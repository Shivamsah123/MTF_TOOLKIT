// Shared helpers: signed session cookie (HMAC) and small response utilities.
const crypto = require("crypto");

const COOKIE = "cdr_session";
const MAX_AGE = 12 * 60 * 60; // session length in seconds (12 hours)

function secretKey() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // No SESSION_SECRET set: derive the key from the admin password.
  return crypto.createHash("sha256").update("cdr-toolkit|" + (process.env.ADMIN_PASSWORD || "")).digest("hex");
}
const sign = (payload) => crypto.createHmac("sha256", secretKey()).update(payload).digest("base64url");

// Constant-time comparison (hashes first so lengths always match)
function same(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ u: user, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return payload + "." + sign(payload);
}

function parseCookies(header) {
  const out = {};
  String(header || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

// Returns the session data if the request has a valid, unexpired cookie, otherwise null.
function getSession(req) {
  if (!process.env.ADMIN_PASSWORD) return null;
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !same(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function cookie(req, value, maxAge) {
  const local = /^(localhost|127\.0\.0\.1)/.test(req.headers.host || "");
  return COOKIE + "=" + value + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + maxAge + (local ? "" : "; Secure");
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

module.exports = { MAX_AGE, same, makeToken, getSession, cookie, send, redirect };
