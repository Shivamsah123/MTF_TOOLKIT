// Vercel serverless function: forwards the request from the UI to the real API.
// Only a logged-in user (valid session cookie) can use this proxy.

const dns = require("dns").promises;
const net = require("net");
const { getSession } = require("./_auth.js");

const MAX_BODY = 4 * 1024 * 1024; // show up to 4 MB of response
const TIMEOUT_MS = 25000;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l.startsWith("::ffff:");
  }
  return true;
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST is allowed" });
  }

  if (!getSession(req)) {
    return res.status(401).json({ error: "Not logged in. Please log in again." });
  }

  const cfg = req.body || {};
  const { url, method = "GET", headers = {}, body = "" } = cfg;

  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).json({ error: "URL is not valid (enter the full URL starting with https://)" });
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return res.status(400).json({ error: "Only http and https URLs are allowed" });
  }

  // Block private / internal addresses
  try {
    const addrs = await dns.lookup(target.hostname, { all: true });
    if (addrs.some((a) => isPrivateIp(a.address))) {
      return res.status(400).json({ error: "Private or internal addresses are not allowed" });
    }
  } catch (e) {
    return res.status(400).json({ error: "Host not found: " + target.hostname });
  }

  const m = String(method).toUpperCase();
  const h = {};
  for (const [k, v] of Object.entries(headers || {})) {
    const lk = k.toLowerCase();
    if (["host", "content-length", "connection"].includes(lk)) continue;
    h[k] = String(v);
  }
  if (!Object.keys(h).some((k) => k.toLowerCase() === "user-agent")) {
    h["User-Agent"] = "api-hit-tool/1.0";
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const start = Date.now();

  try {
    const r = await fetch(target.toString(), {
      method: m,
      headers: h,
      body: ["GET", "HEAD"].includes(m) || !body ? undefined : body,
      redirect: "manual",
      signal: ctrl.signal,
    });

    const buf = Buffer.from(await r.arrayBuffer());
    const truncated = buf.length > MAX_BODY;
    const text = buf.subarray(0, MAX_BODY).toString("utf-8");

    const rh = {};
    r.headers.forEach((v, k) => (rh[k] = v));

    return res.status(200).json({
      status: r.status,
      reason: r.statusText,
      headers: rh,
      body: truncated ? text + "\n\n[Response was large; the rest was truncated]" : text,
      time_ms: Date.now() - start,
      size: buf.length,
    });
  } catch (e) {
    const msg = e.name === "AbortError" ? "Timeout: the API did not respond within " + TIMEOUT_MS / 1000 + " seconds" : String(e.cause || e.message || e);
    return res.status(200).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
};
