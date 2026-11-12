import crypto from 'node:crypto';

export const COOKIE_NAME = 'cdr_session';
export const SESSION_MAX_AGE = 12 * 60 * 60; // 12 hours in seconds

// In-memory brute-force lock table
const loginAttempts = new Map(); // ip -> { count: number, lockedUntil: number }

export function getAdminCredentials() {
  const user = process.env.ADMIN_USERNAME || 'Admin';
  const pass = process.env.ADMIN_PASSWORD || 'admin123';
  return { user, pass };
}

function getSecretKey() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const { pass } = getAdminCredentials();
  return crypto.createHash('sha256').update(`cdr-toolkit-secret|${pass}`).digest('hex');
}

// HMAC-SHA256 sign
export function sign(payload) {
  return crypto.createHmac('sha256', getSecretKey()).update(payload).digest('base64url');
}

// Constant-time string comparison to prevent timing attacks
export function constantTimeEquals(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Generate signed JWT-like token: base64url(payload).hmac_signature
export function createToken(username) {
  const payload = Buffer.from(JSON.stringify({
    u: username,
    exp: Date.now() + SESSION_MAX_AGE * 1000
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

// Parse cookie string
export function parseCookies(header = '') {
  const out = {};
  header.split(';').forEach((p) => {
    const idx = p.indexOf('=');
    if (idx > 0) {
      out[p.slice(0, idx).trim()] = p.slice(idx + 1).trim();
    }
  });
  return out;
}

// Validate session from request
export function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const [payload, sig] = token.split('.');
  if (!payload || !sig || !constantTimeEquals(sig, sign(payload))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp > Date.now()) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

// Generate Set-Cookie header string
export function makeCookieHeader(value, maxAge = SESSION_MAX_AGE) {
  const isHttps = process.env.NODE_ENV === 'production';
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}`;
}

// Rate Limiting (Brute-force protection)
export function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSec = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, remainingSec };
  }

  // Lock expired
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;

  if (entry.count >= 5) {
    entry.lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
  }
  loginAttempts.set(ip, entry);
  return entry;
}

export function resetAttempts(ip) {
  loginAttempts.delete(ip);
}

