import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  Plus,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  Percent,
  AlertCircle,
  HelpCircle,
  Cloud,
  HardDrive
} from 'lucide-react';

const fmt = n => Number(n || 0).toLocaleString('en-IN');
const fmtPct = n => Number(n || 0).toFixed(2) + '%';

export default function DailyAnalyticsTracker() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sourceType, setSourceType] = useState('local'); // 'supabase' | 'local'

  // Filters
  const [dateFilter, setDateFilter] = useState('90'); // '7' | '30' | '90' | 'all'
  const [selectedCampaign, setSelectedCampaign] = useState('ALL');

  // Manual entry modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualCampaign, setManualCampaign] = useState('MTF-CROSS SELL');
  const [manualDialed, setManualDialed] = useState('');
  const [manualConnected, setManualConnected] = useState('');
  const [manualAnswerNull, setManualAnswerNull] = useState('');

  // Fetch reports from backend / localStorage fallback
  const fetchReports = async () => {
    setLoading(true);
    setErrorMsg('');

    // 1. Instantly load from local storage so user sees their saved reports without delay
    let localList = [];
    try {
      const raw = localStorage.getItem('cdr_master_daily_reports') || localStorage.getItem('cdr_daily_analytics_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localList = parsed;
          setReports(localList);
        }
      }
    } catch {}

    // 2. Query server / Supabase
    try {
      const res = await fetch('/api/analytics', {
        method: 'GET',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const serverList = Array.isArray(data.reports) ? data.reports : [];
        const isSupabase = data.source === 'supabase';
        setSourceType(isSupabase ? 'supabase' : 'local');

        // Merge local and server reports by id so neither is ever lost!
        const mergedMap = new Map();
        localList.forEach(r => { if (r && r.id) mergedMap.set(r.id, r); });
        serverList.forEach(r => { if (r && r.id) mergedMap.set(r.id, r); });

        const finalList = Array.from(mergedMap.values()).sort((a, b) => (b.report_date || '').localeCompare(a.report_date || ''));

        setReports(finalList);

        // Save merged list permanently in browser storage
        try {
          localStorage.setItem('cdr_master_daily_reports', JSON.stringify(finalList));
          localStorage.setItem('cdr_daily_analytics_cache', JSON.stringify(finalList));
        } catch {}
      } else {
        throw new Error('Server returned error status');
      }
    } catch (err) {
      if (localList.length === 0) {
        setErrorMsg('No saved reports found yet. Analyze CDR and click Save Daily Report (8 PM) in Tool 6.');
      } else {
        setSourceType('local');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const triggerToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Distinct campaigns in dataset
  const campaignsList = useMemo(() => {
    const set = new Set();
    reports.forEach(r => {
      if (r.campaign) set.add(r.campaign);
    });
    return Array.from(set);
  }, [reports]);

  // Distinct sub-dispositions keys across all records
  const allSubDispositions = useMemo(() => {
    const keys = new Set();
    reports.forEach(r => {
      if (r.dispositions && typeof r.dispositions === 'object') {
        Object.keys(r.dispositions).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys).sort();
  }, [reports]);

  // Filtered dataset
  const filteredReports = useMemo(() => {
    let list = [...reports];

    // Filter by campaign
    if (selectedCampaign !== 'ALL') {
      list = list.filter(r => r.campaign === selectedCampaign);
    }

    // Filter by date range
    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.filter(r => (r.report_date || '') >= cutoffStr);
    }

    return list.sort((a, b) => (b.report_date || '').localeCompare(a.report_date || ''));
  }, [reports, selectedCampaign, dateFilter]);

  // Aggregate Metrics for KPI Cards
  const kpiStats = useMemo(() => {
    let totalDialed = 0;
    let totalConnected = 0;
    let totalAnswerNull = 0;

    filteredReports.forEach(r => {
      totalDialed += Number(r.dialed || 0);
      totalConnected += Number(r.connected || 0);
      totalAnswerNull += Number(r.answer_null || 0);
    });

    const avgConnectivity = totalDialed > 0 ? (totalConnected / totalDialed) * 100 : 0;

    return {
      totalDialed,
      totalConnected,
      avgConnectivity,
      totalAnswerNull,
      daysCount: filteredReports.length
    };
  }, [filteredReports]);

  // Trend data sorted chronologically (oldest to newest) for chart
  const chronologicalData = useMemo(() => {
    return [...filteredReports].sort((a, b) => (a.report_date || '').localeCompare(b.report_date || ''));
  }, [filteredReports]);

  // Delete a report
  const handleDelete = async (id, date) => {
    if (!window.confirm(`Are you sure you want to delete the report for ${date}?`)) return;

    try {
      await fetch(`/api/analytics?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Server delete error:', e);
    }

    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
    try {
      localStorage.setItem('cdr_master_daily_reports', JSON.stringify(updated));
      localStorage.setItem('cdr_daily_analytics_cache', JSON.stringify(updated));
    } catch {}
    triggerToast(`Report for ${date} removed.`);
  };

  // Add Manual Report
  const handleSaveManual = async (e) => {
    e.preventDefault();
    const d = parseInt(manualDialed || 0, 10);
    const c = parseInt(manualConnected || 0, 10);
    const an = parseInt(manualAnswerNull || 0, 10);
    const conn = d > 0 ? ((c / d) * 100).toFixed(2) : 0;

    const id = `${manualDate}_${manualCampaign.replace(/[^\w-]+/g, '_')}`;
    const payload = {
      id,
      report_date: manualDate,
      campaign: manualCampaign,
      dialed: d,
      connected: c,
      connectivity: Number(conn),
      answer_null: an,
      dispositions: {},
      created_at: new Date().toISOString()
    };

    // Save in browser storage immediately
    try {
      const stored = localStorage.getItem('cdr_master_daily_reports');
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];
      const exIdx = list.findIndex(r => r.id === id);
      if (exIdx >= 0) list[exIdx] = payload;
      else list.unshift(payload);
      localStorage.setItem('cdr_master_daily_reports', JSON.stringify(list));
      localStorage.setItem('cdr_daily_analytics_cache', JSON.stringify(list));
    } catch {}

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
    } catch (err) {
      console.warn('Server save error:', err);
    }

    setShowAddModal(false);
    triggerToast(`Saved report for ${manualDate}!`);
    fetchReports();
  };

  // Export Complete Master Excel File (.xlsx)
  const exportMasterExcel = () => {
    if (!filteredReports.length) {
      alert('No data available to export.');
      return;
    }

    const rows = filteredReports.map(r => {
      const o = {
        'Date': r.report_date,
        'Campaign': r.campaign || 'All campaigns',
        'Total Dialed': r.dialed,
        'Connected Calls': r.connected,
        'Connectivity %': r.connectivity ? r.connectivity + '%' : '0.00%',
        'ANSWER_NULL Calls': r.answer_null
      };

      // Add each sub-disposition column
      allSubDispositions.forEach(dispKey => {
        o[dispKey] = r.dispositions?.[dispKey] || 0;
      });

      return o;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily_Analytics');

    const fileName = `CDR_Daily_Analytics_${dateFilter === 'all' ? 'All_Time' : 'Last_' + dateFilter + '_Days'}.xlsx`;
    XLSX.writeFile(wb, fileName);
    triggerToast(`Exported ${fileName}`);
  };

  // Export CSV
  const exportMasterCsv = () => {
    if (!filteredReports.length) return;
    const cols = ['Date', 'Campaign', 'Total Dialed', 'Connected Calls', 'Connectivity %', 'ANSWER_NULL Calls', ...allSubDispositions];
    const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;

    const lines = [
      cols.map(q).join(','),
      ...filteredReports.map(r => {
        const row = [
          r.report_date,
          r.campaign,
          r.dialed,
          r.connected,
          r.connectivity ? r.connectivity + '%' : '0.00%',
          r.answer_null,
          ...allSubDispositions.map(d => r.dispositions?.[d] || 0)
        ];
        return row.map(q).join(',');
      })
    ].join('\r\n');

    const blob = new Blob(['\ufeff' + lines], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CDR_Daily_Analytics_${dateFilter}_Days.csv`;
    a.click();
    triggerToast('CSV file downloaded.');
  };

  // Maximum value for chart bar scaling
  const maxDialedInChart = Math.max(1, ...chronologicalData.map(d => Number(d.dialed || 0)));

  return (
    <div className="tool-wrapper">
      {/* Header & Title */}
      <div className="tool-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 className="tool-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={24} color="#fe0168" />
            Daily Analytics &amp; Trends Tracker
          </h2>
          <p className="tool-subtitle">
            2–3 Months historical call analysis, daily comparisons, connectivity trends &amp; profit/loss overview.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={exportMasterExcel} disabled={!filteredReports.length}>
            <FileSpreadsheet size={16} /> Export Master Excel
          </button>
          <button className="btn btn-alt" onClick={exportMasterCsv} disabled={!filteredReports.length}>
            <FileText size={16} /> Export CSV
          </button>
          <button className="btn btn-alt" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Entry
          </button>
          <button className="btn btn-alt" onClick={fetchReports} title="Reload latest data">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="status-msg ok" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="status-msg warn" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          {errorMsg}
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="tool-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Date range filter buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Calendar size={16} color="#5b6b79" />
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink-secondary)' }}>Range:</span>
            {[
              ['7', 'Last 7 Days'],
              ['30', 'Last 30 Days'],
              ['90', 'Last 3 Months'],
              ['all', 'All Time']
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`btn ${dateFilter === val ? '' : 'btn-alt'}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setDateFilter(val)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Campaign Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="#5b6b79" />
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink-secondary)' }}>Campaign:</span>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              style={{ width: 'auto', minWidth: 160, padding: '6px 10px', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Campaigns</option>
              {campaignsList.map(camp => (
                <option key={camp} value={camp}>{camp}</option>
              ))}
            </select>
          </div>

          {/* Cloud / Storage Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748b' }}>
            {sourceType === 'supabase' ? (
              <>
                <Cloud size={15} color="#10b981" />
                <span>Cloud Synced (Supabase)</span>
              </>
            ) : (
              <>
                <HardDrive size={15} color="#3b82f6" />
                <span>Local &amp; Server Storage</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Card 1: Total Dialed */}
        <div className="tool-card" style={{ margin: 0, padding: 18, borderLeft: '4px solid #1f2d4d' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
            Total Dialed Calls
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1f2d4d', marginTop: 4 }}>
            {fmt(kpiStats.totalDialed)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
            Across {kpiStats.daysCount} recorded days
          </div>
        </div>

        {/* Card 2: Total Connected */}
        <div className="tool-card" style={{ margin: 0, padding: 18, borderLeft: '4px solid #fe0168' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
            Connected Calls
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fe0168', marginTop: 4 }}>
            {fmt(kpiStats.totalConnected)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
            CRM Contacted calls
          </div>
        </div>

        {/* Card 3: Average Connectivity */}
        <div className="tool-card" style={{ margin: 0, padding: 18, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
            Avg. Connectivity Rate
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981', marginTop: 4 }}>
            {fmtPct(kpiStats.avgConnectivity)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
            Connected ÷ Total Dialed
          </div>
        </div>

        {/* Card 4: Answer Null */}
        <div className="tool-card" style={{ margin: 0, padding: 18, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
            ANSWER_NULL Calls
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
            {fmt(kpiStats.totalAnswerNull)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
            Gateway Answer &amp; CRM Null
          </div>
        </div>
      </div>

      {/* Visual Chart: Daily Calls & Connectivity Trend */}
      {chronologicalData.length > 0 ? (
        <div className="tool-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
              📅 Daily Call Volume &amp; Connectivity Rate Trends
            </h3>
            <div style={{ display: 'flex', gap: 14, fontSize: '0.82rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: '#1f2d4d', borderRadius: 2 }} /> Dialed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: '#fe0168', borderRadius: 2 }} /> Connected
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 3, background: '#10b981', borderRadius: 2 }} /> Connectivity %
              </span>
            </div>
          </div>

          {/* SVG / Pure HTML Interactive Bar Chart */}
          <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
            <div style={{ minWidth: Math.max(680, chronologicalData.length * 68), height: 260, display: 'flex', alignItems: 'flex-end', gap: 16, borderBottom: '1px solid #e2e8f0', padding: '0 10px 10px' }}>
              {chronologicalData.map(item => {
                const dialedHeight = Math.max(8, (Number(item.dialed || 0) / maxDialedInChart) * 190);
                const connectedHeight = Math.max(4, (Number(item.connected || 0) / maxDialedInChart) * 190);
                const connRate = Number(item.connectivity || 0);

                return (
                  <div
                    key={item.id || item.report_date}
                    style={{ flex: 1, minWidth: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                    title={`${item.report_date}\nDialed: ${fmt(item.dialed)}\nConnected: ${fmt(item.connected)}\nConnectivity: ${fmtPct(item.connectivity)}`}
                  >
                    {/* Connectivity badge on top */}
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#10b981', marginBottom: 6 }}>
                      {connRate.toFixed(1)}%
                    </span>

                    {/* Bars container */}
                    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 190 }}>
                      <div
                        style={{
                          width: 16,
                          height: dialedHeight,
                          background: '#1f2d4d',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease'
                        }}
                      />
                      <div
                        style={{
                          width: 16,
                          height: connectedHeight,
                          background: '#fe0168',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease'
                        }}
                      />
                    </div>

                    {/* Date label */}
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 8, whiteSpace: 'nowrap' }}>
                      {item.report_date ? item.report_date.slice(5) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="tool-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', marginBottom: 20 }}>
          <Calendar size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ margin: '0 0 6px', color: 'var(--ink-primary)' }}>No Reports Saved Yet</h4>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            Upload your CSV in <b>Sub-Disposition Pivot</b> and click &quot;Save Daily Report&quot; at 8 PM, or use &quot;Add Entry&quot; above.
          </p>
        </div>
      )}

      {/* Historical Master Comparison Table */}
      <div className="tool-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
            📊 Historical Calls Master Table ({filteredReports.length} Days)
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
            Showing 2–3 Months Consolidated Breakdown
          </span>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: 520 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-light)', textAlign: 'left', minWidth: 100 }}>Date</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-light)', textAlign: 'left', minWidth: 140 }}>Campaign</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-light)', textAlign: 'right', minWidth: 90 }}>Dialed</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-light)', textAlign: 'right', minWidth: 90 }}>Connected</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-light)', textAlign: 'right', minWidth: 110 }}>Connectivity</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-light)', textAlign: 'right', minWidth: 100 }}>Answer Null</th>
                {allSubDispositions.map(key => (
                  <th key={key} style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-light)', textAlign: 'right', minWidth: 110 }}>
                    {key}
                  </th>
                ))}
                <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-light)', textAlign: 'center', width: 60 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7 + allSubDispositions.length} style={{ padding: '28px', textAlign: 'center', color: '#94a3b8' }}>
                    No records found for this filter range.
                  </td>
                </tr>
              ) : (
                filteredReports.map((row) => {
                  const conn = Number(row.connectivity || 0);
                  const isHigh = conn >= 15;
                  const isMedium = conn >= 8 && conn < 15;

                  return (
                    <tr key={row.id || row.report_date} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.report_date}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--ink-secondary)' }}>{row.campaign}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {fmt(row.dialed)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#fe0168', fontWeight: 600 }}>
                        {fmt(row.connected)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: isHigh ? 'var(--ok-soft)' : isMedium ? 'var(--warn-soft)' : 'var(--err-soft)',
                            color: isHigh ? 'var(--ok)' : isMedium ? 'var(--warn)' : 'var(--err)'
                          }}
                        >
                          {fmtPct(row.connectivity)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#f59e0b' }}>
                        {fmt(row.answer_null)}
                      </td>

                      {/* Dynamic Sub-Dispositions counts */}
                      {allSubDispositions.map(k => (
                        <td key={k} style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#334155' }}>
                          {row.dispositions?.[k] ? fmt(row.dispositions[k]) : '—'}
                        </td>
                      ))}

                      {/* Delete action */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id, row.report_date)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
                          title="Delete entry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 700 }}>Add Daily Call Summary</h3>
            <form onSubmit={handleSaveManual}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', color: '#64748b', marginBottom: 4 }}>Date</label>
                <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', color: '#64748b', marginBottom: 4 }}>Campaign</label>
                <input type="text" value={manualCampaign} onChange={e => setManualCampaign(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: '#64748b', marginBottom: 4 }}>Total Dialed</label>
                  <input type="number" value={manualDialed} onChange={e => setManualDialed(e.target.value)} placeholder="e.g. 520" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: '#64748b', marginBottom: 4 }}>Connected</label>
                  <input type="number" value={manualConnected} onChange={e => setManualConnected(e.target.value)} placeholder="e.g. 84" required />
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', color: '#64748b', marginBottom: 4 }}>ANSWER_NULL Calls</label>
                <input type="number" value={manualAnswerNull} onChange={e => setManualAnswerNull(e.target.value)} placeholder="e.g. 18" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-alt" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

