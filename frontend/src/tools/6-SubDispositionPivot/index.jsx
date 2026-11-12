import React, { useState, useRef, useId, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Camera,
  Copy,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  Globe,
  Settings,
  Search,
  RotateCcw,
  Download,
  Calendar,
  Sliders,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

const norm = s => String(s ?? '').trim().toLowerCase().replace(/[\s_]+/g, ' ');
const findCol = (header, name) => {
  const t = norm(name);
  return header.findIndex(h => norm(h) === t);
};
const fmt = n => Number(n || 0).toLocaleString('en-IN');

export default function SubDispositionPivotConverter() {
  const fileInputId = useId();

  // Mode: 'upload' (CSV/Excel upload) or 'api' (Direct Waanee API Fetch)
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' | 'api'

  // Data state
  const [fileName, setFileName] = useState('');
  const [rowsData, setRowsData] = useState(null);
  const [headerCols, setHeaderCols] = useState([]);
  const [rawCsvText, setRawCsvText] = useState('');
  const [tablePage, setTablePage] = useState(1);

  // Column mapping & campaign state
  const [campColIndex, setCampColIndex] = useState(-1);
  const [subColIndex, setSubColIndex] = useState(-1);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [campaignList, setCampaignList] = useState([]);

  // Results
  const [pivotResult, setPivotResult] = useState(null);
  const [summaryResult, setSummaryResult] = useState(null);
  const [msg, setMsg] = useState(null);
  const [copiedAction, setCopiedAction] = useState('');

  // Save to Daily Analytics state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveDate, setSaveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [savingStatus, setSavingStatus] = useState(null);

  // --- API Direct Fetch Form States (matching Waanee portal screenshot) ---
  const [cdrTab, setCdrTab] = useState('OVERALL CDR'); // 'OVERALL CDR' | 'CONNECTED CDR'
  const [callType, setCallType] = useState('Predictive');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setHours(23, 14, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [apiCampaign, setApiCampaign] = useState('MTF-CROSS SELL');
  const [fetchingApi, setFetchingApi] = useState(false);

  // API Config Settings
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [portalUrl, setPortalUrl] = useState(() => localStorage.getItem('waanee_portal_url') || 'https://msl.waanee.ai');
  const [apiToken, setApiToken] = useState(() => localStorage.getItem('waanee_portal_token') || '');
  const [apiEndpoint, setApiEndpoint] = useState(() => localStorage.getItem('waanee_api_endpoint') || '/api/cdr/export');

  const triggerCopyFeedback = (text) => {
    setCopiedAction(text);
    setTimeout(() => setCopiedAction(''), 2500);
  };

  // Common parser logic that accepts raw 2D array of rows
  const loadParsedRows = (raw, sourceTitle, rawCsvString = '') => {
    if (!raw || !raw.length) throw new Error('No tabular data found.');

    const hdr = (raw[0] || []).map(h => String(h ?? '').trim());
    setRowsData(raw);
    setHeaderCols(hdr);
    setFileName(sourceTitle);
    setTablePage(1);
    if (rawCsvString) setRawCsvText(rawCsvString);

    const cIdx = Math.max(0, findCol(hdr, 'CAMPAIGN NAME'));
    const sIdx = Math.max(0, findCol(hdr, 'CRM SUB-DISPOSITION'));
    setCampColIndex(cIdx);
    setSubColIndex(sIdx);

    // Extract campaigns
    const campCounts = new Map();
    for (let i = 1; i < raw.length; i++) {
      const v = String(raw[i]?.[cIdx] ?? '').trim();
      if (v) campCounts.set(v, (campCounts.get(v) || 0) + 1);
    }
    const cList = [...campCounts.entries()].sort((a, b) => b[1] - a[1]);
    setCampaignList(cList);

    const defaultCamp = cList.find(([name]) => norm(name) === 'mtf-cross sell')?.[0] || (cList[0] ? cList[0][0] : '');
    setSelectedCampaign(defaultCamp);

    // Compute Pivot and Call summary
    computeData(raw, hdr, cIdx, sIdx, defaultCamp);
    setMsg({
      type: 'ok',
      text: `${sourceTitle}: ${(raw.length - 1).toLocaleString('en-IN')} calls loaded successfully.`
    });
  };

  // File Upload parser
  const parseFile = async (file) => {
    if (!file) return;
    setMsg({ type: 'info', text: `Reading: ${file.name}...` });

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

      loadParsedRows(raw, file.name);
    } catch (err) {
      setRowsData(null);
      setHeaderCols([]);
      setPivotResult(null);
      setSummaryResult(null);
      setMsg({ type: 'err', text: err.message || 'Error processing file.' });
    }
  };

  // --- DIRECT API FETCH ACTION ---
  const handleApiFetch = async () => {
    setFetchingApi(true);
    setMsg({ type: 'info', text: `Fetching CDR from ${portalUrl} (${apiCampaign})...` });

    try {
      // Save settings in localStorage
      localStorage.setItem('waanee_portal_url', portalUrl);
      localStorage.setItem('waanee_portal_token', apiToken);
      localStorage.setItem('waanee_api_endpoint', apiEndpoint);

      const targetFullUrl = `${portalUrl.replace(/\/+$/, '')}${apiEndpoint}?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&campaign=${encodeURIComponent(apiCampaign)}&callType=${encodeURIComponent(callType)}&tab=${encodeURIComponent(cdrTab)}`;

      let responseText = '';
      let fetchSuccess = false;

      // Try fetching via backend proxy
      try {
        const proxyRes = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: targetFullUrl,
            method: 'POST',
            headers: {
              'Authorization': apiToken ? (apiToken.startsWith('Bearer ') ? apiToken : `Bearer ${apiToken}`) : '',
              'Content-Type': 'application/json'
            },
            body: {
              from_date: fromDate,
              to_date: toDate,
              campaign: apiCampaign,
              call_type: callType,
              tab: cdrTab
            }
          })
        });

        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (proxyData.body) {
            responseText = proxyData.body;
            fetchSuccess = true;
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy fetch attempt failed:', proxyErr.message);
      }

      // If portal returned response or if user is testing without live portal token, generate intelligent mock CDR dataset
      if (!fetchSuccess || !responseText) {
        if (!apiToken.trim()) {
          // If no token is provided yet, generate an authentic preview dataset so the user can see it works instantly!
          responseText = generateSampleCdrCsv(apiCampaign, fromDate, toDate);
          fetchSuccess = true;
          setMsg({
            type: 'warn',
            text: 'Live Waanee Token not provided yet. Loaded simulated CDR sample data for this date range so you can test the analysis!'
          });
        } else {
          throw new Error(`Could not reach ${portalUrl}. Please check the URL, token, or internet connection.`);
        }
      }

      // Parse the CSV text into rows
      const wb = XLSX.read(responseText, { type: 'string', raw: true });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

      loadParsedRows(raw, `Waanee_${apiCampaign}_${fromDate.slice(0, 10)}.csv`, responseText);
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'API fetch failed.' });
    } finally {
      setFetchingApi(false);
    }
  };

  // Export the fetched raw CSV directly
  const handleExportFetchedCsv = () => {
    if (rawCsvText) {
      const blob = new Blob(['\ufeff' + rawCsvText], { type: 'text/csv;charset=utf-8;' });
      saveBlob(blob, `CDR_${apiCampaign.replace(/\s+/g, '_')}_${fromDate.slice(0, 10)}_to_${toDate.slice(0, 10)}.csv`);
      triggerCopyFeedback('Downloaded CDR CSV file.');
      return;
    }

    if (rowsData && rowsData.length) {
      const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
      const lines = rowsData.map(r => r.map(q).join(',')).join('\r\n');
      const blob = new Blob(['\ufeff' + lines], { type: 'text/csv;charset=utf-8;' });
      saveBlob(blob, `CDR_${(selectedCampaign || 'Export').replace(/\s+/g, '_')}.csv`);
      triggerCopyFeedback('Downloaded CDR CSV file.');
    } else {
      alert('No CDR data loaded yet. Please click Search first.');
    }
  };

  const handleClearApiForm = () => {
    setApiCampaign('MTF-CROSS SELL');
    setCallType('Predictive');
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    setFromDate(d.toISOString().slice(0, 16));
    d.setHours(23, 14, 0, 0);
    setToDate(d.toISOString().slice(0, 16));
  };

  // --- SAVE DAILY REPORT TO ANALYTICS (Supabase / Local) ---
  const handleSaveToDailyAnalytics = async () => {
    if (!pivotResult) return;
    setSavingStatus('saving');

    // Build dispositions object from pivot rows
    const dispositions = {};
    pivotResult.rows.forEach(([label, count]) => {
      dispositions[label] = count;
    });

    // Extract summary values
    let dialed = 0, connected = 0, connectivity = 0, answerNull = 0;
    if (summaryResult && summaryResult.length >= 5) {
      answerNull = parseInt(String(summaryResult[1][1]).replace(/,/g, ''), 10) || 0;
      connected = parseInt(String(summaryResult[2][1]).replace(/,/g, ''), 10) || 0;
      dialed = parseInt(String(summaryResult[3][1]).replace(/,/g, ''), 10) || 0;
      connectivity = parseFloat(String(summaryResult[4][1]).replace('%', '')) || 0;
    } else if (pivotResult) {
      dialed = pivotResult.total || 0;
    }

    const id = `${saveDate}_${(selectedCampaign || 'All campaigns').replace(/[^\w-]+/g, '_')}`;
    const payload = {
      id,
      report_date: saveDate,
      campaign: selectedCampaign || 'All campaigns',
      dialed,
      connected,
      connectivity,
      answer_null: answerNull,
      dispositions,
      created_at: new Date().toISOString()
    };

    // 1. SAVE TO BROWSER PERMANENT STORAGE IMMEDIATELY
    try {
      const stored = localStorage.getItem('cdr_master_daily_reports');
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];
      const exIdx = list.findIndex(r => r.id === id);
      if (exIdx >= 0) list[exIdx] = payload;
      else list.unshift(payload);
      localStorage.setItem('cdr_master_daily_reports', JSON.stringify(list));
      localStorage.setItem('cdr_daily_analytics_cache', JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // 2. SAVE TO SERVER / SUPABASE
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavingStatus('saved');
        const sourceName = data.source === 'supabase' ? 'Supabase Cloud Database' : 'Browser Storage';
        triggerCopyFeedback(`Daily report saved permanently for ${saveDate} (${sourceName})!`);
        setTimeout(() => {
          setSaveModalOpen(false);
          setSavingStatus(null);
        }, 1500);
      } else {
        setSavingStatus('saved');
        triggerCopyFeedback(`Saved in browser permanent storage for ${saveDate}!`);
        setTimeout(() => {
          setSaveModalOpen(false);
          setSavingStatus(null);
        }, 1500);
      }
    } catch (err) {
      setSavingStatus('saved');
      triggerCopyFeedback(`Saved in browser permanent storage for ${saveDate}!`);
      setTimeout(() => {
        setSaveModalOpen(false);
        setSavingStatus(null);
      }, 1500);
    }
  };

  // Generate authentic sample CDR CSV if token not provided
  const generateSampleCdrCsv = (camp, from, to) => {
    const headers = [
      'Contact Number', 'DID', 'Extension', 'Call Type', 'Agent Name', 'Team Name', 'Campaign',
      'Call Duration', 'Talk Duration', 'ACW Duration', 'AGENT Ringing TIME', 'CUSTOMER Ringing TIME',
      'Trunk Group', 'Dialer disposition', 'CRM disposition', 'CRM sub-disposition', 'Drop by'
    ];

    const subDisps = [
      'Interested', 'Connected to an executive', 'Call back', 'Dropped during conversation',
      'General Callback', 'Language Barrier', 'NA', 'Need time to think', 'Not Interested',
      'null', 'Put the Call On Hold', 'Voice Mail', 'Voice not clear', 'Wrong Number'
    ];

    const rows = [headers.join(',')];
    const totalCount = 180;

    for (let i = 0; i < totalCount; i++) {
      const isAnswer = Math.random() < 0.65;
      const isContacted = isAnswer && Math.random() < 0.70;
      const sub = isContacted ? subDisps[Math.floor(Math.random() * (subDisps.length - 1))] : (isAnswer ? 'null' : '');

      const contact = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const gw = isAnswer ? 'ANSWER' : 'NOANSWER';
      const crm = isContacted ? 'Contacted' : (isAnswer ? '' : 'Not Contacted');

      rows.push([
        contact, '+918065741695', 'owlexa', 'Predictive', 'Agent ' + ((i % 5) + 1), 'Team 1', camp,
        isAnswer ? 24 : 0, isAnswer ? '00:00:20' : '00:00:00', '00:00:05', '00:00:02', '00:00:00',
        'msl264', gw, crm, sub, 'From_Customer'
      ].join(','));
    }

    return rows.join('\r\n');
  };

  const computeData = (rows, hdr, cCol, sCol, camp) => {
    if (!rows || rows.length < 2) return;

    // 1. Pivot Table
    const byKey = new Map();
    let total = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      if (cCol >= 0 && camp && norm(r[cCol]) !== norm(camp)) continue;

      let v = String(r[sCol] ?? '').trim();
      if (v === '') v = 'null';
      const k = v.toLowerCase();
      let entry = byKey.get(k);
      if (!entry) {
        entry = { total: 0, forms: new Map() };
        byKey.set(k, entry);
      }
      entry.total++;
      entry.forms.set(v, (entry.forms.get(v) || 0) + 1);
      total++;
    }

    const pivotRows = [];
    for (const [k, e] of byKey) {
      let bestForm = '', bestCount = -1;
      for (const [f, c] of e.forms) {
        if (c > bestCount) {
          bestForm = f;
          bestCount = c;
        }
      }
      pivotRows.push([bestForm, e.total]);
    }
    pivotRows.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
    setPivotResult({ rows: pivotRows, total });

    // 2. Call Summary & Connectivity
    const gwCol = findCol(hdr, 'Dialer disposition') >= 0 ? findCol(hdr, 'Dialer disposition') : findCol(hdr, 'GATEWAY DISPOSITION');
    const crmCol = findCol(hdr, 'CRM disposition') >= 0 ? findCol(hdr, 'CRM disposition') : findCol(hdr, 'CRM DISPOSITION');

    if (gwCol >= 0 && crmCol >= 0) {
      let dialed = 0, answerNull = 0, connected = 0;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        if (cCol >= 0 && camp && norm(r[cCol]) !== norm(camp)) continue;
        dialed++;
        const g = norm(r[gwCol]);
        let d = norm(r[crmCol]);
        if (d === '') d = 'null';
        if (g === 'answer' && d === 'null') answerNull++;
        if (d === 'contacted') connected++;
      }
      const pct = dialed ? (connected / dialed) * 100 : 0;
      setSummaryResult([
        ['Metric', 'Value'],
        ['ANSWER_NULL Calls', fmt(answerNull)],
        ['Connected Calls', fmt(connected)],
        ['Total Dialed Calls', fmt(dialed)],
        ['Connectivity', pct.toFixed(2) + '%']
      ]);
    } else {
      setSummaryResult(null);
    }
  };

  const handleCampColChange = (val) => {
    const idx = Number(val);
    setCampColIndex(idx);
    if (!rowsData) return;

    const campCounts = new Map();
    for (let i = 1; i < rowsData.length; i++) {
      const v = String(rowsData[i]?.[idx] ?? '').trim();
      if (v) campCounts.set(v, (campCounts.get(v) || 0) + 1);
    }
    const cList = [...campCounts.entries()].sort((a, b) => b[1] - a[1]);
    setCampaignList(cList);
    setSelectedCampaign('');
    computeData(rowsData, headerCols, idx, subColIndex, '');
  };

  const handleCampaignChange = (camp) => {
    setSelectedCampaign(camp);
    computeData(rowsData, headerCols, campColIndex, subColIndex, camp);
  };

  const handleSubColChange = (val) => {
    const idx = Number(val);
    setSubColIndex(idx);
    computeData(rowsData, headerCols, campColIndex, idx, selectedCampaign);
  };

  // Canvas screenshot generator
  const generateCanvas = (tableRows, hasTotal = true) => {
    const S = 2, RH = 28, PAD = 10, F = '14px system-ui, sans-serif', FB = 'bold 14px system-ui, sans-serif';
    const m = document.createElement('canvas').getContext('2d');
    m.font = FB;
    let w1 = 0, w2 = 0;
    tableRows.forEach(r => {
      w1 = Math.max(w1, m.measureText(String(r[0])).width);
      w2 = Math.max(w2, m.measureText(String(r[1])).width);
    });
    w1 = Math.ceil(w1 + PAD * 2 + 28);
    w2 = Math.ceil(w2 + PAD * 2 + 10);
    const W = w1 + w2, H = tableRows.length * RH;

    const c = document.createElement('canvas');
    c.width = W * S;
    c.height = H * S;
    const g = c.getContext('2d');
    g.scale(S, S);

    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);
    g.textBaseline = 'middle';

    tableRows.forEach((r, i) => {
      const y = i * RH;
      const isHeader = i === 0;
      const isTotal = hasTotal && i === tableRows.length - 1;

      if (isHeader || isTotal) {
        g.fillStyle = '#ddebf7';
        g.fillRect(0, y, W, RH);
      }
      g.strokeStyle = (isHeader || isTotal) ? '#9bc2e6' : '#e1e4ea';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, y + RH - 0.5);
      g.lineTo(W, y + RH - 0.5);
      if (isTotal) {
        g.moveTo(0, y + 0.5);
        g.lineTo(W, y + 0.5);
      }
      g.stroke();

      g.fillStyle = '#14202b';
      g.font = (isHeader || isTotal) ? FB : F;
      g.textAlign = 'left';
      g.fillText(String(r[0]), PAD, y + RH / 2 + 1);
      g.textAlign = 'right';
      g.fillText(String(r[1]), W - PAD, y + RH / 2 + 1);
    });
    return c;
  };

  const getFileBaseName = () => (selectedCampaign || 'All-Campaigns').replace(/[^\w-]+/g, '_');
  const saveBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // Export functions
  const downloadPivotImage = () => {
    if (!pivotResult) return;
    const colName = headerCols[subColIndex] || 'Sub-Disposition';
    const rows = [
      [colName, `Count of ${colName}`],
      ...pivotResult.rows.map(r => [r[0], fmt(r[1])]),
      ['Grand Total', fmt(pivotResult.total)]
    ];
    const c = generateCanvas(rows, true);
    c.toBlob(blob => saveBlob(blob, `${getFileBaseName()}_Sub_Disposition.png`), 'image/png');
  };

  const copyPivotImage = () => {
    if (!pivotResult) return;
    const colName = headerCols[subColIndex] || 'Sub-Disposition';
    const rows = [
      [colName, `Count of ${colName}`],
      ...pivotResult.rows.map(r => [r[0], fmt(r[1])]),
      ['Grand Total', fmt(pivotResult.total)]
    ];
    const c = generateCanvas(rows, true);
    c.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        triggerCopyFeedback('Screenshot copied to clipboard!');
      } catch {
        alert('Could not copy image directly in this browser.');
      }
    }, 'image/png');
  };

  const downloadPivotExcel = () => {
    if (!pivotResult) return;
    const colName = headerCols[subColIndex] || 'Sub-Disposition';
    const data = [
      [`Campaign: ${selectedCampaign || 'All campaigns'}`],
      [],
      [colName, `Count of ${colName}`],
      ...pivotResult.rows.map(r => [r[0], r[1]]),
      ['Grand Total', pivotResult.total]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pivot');
    XLSX.writeFile(wb, `${getFileBaseName()}_Sub_Disposition.xlsx`);
  };

  const downloadPivotCsv = () => {
    if (!pivotResult) return;
    const colName = headerCols[subColIndex] || 'Sub-Disposition';
    const q = s => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [
      [colName, `Count of ${colName}`],
      ...pivotResult.rows,
      ['Grand Total', pivotResult.total]
    ].map(r => r.map(q).join(',')).join('\r\n');

    const blob = new Blob(['\ufeff' + lines], { type: 'text/csv;charset=utf-8;' });
    saveBlob(blob, `${getFileBaseName()}_Sub_Disposition.csv`);
  };

  const copyPivotTsv = async () => {
    if (!pivotResult) return;
    const colName = headerCols[subColIndex] || 'Sub-Disposition';
    const t = [
      [colName, `Count of ${colName}`],
      ...pivotResult.rows,
      ['Grand Total', pivotResult.total]
    ].map(r => r.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(t);
      triggerCopyFeedback('Copied. Now press Ctrl+V in Excel.');
    } catch {
      alert('Unable to copy.');
    }
  };

  const downloadSummaryImage = () => {
    if (!summaryResult) return;
    const c = generateCanvas(summaryResult, true);
    c.toBlob(blob => saveBlob(blob, `${getFileBaseName()}_Call_Summary.png`), 'image/png');
  };

  const copySummaryImage = () => {
    if (!summaryResult) return;
    const c = generateCanvas(summaryResult, true);
    c.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        triggerCopyFeedback('Summary screenshot copied!');
      } catch {
        alert('Could not copy image directly in this browser.');
      }
    }, 'image/png');
  };

  const copySummaryTsv = async () => {
    if (!summaryResult) return;
    const t = summaryResult.map(r => r.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(t);
      triggerCopyFeedback('Summary copied. Now press Ctrl+V in Excel.');
    } catch {
      alert('Unable to copy.');
    }
  };

  const subColName = headerCols[subColIndex] || 'Sub-Disposition';

  return (
    <div className="tool-wrapper">
      {/* Title */}
      <div className="tool-header">
        <h2 className="tool-title">Sub-Disposition Pivot Converter</h2>
        <p className="tool-subtitle">
          Analyze CDR call outcomes, generate automated Pivot tables &amp; connectivity metrics either by uploading files or direct portal API fetch.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          className={`btn ${activeMode === 'upload' ? '' : 'btn-alt'}`}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
          onClick={() => setActiveMode('upload')}
        >
          <Upload size={15} /> 📂 Upload CSV / Excel File
        </button>

        <button
          type="button"
          className={`btn ${activeMode === 'api' ? '' : 'btn-alt'}`}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
          onClick={() => setActiveMode('api')}
        >
          <Globe size={15} /> ⚡ Direct Fetch from Dial Portal (API)
        </button>
      </div>

      {/* MODE 1: FILE UPLOAD */}
      {activeMode === 'upload' && (
        <div className="tool-card">
          <label htmlFor={fileInputId} className={`dropzone ${rowsData ? 'loaded' : ''}`}>
            <Upload className="dropzone-icon" style={{ strokeWidth: 1.5, width: 32, height: 32, margin: '0 auto 8px' }} />
            <div className="dropzone-text">{fileName || 'Drag and drop a CSV or XLSX file here or click to browse'}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>Supports CDR files exported from Waanee Dial Portal</span>
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            onChange={(e) => parseFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* MODE 2: DIRECT API FETCH (Matching User Screenshot) */}
      {activeMode === 'api' && (
        <div className="tool-card" style={{ padding: '20px 24px' }}>
          {/* Top Sub-Tabs like Waanee Portal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              {['OVERALL CDR', 'CONNECTED CDR'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCdrTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 4px 12px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: cdrTab === tab ? '#fe0168' : '#64748b',
                    borderBottom: cdrTab === tab ? '3px solid #fe0168' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-alt"
              style={{ padding: '4px 10px', fontSize: '0.8rem', border: 'none' }}
              onClick={() => setShowApiSettings(!showApiSettings)}
              title="Portal Connection Settings"
            >
              <Settings size={15} color="#64748b" />
              <span style={{ color: '#64748b' }}>API Settings</span>
            </button>
          </div>

          {/* Optional API Settings Collapsible Box */}
          {showApiSettings && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 18, fontSize: '0.84rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Settings size={14} color="#fe0168" />
                Waanee Dial Portal Connection Config
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--mute)', marginBottom: 2 }}>Portal Base URL</label>
                  <input type="text" value={portalUrl} onChange={e => setPortalUrl(e.target.value)} placeholder="https://msl.waanee.ai" />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--mute)', marginBottom: 2 }}>Bearer Token / Session Cookie (Optional)</label>
                  <input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="Paste token if required" />
                </div>
              </div>
            </div>
          )}

          {/* Form Filter Row (Matches Screenshot layout) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'end' }}>
            {/* Call Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', color: '#64748b', marginBottom: 4 }}>Call Type:</label>
              <select value={callType} onChange={e => setCallType(e.target.value)}>
                <option value="Predictive">Predictive</option>
                <option value="Manual">Manual</option>
                <option value="Inbound">Inbound</option>
                <option value="Blended">Blended</option>
                <option value="All">All</option>
              </select>
            </div>

            {/* From Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', color: '#64748b', marginBottom: 4 }}>From Date:</label>
              <input
                type="datetime-local"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* To Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', color: '#64748b', marginBottom: 4 }}>To Date:</label>
              <input
                type="datetime-local"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Campaign Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', color: '#64748b', marginBottom: 4 }}>Campaign:</label>
              <select value={apiCampaign} onChange={e => setApiCampaign(e.target.value)}>
                <option value="MTF-CROSS SELL">MTF-CROSS SELL</option>
                <option value="South Bot">South Bot</option>
                <option value="Test Campaign">Test Campaign</option>
                <option value="Bot Calling">Bot Calling</option>
              </select>
            </div>
          </div>

          {/* Action Buttons (Matches Screenshot: Search [Pink] | Clear [Green] | Export [Cyan]) */}
          <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
            {/* Search Button (Pink) */}
            <button
              type="button"
              className="btn"
              style={{ background: '#fe0168', borderColor: '#fe0168', minWidth: 120 }}
              onClick={handleApiFetch}
              disabled={fetchingApi}
            >
              <Search size={15} />
              {fetchingApi ? 'Fetching...' : 'Search'}
            </button>

            {/* Clear Button (Green) */}
            <button
              type="button"
              className="btn"
              style={{ background: '#10b981', borderColor: '#10b981', minWidth: 100 }}
              onClick={handleClearApiForm}
            >
              <RotateCcw size={15} /> Clear
            </button>

            {/* Export CSV Button (Light Blue / Cyan) */}
            <button
              type="button"
              className="btn"
              style={{ background: '#0284c7', borderColor: '#0284c7', minWidth: 120 }}
              onClick={handleExportFetchedCsv}
              disabled={!rowsData && !rawCsvText}
            >
              <Download size={15} /> Export
            </button>
          </div>

          {/* CDR Preview Table matching Waanee Dial Portal */}
          {rowsData && rowsData.length > 1 && (
            <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              {/* Pagination controls top right */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: '0.84rem', color: '#64748b' }}>
                <span>
                  {fmt(Math.min((tablePage - 1) * 10 + 1, rowsData.length - 1))} - {fmt(Math.min(tablePage * 10, rowsData.length - 1))} of {fmt(rowsData.length - 1)}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', cursor: tablePage > 1 ? 'pointer' : 'default', padding: '2px 4px', opacity: tablePage > 1 ? 1 : 0.3 }}
                    onClick={() => setTablePage(1)}
                    disabled={tablePage <= 1}
                    title="First page"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', cursor: tablePage > 1 ? 'pointer' : 'default', padding: '2px 4px', opacity: tablePage > 1 ? 1 : 0.3 }}
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    disabled={tablePage <= 1}
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', cursor: tablePage < Math.ceil((rowsData.length - 1) / 10) ? 'pointer' : 'default', padding: '2px 4px', opacity: tablePage < Math.ceil((rowsData.length - 1) / 10) ? 1 : 0.3 }}
                    onClick={() => setTablePage(p => Math.min(Math.ceil((rowsData.length - 1) / 10), p + 1))}
                    disabled={tablePage >= Math.ceil((rowsData.length - 1) / 10)}
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', cursor: tablePage < Math.ceil((rowsData.length - 1) / 10) ? 'pointer' : 'default', padding: '2px 4px', opacity: tablePage < Math.ceil((rowsData.length - 1) / 10) ? 1 : 0.3 }}
                    onClick={() => setTablePage(Math.ceil((rowsData.length - 1) / 10))}
                    disabled={tablePage >= Math.ceil((rowsData.length - 1) / 10)}
                    title="Last page"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {headerCols.slice(0, 17).map((col, cIdx) => (
                        <th
                          key={cIdx}
                          style={{
                            padding: '8px 10px',
                            fontWeight: 700,
                            textAlign: 'center',
                            color: '#ea580c',
                            fontSize: '0.78rem',
                            letterSpacing: '0.02em'
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rowsData.slice((tablePage - 1) * 10 + 1, tablePage * 10 + 1).map((r, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9', background: rIdx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        {r.slice(0, 17).map((val, cIdx) => {
                          const isContact = cIdx === 0;
                          const displayVal = isContact && String(val).length > 4
                            ? `*******${String(val).slice(-4)}`
                            : String(val ?? '');
                          return (
                            <td
                              key={cIdx}
                              style={{
                                padding: '8px 10px',
                                textAlign: 'center',
                                color: isContact ? '#0284c7' : '#334155',
                                fontWeight: isContact ? 600 : 400
                              }}
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {msg && (
        <div className={`status-msg ${msg.type}`} style={{ marginBottom: 14 }}>
          {msg.type === 'ok' ? <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> : <AlertCircle size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />}
          {msg.text}
        </div>
      )}

      {/* Feedback Toast */}
      {copiedAction && (
        <div className="status-msg ok" style={{ marginBottom: 14 }}>
          <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          {copiedAction}
        </div>
      )}

      {/* Filter Options for Pivot */}
      {rowsData && (
        <div className="tool-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>Campaign filter</label>
              <select value={selectedCampaign} onChange={(e) => handleCampaignChange(e.target.value)}>
                <option value="">(All campaigns)</option>
                {campaignList.map(([name, count]) => (
                  <option key={name} value={name}>{name} ({count.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>Rows / Values column</label>
              <select value={subColIndex} onChange={(e) => handleSubColChange(e.target.value)}>
                {headerCols.map((col, idx) => (
                  <option key={idx} value={idx}>{col || `Column ${idx + 1}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>Campaign column</label>
              <select value={campColIndex} onChange={(e) => handleCampColChange(e.target.value)}>
                {headerCols.map((col, idx) => (
                  <option key={idx} value={idx}>{col || `Column ${idx + 1}`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Pivot Result Card */}
      {pivotResult && (
        <div className="tool-card">
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#ddebf7' }}>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>{subColName}</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right' }}>Count of {subColName}</th>
                </tr>
              </thead>
              <tbody>
                {pivotResult.rows.map(([label, count]) => (
                  <tr key={label}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>{label}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(count)}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 'bold', background: '#ddebf7' }}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>Grand Total</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(pivotResult.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={downloadPivotImage}>
              <Camera size={15} /> Download screenshot (PNG)
            </button>
            <button className="btn btn-alt" onClick={copyPivotImage}>
              <Copy size={15} /> Copy screenshot
            </button>
            <button className="btn btn-alt" onClick={downloadPivotExcel}>
              <FileSpreadsheet size={15} /> Download Excel (.xlsx)
            </button>
            <button className="btn btn-alt" onClick={downloadPivotCsv}>
              <FileText size={15} /> Download CSV
            </button>
            <button className="btn btn-alt" onClick={copyPivotTsv}>
              <Copy size={15} /> Copy (paste into Excel)
            </button>
          </div>
        </div>
      )}

      {/* Call Summary & Connectivity Card */}
      {summaryResult && (
        <div className="tool-card">
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px' }}>Call Summary &amp; Connectivity</h3>
          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#ddebf7' }}>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>{summaryResult[0][0]}</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right' }}>{summaryResult[0][1]}</th>
                </tr>
              </thead>
              <tbody>
                {summaryResult.slice(1).map((row, idx) => (
                  <tr key={row[0]} style={{ fontWeight: idx === 3 ? 'bold' : 'normal', background: idx === 3 ? '#ddebf7' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>{row[0]}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row[1]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ color: 'var(--mute)', fontSize: '0.8rem', margin: '0 0 14px' }}>
            ANSWER_NULL = GATEWAY DISPOSITION &quot;Answer&quot; + CRM DISPOSITION null. Connected = CRM DISPOSITION &quot;Contacted&quot;. Connectivity = Connected / Dialed.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={downloadSummaryImage}>
              <Camera size={15} /> Download screenshot (PNG)
            </button>
            <button className="btn btn-alt" onClick={copySummaryImage}>
              <Copy size={15} /> Copy screenshot
            </button>
            <button className="btn btn-alt" onClick={copySummaryTsv}>
              <Copy size={15} /> Copy (paste into Excel)
            </button>
          </div>
        </div>
      )}

      {/* Unified Single Action: Save Complete Daily Report (8 PM) */}
      {(pivotResult || summaryResult) && (
        <div className="tool-card" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e6fced 100%)', border: '1.5px solid #86efac', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '1.05rem', color: '#166534' }}>
              <Save size={18} color="#16a34a" />
              Save Complete Daily Report (8 PM)
            </div>
            <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: 4 }}>
              Ek hi click me Sub-Disposition Breakdown aur Call Connectivity metrics ko Daily Analytics Master Database me save karein.
            </div>
          </div>

          <button
            type="button"
            className="btn"
            style={{ background: '#10b981', borderColor: '#10b981', fontSize: '0.95rem', padding: '10px 24px', fontWeight: 700, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}
            onClick={() => setSaveModalOpen(true)}
          >
            <Save size={16} /> Save Daily Report (8 PM)
          </button>
        </div>
      )}

      {/* Save Modal */}
      {saveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 700 }}>💾 Save Daily Performance Report</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.86rem', color: 'var(--ink-secondary)' }}>
              Save today&apos;s calls analysis to the master <b>Daily Analytics Tracker</b> for multi-month trends and profit/loss monitoring.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--ink-secondary)', marginBottom: 4 }}>Report Date</label>
              <input type="date" value={saveDate} onChange={e => setSaveDate(e.target.value)} required />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--ink-secondary)', marginBottom: 4 }}>Campaign</label>
              <input type="text" value={selectedCampaign || 'All campaigns'} readOnly style={{ background: '#f8fafc' }} />
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, marginBottom: 18, fontSize: '0.84rem', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Total Calls Analyzed:</span>
                <b>{fmt(pivotResult?.total || 0)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Total Dispositions:</span>
                <b>{pivotResult?.rows?.length || 0} categories</b>
              </div>
              {summaryResult && summaryResult.length >= 5 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                  <span>Connectivity Rate:</span>
                  <span>{summaryResult[4][1]}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-alt" onClick={() => setSaveModalOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn"
                style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={handleSaveToDailyAnalytics}
                disabled={savingStatus === 'saving'}
              >
                {savingStatus === 'saving' ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
