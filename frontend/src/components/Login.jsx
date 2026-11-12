import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        }),
        credentials: 'include'
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        onLoginSuccess({ user: data.user || username.trim() });
      } else {
        setError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Could not reach backend server. Please verify connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Left Side: Photo */}
        <div className="login-photo" role="img" aria-label="Waanee AI Office" />

        {/* Right Side: Form */}
        <div className="login-right">
          <div className="login-main">
            <img
              src="/logo.png"
              alt="waanee.ai - POWER OF CHOICE"
              className="login-logo"
            />

            <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
              <input
                type="text"
                className="login-input"
                name="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />

              <input
                type="password"
                className="login-input"
                name="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? 'LOGGING IN...' : 'LOG IN'}
              </button>

              {error && (
                <p className="login-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </div>

          <div className="login-foot">
            <button
              type="button"
              className="login-link-btn"
              onClick={() => setShowForgot(!showForgot)}
            >
              Forgot Password
            </button>
            {showForgot && (
              <p className="login-forgot-msg">
                Please contact your administrator to reset the password. (Default: <code>Admin</code> / <code>admin123</code>)
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="login-copyright">
        2022 &copy; Waanee AI Private Limited.
      </div>
    </div>
  );
}
