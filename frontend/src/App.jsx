import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Login from './components/Login';

// Independent converters
import DispositionRemarkConverter from './tools/1-DispositionRemark';
import ExcelToJsonConverter from './tools/2-ExcelToJson';
import ApiRequestSender from './tools/3-ApiSender';
import DownloadAnswerNullCdr from './tools/4-AnswerNullCdr';
import LeadToAnswerNullConverter from './tools/5-LeadToAnswerNull';
import SubDispositionPivotConverter from './tools/6-SubDispositionPivot';
import DailyAnalyticsTracker from './tools/7-DailyAnalyticsTracker';

const TOOLS = [
  {
    id: 'disposition-remark',
    title: 'Disposition Remark Converter',
    shortTitle: 'Disposition Remarks',
    desc: 'CSV filter & remarks pairing',
    component: DispositionRemarkConverter
  },
  {
    id: 'excel-to-json',
    title: 'Excel to JSON Converter',
    shortTitle: 'Excel to JSON',
    desc: 'Convert Excel/CSV to dialer JSON',
    component: ExcelToJsonConverter
  },
  {
    id: 'api-sender',
    title: 'API Request Sender',
    shortTitle: 'API Request Sender',
    desc: 'Forward JSON to REST APIs',
    component: ApiRequestSender
  },
  {
    id: 'answer-null-cdr',
    title: 'Download Answer Null CDR',
    shortTitle: 'Answer Null CDR',
    desc: 'Filter Answered null calls',
    component: DownloadAnswerNullCdr
  },
  {
    id: 'lead-to-answer-null',
    title: 'Answer Null Lead Data',
    shortTitle: 'Answer Null Leads',
    desc: 'CRM 57-columns standard export',
    component: LeadToAnswerNullConverter
  },
  {
    id: 'sub-disposition-pivot',
    title: 'Sub-Disposition Pivot',
    shortTitle: 'Sub-Disposition Pivot',
    desc: 'Pivot analytics & connectivity',
    component: SubDispositionPivotConverter
  },
  {
    id: 'daily-analytics',
    title: 'Daily Analytics & Trends Tracker',
    shortTitle: 'Daily Analytics',
    desc: '2–3 months trends & daily report',
    component: DailyAnalyticsTracker
  }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [activeToolIndex, setActiveToolIndex] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    const num = parseInt(hash, 10);
    if (!isNaN(num) && num >= 1 && num <= TOOLS.length) {
      return num - 1;
    }
    return 0;
  });

  // Check server session on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setSession({ user: data.user || 'Administrator' });
        } else {
          setSession(null);
        }
      } catch {
        setSession(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    verifyAuth();
  }, []);

  const handleSelectTool = (idx) => {
    setActiveToolIndex(idx);
    window.location.hash = `#${idx + 1}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {}
    setSession(null);
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const num = parseInt(hash, 10);
      if (!isNaN(num) && num >= 1 && num <= TOOLS.length) {
        setActiveToolIndex(num - 1);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#edf1f8' }}>
        <div style={{ color: '#5b6b79', fontSize: '1.05rem', fontWeight: 600 }}>Loading Waanee CDR Suite...</div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={setSession} />;
  }

  const activeTool = TOOLS[activeToolIndex];
  const ActiveComponent = activeTool.component;

  return (
    <div className="waanee-app-container">
      <Header
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeToolTitle={activeTool.title}
        sessionUser={session?.user}
        onLogout={handleLogout}
      />
      <div className={`waanee-app-layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
        <Sidebar
          tools={TOOLS}
          activeIndex={activeToolIndex}
          onSelectTool={handleSelectTool}
          collapsed={sidebarCollapsed}
        />
        <main className="waanee-main-content">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
