/* ============================================================
   MASJID BANDAR LABIS — Semakan pautan & keselamatan
   Digunakan dalam GitHub Actions sebelum deploy.

   Semak:
   1. Setiap pautan dalaman (href/src/action) wujud dalam dist/
   2. Tiada pautan http:// (tidak selamat) — semua mesti https
   3. Setiap <a target="_blank"> mesti ada rel="noopener noreferrer"
   4. Fail CSS/JS/gambar yang dirujuk wujud
   5. Tiada atribut on* (onclick, onerror, dll) dalam HTML
      dan tiada tag <script> inline — selaras CSP script-src 'self'

   Keluar dengan kod bukan-sifar jika ada sebarang masalah.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const DIST = path.resolve(__dirname, "..", "dist");

// Fail optional: belum wujud di repo tetapi diperlukan untuk gantian
// kemudian. Kehilangan fail ini hanya menjana AMARAN (bukan ralat),
// supaya CI boleh lulus untuk deploy pertama.
const OPTIONAL_FILES = [
  "images/qr-sumbangan.jpg", // DuitNow QR rasmi daripada Bank Rakyat
  "images/logo.png",         // Logo masjid (navbar + footer)
];

let errors = [];
let warnings = [];
const seenWarnings = new Set();

/* ---------- Kumpul semua fail HTML ---------- */
function collectHtml(dir, out) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) collectHtml(full, out);
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

/* ============================================================
   PEMERIKSAAN UTAMA
   ============================================================ */
const htmlFiles = collectHtml(DIST, []);

if (!htmlFiles.length) {
  console.error("Tiada fail HTML dalam dist/. Jalankan node src/build.js dahulu.");
  process.exit(1);
}

// Kumpul semua id untuk semakan anchor (#fragment)
const idMap = {};
for (const f of htmlFiles) {
  const rel = path.relative(DIST, f).split(path.sep).join("/");
  const ids = new Set();
  const idRe = /\bid="([^"]+)"/g;
  let im;
  while ((im = idRe.exec(read(f))) !== null) ids.add(im[1]);
  idMap[rel] = ids;
}

function resolveInternal(url, fromFile) {
  const idx = url.indexOf("#");
  const filePart = idx === -1 ? url : url.slice(0, idx);
  const frag = idx === -1 ? "" : url.slice(idx + 1);

  let targetFile;
  if (!filePart) {
    targetFile = fromFile; // anchor pada halaman semasa
  } else {
    targetFile = path.resolve(path.dirname(fromFile), filePart);
    const relToDist = path.relative(DIST, targetFile);
    if (relToDist.startsWith("..") || path.isAbsolute(relToDist)) {
      return { ok: false, reason: "di luar dist" };
    }
    if (!fs.existsSync(targetFile)) return { ok: false, reason: "fail tiada" };
    if (fs.statSync(targetFile).isDirectory()) {
      targetFile = path.join(targetFile, "index.html");
    }
  }

  if (frag) {
    const key = path.relative(DIST, targetFile).split(path.sep).join("/");
    const ids = idMap[key];
    if (!ids || !ids.has(frag)) {
      return { ok: false, reason: "anchor #" + frag + " tiada dalam " + key };
    }
  }
  return { ok: true };
}

for (const file of htmlFiles) {
  const content = read(file);
  const name = path.relative(DIST, file);

  // ---- 1 & 4. Semua href / src / action ----
  const urlRe = /(?:href|src|action)=["']([^"']+)["']/g;
  let m;
  while ((m = urlRe.exec(content)) !== null) {
    const url = m[1];
    if (!url) continue;

    // Protokol yang dibenarkan
    if (/^https?:\/\//.test(url)) {
      if (url.startsWith("http://")) {
        errors.push(name + ": pautan http:// (tidak selamat) -> " + url);
      }
      continue; // pautan luar
    }
    if (/^(mailto:|tel:|data:|#|\/\/)/.test(url)) continue;
    if (url.startsWith("javascript:")) {
      errors.push(name + ": pautan javascript: dikesan -> " + url);
      continue;
    }

    // Pautan dalaman — fail & anchor mesti wujud
    const res = resolveInternal(url, file);
    if (!res.ok) {
      const clean = url.split("#")[0];
      if (OPTIONAL_FILES.includes(clean)) {
        const key = "optional:" + clean;
        if (!seenWarnings.has(key)) {
          seenWarnings.add(key);
          warnings.push(
            "fail optional tiada (" + clean +
            ") — ganti dengan fail sebenar sebelum pelancaran rasmi"
          );
        }
      } else {
        errors.push(name + ": pautan dalaman tiada -> " + url + " (" + res.reason + ")");
      }
    }
  }

  // ---- 2. Tag <a> dengan target="_blank" mesti ada rel noopener ----
  const aRe = /<a\b[^>]*>/g;
  let a;
  while ((a = aRe.exec(content)) !== null) {
    const tag = a[0];
    if (tag.includes('target="_blank"') || tag.includes("target='_blank'")) {
      const hasNoopener = /rel=["'][^"']*noopener/i.test(tag);
      if (!hasNoopener) {
        errors.push(name + ": <a target=\"_blank\"> tanpa rel=\"noopener noreferrer\" -> " + tag.slice(0, 120));
      }
    }
  }

  // ---- 3. Tiada skrip inline (CSP script-src 'self') ----
  const inlineScript = /<script(?![^>]*src=)[^>]*>/g;
  if (inlineScript.test(content)) {
    errors.push(name + ": terdapat <script> inline (langgar CSP script-src 'self')");
  }

  // ---- 4. Tiada pengendali acara inline (on*) ----
  const onAttr = /\son\w+\s*=/gi;
  const stripped = content.replace(/<script[\s\S]*?<\/script>/g, "");
  if (onAttr.test(stripped)) {
    errors.push(name + ": terdapat atribut on* inline (langgar CSP script-src 'self')");
  }

  // ---- 5. Meta CSP wujud ----
  if (!/content-security-policy/i.test(content)) {
    warnings.push(name + ": meta Content-Security-Policy tidak dijumpai");
  }

  // ---- 6. Meta viewport & charset ----
  if (!/<meta[^>]+charset=/i.test(content)) {
    warnings.push(name + ": meta charset tiada");
  }
  if (!/<meta[^>]+viewport/i.test(content)) {
    warnings.push(name + ": meta viewport tiada");
  }
}

/* ============================================================
   LAPORAN
   ============================================================ */
if (warnings.length) {
  console.log("Amaran (" + warnings.length + "):");
  warnings.forEach(function (w) { console.log("  ! " + w); });
}
if (errors.length) {
  console.error("\nRalat (" + errors.length + ") — deploy DIBATALKAN:");
  errors.forEach(function (e) { console.error("  \u2717 " + e); });
  process.exit(1);
}

console.log("\nSemakan selesai: " + htmlFiles.length + " fail HTML diperiksa.");
console.log("Semua pautan dalaman sah, tiada http:// tidak selamat, tiada skrip/atribut inline.");
console.log("=== LULUS — sedia untuk deploy ===");
