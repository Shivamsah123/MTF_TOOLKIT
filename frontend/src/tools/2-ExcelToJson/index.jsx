import React, { useState, useEffect, useRef, useId } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Copy, Download, Check, AlertCircle, FileCode } from 'lucide-react';

const ALIASES = {
  lead: ['record_id', 'record id', 'recordid', 'lead_id', 'lead id'],
  call: ['call_id', 'call id', 'callid'],
  sub:  ['remark', 'remarks', 'sub_disposition', 'sub disposition'],
  desc: ['call_description', 'call description', 'calldescription', 'summary']
};

export default function ExcelToJsonConverter() {
  const fileInputId = useId();
  const [fileName, setFileName] = useState('');
  const [baseName, setBaseName] = useState('output');
  const [sheets, setSheets] = useState([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);

  const [colLead, setColLead] = useState(-1);
  const [colCall, setColCall] = useState(-1);
  const [colSub, setColSub] = useState(-1);
  const [colDesc, setColDesc] = useState(-1);

  const [disposition, setDisposition] = useState('Contacted');
  const [includeEmptySub, setIncludeEmptySub] = useState(false);

  const [jsonOutput, setJsonOutput] = useState('');
  const [statsText, setStatsText] = useState('No file loaded yet.');
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const isDragging = useRef(false);
  const [dragOver, setDragOver] = useState(false);

  // Read file using XLSX
  const processFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setMsg({ type: 'info', text: 'Reading file...' });
    const bName = file.name.replace(/\.[^.]+$/, '');
    setBaseName(bName);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      const parsedSheets = wb.SheetNames.map(name => {
        const sheet = wb.Sheets[name];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        // find header row with at least 2 non-empty cells
        const headerIndex = rawRows.findIndex(r => r.filter(x => String(x ?? '').trim() !== '').length >= 2);
        if (headerIndex < 0) return { name, header: [], body: [] };
        const header = rawRows[headerIndex].map(h => String(h ?? '').trim());
        const body = rawRows.slice(headerIndex + 1);
        return { name, header, body };
      }).filter(s => s.header.length > 0);

      if (!parsedSheets.length) throw new Error('No valid tabular data found in this file.');

      setSheets(parsedSheets);
      setSelectedSheetIndex(0);
      setupColumns(parsedSheets[0]);
      setMsg({ type: 'ok', text: `Loaded file: ${file.name}` });
    } catch (err) {
      setSheets([]);
      setJsonOutput('');
      setStatsText('No file loaded yet.');
      setMsg({ type: 'err', text: err.message || 'Could not parse this file.' });
    }
  };

  const setupColumns = (sheet) => {
    if (!sheet) return;
    const findIndex = (key) => sheet.header.findIndex(h => ALIASES[key].includes(h.toLowerCase()));
    setColLead(findIndex('lead'));
    setColCall(findIndex('call'));
    setColSub(findIndex('sub'));
    setColDesc(findIndex('desc'));
  };

  const handleSheetChange = (idx) => {
    setSelectedSheetIndex(idx);
    setupColumns(sheets[idx]);
  };

  // Convert whenever mappings change
  useEffect(() => {
    if (!sheets.length || selectedSheetIndex >= sheets.length) return;
    const sheet = sheets[selectedSheetIndex];
    if (!sheet) return;

    if (colLead < 0 || colCall < 0 || !disposition.trim()) {
      setJsonOutput('');
      setStatsText('lead_id, call_id and disposition are required to convert.');
      return;
    }

    const val = x => String(x ?? '').trim();
    const seen = new Set();
    const result = [];
    let noId = 0, noRemark = 0, dup = 0;

    for (const r of sheet.body) {
      const lead = val(r[colLead]);
      const call = val(r[colCall]).replace(/['\u2018\u2019]/g, '').trim();
      const sub = colSub >= 0 ? val(r[colSub]) : '';
      const desc = colDesc >= 0 ? val(r[colDesc]) : '';

      // Skip fully blank rows
      if (r.every(x => val(x) === '')) continue;
      if (!lead || !call) { noId++; continue; }
      if (colSub >= 0 && !sub && !includeEmptySub) { noRemark++; continue; }
      if (seen.has(call)) { dup++; continue; }

      seen.add(call);
      const num = Number(lead);
      const rec = {
        lead_id: Number.isFinite(num) ? num : lead,
        call_id: call
      };
      if (colSub >= 0) rec.sub_disposition = sub;
      rec.disposition = disposition;
      if (colDesc >= 0) rec.summary = desc;

      result.push(rec);
    }

    const formatted = JSON.stringify(result, null, 2);
    setJsonOutput(formatted);
    // Share with API Sender tool via localStorage
    try {
      localStorage.setItem('cdr_toolkit_last_json', formatted);
    } catch {}

    setStatsText(`${result.length.toLocaleString()} records converted. Skipped: ${noRemark.toLocaleString()} without sub_disposition, ${noId.toLocaleString()} without IDs, ${dup.toLocaleString()} duplicate call IDs.`);
  }, [sheets, selectedSheetIndex, colLead, colCall, colSub, colDesc, disposition, includeEmptySub]);

  const handleCopy = async () => {
    if (!jsonOutput) return;
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert('Clipboard copy failed. Please select and copy manually.');
    }
  };

  const handleDownload = () => {
    if (!jsonOutput) return;
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const currentSheet = sheets[selectedSheetIndex];

  return (
    <div className="tool-wrapper">
      <div className="tool-header">
        <h2 className="tool-title">Excel to JSON Converter</h2>
        <p className="tool-subtitle">Offline file converter. Converts Excel or CSV rows into call JSON payloads.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, alignItems: 'start' }}>
        {/* Left Column: Settings */}
        <div>
          {/* Step 1: File selection */}
          <div className="tool-card">
            <div className="step-indicator">
              <span className="step-num">1</span>
              <span>Choose a file</span>
            </div>
            <label
              htmlFor={fileInputId}
              className={`dropzone ${dragOver ? 'active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                processFile(e.dataTransfer.files?.[0]);
              }}
            >
              <Upload className="dropzone-icon" style={{ strokeWidth: 1.5, width: 32, height: 32, margin: '0 auto 8px' }} />
              <div className="dropzone-text">{fileName || 'Drop an Excel or CSV file here'}</div>
              <span style={{ fontSize: '0.82rem', color: 'var(--mute)' }}>Supports .xlsx, .xlsm, .csv</span>
            </label>
            <input
              id={fileInputId}
              type="file"
              accept=".xlsx,.xlsm,.csv"
              style={{ display: 'none' }}
              onChange={(e) => processFile(e.target.files?.[0])}
            />
            {msg && (
              <div className={`status-msg ${msg.type}`} style={{ marginTop: 10 }}>
                {msg.text}
              </div>
            )}
          </div>

          {/* Step 2: Column mapping */}
          <div className={`tool-card ${!sheets.length ? 'disabled' : ''}`}>
            <div className="step-indicator">
              <span className="step-num">2</span>
              <span>Map the columns</span>
            </div>

            {sheets.length > 1 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>Worksheet</label>
                <select value={selectedSheetIndex} onChange={(e) => handleSheetChange(Number(e.target.value))}>
                  {sheets.map((s, idx) => (
                    <option key={s.name} value={idx}>{s.name} ({s.body.length.toLocaleString()} rows)</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>
                  <code>lead_id</code> comes from <span style={{ color: 'var(--err)' }}>*</span>
                </label>
                <select value={colLead} onChange={(e) => setColLead(Number(e.target.value))}>
                  <option value={-1}>(none)</option>
                  {currentSheet?.header.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>
                  <code>call_id</code> comes from <span style={{ color: 'var(--err)' }}>*</span>
                </label>
                <select value={colCall} onChange={(e) => setColCall(Number(e.target.value))}>
                  <option value={-1}>(none)</option>
                  {currentSheet?.header.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>
                  <code>disposition</code> value (constant for all records) <span style={{ color: 'var(--err)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                  placeholder="Contacted"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>
                  <code>sub_disposition</code> comes from (optional)
                </label>
                <select value={colSub} onChange={(e) => setColSub(Number(e.target.value))}>
                  <option value={-1}>(none)</option>
                  {currentSheet?.header.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>
                  <code>summary</code> comes from Call_description (optional)
                </label>
                <select value={colDesc} onChange={(e) => setColDesc(Number(e.target.value))}>
                  <option value={-1}>(none)</option>
                  {currentSheet?.header.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer', marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={includeEmptySub}
                  onChange={(e) => setIncludeEmptySub(e.target.checked)}
                />
                <span>Include rows with empty sub_disposition</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="tool-card" style={{ height: '100%' }}>
          <div className="step-indicator">
            <span className="step-num">3</span>
            <span>Copy or Download JSON</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>{statsText}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn ${copied ? 'btn-success' : 'btn-alt'}`}
                style={{ padding: '7px 14px', fontSize: '0.86rem' }}
                onClick={handleCopy}
                disabled={!jsonOutput}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
              <button
                className="btn"
                style={{ padding: '7px 14px', fontSize: '0.86rem' }}
                onClick={handleDownload}
                disabled={!jsonOutput}
              >
                <Download size={15} /> Download .json
              </button>
            </div>
          </div>

          <textarea
            readOnly
            value={jsonOutput}
            placeholder="Converted JSON will appear here..."
            style={{ width: '100%', minHeight: 460, background: '#f8fafc', whiteSpace: 'pre' }}
          />

          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', marginTop: 10 }}>
            Rows with missing lead_id or call_id are automatically skipped, and repeated call IDs are deduplicated.
          </div>
        </div>
      </div>
    </div>
  );
}

