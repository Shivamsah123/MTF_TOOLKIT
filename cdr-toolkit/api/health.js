// GET /api/health -> quick check that the serverless functions are deployed (public, no secrets).
module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({ ok: true, passwordConfigured: Boolean(process.env.ADMIN_PASSWORD) }));
};
