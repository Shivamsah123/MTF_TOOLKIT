import React, { useState } from 'react';
import { Send, FileJson, Sparkles, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight } from 'lucide-react';

export default function ApiRequestSender() {
  const [method, setMethod] = useState('POST');
  const [url, setUrl] = useState('');
  
  const [authType, setAuthType] = useState('bearer');
  const [authToken, setAuthToken] = useState('');
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authKeyName, setAuthKeyName] = useState('x-api-key');

  const [headersText, setHeadersText] = useState('{\n  "Content-Type": "application/json"\n}');
  const [bodyText, setBodyText] = useState('{\n  "name": "test"\n}');

  const [sending, setSending] = useState(false);
  const [responseTab, setResponseTab] = useState('body');
  const [lastResponse, setLastResponse] = useState(null);

  const isModifying = ['PUT', 'PATCH', 'DELETE', 'POST'].includes(method);

  const handleLoadFromConverter = () => {
    try {
      const saved = localStorage.getItem('cdr_toolkit_last_json');
      if (saved && saved.trim()) {
        setBodyText(saved);
      } else {
        alert('No converted JSON found. Convert a file in "Excel to JSON" first.');
      }
    } catch {
      alert('Unable to load from storage.');
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(bodyText);
      setBodyText(JSON.stringify(parsed, null, 2));
    } catch (e) {
      alert('Body is not valid JSON: ' + e.message);
    }
  };

  const handleSend = async () => {
    if (!url.trim()) {
      alert('Please enter a target URL.');
      return;
    }

    let parsedHeaders = {};
    try {
      parsedHeaders = headersText.trim() ? JSON.parse(headersText) : {};
    } catch (e) {
      alert('Headers are not valid JSON: ' + e.message);
      return;
    }

    // Apply authorization
    if (authType === 'bearer' && authToken.trim()) {
      parsedHeaders['Authorization'] = `Bearer ${authToken.trim()}`;
    } else if (authType === 'basic') {
      const encoded = btoa(`${authUser}:${authPass}`);
      parsedHeaders['Authorization'] = `Basic ${encoded}`;
    } else if (authType === 'apikey' && authToken.trim()) {
      parsedHeaders[authKeyName.trim() || 'x-api-key'] = authToken.trim();
    }

    const reqBody = ['GET', 'HEAD'].includes(method) ? undefined : bodyText;

    setSending(true);
    const start = performance.now();

    try {
      // First attempt via /api/send proxy (if backend exists)
      let res;
      try {
        res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.trim(),
            method,
            headers: parsedHeaders,
            body: reqBody
          })
        });
      } catch (proxyErr) {
        // Fallback: direct browser fetch
        res = null;
      }

      if (res && res.ok) {
        const data = await res.json();
        setLastResponse(data);
      } else if (res && res.status === 401) {
        setLastResponse({
          error: 'Session expired or unauthorized. Please re-login.'
        });
      } else {
        // Fallback directly to the target URL
        const directRes = await fetch(url.trim(), {
          method,
          headers: parsedHeaders,
          body: reqBody
        });

        const timeMs = Math.round(performance.now() - start);
        const resText = await directRes.text();
        const resHeaders = {};
        directRes.headers.forEach((val, key) => { resHeaders[key] = val; });

        setLastResponse({
          status: directRes.status,
          reason: directRes.statusText || (directRes.status >= 200 && directRes.status < 300 ? 'OK' : 'Error'),
          time_ms: timeMs,
          size: new TextEncoder().encode(resText).length,
          body: resText,
          headers: resHeaders
        });
      }
    } catch (err) {
      setLastResponse({
        error: `Request failed: ${err.message}. If this is a CORS issue, ensure the target server allows cross-origin requests or run the backend proxy.`
      });
    } finally {
      setSending(false);
    }
  };

  const formatBodyDisplay = (str) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  return (
    <div className="tool-wrapper">
      <div className="tool-header">
        <h2 className="tool-title">API Request Sender</h2>
        <p className="tool-subtitle">Send JSON payloads to external APIs with authentication, headers, and response inspection.</p>
      </div>

      <div className="tool-card">
        {/* Method & URL Row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{ width: 120, fontWeight: 700 }}
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
            <option>HEAD</option>
            <option>OPTIONS</option>
          </select>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/users/123"
            style={{ flex: 1, minWidth: 260 }}
          />

          <button className="btn" onClick={handleSend} disabled={sending}>
            <Send size={15} />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {isModifying && (
          <div className="status-msg warn" style={{ marginTop: 12 }}>
            <AlertTriangle size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            This {method} request can change or delete data. If this is a production URL, double-check the URL and payload first.
          </div>
        )}

        {/* Authorization Section */}
        <div style={{ marginTop: 18 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 6 }}>Authorization</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={authType}
              onChange={(e) => setAuthType(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="none">No Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key (header)</option>
            </select>

            {authType === 'bearer' && (
              <input
                type="text"
                placeholder="Enter token"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
            )}

            {authType === 'basic' && (
              <>
                <input
                  type="text"
                  placeholder="Username"
                  value={authUser}
                  onChange={(e) => setAuthUser(e.target.value)}
                  style={{ width: 180 }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value)}
                  style={{ width: 180 }}
                />
              </>
            )}

            {authType === 'apikey' && (
              <>
                <input
                  type="text"
                  placeholder="Header name (e.g. x-api-key)"
                  value={authKeyName}
                  onChange={(e) => setAuthKeyName(e.target.value)}
                  style={{ width: 200 }}
                />
                <input
                  type="text"
                  placeholder="API Key value"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  style={{ flex: 1, minWidth: 200 }}
                />
              </>
            )}
          </div>
        </div>

        {/* Headers Section */}
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: 6 }}>Headers (JSON)</label>
          <textarea
            rows={3}
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
          />
        </div>

        {/* Body Section */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--mute)', margin: 0 }}>Body (JSON)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-alt"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={handleLoadFromConverter}
              >
                <FileJson size={13} /> Use JSON from converter
              </button>
              <button
                type="button"
                className="btn btn-alt"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={handleFormatJson}
              >
                <Sparkles size={13} /> Format JSON
              </button>
            </div>
          </div>
          <textarea
            rows={8}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
          {['GET', 'HEAD'].includes(method) && (
            <span style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>Note: GET / HEAD requests do not send a payload body.</span>
          )}
        </div>
      </div>

      {/* Response Card */}
      {lastResponse && (
        <div className="tool-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            {lastResponse.error ? (
              <span className="status-msg err" style={{ margin: 0, padding: '4px 10px' }}>
                <XCircle size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
                Request Failed
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: lastResponse.status >= 200 && lastResponse.status < 300 ? 'var(--ok-soft)' : 'var(--err-soft)',
                    color: lastResponse.status >= 200 && lastResponse.status < 300 ? 'var(--ok)' : 'var(--err)',
                    fontSize: '0.92rem'
                  }}
                >
                  {lastResponse.status} {lastResponse.reason}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>{lastResponse.time_ms} ms</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>{lastResponse.size} bytes</span>
              </div>
            )}

            {!lastResponse.error && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className={`btn ${responseTab === 'body' ? '' : 'btn-alt'}`}
                  style={{ padding: '4px 12px', fontSize: '0.82rem' }}
                  onClick={() => setResponseTab('body')}
                >
                  Body
                </button>
                <button
                  className={`btn ${responseTab === 'headers' ? '' : 'btn-alt'}`}
                  style={{ padding: '4px 12px', fontSize: '0.82rem' }}
                  onClick={() => setResponseTab('headers')}
                >
                  Headers
                </button>
              </div>
            )}
          </div>

          <pre
            style={{
              background: '#f8fafc',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 14,
              margin: 0,
              fontSize: '0.86rem',
              maxHeight: 440,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace'
            }}
          >
            {lastResponse.error
              ? lastResponse.error
              : responseTab === 'body'
              ? formatBodyDisplay(lastResponse.body)
              : Object.entries(lastResponse.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}

