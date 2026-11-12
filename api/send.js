import { getSession } from '../backend/src/auth.js';
import { forwardApiRequest } from '../backend/src/proxy.js';

export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized. Please log in first.' });
  }

  try {
    const result = await forwardApiRequest(req.body || {});
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

