import { getSession } from '../backend/src/auth.js';
import { getAllReports, saveReport, deleteReport } from '../backend/src/analyticsStore.js';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized. Please log in first.' });
  }

  if (req.method === 'GET') {
    try {
      const reports = await getAllReports();
      return res.status(200).json({ ok: true, reports });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      if (!body.report_date) {
        return res.status(400).json({ error: 'report_date is required' });
      }
      const result = await saveReport(body);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'id query parameter is required' });
      }
      await deleteReport(id);
      return res.status(200).json({ ok: true, deleted: id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

