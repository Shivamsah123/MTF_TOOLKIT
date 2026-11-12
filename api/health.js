export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production'
  });
}

