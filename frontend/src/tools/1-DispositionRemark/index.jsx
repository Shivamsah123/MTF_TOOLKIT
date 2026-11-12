import React, { useState, useId } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

const CAMPAIGN = 'mtf-cross sell';
const SUBDISPS = ['interested', 'connected to an executive'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const KINDS = {
  'interested': 'Interested',
  'connected to an executive': 'Genuine_Connected_To_Executive'
};

const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');

export default function DispositionRemarkConverter() {
  const fileInputId = useId();
  const [fileInfo, setFileInfo] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [msg1, setMsg1] = useState(null);

  const [pairsText, setPairsText] = useState('');
  const [matchInfo, setMatchInfo] = useState(null);

  const [fileDate, setFileDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [msg3, setMsg3] = useState(null);

  // Parse pair mappings from textarea
  const parsePairs = (text) => {
    const map = {};
    let heading = '';
    const add = (id, rem) => {
      if (map[id] && rem && !map[id].split(' | ').includes(rem)) {
        map[id] += ' | ' + rem;
      } else if (!map[id]) {
        map[id] = rem;
      }
    };

    text.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line) return;
      let m = line.match(/^(?:lead|record)[\s_]*id\s*[:=\-]\s*["']?(\d+)/i);
      if (m) {
        add(m[1], heading);
        return;
      }
      m = line.match(/^["']?(\d+)["']?\s*[\t,;]\s*(.+)$/);
      if (m) {
        add(m[1], m[2].trim().replace(/^"(.*)"$/, '$1'));
        return;
      }
      heading = line.replace(/[:\-]+$/, '').trim();
    });
    return map;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMsg3(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'string', raw: true });
        const sheetName = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', raw: true });
        
        if (!rows.length) throw new Error('File is empty.');

        const rowHeaders = Object.keys(rows[0]);
        const need = ['CAMPAIGN NAME', 'CRM SUB-DISPOSITION', 'RECORD ID'];
        const miss = need.filter(h => !rowHeaders.includes(h));
        if (miss.length) throw new Error('Columns not found: ' + miss.join(', '));

        const mtf = rows.filter(r => norm(r['CAMPAIGN NAME']) === CAMPAIGN);
        const filtered = mtf.filter(r => SUBDISPS.includes(norm(r['CRM SUB-DISPOSITION'])));

        setHeaders(rowHeaders);
        setFilteredRows(filtered);
        setFileInfo({ name: file.name, total: rows.length, mtf: mtf.length, count: filtered.length });

        if (!filtered.length) {
          setMsg1({ type: 'warn', text: `Total ${rows.length} rows → MTF-CROSS SELL: ${mtf.length} → 0 matching rows for Interested / Connected to an executive.` });
        } else {
          setMsg1({
            type: 'ok',
            text: `Total ${rows.length.toLocaleString()} rows → MTF-CROSS SELL: ${mtf.length.toLocaleString()} → Final matching: ${filtered.length.toLocaleString()} rows`
          });
        }
      } catch (err) {
        setHeaders([]);
        setFilteredRows([]);
        setMsg1({ type: 'err', text: err.message || 'Error reading CSV file.' });
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handlePairsChange = (e) => {
    const val = e.target.value;
    setPairsText(val);

    if (!filteredRows.length) return;
    const map = parsePairs(val);
    const ids = new Set(filteredRows.map(r => String(r['RECORD ID']).trim()));
    const matched = [...ids].filter(i => map[i] !== undefined).length;
    const extra = Object.keys(map).filter(i => !ids.has(i));

    setMatchInfo({
      totalIds: ids.size,
      matched,
      withoutRemark: ids.size - matched,
      extra
    });
  };

  const getDatePart = () => {
    if (!fileDate) {
      const d = new Date();
      return `${d.getDate()}_${MONTHS[d.getMonth()]}`;
    }
    const [y, m, d] = fileDate.split('-').map(Number);
    return `${d}_${MONTHS[m - 1]}`;
  };

  const getRowsForFilter = (kind, map) => {
    const withRemark = filteredRows.map(r => {
      const id = String(r['RECORD ID']).trim();
      return { r, remark: map[id] !== undefined ? map[id] : '' };
    });
    if (kind === 'all') return withRemark;
    return withRemark.filter(x => norm(x.remark) === kind);
  };

  const currentMap = parsePairs(pairsText);
  const countInterested = filteredRows.length ? getRowsForFilter('interested', currentMap).length : 0;
  const countConnected = filteredRows.length ? getRowsForFilter('connected to an executive', currentMap).length : 0;
  const countAll = filteredRows.length;

  const downloadExcel = (kind) => {
    const rows = getRowsForFilter(kind, currentMap);
    if (!rows.length) {
      setMsg3({ type: 'warn', text: 'No rows matched for this download option.' });
      return;
    }

    const out = rows.map(x => {
      const o = {};
      headers.forEach(h => {
        o[h] = x.r[h] == null ? '' : String(x.r[h]);
      });
      o['Remark'] = x.remark;
      return o;
    });

    const ws = XLSX.utils.json_to_sheet(out, { header: [...headers, 'Remark'] });
    ws['!cols'] = [...headers, 'Remark'].map(h => ({ wch: Math.min(40, Math.max(12, h.length + 2)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const fileName = kind === 'all'
      ? `${getDatePart()}_MTF_Updated_Disposition.xlsx`
      : `${getDatePart()}_MTF_${KINDS[kind]}.xlsx`;

    XLSX.writeFile(wb, fileName);
    setMsg3({ type: 'ok', text: `Downloaded: ${fileName} (${out.length.toLocaleString()} rows)` });
  };

  return (
    <div className="tool-wrapper">
      <div className="tool-header">
        <h2 className="tool-title">Disposition Remark Converter</h2>
        <p className="tool-subtitle">CDR CSV → Filter MTF &amp; Sub-Dispositions → Add Remarks → Export Excel (.xlsx)</p>
      </div>

      {/* Step 1 */}
      <div className="tool-card">
        <div className="step-indicator">
          <span className="step-num">1</span>
          <span>Upload the CDR CSV file</span>
        </div>
        <div className="step-hint">
          Auto filter: <code>CAMPAIGN NAME = MTF-CROSS SELL</code> &amp; <code>CRM SUB-DISPOSITION = Interested / Connected to an executive</code>
        </div>
        <div style={{ marginTop: 12 }}>
          <label htmlFor={fileInputId} className="dropzone">
            <Upload className="dropzone-icon" style={{ strokeWidth: 1.5, width: 32, height: 32, margin: '0 auto 8px' }} />
            <div className="dropzone-text">{fileInfo ? fileInfo.name : 'Select or drop CDR CSV file here'}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>Only .csv files accepted</span>
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
        {msg1 && (
          <div className={`status-msg ${msg1.type}`}>
            {msg1.type === 'ok' ? <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> : <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />}
            {msg1.text}
          </div>
        )}
      </div>

      {/* Step 2 */}
      <div className={`tool-card ${!filteredRows.length ? 'disabled' : ''}`}>
        <div className="step-indicator">
          <span className="step-num">2</span>
          <span>Paste Record IDs and Remarks</span>
        </div>
        <div className="step-hint">
          Write the Remark on one line, followed by the <code>lead_id: 123</code> lines below it. Or use <code>123 &lt;tab&gt; remark</code> format.
        </div>
        <textarea
          rows={7}
          value={pairsText}
          onChange={handlePairsChange}
          placeholder={`Dropped During Conversation\nlead_id: 211296\nlead_id: 211666\n\nConnected to an executive\nlead_id: 193132`}
        />
        {matchInfo && (
          <div className="status-msg ok" style={{ marginTop: 10 }}>
            Filtered file has <b>{matchInfo.totalIds}</b> unique Record IDs. Remarks matched: <b>{matchInfo.matched}</b>, Without remark: <b>{matchInfo.withoutRemark}</b>
            {matchInfo.extra.length > 0 && (
              <div style={{ marginTop: 6, color: 'var(--warn)' }}>
                Ignored IDs (not in filtered file): {matchInfo.extra.slice(0, 10).join(', ')}{matchInfo.extra.length > 10 ? ` and ${matchInfo.extra.length - 10} more` : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3 */}
      <div className={`tool-card ${!filteredRows.length ? 'disabled' : ''}`}>
        <div className="step-indicator">
          <span className="step-num">3</span>
          <span>Download Excel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--mute)' }}>File date for naming:</span>
          <input
            type="date"
            value={fileDate}
            onChange={(e) => setFileDate(e.target.value)}
            style={{ width: 'auto', padding: '6px 10px' }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              className="btn btn-alt"
              onClick={() => downloadExcel('interested')}
              disabled={countInterested === 0}
            >
              <Download size={16} /> Interested only
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--mute)', paddingLeft: 4 }}>
              Count: <b>{countInterested}</b>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              className="btn btn-alt"
              onClick={() => downloadExcel('connected to an executive')}
              disabled={countConnected === 0}
            >
              <Download size={16} /> Connected to executive
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--mute)', paddingLeft: 4 }}>
              Count: <b>{countConnected}</b>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              className="btn"
              onClick={() => downloadExcel('all')}
              disabled={countAll === 0}
            >
              <FileSpreadsheet size={16} /> Download complete file
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--mute)', paddingLeft: 4 }}>
              Count: <b>{countAll}</b>
            </span>
          </div>
        </div>

        {msg3 && (
          <div className={`status-msg ${msg3.type}`} style={{ marginTop: 16 }}>
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            {msg3.text}
          </div>
        )}
      </div>
    </div>
  );
}

