import React, { useState, useId } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const norm = v => String(v == null ? '' : v).trim().toUpperCase().replace(/[_\-\s]+/g, ' ');
const isNull = v => ['', 'null', 'nan', 'none'].includes(String(v == null ? '' : v).trim().toLowerCase());

export default function DownloadAnswerNullCdr() {
  const fileInputId = useId();
  const [fileName, setFileName] = useState('');
  const [baseName, setBaseName] = useState('output');
  const [rawRows, setRawRows] = useState(null);
  const [headerCols, setHeaderCols] = useState([]);

  const [campaign, setCampaign] = useState('MTF-CROSS SELL');
  const [gatewayDisp, setGatewayDisp] = useState('ANSWER');
  const [crmMode, setCrmMode] = useState('filter'); // 'filter' | 'clear' | 'none'

  const [filterSteps, setFilterSteps] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewCols, setPreviewCols] = useState([]);
  const [msg, setMsg] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      setMsg({ type: 'err', text: 'Only .csv files are supported. If you have an Excel file, save it as CSV first.' });
      return;
    }

    setFileName(file.name);
    setBaseName(file.name.replace(/\.[^.]+$/, ''));
    setMsg({ type: 'info', text: 'Reading file...' });

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const wb = XLSX.read(text, { type: 'string', raw: true });
        const sheetName = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });

        if (!data || !data.length) throw new Error('File is empty.');

        const h = data[0].map(x => String(x ?? '').trim());
        const miss = ['CAMPAIGN NAME', 'GATEWAY DISPOSITION', 'CRM DISPOSITION'].filter(x => !h.includes(x));
        if (miss.length) {
          throw new Error('These required columns were not found in the file: ' + miss.join(', '));
        }

        setRawRows(data);
        setHeaderCols(h);
        setFilterSteps([]);
        setPreviewRows([]);
        setMsg({
          type: 'ok',
          text: `Loaded: ${file.name} (${(data.length - 1).toLocaleString()} data rows, ${h.length} columns)`
        });
      } catch (err) {
        setRawRows(null);
        setHeaderCols([]);
        setMsg({ type: 'err', text: err.message || 'Failed to read file.' });
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleConvertAndDownload = () => {
    if (!rawRows || rawRows.length < 2) return;

    try {
      const h = headerCols;
      const ci = h.indexOf('CAMPAIGN NAME');
      const gi = h.indexOf('GATEWAY DISPOSITION');
      const ri = h.indexOf('CRM DISPOSITION');

      let d = rawRows.slice(1).filter(r => r.length > 1 && r.some(c => String(c ?? '').trim() !== ''));
      const steps = [['Total', d.length]];

      if (campaign.trim()) {
        d = d.filter(r => norm(r[ci]) === norm(campaign));
      }
      steps.push(['Campaign', d.length]);

      if (gatewayDisp.trim()) {
        d = d.filter(r => norm(r[gi]) === norm(gatewayDisp));
      }
      steps.push(['Gateway', d.length]);

      if (crmMode === 'filter') {
        d = d.filter(r => isNull(r[ri]));
      } else if (crmMode === 'clear') {
        d = d.map(r => {
          const c = r.slice();
          c[ri] = '';
          return c;
        });
      }
      steps.push(['Final', d.length]);
      setFilterSteps(steps);

      if (!d.length) {
        setPreviewRows([]);
        setMsg({ type: 'warn', text: 'No rows left after filtering. Please verify Campaign and Gateway spelling.' });
        return;
      }

      // Preview top 5 rows
      const targetCols = ['CUSTOMER NAME', 'CAMPAIGN NAME', 'GATEWAY DISPOSITION', 'CRM DISPOSITION'].filter(c => h.includes(c));
      setPreviewCols(targetCols);
      setPreviewRows(d.slice(0, 5));

      // Build XLSX
      const aoa = [h, ...d];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Filtered');

      const outName = `${baseName}_filtered.xlsx`;
      XLSX.writeFile(wb, outName);

      setMsg({
        type: 'ok',
        text: `Successfully downloaded ${outName} (${d.length.toLocaleString()} rows)`
      });
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Conversion failed.' });
    }
  };

  return (
    <div className="tool-wrapper">
      <div className="tool-header">
        <h2 className="tool-title">Download Answer Null CDR</h2>
        <p className="tool-subtitle">Upload a CDR CSV, filter Answered calls with null disposition, and export to Excel (.xlsx).</p>
      </div>

      {/* Step 1: Upload */}
      <div className="tool-card">
        <div className="step-indicator">
          <span className="step-num">1</span>
          <span>Choose a file</span>
        </div>
        <label htmlFor={fileInputId} className={`dropzone ${rawRows ? 'loaded' : ''}`}>
          <Upload className="dropzone-icon" style={{ strokeWidth: 1.5, width: 32, height: 32, margin: '0 auto 8px' }} />
          <div className="dropzone-text">{fileName || 'Drop a CSV file here or click to browse'}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>Accepts CDR .csv</span>
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        {msg && (
          <div className={`status-msg ${msg.type}`} style={{ marginTop: 10 }}>
            {msg.type === 'ok' ? <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> : <AlertCircle size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />}
            {msg.text}
          </div>
        )}
      </div>

      {/* Step 2: Filters */}
      <div className={`tool-card ${!rawRows ? 'disabled' : ''}`}>
        <div className="step-indicator">
          <span className="step-num">2</span>
          <span>Filters</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>CAMPAIGN NAME</label>
            <input
              type="text"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 4 }}>GATEWAY DISPOSITION</label>
            <input
              type="text"
              value={gatewayDisp}
              onChange={(e) => setGatewayDisp(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 6 }}>CRM DISPOSITION</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                border: '1px solid var(--line)',
                borderRadius: 8,
                background: crmMode === 'filter' ? 'var(--accent-soft)' : '#fff',
                borderColor: crmMode === 'filter' ? 'var(--accent)' : 'var(--line)',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="crmMode"
                value="filter"
                checked={crmMode === 'filter'}
                onChange={() => setCrmMode('filter')}
                style={{ marginTop: 3 }}
              />
              <div>
                <b style={{ display: 'block', fontSize: '0.92rem' }}>Keep null rows only</b>
                <span style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>Only rows where CRM DISPOSITION is empty / null</span>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                border: '1px solid var(--line)',
                borderRadius: 8,
                background: crmMode === 'clear' ? 'var(--accent-soft)' : '#fff',
                borderColor: crmMode === 'clear' ? 'var(--accent)' : 'var(--line)',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="crmMode"
                value="clear"
                checked={crmMode === 'clear'}
                onChange={() => setCrmMode('clear')}
                style={{ marginTop: 3 }}
              />
              <div>
                <b style={{ display: 'block', fontSize: '0.92rem' }}>Clear the column</b>
                <span style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>Keep all rows, set CRM DISPOSITION to empty</span>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                border: '1px solid var(--line)',
                borderRadius: 8,
                background: crmMode === 'none' ? 'var(--accent-soft)' : '#fff',
                borderColor: crmMode === 'none' ? 'var(--accent)' : 'var(--line)',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="crmMode"
                value="none"
                checked={crmMode === 'none'}
                onChange={() => setCrmMode('none')}
                style={{ marginTop: 3 }}
              />
              <div>
                <b style={{ display: 'block', fontSize: '0.92rem' }}>Do nothing</b>
                <span style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>CRM DISPOSITION stays unchanged</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Step 3: Convert */}
      <div className={`tool-card ${!rawRows ? 'disabled' : ''}`}>
        <div className="step-indicator">
          <span className="step-num">3</span>
          <span>Convert &amp; Download</span>
        </div>

        <button className="btn" style={{ width: '100%', padding: '12px', fontSize: '1rem' }} onClick={handleConvertAndDownload}>
          <FileSpreadsheet size={18} /> Convert &amp; Download XLSX
        </button>

        {/* Step chips */}
        {filterSteps.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {filterSteps.map(([label, count], idx) => (
              <div
                key={label}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: idx === filterSteps.length - 1 ? 'var(--accent)' : 'var(--accent-soft)',
                  color: idx === filterSteps.length - 1 ? '#fff' : 'var(--mute)',
                  fontSize: '0.84rem'
                }}
              >
                <div>{label}</div>
                <b style={{ fontSize: '1.15rem', color: idx === filterSteps.length - 1 ? '#fff' : 'var(--ink)' }}>
                  {count.toLocaleString()}
                </b>
              </div>
            ))}
          </div>
        )}

        {/* Preview table */}
        {previewRows.length > 0 && (
          <div style={{ marginTop: 18, overflowX: 'auto' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--mute)', marginBottom: 6 }}>
              Preview (First 5 Rows):
            </span>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--accent-soft)' }}>
                  {previewCols.map(c => (
                    <th key={c} style={{ border: '1px solid var(--line)', padding: '6px 10px', textAlign: 'left' }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i}>
                    {previewCols.map(c => (
                      <td key={c} style={{ border: '1px solid var(--line)', padding: '6px 10px' }}>
                        {r[headerCols.indexOf(c)] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

