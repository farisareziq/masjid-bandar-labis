/* ============================================================
   MASJID BANDAR LABIS - Muat turun siaran Facebook (bina-masa)

   Guna:  node src/fetch-fb-posts.js

   Membaca token SYSTEM USER daripada:
     1. Pemboleh ubah persekitaran FB_ACCESS_TOKEN
     2. Fail .env di root repo (FAIL INI TIDAK BOLEH DI-COMMIT)

   Skrip kemudian mendapatkan Page Access Token daripada /me/accounts
   (diperlukan oleh "new Pages experience" Facebook untuk endpoint /posts).
   Page token itu TIDAK disimpan ke fail.

   Hasil:  src/fb-posts.json  (senarai siaran terkini halaman)

   PENTING (keselamatan):
   - Token TIDAK PERNAH dimasukkan ke dalam HTML/JS yang di-deploy.
     Ia hanya digunakan di komputer anda semasa bina.
   - Fail src/fb-posts.json diabaikan oleh git (.gitignore).
   - Jika token tiada / gagal, cache lama dikekalkan dan skrip
     keluar dengan kod 0 supaya deploy diteruskan dengan fallback.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "fb-posts.json");
const ENV_FILE = path.join(ROOT, ".env");

const PAGE_REF = "masjidbandarlabis"; // username halaman Facebook rasmi
const POST_LIMIT = 6;
const GRAPH_VERSION = "v21.0";
const TIMEOUT_MS = 15000;

/* ---------- Baca .env (tanpa dependency) ---------- */
function readDotEnv() {
  const env = {};
  try {
    const raw = fs.readFileSync(ENV_FILE, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  } catch (e) {
    // Tiada .env - guna pemboleh ubah persekitaran sahaja
  }
  return env;
}

function getToken() {
  const env = readDotEnv();
  return process.env.FB_ACCESS_TOKEN || env.FB_ACCESS_TOKEN || "";
}

/* ---------- HTTPS GET JSON (tanpa dependency) ---------- */
function httpsGetJson(url) {
  return new Promise(function (resolve, reject) {
    const req = https.get(url, function (res) {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", function (chunk) { body += chunk; });
      res.on("end", function () {
        let json;
        try {
          json = JSON.parse(body);
        } catch (e) {
          reject(new Error("Respons Graph API bukan JSON (HTTP " + res.statusCode + ")"));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300 || (json && json.error)) {
          reject(new Error((json && json.error && json.error.message) || "HTTP " + res.statusCode));
          return;
        }
        resolve(json);
      });
    });
    req.setTimeout(TIMEOUT_MS, function () {
      req.destroy(new Error("Masa tamat (Graph API)"));
    });
    req.on("error", reject);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function main() {
  const token = getToken();
  if (!token) {
    console.log("  Tiada FB_ACCESS_TOKEN - siaran Facebook dikemaskini, guna fallback statik.");
    return;
  }

  try {
    // 1. Senarai halaman milik System User
    const accounts = await httpsGetJson(
      "https://graph.facebook.com/" + GRAPH_VERSION + "/me/accounts" +
      "?fields=id,name,access_token&access_token=" + encodeURIComponent(token)
    );
    const pages = accounts.data || [];
    const normalize = function (s) {
      return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    };
    let page = pages.find(function (p) {
      return normalize(p.name) === normalize(PAGE_REF) || p.id === PAGE_REF;
    });
    if (!page && pages.length === 1) {
      page = pages[0];
      console.log("  Nota: guna halaman tunggal \"" + page.name + "\".");
    }
    if (!page) {
      throw new Error(
        "Halaman '" + PAGE_REF + "' tiada dalam senarai System User (semak /me/accounts)"
      );
    }

    // 2. Ambil siaran terkini halaman (guna Page Access Token)
    const posts = await httpsGetJson(
      "https://graph.facebook.com/" + GRAPH_VERSION + "/" + page.id + "/posts" +
      "?fields=id,created_time,message,full_picture,permalink_url&limit=" + POST_LIMIT +
      "&access_token=" + encodeURIComponent(page.access_token)
    );

    const data = (posts.data || []).map(function (p) {
      return {
        id: p.id || "",
        created_time: p.created_time || "",
        message: p.message ? String(p.message).slice(0, 220) : "",
        full_picture: p.full_picture || "",
        permalink_url: p.permalink_url ||
          "https://www.facebook.com/" + PAGE_REF + "/posts/" + String(p.id || "").split("_").pop(),
      };
    });

    fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log("  OK - " + data.length + " siaran disimpan ke src/fb-posts.json");
  } catch (e) {
    // Jangan gagalkan deploy: simpan cache lama & guna fallback
    console.warn("  Amaran: gagal ambil siaran Facebook -> " + e.message);
    console.warn("  Cache sedia ada dikekalkan (jika ada); laman guna fallback statik.");
  }
}

main();
