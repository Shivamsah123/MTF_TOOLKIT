// POST /api/logout -> clears the session cookie.
const { cookie, send } = require("./_auth.js");

module.exports = (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Only POST is allowed" });
  res.setHeader("Set-Cookie", cookie(req, "", 0));
  return send(res, 200, { ok: true });
};
