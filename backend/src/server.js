import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import {
  getAdminCredentials,
  createToken,
  getSession,
  makeCookieHeader,
  constantTimeEquals,
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts
} from './auth.js';
import { forwardApiRequest } from './proxy.js';
import { getAllReports, saveReport, deleteReport } from './analyticsStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Helper: Parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) { // 5MB limit
        req.destroy(new Error('Body payload too large'));
      }
    });
    req.on('end', () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error('Malformed JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

// Helper: JSON response with standard security headers
function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const json = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders
  });
  res.end(json);
}

// Helper: Get Client IP
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

// Static File Server with Gzip & Caching
function serveStaticFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA client-side routing
      const indexFile = path.join(FRONTEND_DIST, 'index.html');
      return serveStaticFile(req, res, indexFile);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isAsset = filePath.includes(path.sep + 'assets' + path.sep);

    const headers = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': isAsset
        ? 'public, max-age=31536000, immutable'
        : 'no-cache, must-revalidate'
    };

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldGzip = /gzip/i.test(acceptEncoding) && /text|javascript|json|svg/i.test(contentType);

    if (shouldGzip) {
      headers['Content-Encoding'] = 'gzip';
      res.writeHead(200, headers);
      const rawStream = fs.createReadStream(filePath);
      const gzip = zlib.createGzip();
      rawStream.pipe(gzip).pipe(res);
    } else {
      headers['Content-Length'] = stats.size;
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

// Main HTTP Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const ip = getClientIp(req);

  // CORS for local development (if frontend is on vite port 5173)
  const origin = req.headers.origin;
  const isDevOrigin = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
  const corsHeaders = isDevOrigin ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  } : {};

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...corsHeaders, 'Content-Length': 0 });
    return res.end();
  }

  // --- API ROUTES ---

  // Health check
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, uptime: process.uptime(), time: new Date().toISOString() }, corsHeaders);
  }

  // Auth: Check Current Session
  if (pathname === '/api/me' && req.method === 'GET') {
    const session = getSession(req);
    if (session) {
      return sendJson(res, 200, { authenticated: true, user: session.u }, corsHeaders);
    }
    return sendJson(res, 401, { authenticated: false }, corsHeaders);
  }

  // Auth: Login
  if (pathname === '/api/login' && req.method === 'POST') {
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return sendJson(res, 429, {
        error: `Too many failed attempts. Account locked for ${rateCheck.remainingSec} more seconds.`
      }, corsHeaders);
    }

    try {
      const { username, password } = await parseJsonBody(req);
      const { user: expUser, pass: expPass } = getAdminCredentials();

      const userMatch = constantTimeEquals(String(username || '').trim().toLowerCase(), expUser.toLowerCase());
      const passMatch = constantTimeEquals(String(password || '').trim(), expPass);

      if (userMatch && passMatch) {
        resetAttempts(ip);
        const token = createToken(expUser);
        const cookie = makeCookieHeader(token);
        return sendJson(res, 200, { ok: true, user: expUser }, {
          ...corsHeaders,
          'Set-Cookie': cookie
        });
      }

      recordFailedAttempt(ip);
      return sendJson(res, 401, { error: 'Invalid username or password.' }, corsHeaders);
    } catch (err) {
      return sendJson(res, 400, { error: err.message }, corsHeaders);
    }
  }

  // Auth: Logout
  if (pathname === '/api/logout' && req.method === 'POST') {
    const clearCookie = makeCookieHeader('', 0);
    return sendJson(res, 200, { ok: true }, {
      ...corsHeaders,
      'Set-Cookie': clearCookie
    });
  }

  // API Request Sender: SSRF-Protected Proxy
  if (pathname === '/api/send' && req.method === 'POST') {
    const session = getSession(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Unauthorized. Please log in first.' }, corsHeaders);
    }

    try {
      const payload = await parseJsonBody(req);
      const result = await forwardApiRequest(payload);
      return sendJson(res, 200, result, corsHeaders);
    } catch (err) {
      return sendJson(res, 400, { error: err.message }, corsHeaders);
    }
  }

  // Daily Analytics & Reports API
  if (pathname === '/api/analytics') {
    const session = getSession(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Unauthorized. Please log in first.' }, corsHeaders);
    }

    if (req.method === 'GET') {
      try {
        const result = await getAllReports();
        const reports = Array.isArray(result) ? result : (result.reports || []);
        const source = result.source || 'local';
        return sendJson(res, 200, { ok: true, source, reports }, corsHeaders);
      } catch (err) {
        return sendJson(res, 500, { error: err.message }, corsHeaders);
      }
    }

    if (req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        if (!body.report_date) {
          return sendJson(res, 400, { error: 'report_date is required' }, corsHeaders);
        }
        const result = await saveReport(body);
        return sendJson(res, 200, result, corsHeaders);
      } catch (err) {
        return sendJson(res, 500, { error: err.message }, corsHeaders);
      }
    }

    if (req.method === 'DELETE') {
      try {
        const id = parsedUrl.searchParams.get('id');
        if (!id) {
          return sendJson(res, 400, { error: 'id parameter is required' }, corsHeaders);
        }
        await deleteReport(id);
        return sendJson(res, 200, { ok: true, deleted: id }, corsHeaders);
      } catch (err) {
        return sendJson(res, 500, { error: err.message }, corsHeaders);
      }
    }
  }

  // --- STATIC ASSETS & SPA SERVING ---
  if (req.method === 'GET' || req.method === 'HEAD') {
    const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let targetFile = path.join(FRONTEND_DIST, safePath);

    if (pathname === '/' || !path.extname(targetFile)) {
      targetFile = path.join(FRONTEND_DIST, 'index.html');
    }

    return serveStaticFile(req, res, targetFile);
  }

  return sendJson(res, 404, { error: 'Not Found' }, corsHeaders);
});

server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Production Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving frontend from: ${FRONTEND_DIST}`);
  console.log(`🔒 Authentication: HMAC-SHA256 Signed HttpOnly Cookies`);
  console.log(`🛡️  SSRF-Protected API Proxy: Active on /api/send`);
  console.log(`======================================================\n`);
});

