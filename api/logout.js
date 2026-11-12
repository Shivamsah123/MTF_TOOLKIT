import { makeCookieHeader } from '../backend/src/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const clearCookie = makeCookieHeader('', 0);
  res.setHeader('Set-Cookie', clearCookie);
  return res.status(200).json({ ok: true });
}

