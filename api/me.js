import { getSession } from '../backend/src/auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = getSession(req);
  if (session) {
    return res.status(200).json({ authenticated: true, user: session.u });
  }
  return res.status(401).json({ authenticated: false });
}

