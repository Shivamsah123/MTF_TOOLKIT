import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL);
const LOCAL_DATA_DIR = isVercel ? '/tmp' : path.resolve(__dirname, '../data');
const LOCAL_DATA_FILE = path.join(LOCAL_DATA_DIR, 'daily_analytics.json');

// Ensure local data directory and file exist
function initLocalFile() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      fs.writeFileSync(LOCAL_DATA_FILE, '[]', 'utf8');
    }
  } catch (err) {
    console.error('Local file init error:', err.message);
  }
}

initLocalFile();

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    return { url: url.replace(/\/+$/, ''), key };
  }
  return null;
}

// Helper: Make HTTP/HTTPS request for Supabase REST API
function supabaseRequest(endpoint, method = 'GET', body = null) {
  const cfg = getSupabaseConfig();
  if (!cfg) return Promise.reject(new Error('Supabase not configured'));

  const parsedUrl = new URL(`${cfg.url}/rest/v1/${endpoint}`);
  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const headers = {
      'apikey': cfg.key,
      'Authorization': `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation,resolution=merge-duplicates' : 'return=minimal'
    };

    const req = client.request({
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || `Supabase error (${res.statusCode})`));
          }
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// 1. Get all analytics records
export async function getAllReports() {
  const cfg = getSupabaseConfig();
  if (cfg) {
    try {
      const data = await supabaseRequest('daily_analytics?select=*&order=report_date.desc');
      if (Array.isArray(data)) return { source: 'supabase', reports: data };
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local storage:', err.message);
    }
  }

  // Local fallback
  try {
    const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
    const list = JSON.parse(raw);
    const sorted = Array.isArray(list) ? list.sort((a, b) => (b.report_date || '').localeCompare(a.report_date || '')) : [];
    return { source: 'local', reports: sorted };
  } catch {
    return { source: 'local', reports: [] };
  }
}

// 2. Save or update a daily report
export async function saveReport(record) {
  const id = record.id || `${record.report_date}_${(record.campaign || 'ALL').replace(/[^\w-]+/g, '_')}`;
  const payload = {
    id,
    report_date: record.report_date,
    campaign: record.campaign || 'All campaigns',
    dialed: parseInt(record.dialed || 0, 10),
    connected: parseInt(record.connected || 0, 10),
    connectivity: parseFloat(record.connectivity || 0),
    answer_null: parseInt(record.answer_null || 0, 10),
    dispositions: record.dispositions || {},
    created_at: new Date().toISOString()
  };

  const cfg = getSupabaseConfig();
  if (cfg) {
    try {
      // Upsert into Supabase
      const res = await supabaseRequest('daily_analytics?on_conflict=id', 'POST', payload);
      return { success: true, source: 'supabase', record: payload };
    } catch (err) {
      console.warn('Supabase save failed, saving to local:', err.message);
    }
  }

  // Local file save
  try {
    initLocalFile();
    const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
    let list = JSON.parse(raw);
    if (!Array.isArray(list)) list = [];

    const existingIdx = list.findIndex(r => r.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = payload;
    } else {
      list.unshift(payload);
    }

    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
    return { success: true, source: 'local', record: payload };
  } catch (err) {
    throw new Error(`Failed to save report: ${err.message}`);
  }
}

// 3. Delete report by ID
export async function deleteReport(id) {
  const cfg = getSupabaseConfig();
  if (cfg) {
    try {
      await supabaseRequest(`daily_analytics?id=eq.${encodeURIComponent(id)}`, 'DELETE');
    } catch (err) {
      console.warn('Supabase delete failed:', err.message);
    }
  }

  try {
    initLocalFile();
    const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
    let list = JSON.parse(raw);
    if (Array.isArray(list)) {
      list = list.filter(r => r.id !== id);
      fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
    }
    return { success: true };
  } catch (err) {
    throw new Error(`Failed to delete report: ${err.message}`);
  }
}

