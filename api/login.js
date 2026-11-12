import {
  getAdminCredentials,
  constantTimeEquals,
  createToken,
  makeCookieHeader,
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts
} from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many failed attempts. Account locked for ${rateCheck.remainingSec} more seconds.`
    });
  }

  const { username, password } = req.body || {};
  const { user: expUser, pass: expPass } = getAdminCredentials();

  const userMatch = constantTimeEquals(String(username || '').trim().toLowerCase(), expUser.toLowerCase());
  const passMatch = constantTimeEquals(String(password || '').trim(), expPass);

  if (userMatch && passMatch) {
    resetAttempts(ip);
    const token = createToken(expUser);
    const cookie = makeCookieHeader(token);
    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ ok: true, user: expUser });
  }

  recordFailedAttempt(ip);
  return res.status(401).json({ error: 'Invalid username or password.' });
}

