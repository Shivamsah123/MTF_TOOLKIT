import React, { useState, useId } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

const HEAD = [
  "id", "full_name", "date_entered", "date_modified", "modified_user_id", "created_by", "description", "deleted", "assigned_user_id", "team_id", "phone_mobile", "date_start", "date_end", "parent_type", "status", "parent_id", "disposition", "sub_disposition", "ticket", "callback_time", "appointment_time", "call_id", "call_duration", "call_start_time", "call_end_time", "appointment_address1", "appointment_address2", "appointment_landmark", "appointment_city", "appointment_state", "appointment_pin_code", "call_attempt_number", "actual_callback", "duration_minutes", "direction", "duration", "parent_name", "time_to", "opportunity_id", "created_for", "dcr_id", "call_record", "confierance_agent_id", "confierance_agent_name", "confierance_agent_mobile", "confierance_call", "manual", "campaign_id", "leg_parent_id", "enquiry_id", "sheet_name", "project_name", "ai_disposition", "ai_sub_disposition", "ai_description", "budget", "configuration"
];

const BASE = [
  1, "Aman Gupta", "2026-10-31 20:15", "NULL", "NULL", 5, null, 0, 5, 3, "NULL", "NULL", "NULL", "Leads", "Held", 193868, "Contacted", "Connected to an executive", "NULL", "NULL", "NULL", "'09068437790-1793432838635-Leads-193868-7", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", 14, "NULL", "NULL", "Owlexa Outbound", "NULL", "NULL", "NULL", "NULL", "NULL", 0, "NULL", "NULL", "NULL", "NULL", "NULL", "No", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NA"
];

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const clean = v => v == null ? '' : String(v).trim();

export default function LeadToAnswerNullConverter() {
  const fileInputId = useId();
  const [fileName, setFileName] = useState('');
  const [wbIn, setWbIn] = useState(null);
  
  // Default to today or specific time
  const [dateTimeVal, setDateTimeVal] = useState(() => {
    const d = new Date();
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
  });

  const [msg, setMsg] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMsg({ type: 'info', text: 'Reading file...' });

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        setWbIn(wb);
        setMsg({ type: 'ok', text: `File ready: ${file.name}. Click Convert & Download.` });
      } catch (err) {
        setWbIn(null);
        setMsg({ type: 'err', text: 'Could not open file: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConvert = () => {
    if (!wbIn) return;

    try {
      const ws = wbIn.Sheets[wbIn.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

      const need = ['CUSTOMER NAME', 'RECORD ID', 'Remark', 'CALL ID', 'CALL ATTEMPT', 'CAMPAIGN NAME', 'GATEWAY DISPOSITION'];
      const miss = need.filter(c => !(rows.length && c in rows[0]));
      if (miss.length) {
        setMsg({ type: 'err', text: 'These columns were not found in the file: ' + miss.join(', ') });
        return;
      }

      const sel = rows.filter(r => (
        clean(r['Remark']) !== '' &&
        clean(r['CAMPAIGN NAME']) === 'MTF-CROSS SELL' &&
        clean(r['GATEWAY DISPOSITION']) === 'ANSWER'
      ));

      if (!sel.length) {
        setMsg({ type: 'warn', text: 'No rows matched the filter (Remark filled + MTF-CROSS SELL + ANSWER).' });
        return;
      }

      const ix = n => HEAD.indexOf(n);
      let serial = null;
      if (dateTimeVal) {
        const m = dateTimeVal.match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+)/);
        if (m) {
          serial = (Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) - Date.UTC(1899, 11, 30)) / 864e5;
        }
      }

      const out = [HEAD];
      sel.forEach((r, i) => {
        const a = BASE.slice();
        a[ix('id')] = i + 1;
        a[ix('full_name')] = r['CUSTOMER NAME'];
        a[ix('parent_id')] = r['RECORD ID'];
        a[ix('sub_disposition')] = clean(r['Remark']);
        a[ix('call_id')] = r['CALL ID'];
        a[ix('call_attempt_number')] = r['CALL ATTEMPT'];
        a[ix('date_entered')] = serial;
        out.push(a);
      });

      const outSheet = XLSX.utils.aoa_to_sheet(out);
      const cIdx = ix('date_entered');
      for (let r = 1; r < out.length; r++) {
        const cell = outSheet[XLSX.utils.encode_cell({ r, c: cIdx })];
        if (cell) {
          cell.t = 'n';
          cell.z = 'dd/mm/yyyy hh:mm';
        }
      }

      const wbOut = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wbOut, outSheet, 'Sheet1');

      let d = null;
      const cs = sel[0]['CALL START TIME'];
      if (typeof cs === 'number') {
        d = new Date(Date.UTC(1899, 11, 30) + Math.round(cs * 864e5));
      } else if (cs) {
        const t = new Date(cs);
        if (!isNaN(t)) d = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
      }
      if (!d && dateTimeVal) {
        const m = dateTimeVal.match(/(\d+)-(\d+)-(\d+)/);
        if (m) d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3]));
      }

      const outName = d
        ? `${String(d.getUTCDate()).padStart(2, '0')}_${MON[d.getUTCMonth()]}_MTF_ANSWER_NULL.xlsx`
        : 'MTF_ANSWER_NULL.xlsx';

      XLSX.writeFile(wbOut, outName);
      setMsg({ type: 'ok', text: `${sel.length.toLocaleString()} rows converted. Downloaded: ${outName}` });
    } catch (err) {
      setMsg({ type: 'err', text: 'Error: ' + err.message });
    }
  };

  return (
    <div className="tool-wrapper">
      <div className="tool-header">
        <h2 className="tool-title">Answer Null Lead Data</h2>
        <p className="tool-subtitle">Upload the Lead Data (.xlsx) file and generate the standardized Answer Null CRM dataset.</p>
      </div>

      <div className="tool-card" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="step-indicator">
          <span className="step-num">1</span>
          <span>Upload Lead Data File</span>
        </div>

        <label htmlFor={fileInputId} className={`dropzone ${wbIn ? 'loaded' : ''}`}>
          <Upload className="dropzone-icon" style={{ strokeWidth: 1.5, width: 32, height: 32, margin: '0 auto 8px' }} />
          <div className="dropzone-text">{fileName || 'Drop Excel file here or click to browse'}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>Supports .xlsx, .xls</span>
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        <div style={{ marginTop: 18 }}>
          <label style={{ display: 'block', fontSize: '0.86rem', color: 'var(--mute)', marginBottom: 6 }}>
            <code>date_entered</code> timestamp (all other columns stay standard)
          </label>
          <input
            type="datetime-local"
            value={dateTimeVal}
            onChange={(e) => setDateTimeVal(e.target.value)}
          />
        </div>

        <button
          className="btn"
          style={{ width: '100%', marginTop: 20, padding: 12, fontSize: '0.98rem' }}
          onClick={handleConvert}
          disabled={!wbIn}
        >
          <FileSpreadsheet size={17} /> Convert &amp; Download XLSX
        </button>

        {msg && (
          <div className={`status-msg ${msg.type}`} style={{ marginTop: 16 }}>
            {msg.type === 'ok' ? <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> : <AlertCircle size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />}
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}

