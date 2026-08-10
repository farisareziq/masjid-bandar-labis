/* ============================================================
   Server pra-tonton lokal (tiada dependency — Node sahaja)
   Guna:  node src/serve.js
   Buka:  http://localhost:8080
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.resolve(__dirname, "..", "dist");
const PORT = process.env.PORT || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const server = http.createServer(function (req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch (e) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }
  if (urlPath === "/") urlPath = "/index.html";

  // Cegah directory traversal
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(DIST, safePath);

  const rel = path.relative(DIST, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(file, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 — Fail tidak dijumpai. Jalankan node src/build.js dahulu.");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

if (!fs.existsSync(DIST)) {
  console.log("Folder dist/ tiada. Jalankan: node src/build.js");
}

server.listen(PORT, function () {
  console.log("Pra-tonton: http://localhost:" + PORT);
  console.log("Tekan Ctrl+C untuk berhenti.");
});
