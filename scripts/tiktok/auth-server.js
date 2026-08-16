/* ============================================================
   OAuth TikTok (sambung akaun) - sekali sahaja
   Jalankan:  node scripts/tiktok/auth-server.js
   Buka:      http://localhost:8080
   Hasil:     tokens.json (JANGAN commit)
   ============================================================ */
"use strict";

const http = require("http");
const crypto = require("crypto");
const tiktok = require("./lib/tiktok");
const state = require("./lib/state");

const PORT = Number(tiktok.cfg("TIKTOK_PORT", "8080"));
const REDIRECT = tiktok.cfg("TIKTOK_REDIRECT_URI", "http://localhost:" + PORT + "/callback");
// State rawak setiap proses - perlindungan CSRF
const STATE = crypto.randomBytes(16).toString("hex");
const pkce = tiktok.pkcePair();

// Escape teks sebelum dimasukkan ke dalam HTML (elak reflected XSS)
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(title, body) {
  return (
    "<!DOCTYPE html><html lang=\"ms\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<title>" + title + " - AutoPost TikTok</title>" +
    "<style>" +
    "body{font-family:Segoe UI,Arial,sans-serif;background:#0c0c0c;color:#1b1b1b;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center}" +
    ".card{background:#FFFDD0;border-radius:18px;padding:36px;max-width:520px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,.4)}" +
    "h1{font-size:1.4rem;margin:0 0 6px} p{line-height:1.7;margin:8px 0}" +
    "code{background:#f4ecd9;padding:2px 6px;border-radius:6px;font-size:.9rem;word-break:break-all}" +
    ".btn{display:inline-block;background:#0c0c0c;color:#FFFDD0;padding:13px 22px;border-radius:12px;text-decoration:none;font-weight:700;margin-top:14px}" +
    ".ok{color:#0a7d33;font-weight:700}" +
    "</style></head><body><div class=\"card\">" + body + "</div></body></html>"
  );
}

function home() {
  const tokens = state.loadTokens();
  const ok = !!(tokens.access_token && tokens.open_id);
  const authUrl = tiktok.authorizeUrl({
    redirectUri: REDIRECT,
    state: STATE,
    codeChallenge: pkce.challenge,
  });
  return page(
    "Sambung TikTok",
    "<h1>AutoPost Masjid Bandar Labis - TikTok</h1>" +
      (ok
        ? "<p class=\"ok\">\u2713 Akaun sudah disambung: <code>" + tokens.open_id + "</code></p>"
        : "<p>Belum disambung. Klik butang di bawah, login TikTok masjid, dan benarkan akses.</p>") +
      '<a class="btn" href="' + authUrl + '">Login dengan TikTok</a>' +
      "<p><small>Redirect URI: <code>" + REDIRECT + "</code></small></p>"
  );
}

function callback(req, res, url) {
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || stateParam !== STATE) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(page("Ralat", "<h1>Ralat OAuth</h1><p>Kod atau state tidak sah. Cuba semula dari halaman utama.</p>"));
    return;
  }
  tiktok
    .exchangeCode({
      code: code,
      redirectUri: REDIRECT,
      codeVerifier: pkce.verifier,
    })
    .then(function (tokens) {
      const saved = state.saveTokens(
        Object.assign({}, tokens, {
          expires_at: new Date(Date.now() + (tokens.expires_in || 86400) * 1000).toISOString(),
        })
      );
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        page(
          "Berjaya!",
          "<h1 class=\"ok\">\u2713 Sambungan berjaya</h1>" +
            "<p>Open ID: <code>" + saved.open_id + "</code></p>" +
            "<p>Langkah seterusnya:</p>" +
            "<p>1. Salin <b>refresh token</b> daripada fail <code>scripts/tiktok/tokens.json</code>.</p>" +
            "<p>2. Hantar video ujian: <code>node scripts/tiktok/post-video.js video.mp4</code></p>" +
            "<p>3. Rakam skrin aliran ini untuk demo video review TikTok.</p>"
        )
      );
    })
    .catch(function (err) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(page("Ralat", "<h1>Ralat</h1><p>" + escapeHtml(err.message) + "</p>"));
    });
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, "http://localhost:" + PORT);
  if (url.pathname === "/callback") {
    callback(req, res, url);
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(home());
});

server.listen(PORT, "127.0.0.1", function () {
  console.log("OAuth TikTok berjalan: http://localhost:" + PORT);
  console.log("Buka URL ini dalam browser dan login akaun TikTok masjid.");
  console.log("Redirect URI (daftar dalam portal TikTok): " + REDIRECT);
});
