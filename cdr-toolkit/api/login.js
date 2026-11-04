// POST /api/login  { username, password }  ->  sets the session cookie.
// Set ADMIN_PASSWORD (required) and ADMIN_USERNAME (optional, default "Admin") in the Vercel environment variables.
const { same, makeToken, cookie, send, MAX_AGE } = require("./_auth.js");

// Best-effort brute-force limit (per warm server instance)
const fails = new Map();
const WINDOW = 15 * 60 * 1000, LIMIT = 5;

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Only POST is allowed" });

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return send(res, 500, { error: "ADMIN_PASSWORD is not set on the server. Add it in Vercel settings and redeploy." });
  const user = process.env.ADMIN_USERNAME || "Admin";

  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const rec = fails.get(ip);
  if (rec && Date.now() - rec.t < WINDOW && rec.n >= LIMIT) {
    return send(res, 429, { error: "Too many failed attempts. Try again in 15 minutes." });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const okUser = same(String(body.username || "").trim().toLowerCase(), user.toLowerCase());
  const okPass = same(String(body.password || ""), password);
  if (!(okUser && okPass)) {
    fails.set(ip, { n: rec && Date.now() - rec.t < WINDOW ? rec.n + 1 : 1, t: rec && Date.now() - rec.t < WINDOW ? rec.t : Date.now() });
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return send(res, 401, { error: "Incorrect username or password." });
  }

  fails.delete(ip);
  res.setHeader("Set-Cookie", cookie(req, makeToken(user), MAX_AGE));
  return send(res, 200, { ok: true });
};
