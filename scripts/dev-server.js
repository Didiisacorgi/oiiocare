/* Local static server plus /api/chat. Usage: node scripts/dev-server.js */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleChat } = require("../server/chat-handler");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const abs = path.join(root, rel);
  if (!abs.startsWith(root)) return null;
  const candidates = [abs];
  if (!path.extname(abs)) {
    candidates.push(path.join(abs, "index.html"), abs + ".html");
  }
  return candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) || null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/api/chat") {
    handleChat(req, res);
    return;
  }
  const file = resolveFile(url.pathname);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": types[path.extname(file)] || "application/octet-stream",
    "cache-control": "no-cache"
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log("oiioCare dev http://127.0.0.1:" + port);
});
