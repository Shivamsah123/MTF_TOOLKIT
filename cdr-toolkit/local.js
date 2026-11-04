// Run locally without Vercel:  node local.js  ->  http://localhost:3000 (auto-picks the next port if busy)
// Local login: username "Admin", password "admin123" unless you set ADMIN_PASSWORD yourself.
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const http = require("http");
const fs = require("fs");
const path = require("path");
const handlers = {
  "/api/login": require("./api/login.js"),
  "/api/logout": require("./api/logout.js"),
  "/api/send": require("./api/send.js"),
  "/api/app": require("./api/app.js"),
  "/api/health": require("./api/health.js"),
};

// Same rules as "rewrites" in vercel.json
function rewrite(pathname) {
  if (pathname === "/") return "/api/app?p=index.html";
  if (pathname === "/login") return "/api/app?p=login.html";
  const m = pathname.match(/^\/tools\/([^/]+)$/);
  return m ? "/api/app?p=tools/" + encodeURIComponent(m[1]) : null;
}

const server = http.createServer((req, res) => {
  const pathname = req.url.split("?")[0];
  if (pathname === "/favicon.svg") { res.setHeader("Content-Type", "image/svg+xml"); return res.end(fs.readFileSync(path.join(__dirname, "public", "favicon.svg"))); }
  const target = rewrite(pathname);
  if (target) req.url = target;
  const handler = handlers[target ? "/api/app" : pathname];
  if (!handler) { res.statusCode = 404; return res.end("Not found"); }

  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
    handler(req, res);
  });
});

let port = Number(process.env.PORT || 3000), tries = 0;
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && tries < 20) {
    console.log("Port " + port + " is busy, trying " + (port + 1) + "...");
    tries++; port++;
    server.listen(port, "127.0.0.1");
  } else throw e;
});
server.on("listening", () => {
  console.log("Running: http://localhost:" + server.address().port);
  console.log("Login: " + (process.env.ADMIN_USERNAME || "Admin") + " / " + process.env.ADMIN_PASSWORD);
});
server.listen(port, "127.0.0.1");
