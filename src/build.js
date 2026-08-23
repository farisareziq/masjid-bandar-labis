/* ============================================================
   MASJID BANDAR LABIS — Build script
   Menjana semua halaman HTML ke folder `dist/`.

   Cara guna:  node src/build.js
   Hasil:      dist/  (index.html + 5 halaman + css + js + images)

   Semua kandungan adalah statik dan dipercayai (authored),
   maka tiada sanitasi diperlukan pada masa bina.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

/* ============================================================
   KONFIGURASI — kemas kini di sini
   ============================================================ */
const CONFIG = {
  siteName: "Masjid Bandar Labis",
  admin: "Pejabat Kadi Daerah Segamat",
  address: "Masjid Bandar Labis, Jalan Muar, 85300 Labis, Johor Darul Ta'azim",
  addressLines: [
    "Masjid Bandar Labis",
    "Jalan Muar",
    "85300 Labis",
    "Johor Darul Ta'azim",
  ],
  email: "masjidbandarlabis@gmail.com",
  // Facebook page rasmi masjid
  facebookUrl: "https://www.facebook.com/masjidbandarlabis",
  // TikTok rasmi masjid
  tiktokUrl: "https://www.tiktok.com/@masjidlabis",
  tiktokUsername: "@masjidlabis",
  // Video aerial masjid (YouTube embed)
  videoAerial: "https://www.youtube-nocookie.com/embed/YbEaCgKmAC8",
  // Video aerial 2026 (YouTube embed)
  videoAerial2026: "https://www.youtube-nocookie.com/embed/03jG01K-D2g",
  // Imej QR sumbangan (DuitNow) & carta organisasi
  qrImage: "images/qr-sumbangan.jpg",
  cartaImage: "images/carta-pentadbiran.jpg",
  sejarahImage: "images/sejarah-masjid-lama.jpg",
  // Domain khas (GitHub Pages CNAME)
  customDomain: "masjidlabis.my",
  // Pejabat Kadi Daerah Segamat (Bahagian Pengurusan Masjid Surau)
  kadiOffice: {
    name: "Bahagian Pengurusan Masjid Surau, Pejabat Kadi Daerah Segamat",
    address: "KM 1, Jalan Buluh Kasap, 85000 Segamat, Johor",
    phone: "07-9311330 / 07-9333432",
    fax: "07-9321240",
  },
  // Senarai pegawai masjid (gambar: letak dalam images/pegawai/<key>.jpg)
  pegawai: [
    { key: "bahari-osman", nama: "Bahari Bin Osman", jawatan: "Imam", telefon: "+60" },
    { key: "nabiel-tukiran", nama: "Mohd Nabiel Bin Tukiran", jawatan: "Imam", telefon: "+60" },
    { key: "najid-suyut", nama: "Mohd Najid Bin Md Suyut", jawatan: "Bilal", telefon: "+60" },
    { key: "zainal-abidin", nama: "Hj Zainal Abidin Bin Abu", jawatan: "Bilal", telefon: "+60" },
    { key: "azman-noja", nama: "Azman Bin Noja", jawatan: "Pembantu Am", telefon: "+60" },
    { key: "anil-hamdi", nama: "Encik Anil Bin Hamdi", jawatan: "Pembantu Am", telefon: "+60" },
  ],
  bank: { name: "Bank Rakyat", account: "1101456319" },
  zone: "JHR04",
  zoneLabel: "Segamat, Johor",
  copyright: "Masjid Bandar Labis",
};

/* ============================================================
   UTILITI
   ============================================================ */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Versi aset (hash kandungan) untuk cache-busting:
// URL berubah bila fail berubah -> pelayar/CDN muat versi baharu
function assetVersion(relPath) {
  try {
    return crypto
      .createHash("md5")
      .update(fs.readFileSync(path.join(ROOT, relPath)))
      .digest("hex")
      .slice(0, 10);
  } catch (e) {
    return "1";
  }
}

/* Senarai gambar galeri: root = 2023, subfolder 2026/ = 2026 */
function listGalleryImages() {
  const root = path.join(ROOT, "images", "Galeri");
  const imgRe = /\.[jJ][pP][gG]$|\.[jJ][pP][eE][gG]$|\.png$|\.webp$/;
  const out = [];
  if (fs.existsSync(root)) {
    fs.readdirSync(root)
      .filter(function (f) { return imgRe.test(f); })
      .sort()
      .forEach(function (f) { out.push({ file: f, year: "2023", sub: "" }); });
  }
  const sub = path.join(root, "2026");
  if (fs.existsSync(sub)) {
    fs.readdirSync(sub)
      .filter(function (f) { return imgRe.test(f); })
      .sort()
      .forEach(function (f) { out.push({ file: f, year: "2026", sub: "2026/" }); });
  }
  return out;
}

function write(relPath, content) {
  const file = path.join(DIST, relPath);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
  console.log("  \u2713 " + relPath);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src)) {
    // Video aerial dikecualikan (terlalu besar untuk git/web; guna YouTube)
    if (entry === "Video Aerial Masjid") continue;
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

/* ---------- Ikon SVG (inline, tiada library luar) ---------- */
function iconSvg(name, size) {
  const s = size || 20;
  const stroke =
    '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  switch (name) {
    case "facebook":
      return (
        '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>'
      );
    case "tiktok":
      return (
        '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>'
      );
    case "whatsapp":
      return (
        '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
      );
    case "pin":
      return (
        stroke +
        '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
      );
    case "phone":
      return (
        stroke +
        '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
      );
    case "printer":
      return (
        stroke +
        '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>'
      );
    case "mail":
      return (
        stroke +
        '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
      );
    case "clock":
      return (
        stroke +
        '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
      );
    default:
      return "";
  }
}

/* ============================================================
   TEMPLAT LAMAN
   ============================================================ */
function head(title, description, canonicalUrl, titleKey) {
  return (
    "<!DOCTYPE html>\n" +
    '<html lang="ms">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    "<title" + (titleKey ? ' data-i18n="' + titleKey + '"' : "") + ">" + title + "</title>\n" +
    '<meta name="description" content="' + description + '">\n' +
    '<meta name="theme-color" content="#FFFDD0">\n' +
    (canonicalUrl
      ? '<link rel="canonical" href="' + canonicalUrl + '">\n' +
        '<meta property="og:url" content="' + canonicalUrl + '">\n'
      : "") +
    '<meta property="og:title" content="' + title + '">\n' +
    '<meta property="og:description" content="' + description + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:locale" content="ms_MY">\n' +
    // Content-Security-Policy: hadkan sumber skrip/style/gambar/fetch
    '<meta http-equiv="Content-Security-Policy" content="' +
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://*.fbcdn.net https://lookaside.fbsbx.com; " +
    "connect-src 'self' https://www.e-solat.gov.my https://formsubmit.co; " +
    "frame-src https://maps.google.com https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com; " +
    "form-action 'self' https://formsubmit.co; " +
    "base-uri 'self'; " +
    "frame-ancestors 'self'" +
    '">\n' +
    // Favicon: guna logo masjid (images/logo.png)
    '<link rel="icon" type="image/png" href="images/logo.png?v=' + assetVersion("images/logo.png") + '">\n' +
    '<link rel="apple-touch-icon" href="images/logo.png?v=' + assetVersion("images/logo.png") + '">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n' +
    '<link rel="stylesheet" href="css/style.css?v=' + assetVersion("css/style.css") + '">\n' +
    "</head>\n<body>\n"
  );
}

function nav(active) {
  const item = function (href, label, isActive, extra, key) {
    return (
      '<li class="nav-item">' +
      '<a href="' + href + '" class="nav-link' +
      (isActive ? " active" : "") +
      (extra ? " " + extra : "") +
      '"' + (key ? ' data-i18n="' + key + '"' : "") + ">" + label + "</a></li>"
    );
  };
  const dropdown = function (href, label, isActive, children, key) {
    const links = children
      .map(function (c) {
        return (
          '<li><a href="' + c.href + '"' +
          (c.key ? ' data-i18n="' + c.key + '"' : "") +
          ">" + c.label + "</a></li>"
        );
      })
      .join("");
    return (
      '<li class="nav-item has-dropdown">' +
      '<a href="' + href + '" class="nav-link' + (isActive ? " active" : "") +
      '"' + (key ? ' data-i18n="' + key + '"' : "") + ">" + label + "</a>" +
      '<ul class="dropdown-menu">' + links + "</ul></li>"
    );
  };

  return (
    '<nav class="navbar" id="navbar">\n' +
    '<div class="container nav-container">\n' +
    '<a href="index.html" class="nav-logo">' +
    '<img src="images/logo.png" class="nav-logo-img logo-img" alt="Logo Masjid Bandar Labis" hidden>' +
    '<span class="nav-logo-icon logo-fallback">\u{1F54C}</span>' +
    '<img src="images/jata-negeri-johor.png" class="nav-jata" alt="Jata Negeri Johor" loading="lazy">' +
    '<span class="nav-logo-text">Masjid <b>Bandar Labis</b></span>' +
    "</a>\n" +
    '<ul class="nav-menu" id="navMenu">' +
    item("index.html", "Utama", active === "index", null, "nav.utama") +
    dropdown("tentang.html", "Tentang", active === "tentang", [
      { href: "tentang.html#sejarah", label: "Sejarah", key: "nav.tentang.sejarah" },
      { href: "tentang.html#visi-misi", label: "Visi & Misi", key: "nav.tentang.visi" },
      { href: "tentang.html#carta", label: "Carta Organisasi", key: "nav.tentang.carta" },
      { href: "tentang.html#pegawai", label: "Senarai Pegawai", key: "nav.tentang.pegawai" },
    ], "nav.tentang") +
    dropdown("aktiviti.html", "Aktiviti", active === "aktiviti", [
      { href: "aktiviti.html#jadual-kuliah", label: "Jadual Kuliah", key: "nav.aktiviti.jadual" },
      { href: "aktiviti.html#siaran-media", label: "Siaran Media", key: "nav.aktiviti.siaran" },
    ], "nav.aktiviti") +
    dropdown("perkhidmatan.html", "Perkhidmatan", active === "perkhidmatan", [
      { href: "perkhidmatan.html#urusan-harian", label: "Urusan Harian", key: "nav.perkhidmatan.urusan" },
      { href: "perkhidmatan.html#musafir-inn", label: "Musafir Inn", key: "nav.perkhidmatan.musafir" },
    ], "nav.perkhidmatan") +
    item("galeri.html", "Galeri", active === "galeri", null, "nav.galeri") +
    item("hubungi.html", "Hubungi", active === "hubungi", null, "nav.hubungi") +
    item("index.html#sumbangan", "Sumbangan", false, "nav-cta", "nav.sumbangan") +
    "</ul>\n" +
    '<button type="button" class="lang-toggle" id="langToggle" aria-label="Tukar bahasa">EN</button>\n' +
    '<button class="nav-toggle" id="navToggle" aria-label="Buka menu"><span></span><span></span><span></span></button>\n' +
    "</div>\n</nav>\n"
  );
}

function footer() {
  const faUrl = CONFIG.facebookUrl;
  return (
    '<footer class="footer">\n' +
    '<div class="container footer-grid">\n' +
    '<div class="footer-col footer-about">' +
    '<div class="footer-logos">' +
    '<img src="images/logo.png" class="footer-logo logo-img" alt="Logo Masjid Bandar Labis" hidden>' +
    '<span class="logo-fallback footer-logo-fallback" hidden>\u{1F54C}</span>' +
    '<img src="images/jata-negeri-johor.png" class="footer-jata" alt="Jata Negeri Johor" loading="lazy">' +
    "</div>" +
    "<h3>Masjid <b>Bandar Labis</b></h3>" +
    '<p data-i18n="footer.about">Jalan Muar, 85300 Labis, Johor Darul Ta\'azim.</p>' +
    '<p data-i18n="footer.seliaan">Di bawah seliaan ' + CONFIG.admin + "</p>" +
    '<p>Jabatan Agama Islam Negeri Johor (JAINJ)</p>' +
    '<div class="footer-socials">' +
    '<a class="social-link" href="' + faUrl + '" target="_blank" rel="noopener noreferrer">' +
    iconSvg("facebook", 18) + '<span data-i18n="footer.fb"> Facebook Masjid Bandar Labis</span></a>' +
    '<a class="social-link social-link--tiktok" href="' + CONFIG.tiktokUrl + '" target="_blank" rel="noopener noreferrer">' +
    iconSvg("tiktok", 18) + '<span>TikTok ' + CONFIG.tiktokUsername + '</span></a>' +
    "</div>\n" +
    "</div>\n" +
    '<div class="footer-col">' +
    '<h4 data-i18n="footer.pautan">Pautan</h4><ul>' +
    '<li><a href="index.html" data-i18n="nav.utama">Utama</a></li>' +
    '<li><a href="tentang.html" data-i18n="nav.tentang">Tentang</a></li>' +
    '<li><a href="galeri.html" data-i18n="nav.galeri">Galeri</a></li>' +
    '<li><a href="hubungi.html" data-i18n="nav.hubungi">Hubungi</a></li>' +
    '<li><a href="index.html#sumbangan" data-i18n="nav.sumbangan">Sumbangan</a></li>' +
    "</ul></div>\n" +
    '<div class="footer-col">' +
    '<h4 data-i18n="footer.perkhidmatan">Perkhidmatan</h4><ul>' +
    '<li><a href="aktiviti.html#jadual-kuliah" data-i18n="nav.aktiviti.jadual">Jadual Kuliah</a></li>' +
    '<li><a href="aktiviti.html#siaran-media" data-i18n="nav.aktiviti.siaran">Siaran Media</a></li>' +
    '<li><a href="perkhidmatan.html#urusan-harian" data-i18n="nav.perkhidmatan.urusan">Urusan Harian</a></li>' +
    '<li><a href="perkhidmatan.html#musafir-inn" data-i18n="nav.perkhidmatan.musafir">Musafir Inn</a></li>' +
    "</ul></div>\n" +
    '<div class="footer-col">' +
    '<h4 data-i18n="footer.sumbangan">Sumbangan</h4>' +
    '<p data-i18n="footer.sumbangan.text">Infaq ikhlas anda amat dihargai.</p>' +
    '<div class="footer-bank">' +
    '<span class="bn">' + CONFIG.bank.name + "</span><br>" +
    '<span class="ba">' + CONFIG.bank.account + "</span>" +
    "</div></div>\n" +
    "</div>\n" +
    '<div class="footer-bottom"><div class="container">' +
    '<p>&copy; <span data-year></span> ' + CONFIG.copyright +
    ' &nbsp;|&nbsp; <a href="privacy.html" data-i18n="footer.privacy">Dasar Privasi</a> &nbsp;|&nbsp; <a href="terms.html" data-i18n="footer.terms">Terma</a></p>' +
    "</div></div>\n</footer>\n" +
    '<button class="scroll-top" id="scrollTop" aria-label="Kembali ke atas">\u2191</button>\n'
  );
}

function page(opts) {
  const scripts =
    opts.prayer ? '<script src="js/prayer-times.js?v=' + assetVersion("js/prayer-times.js") + '" defer></script>\n' : "";
  return (
    head(opts.title, opts.description, opts.canonical, opts.titleKey) +
    nav(opts.active) +
    opts.body +
    footer() +
    '<script src="js/i18n.js?v=' + assetVersion("js/i18n.js") + '" defer></script>\n' +
    '<script src="js/main.js?v=' + assetVersion("js/main.js") + '" defer></script>\n' +
    scripts +
    "</body>\n</html>\n"
  );
}

function pageHeader(title, crumb, titleKey, crumbKey) {
  return (
    '<section class="page-header"><div class="container">' +
    "<h1" + (titleKey ? ' data-i18n-html="' + titleKey + '"' : "") + ">" + title + "</h1>" +
    '<p class="breadcrumb"><a href="index.html" data-i18n="nav.breadcrumb">Utama</a> &raquo; <span' +
    (crumbKey ? ' data-i18n="' + crumbKey + '"' : "") + ">" + crumb + "</span></p>" +
    "</div></section>"
  );
}

function sectionHeader(title, subtitle, dark, titleKey, subKey) {
  return (
    '<div class="section-header" data-reveal>' +
    '<h2 class="section-title"' +
    (titleKey ? ' data-i18n-html="' + titleKey + '"' : "") +
    ">" + title + "</h2>" +
    (subtitle ? "<p" + (subKey ? ' data-i18n="' + subKey + '"' : "") + ">" + subtitle + "</p>" : "") +
    '<div class="divider"></div></div>'
  );
}

/* ============================================================
   MUKA SURAT 1 — index.html (Utama + Sumbangan)
   ============================================================ */
function buildIndex() {
  // Slider gambar masjid: edisi 2026 sahaja (fallback: semua galeri)
  const allGal = listGalleryImages();
  const gal2026 = allGal.filter(function (it) { return it.year === "2026"; });
  const galFiles = gal2026.length ? gal2026 : allGal;
  const sliderSlides = galFiles.length
    ? galFiles
        .map(function (it, idx) {
          return (
            '<img src="images/Galeri/' +
            it.sub +
            encodeURIComponent(it.file) +
            '" alt="Galeri Masjid Bandar Labis" class="mosque-slide' +
            (idx === 0 ? " active" : "") +
            '" loading="lazy">'
          );
        })
        .join("")
    : '<div class="mosque-fallback">\u{1F54C}</div>';

  const body =
    // ---------- Hero ----------
    '<section class="hero">' +
    '<div class="hero-pattern" aria-hidden="true"></div>' +
    '<div class="container hero-content">' +
    '<h1 class="hero-title">Masjid <span>Bandar Labis</span></h1>' +
    '<p class="hero-subtitle" data-i18n="hero.subtitle">Memakmurkan Masjid, Menyantuni Ummah</p>' +
    '<p class="hero-admin" data-i18n="hero.admin">Di bawah seliaan ' + CONFIG.admin + " \u00B7 JAINJ</p>" +
    '<div class="hero-actions">' +
    '<a href="tentang.html" class="btn btn-gold" data-i18n="hero.kenali">Kenali Kami</a>' +
    '<a href="#sumbangan" class="btn btn-outline" data-i18n="hero.sumbangan">Sumbangan</a>' +
    "</div>" +
    "</div></section>\n" +

    // ---------- Widget waktu solat ----------
    '<div class="prayer-widget" id="prayerWidget">' +
    '<div class="container"><div class="prayer-loading" data-i18n="prayer.loading">Memuatkan waktu solat...</div></div>' +
    "</div>\n" +

    // ---------- Ringkasan tentang ----------
    '<section class="section">' +
    '<div class="container about-grid">' +
    '<div class="about-text" data-reveal>' +
    '<h2 class="section-title" data-i18n-html="about.title">Selamat Datang ke <span>Masjid Bandar Labis</span></h2>' +
    '<p data-i18n="about.text">Pusat ibadah dan kebajikan umat Islam di Bandar Labis, Daerah Segamat, Johor. Masjid ini menjadi nadi kegiatan keagamaan, pendidikan dan kemasyarakatan setempat, di bawah seliaan ' +
    CONFIG.admin + ".</p>" +
    "</div>" +
    '<div class="mosque-slider" id="mosqueSlider" data-reveal role="region" aria-label="Galeri gambar Masjid Bandar Labis" data-i18n-attr="aria-label:about.slider">' +
    sliderSlides +
    '<a class="mosque-badge" href="galeri.html" data-i18n-html="about.badge">\u{1F4F8} Lihat Galeri</a>' +
    "</div>" +
    "</div></section>\n" +

    // ---------- Program ----------
    '<section class="section section--dark">' +
    '<div class="container">' +
    sectionHeader(
      "Program <span>Masjid</span>",
      "Kegiatan utama yang dikendalikan sepanjang tahun.",
      true,
      "program.title",
      "program.sub"
    ) +
    '<div class="cards-grid">' +
    card("\u{1F54C}", "Solat Jemaah", "Solat fardhu berjemaah lima waktu sehari semalam di masjid.", "", "program.solat", "program.solat.d") +
    card("\u{1F4DC}", "Bacaan Hadis Selepas Asar", "Bacaan hadis diadakan setiap hari selepas solat Asar.", "", "program.hadis", "program.hadis.d") +
    card("\u{1F393}", "Kuliah Mingguan", "Kuliah tafsir, fiqh dan sirah diadakan setiap minggu.", "aktiviti.html#jadual-kuliah", "program.kuliah", "program.kuliah.d") +
    card("\u{1F4D6}", "Kelas Pengajian Al-Quran", "Kelas pengajian al-Quran untuk kanak-kanak dan dewasa.", "", "program.quran", "program.quran.d") +
    card("\u{1F3DB}\uFE0F", "Sewaan Dewan Imam Malik", "Sewaan Dewan Imam Malik untuk majlis, kenduri dan program.", "perkhidmatan.html#dewan", "program.dewan", "program.dewan.d") +
    card("\u{1F6CC}", "Sewaan Bilik Musafir Inn", "Penginapan untuk pengembara dan musafir dengan kadar berpatutan.", "perkhidmatan.html#musafir-inn", "program.inn", "program.inn.d") +
    "</div>" +
    "</div></section>\n" +

    // ---------- Aktiviti Masjid (siaran Facebook) ----------
    '<section class="section">' +
    '<div class="container">' +
    sectionHeader(
      "Aktiviti <span>Masjid</span>",
      "Siaran dan aktiviti terkini daripada Facebook rasmi masjid.",
      undefined,
      "home.aktiviti.title",
      "home.aktiviti.sub"
    ) +
    fbFeedBlock() +
    "</div></section>\n" +

    // ---------- Sumbangan ----------
    '<section class="section section--cream" id="sumbangan">' +
    '<div class="container">' +
    sectionHeader(
      "Sumbangan & <span>Infaq</span>",
      "Sumbangan ikhlas anda menyokong program dan kebajikan masjid. Semoga Allah membalas kebaikan anda.",
      undefined,
      "sumbangan.title",
      "sumbangan.sub"
    ) +
    '<div class="donation-grid">' +
    // Kad akaun bank
    '<div class="donation-card" data-reveal>' +
    "<h3 data-i18n-html=\"sumbangan.bank.title\">\u{1F3E6} <span>Sumbangan Terus ke Akaun</span></h3>" +
    '<p data-i18n="sumbangan.bank.desc">Salurkan infaq anda melalui akaun rasmi masjid:</p>' +
    '<div class="bank-box">' +
    '<span class="bank-name">' + CONFIG.bank.name + "</span>" +
    '<span class="bank-account" id="bankAccount">' + CONFIG.bank.account + "</span><br>" +
    '<button type="button" class="btn btn-gold" id="copyAccount" data-i18n="sumbangan.copy">Salin Nombor Akaun</button>' +
    '<span class="copy-msg" id="copyMsg" style="display:none"></span>' +
    "</div>" +
    '<p data-i18n="sumbangan.bank.note">Semua kutipan digunakan untuk pengurusan masjid, program ilmiah dan kebajikan ummah. Mohon sertakan rujukan \u201CInfaq\u201D sekiranya membuat pindahan.</p>' +
    "</div>" +
    // Kad QR
    '<div class="donation-card" data-reveal>' +
    "<h3 data-i18n-html=\"sumbangan.qr.title\">\u{1F4F1} <span>Scan QR</span></h3>" +
    '<p data-i18n="sumbangan.qr.desc">Imbas kod QR di bawah menggunakan aplikasi perbankan (DuitNow QR):</p>' +
    '<div class="qr-frame">' +
    '<button type="button" class="qr-click" id="qrOpen" aria-label="Perbesar kod QR untuk scan">' +
    '<img src="' +
    CONFIG.qrImage +
    '" id="qrDonation" alt="DuitNow QR sumbangan Masjid Bandar Labis" class="qr-image" width="200" height="200" data-i18n-attr="alt:sumbangan.qr.alt">' +
    '<div class="qr-placeholder" id="qrPlaceholder" hidden>' +
    "<span>\u{1F4F1}</span>" +
    "<p>QR Code akan dipaparkan di sini.</p>" +
    "<p><small>Sila letakkan fail <code>images/qr-sumbangan.jpg</code> (DuitNow QR rasmi daripada app Bank Rakyat).</small></p>" +
    "</div>" +
    "</button>" +
    '<span class="qr-hint" data-i18n="sumbangan.qr.hint">\u{1F446} Klik untuk besarkan &amp; scan</span>' +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div></section>\n" +

    // ---------- CTA ----------
    '<section class="section">' +
    '<div class="container"><div class="cta-banner" data-reveal>' +
    '<h3 data-i18n-html="cta.title">Jom Sertai <span>Aktiviti Masjid</span></h3>' +
    '<p data-i18n="cta.text">Lawati kami, sertai kuliah, atau hubungi pihak pengurusan untuk sebarang pertanyaan.</p>' +
    '<div class="hero-actions">' +
    '<a href="aktiviti.html" class="btn btn-gold" data-i18n="cta.btn1">Lihat Aktiviti</a>' +
    '<a href="hubungi.html" class="btn btn-dark" data-i18n="cta.btn2">Hubungi Kami</a>' +
    "</div>" +
    "</div></div></section>\n" +

    // ---------- Modal QR (perbesar untuk scan) ----------
    '<div class="modal" id="qrModal" hidden role="dialog" aria-modal="true" aria-label="QR Sumbangan Masjid Bandar Labis">' +
    '<div class="modal-backdrop" data-qr-close></div>' +
    '<div class="modal-box">' +
    '<button type="button" class="modal-close" data-qr-close aria-label="Tutup">\u2715</button>' +
    '<img src="' +
    CONFIG.qrImage +
    '" id="qrLarge" alt="DuitNow QR sumbangan Masjid Bandar Labis">' +
    '<p class="modal-text"><span data-i18n="sumbangan.qr.modal">Imbas QR untuk sumbangan</span><br><strong>' +
    CONFIG.bank.name +
    " " +
    CONFIG.bank.account +
    "</strong></p>" +
    "</div>" +
    "</div>";

  write(
    "index.html",
    page({
      title: "Masjid Bandar Labis \u2014 Utama",
      titleKey: "title.index",
      canonical: "https://" + CONFIG.customDomain + "/",
      description:
        "Laman rasmi Masjid Bandar Labis, Segamat, Johor. Waktu solat, aktiviti, perkhidmatan dan maklumat sumbangan.",
      active: "index",
      body: body,
      prayer: true,
    })
  );
}

/* ============================================================
   MUKA SURAT 2 — tentang.html
   ============================================================ */
function buildTentang() {
  // Kad pegawai masjid (gambar auto jika wujud, jika tidak guna inisial)
  const JKT = { "Imam": "jawatan.imam", "Bilal": "jawatan.bilal", "Pembantu Am": "jawatan.pa" };
  const pegawaiDir = path.join(ROOT, "images", "pegawai");
  const pegawaiCards = CONFIG.pegawai
    .map(function (p) {
      const photoPath = path.join(pegawaiDir, p.key + ".jpg");
      const hasPhoto = fs.existsSync(photoPath);
      const photo = hasPhoto
        ? '<img src="images/pegawai/' + p.key + '.jpg" alt="' + p.nama + '" loading="lazy">'
        : '<span class="pegawai-initials">' + initials(p.nama) + "</span>";
      return (
        '<div class="pegawai-card" data-reveal>' +
        '<div class="pegawai-photo">' + photo + "</div>" +
        "<h4>" + p.nama + "</h4>" +
        '<span class="pegawai-jawatan"' + (JKT[p.jawatan] ? ' data-i18n="' + JKT[p.jawatan] + '"' : "") + ">" + p.jawatan + "</span>" +
        '<p class="pegawai-tel">\u{1F4DE} ' + p.telefon + "</p>" +
        "</div>"
      );
    })
    .join("");

  const body =
    pageHeader("Tentang <span>Masjid</span>", "Tentang Masjid", "tentang.header", "crumb.tentang") +

    // ---------- Sejarah ----------
    '<section class="section" id="sejarah">' +
    '<div class="container">' +
    sectionHeader(
      "Sejarah <span>Masjid</span>",
      "Riwayat Masjid Jamik Labis dari awal pembinaan hingga ke tapak sekarang di Jalan Muar.",
      undefined,
      "sejarah.title",
      "sejarah.sub"
    ) +
    // Gambar lama masjid
    '<figure class="history-photo" data-reveal>' +
    '<img src="' +
    CONFIG.sejarahImage +
    '" alt="Masjid Jamik Labis (gambar lama)" loading="lazy" data-i18n-attr="alt:sejarah.photo.alt">' +
    '<figcaption class="history-caption" data-i18n="sejarah.photo.cap">Masjid Jamik Labis &mdash; gambar lama</figcaption>' +
    "</figure>" +
    // Era 1
    '<div class="history-era" data-reveal>' +
    '<h3><span class="era-year">1960-an</span> <span data-i18n="era1.title">Masjid Jamik Labis Pertama &mdash; Jalan Tenang</span></h3>' +
    '<p data-i18n="era1.p1">Sebelum terdirinya bangunan Masjid Bandar Labis di Jalan Muar sekarang, Masjid Jamik Labis yang awal terletak di Jalan Tenang, bersebelahan betul-betul dengan rumah En. Ibrahim (mantan YB ADUN Tenang). Tapak masjid tersebut masih wujud sehingga hari ini, dan di atas tapak masjid awal ini kini terdapat sebuah warung orang kampung Paya Merah yang menumpang sementara.</p>' +
    '<p data-i18n="era1.p2">Masjid ini dibina oleh masyarakat setempat sekitar tahun 1960-an. Seni binanya bercirikan Islamik dan keseluruhan bangunannya terdiri daripada binaan kayu, serta dikatakan tiada menara. Ia mampu memuatkan kira-kira 200 orang jemaah dalam satu-satu masa.</p>' +
    '<p data-i18n="era1.p3">Dari segi pentadbiran, masjid ini ditadbir oleh jawatankuasa daripada masyarakat setempat di Labis. Imam pertama yang berkhidmat ialah Imam Talib dan Imam Haji Khalid bin Chidun, manakala bilalnya bernama Bilal Mohd Deli.</p>' +
    "</div>" +
    // Era 2
    '<div class="history-era" data-reveal>' +
    '<h3><span class="era-year">1968</span> <span data-i18n="era2.title">Masjid Jamik Labis Kedua &mdash; Jalan Yong Peng</span></h3>' +
    '<p data-i18n="era2.p1">Dengan perubahan suasana dan perkembangan semasa, Masjid Jamik Labis yang pertama di Jalan Tenang berpindah ke tempat baharu di Jalan Yong Peng, bersebelahan dengan Sekolah Kebangsaan Labis, pada tahun 1968.</p>' +
    '<p data-i18n="era2.p2">Keadaan binaan masjid yang kedua ini lebih baik, cantik dan sempurna, dengan keseluruhan binaannya daripada batu bata. Reka bentuknya lebih menarik dan selesa, sama ada di bahagian dalaman mahupun halaman persekitaran luar. Kawasan penempatan kenderaan agak luas dan menepati keperluan jemaah. Terdapat satu menara yang tinggi dengan corong pembesar suara, dan masjid ini boleh memuatkan kira-kira 500 orang jemaah dalam satu-satu masa.</p>' +
    '<p data-i18n="era2.p3">Pada permulaannya, pentadbiran masjid dipimpin oleh pengerusi daripada ahli kariah setempat, dan kemudiannya bertukar kepada Haji Wagiman. Imam pertama yang berkhidmat ialah Imam Haji Khalid bin Chindun, Imam Tukiran dan Imam Abdul Rafar bin Yusof.</p>' +
    '<p data-i18n="era2.p4">Selepas itu, pentadbiran Masjid Jamik Labis di Jalan Yong Peng diambil alih oleh Kerajaan Johor dan berada di bawah pentadbiran ' +
    CONFIG.admin +
    ". Pengerusinya ialah Assyekh Haji Azman bin Mokhsin, disusuli Assyekh Haji Ahmad Faisal bin Mohamad, dan Assyekh Haji Sulaiman bin Maiden.</p>" +
    "</div>" +
    // Era 3
    '<div class="history-era" data-reveal>' +
    '<h3><span class="era-year">Kini</span> <span data-i18n="era3.title">Perpindahan ke Jalan Muar (Masjid Bandar Labis)</span></h3>' +
    '<p data-i18n="era3.p1">Saban tahun, Labis menyaksikan perubahan kepadatan penduduk, perkembangan ekonomi dan pembangunan yang semakin berkembang. Justeru, beberapa pihak yang bertanggungjawab &mdash; termasuk pihak Pejabat Kadi Daerah Segamat beserta AJK, YB ADUN Tenang dan Majlis Daerah Labis &mdash; bersetuju bahawa Masjid Jamik Labis di Jalan Yong Peng perlu diperbaharui.</p>' +
    '<p data-i18n="era3.p2">Bagi menjayakan hasrat ini, semua pihak bersetuju untuk berpindah ke tapak yang lebih luas dan selesa, iaitu sebuah padang milik Majlis Daerah Labis di Jalan Muar, bersebelahan dengan dewan Majlis Daerah Labis. Tapak inilah yang menjadi lokasi Masjid Bandar Labis yang ada pada hari ini, di bawah seliaan ' +
    CONFIG.admin +
    ", Jabatan Agama Islam Negeri Johor (JAINJ).</p>" +
    "</div>" +
    "</div></section>\n" +

    // ---------- Visi & Misi ----------
    '<section class="section section--cream" id="visi-misi">' +
    '<div class="container">' +
    sectionHeader("Visi & <span>Misi</span>", undefined, undefined, "visi.title") +
    '<div class="cards-grid">' +
    card("\u{1F4A1}", "Visi", "Menjadi pusat kecemerlangan ibadah dan pembangunan ummah di Bandar Labis.", "tentang.html", "visi.card1.t", "visi.card1.d") +
    card("\u{1F3AF}", "Misi", "Memakmurkan masjid dengan ibadah, pendidikan, kebajikan dan perpaduan komuniti.", "tentang.html", "visi.card2.t", "visi.card2.d") +
    card("\u{1F4AD}", "Nilai", "Ikhlas, Amanah, Ilmu dan Kebersamaan dalam setiap urusan.", "tentang.html", "visi.card3.t", "visi.card3.d") +
    "</div>" +
    "</div></section>\n" +

    // ---------- Carta Organisasi ----------
    '<section class="section" id="carta">' +
    '<div class="container">' +
    sectionHeader("Carta <span>Organisasi</span>", undefined, undefined, "carta.title") +
    '<figure class="carta-figure" data-reveal>' +
    '<img src="' +
    CONFIG.cartaImage +
    '" alt="Carta pentadbiran Masjid Bandar Labis" loading="lazy" data-i18n-attr="alt:carta.alt">' +
    "</figure>" +
    "</div></section>\n" +

    // ---------- Senarai pegawai masjid ----------
    '<section class="section section--cream" id="pegawai">' +
    '<div class="container">' +
    sectionHeader(
      "Senarai <span>Pegawai Masjid</span>",
      "Imam, bilal dan petugas yang memakmurkan Masjid Bandar Labis.",
      undefined,
      "pegawai.title",
      "pegawai.sub"
    ) +
    '<div class="pegawai-grid">' + pegawaiCards + "</div>" +
    '<p class="form-note" style="text-align:center;margin-top:24px;" data-i18n="pegawai.note">Foto pegawai akan dimuat naik dari semasa ke semasa.</p>' +
    "</div></section>\n";

  write(
    "tentang.html",
    page({
      title: "Tentang Masjid \u2014 Masjid Bandar Labis",
      titleKey: "title.tentang",
      canonical: "https://" + CONFIG.customDomain + "/tentang.html",
      description:
        "Sejarah, visi dan misi serta carta organisasi Masjid Bandar Labis, Segamat, Johor.",
      active: "tentang",
      body: body,
    })
  );
}

/* ============================================================
   MUKA SURAT 3 — aktiviti.html (Jadual Kuliah + Siaran Media)
   ============================================================ */
/* ---------- Siaran Facebook (dari src/fb-posts.json) ---------- */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readFbPosts() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "fb-posts.json"), "utf8"));
    if (Array.isArray(data) && data.length) return data;
  } catch (e) {
    // Tiada cache - guna fallback statik
  }
  return null;
}

function formatFbDate(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ms-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch (e) {
    return String(iso).slice(0, 10);
  }
}

function fbPostCard(p) {
  const link = esc(p.permalink_url);
  const img = p.full_picture
    ? '<div class="fb-post-img"><img src="' + esc(p.full_picture) + '" alt="Gambar siaran Facebook Masjid Bandar Labis" loading="lazy"></div>'
    : "";
  const msg = p.message ? '<p class="fb-post-msg">' + esc(p.message) + "</p>" : "";
  return (
    '<a class="fb-post-card" href="' + link + '" target="_blank" rel="noopener noreferrer">' +
    img +
    '<div class="fb-post-body">' +
    '<span class="fb-post-date">' + esc(formatFbDate(p.created_time)) + "</span>" +
    msg +
    '<span class="fb-post-link">Lihat di Facebook &rarr;</span>' +
    "</div></a>"
  );
}

function fbFeedBlock(extraClass) {
  const fbFeed = readFbPosts();
  const cls = extraClass ? " " + extraClass : "";
  if (fbFeed && fbFeed.length) {
    return '<div class="fb-posts-grid' + cls + '">' + fbFeed.map(fbPostCard).join("") + "</div>";
  }
  // Fallback: kad statik jika tiada cache siaran
  return (
    '<div class="media-grid">' +
    '<a class="media-tile" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    '<span class="media-play">\u25B6</span><span class="media-caption" data-i18n="video.cap1">Kuliah Tafsir Al-Quran</span></a>' +
    '<a class="media-tile" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    '<span class="media-play">\u25B6</span><span class="media-caption" data-i18n="video.cap2">Sambutan Maulidur Rasul</span></a>' +
    '<a class="media-tile" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    '<span class="media-play">\u25B6</span><span class="media-caption" data-i18n="video.cap3">Program Ihya\u2019 Ramadan</span></a>' +
    "</div>"
  );
}

/* ============================================================
   JADUAL KULIAH OGOS & SEPTEMBER 2026
   (Sumber: PDF Senarai Bayaran Saguhanti Kuliah Mingguan)
   Semua kuliah selepas solat Maghrib, kecuali Khamis =
   Kuliah Dhuha pada waktu pagi. null = tiada kuliah.
   ============================================================ */
const JADUAL_KULIAH = [
  {
    bulan: "Ogos 2026",
    minggu: [
      {
        label: "Minggu 1", tarikh: "1 - 7 Ogos",
        rows: [
          ["1", "Sabtu", false, "Ust. Khairul Anuar bin Isnin", "Zakat, Fekah, Wakaf"],
          ["2", "Ahad", false, "Ust. Muhamad Syafie bin Bachok", "Bab Akidah"],
          ["3", "Isnin", false, "Imam Bertugas", "Ratib Al-Attas"],
          ["4", "Selasa", false, "Ust. Wan Ismail bin Wan Dagang", "Tafsir Al-Quran"],
          ["5", "Rabu", false, "Ust. Muhd Syahmi Wahiduddin bin Hasnol Hadi", "Fekh & Tasauf"],
          ["6", "Khamis", true, "Ust. Norizam bin Suradi", "Kuliah Dhuha Pagi"],
          ["7", "Jumaat", false, "As-Sheikh Kadi Daerah Segamat", "Tajuk Khas"],
        ],
      },
      {
        label: "Minggu 2", tarikh: "8 - 14 Ogos",
        rows: [
          ["8", "Sabtu", false, "As-Sheikh Haji Nasri bin Rahman", "Risalah Tauhid"],
          ["9", "Ahad", false, "Ust. Abdul Hadi bin Mohamed Suhaimi", "Hadis"],
          ["10", "Isnin", false, "Imam Bertugas", "Ratib Al-Attas"],
          null,
          ["12", "Rabu", false, "Imam Daerah Segamat", "Tajuk Khas"],
          ["13", "Khamis", true, "Ust. Norizam bin Suradi", "Kuliah Dhuha Pagi"],
          ["14", "Jumaat", false, "As-Sheikh Kadi Daerah Segamat", "Tajuk Khas"],
        ],
      },
      {
        label: "Minggu 3", tarikh: "15 - 21 Ogos",
        rows: [
          ["15", "Sabtu", false, "Ust. Khairul Anuar bin Isnin", "Zakat, Fekah, Wakaf"],
          ["16", "Ahad", false, "Ust. Muhamad Syafie bin Bachok", "Bab Akidah"],
          ["17", "Isnin", false, "Imam Bertugas", "Ratib Al-Attas"],
          ["18", "Selasa", false, "Ust. Wan Ismail bin Wan Dagang", "Tafsir Al-Quran"],
          ["19", "Rabu", false, "Ust. Solihin bin Abd Rahman", "Feqah"],
          ["20", "Khamis", true, "Ust. Norizam bin Suradi", "Kuliah Dhuha Pagi"],
          ["21", "Jumaat", false, "As-Sheikh Kadi Daerah Segamat", "Tajuk Khas"],
        ],
      },
      {
        label: "Minggu 4", tarikh: "22 - 28 Ogos",
        rows: [
          ["22", "Sabtu", false, "As-Sheikh Haji Nasri bin Rahman", "Risalah Tauhid"],
          ["23", "Ahad", false, "Ust. Abdul Hadi bin Mohamed Suhaimi", "Hadis"],
          ["24", "Isnin", false, "Imam Bertugas", "Ratib Al-Attas"],
          null,
          ["26", "Rabu", false, "Ust. Muhd Syahmi Wahiduddin bin Hasnol Hadi", "Fekh & Tasauf"],
          ["27", "Khamis", true, "Ust. Norizam bin Suradi", "Kuliah Dhuha Pagi"],
          ["28", "Jumaat", false, "As-Sheikh Kadi Daerah Segamat", "Tajuk Khas"],
        ],
      },
      {
        label: "Minggu 5", tarikh: "29 - 31 Ogos",
        rows: [
          null,
          null,
          ["31", "Isnin", false, "Imam Bertugas", "Ratib Al-Attas"],
        ],
      },
    ],
  },
  {
    bulan: "September 2026",
    minggu: [
      {
        label: "Minggu 1", tarikh: "1 - 7 September",
        rows: [
          ["1", "Selasa", false, "Ust. Wan Ismail bin Wan Dagang", "Tafsir Al-Quran"],
          ["2", "Rabu", false, "Ust. Muhd Syahmi Wahiduddin bin Hasnol Hadi", "Fekh & Tasauf"],
          ["3", "Khamis", true, "Ust. Norizam bin Suradi", "Kuliah Dhuha Pagi"],
          ["4", "Jumaat", false, "As-Sheikh Kadi Daerah Segamat", "Tajuk Khas"],
          ["5", "Sabtu", false, "Ust. Khairul Anuar bin Isnin", "Zakat, Fekah, Wakaf"],
          ["6", "Ahad", false, "Ust. Muhamad Syafie bin Bachok", "Bab Akidah"],
          ["7", "Isnin", false, "Imam Bertugas", "Ratib Al-Attas"],
        ],
      },
      {
        label: "Minggu 2", tarikh: "8 - 14 September",
        rows: [
          null,
          ["9", "Rabu", false, "Imam Daerah Segamat", "Tajuk Khas"],
          ["10", "Khamis", true, "Ust. Norizam bin Suradi", "Kuliah Dhuha Pagi"],
          ["11", "Jumaat", false, "As-Sheikh Kadi Daerah Segamat", "Tajuk Khas"],
          ["12", "Sabtu", false, "As-Sheikh Haji Nasri bin Rahman", "Risalah Tauhid"],
          ["13", "Ahad", false, "Ust. Abdul Hadi bin Mohamed Suhaimi", "Hadis"],
          ["14", "Isnin", false, "Imam Bertugas", "Ratib Al-Attas"],
        ],
      },
      {
        label: "Minggu 3", tarikh: "15 - 21 September",
        rows: [
          ["15", "Selasa", false, "Ust. Wan Ismail bin Wan Dagang", "Tafsir Al-Quran"],
          ["16", "Rabu", false, "Ust. Solihin bin Abd Rahman", "Feqah"],
          ["17", "Khamis", true, "Ust. Norizam bin Suradi", "Kuliah Dhuha Pagi"],
          ["18", "Jumaat", false, "As-Sheikh Kadi Daerah Segamat", "Tajuk Khas"],
          ["19", "Sabtu", false, "Ust. Khairul Anuar bin Isnin", "Zakat, Fekah, Wakaf"],
          ["20", "Ahad", false, "Ust. Muhamad Syafie bin Bachok", "Bab Akidah"],
          ["21", "Isnin", false, "Imam Bertugas", "Ratib Al-Attas"],
        ],
      },
      {
        label: "Minggu 4", tarikh: "22 - 28 September",
        rows: [
          null,
          ["23", "Rabu", false, "Ust. Muhd Syahmi Wahiduddin bin Hasnol Hadi", "Fekh & Tasauf"],
          ["24", "Khamis", true, "Ust. Norizam bin Suradi", "Kuliah Dhuha Pagi"],
          ["25", "Jumaat", false, "As-Sheikh Kadi Daerah Segamat", "Tajuk Khas"],
          ["26", "Sabtu", false, "As-Sheikh Haji Nasri bin Rahman", "Risalah Tauhid"],
          ["27", "Ahad", false, "Ust. Abdul Hadi bin Mohamed Suhaimi", "Hadis"],
          ["28", "Isnin", false, "Imam Bertugas", "Ratib Al-Attas"],
        ],
      },
      {
        label: "Minggu 5", tarikh: "29 - 30 September",
        rows: [
          ["29", "Selasa", false, "Ust. Wan Ismail bin Wan Dagang", "Tafsir Al-Quran"],
          null,
        ],
      },
    ],
  },
];

// Padanan hari BM -> kunci i18n
const HARI_KEYS = {
  "Sabtu": "hari.sabtu", "Ahad": "hari.ahad", "Isnin": "hari.isnin",
  "Selasa": "hari.selasa", "Rabu": "hari.rabu", "Khamis": "hari.khamis",
  "Jumaat": "hari.jumaat",
};

// Padanan nama bulan BM -> kunci i18n (untuk teks "1 - 7 Ogos" dsb.)
const BULAN_KEYS = {
  "Januari": "bulan.januari", "Februari": "bulan.februari", "Mac": "bulan.mac",
  "April": "bulan.april", "Mei": "bulan.mei", "Jun": "bulan.jun",
  "Julai": "bulan.julai", "Ogos": "bulan.ogos", "September": "bulan.september",
  "Oktober": "bulan.oktober", "November": "bulan.november", "Disember": "bulan.disember",
};

// Gantikan nama bulan dalam teks dengan span i18n
function i18nBulan(text) {
  var out = esc(text);
  for (var nama in BULAN_KEYS) {
    out = out.split(nama).join('<span data-i18n="' + BULAN_KEYS[nama] + '">' + nama + "</span>");
  }
  return out;
}

function jadualKuliahHtml() {
  return JADUAL_KULIAH.map(function (bulan) {
    var body = bulan.minggu.map(function (w) {
      var weekHead =
        '<tr class="week-row"><td colspan="5"><strong><span data-i18n="jadual.minggu">Minggu</span> ' +
        esc(w.label.replace(/^Minggu\s*/, "")) + "</strong> &mdash; " + i18nBulan(w.tarikh) + "</td></tr>";
      var weekRows = w.rows
        .map(function (r) {
          if (!r) return "";
          var masa = r[2]
            ? '<span data-i18n="jadual.masa.dhuha">Dhuha Pagi</span>'
            : '<span data-i18n="jadual.masa.maghrib">Selepas Maghrib</span>';
          var hariKey = HARI_KEYS[r[1]];
          var hari = hariKey
            ? '<span data-i18n="' + hariKey + '">' + esc(r[1]) + "</span>"
            : esc(r[1]);
          return (
            "<tr>" +
            "<td>" + esc(r[0]) + "</td>" +
            "<td>" + hari + "</td>" +
            "<td>" + masa + "</td>" +
            "<td>" + esc(r[3]) + "</td>" +
            "<td>" + esc(r[4]) + "</td>" +
            "</tr>"
          );
        })
        .join("");
      return weekHead + weekRows;
    }).join("");
    return (
      '<h3 class="jadual-bulan">' + i18nBulan(bulan.bulan) + "</h3>" +
      '<div class="table-wrap" data-reveal>' +
      "<table>" +
      '<thead><tr><th data-i18n="jadual.th.tarikh">Tarikh</th><th data-i18n="jadual.th.hari">Hari</th><th data-i18n="jadual.th.masa">Masa</th><th data-i18n="jadual.th.penceramah">Penceramah</th><th data-i18n="jadual.th.tajuk">Tajuk</th></tr></thead>' +
      "<tbody>" + body + "</tbody></table></div>"
    );
  }).join("");
}

function buildAktiviti() {
  const body =
    pageHeader("Aktiviti <span>Masjid</span>", "Aktiviti", "aktiviti.header", "crumb.aktiviti") +

    // ---------- Jadual kuliah ----------
    '<section class="section" id="jadual-kuliah">' +
    '<div class="container">' +
    sectionHeader(
      "Jadual <span>Kuliah</span>",
      "Kuliah mingguan diadakan selepas solat, terbuka kepada semua.",
      undefined,
      "jadual.title",
      "jadual.sub"
    ) +
    jadualKuliahHtml() +
    '<p class="form-note" style="margin-top:16px;text-align:center;" data-i18n="jadual.note">Semua kuliah selepas solat Maghrib, kecuali Khamis (Kuliah Dhuha pagi). Jadual boleh berubah &mdash; sila rujuk pengumuman rasmi masjid atau Facebook page untuk pengesahan.</p>' +
    "</div></section>\n" +

    // ---------- Siaran media ----------
    '<section class="section section--dark" id="siaran-media">' +
    '<div class="container">' +
    sectionHeader(
      "Siaran <span>Media</span>",
      "Ikuti siaran, video dan pengumuman terkini masjid.",
      true,
      "siaran.title",
      "siaran.sub"
    ) +

    // Facebook card
    '<div class="fb-card" data-reveal>' +
    '<div class="fb-icon">' + iconSvg("facebook", 30) + "</div>" +
    "<div>" +
    '<h3 data-i18n="siaran.fb.title">Ikuti Facebook Rasmi Masjid Bandar Labis</h3>' +
    '<p data-i18n="siaran.fb.text">Siaran langsung kuliah, video program dan pengumuman terkini dikongsi melalui page rasmi.</p>' +
    '<a class="btn btn-gold" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    iconSvg("facebook", 18) + '<span data-i18n="siaran.fb.btn"> Lawati Facebook Page</span></a>' +
    "</div></div>\n" +
    '<div class="fb-card fb-card--tiktok" data-reveal>' +
    '<div class="fb-icon">' + iconSvg("tiktok", 30) + "</div>" +
    "<div>" +
    '<h3 data-i18n="siaran.tiktok.title">TikTok Rasmi Masjid Bandar Labis</h3>' +
    '<p data-i18n="siaran.tiktok.text">Video pendek aktiviti, kuliah dan program masjid dikongsi melalui akaun TikTok rasmi.</p>' +
    '<a class="btn btn-gold" href="' + CONFIG.tiktokUrl + '" target="_blank" rel="noopener noreferrer">' +
    iconSvg("tiktok", 18) + '<span data-i18n="siaran.tiktok.btn"> Ikuti TikTok</span> ' + CONFIG.tiktokUsername + "</a>" +
    "</div></div>\n" +

    // Video grid / Siaran Facebook terkini
    "<h3 style=\"text-align:center;color:var(--white);margin-bottom:24px;font-size:1.25rem;\" data-i18n-html=\"siaran.video.title\">Video &amp; Siaran Terkini</h3>" +
    "<!-- FB-FEED-START -->\n" +
    fbFeedBlock() +
    "\n<!-- FB-FEED-END -->\n" +
    '<p style="text-align:center;color:#b8b8b8;font-size:0.85rem;margin-top:16px;" data-i18n="siaran.video.note">Video akan dikemas kini dari semasa ke semasa melalui page rasmi masjid.</p>' +

    "</div></section>\n";

  write(
    "aktiviti.html",
    page({
      title: "Aktiviti \u2014 Masjid Bandar Labis",
      titleKey: "title.aktiviti",
      canonical: "https://" + CONFIG.customDomain + "/aktiviti.html",
      description:
        "Jadual kuliah mingguan dan siaran media Masjid Bandar Labis — video, siaran langsung dan pengumuman terkini.",
      active: "aktiviti",
      body: body,
    })
  );
}

/* ============================================================
   MUKA SURAT 4 — perkhidmatan.html (Urusan Harian + Musafir Inn)
   ============================================================ */
function buildPerkhidmatan() {
  // Foto Musafir Inn: gambar pertama dalam folder images/Musafir Inn
  const innDir = path.join(ROOT, "images", "Musafir Inn");
  let innPhoto = "";
  if (fs.existsSync(innDir)) {
    const innFiles = fs.readdirSync(innDir).filter(function (f) {
      return /\.[jJ][pP][gG]$|\.[jJ][pP][eE][gG]$|\.png$|\.webp$/.test(f);
    });
    if (innFiles.length) {
      innPhoto =
        '<figure class="inn-photo" data-reveal>' +
        '<img src="images/Musafir Inn/' + encodeURIComponent(innFiles[0]) +
        '" alt="Musafir Inn Masjid Bandar Labis" loading="lazy">' +
        "</figure>";
    }
  }

  const body =
    pageHeader("Perkhidmatan <span>Masjid</span>", "Perkhidmatan", "perkhidmatan.header", "crumb.perkhidmatan") +

    // ---------- Urusan harian ----------
    '<section class="section" id="urusan-harian">' +
    '<div class="container">' +
    sectionHeader(
      "Urusan <span>Harian</span>",
      "Perkhidmatan harian yang disediakan kepada masyarakat.",
      undefined,
      "urusan.title",
      "urusan.sub"
    ) +
    '<div class="cards-grid">' +
    card("\u{1F54A}\uFE0F", "Pengurusan Jenazah", "Bantuan mandi, kafan, solat jenazah dan urusan pengkebumian. Beroperasi 24 jam.", "perkhidmatan.html#jenazah", "urusan.jenazah.t", "urusan.jenazah.d") +
    card("\u{1F3E2}", "Sewaan Dewan Imam Malik", "Tempah Dewan Imam Malik untuk majlis, kenduri dan program.", "perkhidmatan.html#dewan", "urusan.dewan.t", "urusan.dewan.d") +
    card("\u{1F6CC}", "Musafir Inn", "Penginapan untuk pengembara dan musafir dengan kadar berpatutan.", "perkhidmatan.html#musafir-inn", "urusan.musafir.t", "urusan.musafir.d") +
    "</div>" +
    "</div></section>\n" +

    // ---------- Butiran urusan harian ----------
    '<section class="section section--cream">' +
    '<div class="container">' +
    "<div>" +
    '<div id="jenazah" data-reveal>' +
    "<h2 class=\"section-title\" data-i18n-html=\"jenazah.title\">Pengurusan <span>Jenazah</span></h2>" +
    '<p style="color:var(--muted);margin-top:10px;" data-i18n="jenazah.desc">Masjid menyediakan perkhidmatan pengurusan jenazah untuk umat Islam di kawasan Bandar Labis dan sekitarnya:</p>' +
    "<ul style=\"margin:16px 0 0 20px;display:grid;gap:8px;color:var(--muted);list-style:disc;\">" +
    '<li data-i18n="jenazah.li1">Mandi dan kafan jenazah</li>' +
    '<li data-i18n="jenazah.li2">Solat jenazah di masjid</li>' +
    '<li data-i18n="jenazah.li3">Urusan tanah perkuburan</li>' +
    '<li data-i18n="jenazah.li4">Koordinasi bersama pihak berkuasa agama</li>' +
    "</ul>" +
    '<p style="margin-top:16px;"><a class="btn btn-gold" href="hubungi.html" data-i18n="jenazah.btn">Hubungi Pihak Masjid</a></p>' +
    '<div class="spjm-box">' +
    '<h3 data-i18n="jenazah.spjm.title">Bantuan SPJM Johor Cawangan Labis</h3>' +
    '<p data-i18n="jenazah.spjm.desc">Untuk urusan jenazah segera, hubungi sukarelawan SPJM Johor Cawangan Labis:</p>' +
    '<ul class="spjm-list">' +
    '<li><span class="spjm-name">Zali</span><a class="spjm-tel" href="tel:+60127681518">012-7681518</a>' +
    '<a class="spjm-wa" href="https://wa.me/60127681518" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Zali">' + iconSvg("whatsapp", 16) + "</a></li>" +
    '<li><span class="spjm-name">Akil</span><a class="spjm-tel" href="tel:+60177545530">017-7545530</a>' +
    '<a class="spjm-wa" href="https://wa.me/60177545530" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Akil">' + iconSvg("whatsapp", 16) + "</a></li>" +
    '<li><span class="spjm-name">Bro Fizi</span><a class="spjm-tel" href="tel:+60177494773">017-7494773</a>' +
    '<a class="spjm-wa" href="https://wa.me/60177494773" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Bro Fizi">' + iconSvg("whatsapp", 16) + "</a></li>" +
    "</ul></div>" +
    "</div>" +
    '<div class="dewan-form" id="dewan" data-reveal>' +
    '<div class="dewan-photo"><img src="images/Dewan Imam Malik/dewan-imam-malik-2026.jpg" alt="Dewan Imam Malik Masjid Bandar Labis" loading="lazy"></div>' +
    '<h2 class="section-title" style="margin-bottom:16px;" data-i18n-html="dewan.title">Tempahan <span style="color:var(--black);">Dewan Imam Malik</span></h2>' +
    '<p style="color:var(--muted);margin-top:10px;margin-bottom:16px;" data-i18n="dewan.desc">Untuk menempah Dewan Imam Malik, isi borang di bawah. Pihak masjid akan menghubungi anda untuk pengesahan.</p>' +
    '<form data-form="dewan">' +
    '<input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">' +
    '<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">' +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="dw-nama" data-i18n="dewan.nama">Nama</label>' +
    '<input type="text" class="form-control" id="dw-nama" name="Nama" required maxlength="100"></div>' +
    '<div class="form-group"><label for="dw-tel" data-i18n="dewan.tel">No. Telefon</label>' +
    '<input type="tel" class="form-control" id="dw-tel" name="No. Telefon" required maxlength="20" autocomplete="tel"></div>' +
    "</div>" +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="dw-guna" data-i18n="dewan.guna">Kegunaan Dewan</label>' +
    '<input type="text" class="form-control" id="dw-guna" name="Kegunaan Dewan" required maxlength="100"></div>' +
    '<div class="form-group"><label for="dw-tarikh" data-i18n="dewan.tarikh">Tarikh</label>' +
    '<input type="date" class="form-control" id="dw-tarikh" name="Tarikh" required></div>' +
    "</div>" +
    '<input type="hidden" name="_subject" value="Tempahan Dewan Imam Malik \u2014 Masjid Bandar Labis">' +
    '<button type="submit" class="btn btn-gold btn-block" data-i18n="dewan.hantar">Hantar Tempahan</button>' +
    '<p class="form-note" style="text-align:center;margin-top:10px;" data-i18n="dewan.note">Tempahan hanya disahkan selepas pihak masjid menghubungi anda.</p>' +
    "</form></div>" +
    "</div>" +
    "</div>" +
    "</div></section>\n" +

    // ---------- Musafir Inn ----------
    '<section class="section section--dark" id="musafir-inn">' +
    '<div class="container">' +
    sectionHeader(
      "Musafir <span>Inn</span>",
      "Penginapan untuk musafir dan tetamu dengan kadar berpatutan.",
      true,
      "musafir.title",
      "musafir.sub"
    ) +
    innPhoto +
    '<div class="room-grid">' +
    roomCard("\u{1F6CC}", "Bilik Besar", "RM90", ["1 katil king", "Aircond & kipas", "Mini fridge", "Boleh tambah 3 tilam single"], "room.besar", ["room.f1", "room.f2", "room.f6", "room.f4"]) +
    roomCard("\u{1F6CF}\uFE0F", "Bilik Kecil", "RM80", ["1 katil king", "Aircond & kipas", "Mini fridge", "Boleh tambah 2 tilam single"], "room.kecil", ["room.f1", "room.f2", "room.f6", "room.f5"]) +
    "</div>" +
    '<div class="inn-facilities" data-reveal>' +
    "<h3 data-i18n=\"inn.fac.title\">Lokasi &amp; Kemudahan</h3>" +
    '<p class="inn-fac-note" data-i18n="inn.fac.notv">Semua bilik tidak menyediakan televisyen dan Wi-Fi.</p>' +
    '<ul class="inn-fac-list">' +
    '<li><span class="fac-icon">\u{1F17F}\uFE0F</span><span data-i18n="inn.fac.parking">Kawasan parking luas, bersebelahan dengan masjid dan dewan serbaguna Majlis Daerah Labis.</span></li>' +
    '<li><span class="fac-icon">\u{1F6D2}</span><span data-i18n="inn.fac.shop">Kedai runcit dan kedai makan dalam lingkungan 1km (kawasan Taman Perling Labis).</span></li>' +
    '<li><span class="fac-icon">\u{1F3D9}\uFE0F</span><span data-i18n="inn.fac.bandar">Bandar Labis dengan landmark Dataran Labis dalam lingkungan 3km dengan menaiki kenderaan.</span></li>' +
    "</ul></div>" +

    '<div class="cta-banner" data-reveal>' +
    "<h3 data-i18n-html=\"tempahan.title\">Pertanyaan <span>Bilik</span></h3>" +
    '<p data-i18n="tempahan.desc">Ada soalan tentang bilik atau ingin membuat tempahan? Isi borang di bawah atau hubungi kami terus.</p>' +
    '<p class="form-note" style="text-align:center;margin:14px 0 0;" data-i18n-html="tempahan.wa">Untuk sebarang pertanyaan atau tempahan, hubungi <strong>+60 19-708 0656</strong> (Ustaz Mohd Najid Md Suyut) atau WhatsApp terus.</p>' +
    '<a class="btn btn-gold btn-block" style="max-width:560px;margin:12px auto 0;" href="https://wa.me/60197080656" target="_blank" rel="noopener noreferrer">' +
    iconSvg("whatsapp", 18) + '<span data-i18n="tempahan.wa.btn">WhatsApp</span></a>' +
    '<form data-form="booking" style="max-width:560px;margin:24px auto 0;text-align:left;">' +
    '<input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">' +
    '<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">' +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="bk-nama" data-i18n="tempahan.nama">Nama Penuh</label>' +
    '<input type="text" class="form-control" id="bk-nama" name="Nama" required maxlength="100"></div>' +
    '<div class="form-group"><label for="bk-tel" data-i18n="tempahan.tel">No. Telefon</label>' +
    '<input type="tel" class="form-control" id="bk-tel" name="No. Telefon" required maxlength="20" autocomplete="tel"></div>' +
    "</div>" +
    '<input type="hidden" name="_subject" value="Pertanyaan Musafir Inn \u2014 Masjid Bandar Labis">' +
    '<button type="submit" class="btn btn-gold btn-block" data-i18n="tempahan.hantar">Hantar Pertanyaan</button>' +
    '<p class="form-note" style="text-align:center;margin-top:10px;" data-i18n="tempahan.note">Pihak masjid akan menghubungi anda untuk sebarang pertanyaan atau tempahan.</p>' +
    "</form>" +
    "</div>" +
    "</div></section>\n";

  write(
    "perkhidmatan.html",
    page({
      title: "Perkhidmatan \u2014 Masjid Bandar Labis",
      titleKey: "title.perkhidmatan",
      canonical: "https://" + CONFIG.customDomain + "/perkhidmatan.html",
      description:
        "Urusan harian masjid — pengurusan jenazah, perkahwinan, tempahan dewan — dan tempahan Musafir Inn.",
      active: "perkhidmatan",
      body: body,
    })
  );
}

/* ============================================================
   MUKA SURAT 5 — galeri.html
   ============================================================ */
function buildGaleri() {
  // Baca semua gambar: root = 2023, subfolder 2026/ = 2026
  const galItems = listGalleryImages();
  const byYear = { "2023": [], "2026": [] };
  galItems.forEach(function (it) {
    (byYear[it.year] = byYear[it.year] || []).push(it);
  });

  function galeriTiles(items, year) {
    if (!items.length) return "";
    return items
      .map(function (it) {
        const isAerial = /^aerial|^DJI_/i.test(it.file);
        const isNew = year === "2026";
        const capKey = isNew
          ? isAerial ? "galeri.aerial2026" : "galeri.photo2026"
          : isAerial ? "galeri.aerial" : "galeri.photo";
        const cap = isNew
          ? isAerial ? "Pandangan Aerial Masjid Bandar Labis (2026)" : "Galeri Masjid Bandar Labis (2026)"
          : isAerial ? "Pandangan Aerial Masjid Bandar Labis" : "Galeri Masjid Bandar Labis";
        return (
          '<figure class="gallery-item" data-reveal>' +
          '<img src="images/Galeri/' +
          it.sub +
          encodeURIComponent(it.file) +
          '" alt="' +
          cap +
          '" loading="lazy" data-i18n-attr="alt:' + capKey + '">' +
          '<figcaption class="gallery-cap" data-i18n="' + capKey + '">' +
          cap +
          "</figcaption></figure>"
        );
      })
      .join("");
  }

  let tiles;
  if (!galItems.length) {
    // Fallback placeholder jika folder kosong
    tiles =
      '<div class="gallery-item" data-reveal>' +
      '<span aria-hidden="true">\u{1F54C}</span>' +
      '<span class="gallery-cap">Masjid Bandar Labis</span>' +
      "</div>";
  } else {
    tiles =
      '<h3 class="galeri-tahun" data-i18n="galeri.tahun2023">Galeri 2023</h3>' +
      '<div class="gallery-grid">' + galeriTiles(byYear["2023"], "2023") + "</div>" +
      '<h3 class="galeri-tahun" data-i18n="galeri.tahun2026">Galeri 2026 (Baharu)</h3>' +
      '<div class="gallery-grid">' + galeriTiles(byYear["2026"], "2026") + "</div>";
  }

  const body =
    pageHeader("Galeri <span>Masjid</span>", "Galeri", "galeri.header", "crumb.galeri") +
    '<section class="section">' +
    '<div class="container">' +
    sectionHeader(
      "Galeri <span>Foto</span>",
      "Gambar aktiviti dan suasana Masjid Bandar Labis.",
      undefined,
      "galeri.title",
      "galeri.sub"
    ) +
    // ---------- Video aerial ----------
    '<div class="video-feature" data-reveal>' +
    '<div class="video-frame">' +
    '<iframe src="' +
    CONFIG.videoAerial +
    '" title="Video aerial Masjid Bandar Labis" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" data-i18n-attr="title:galeri.video.title"></iframe>' +
    "</div>" +
    '<p class="video-caption" data-i18n="galeri.video.title">\u{1F3A5} Video aerial Masjid Bandar Labis</p>' +
    "</div>" +
    // ---------- Video aerial 2026 ----------
    '<div class="video-feature" data-reveal>' +
    '<div class="video-frame">' +
    '<iframe src="' +
    CONFIG.videoAerial2026 +
    '" title="Video aerial 2026 Masjid Bandar Labis" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" data-i18n-attr="title:galeri.video2026.title"></iframe>' +
    "</div>" +
    '<p class="video-caption" data-i18n="galeri.video2026.title">\u{1F3A5} Video Aerial 2026 Masjid Bandar Labis</p>' +
    "</div>" +
    tiles +
    '<p class="form-note" style="text-align:center;margin-top:24px;" data-i18n="galeri.note">Untuk foto terkini, ikuti Facebook page masjid.</p>' +
    "</div></section>\n";

  write(
    "galeri.html",
    page({
      title: "Galeri \u2014 Masjid Bandar Labis",
      titleKey: "title.galeri",
      canonical: "https://" + CONFIG.customDomain + "/galeri.html",
      description:
        "Galeri foto aktiviti dan suasana Masjid Bandar Labis, Segamat, Johor.",
      active: "galeri",
      body: body,
    })
  );
}

/* ============================================================
   MUKA SURAT 6 — hubungi.html
   ============================================================ */
function buildHubungi() {
  const body =
    pageHeader("Hubungi <span>Kami</span>", "Hubungi", "hubungi.header", "crumb.hubungi") +
    '<section class="section">' +
    '<div class="container">' +
    '<div class="contact-grid">' +
    '<div class="contact-info" data-reveal>' +
    '<div class="contact-card">' +
    '<div class="contact-icon">' + iconSvg("pin", 22) + "</div>" +
    "<div><h4 data-i18n=\"contact.alamat\">Alamat</h4><p>" + CONFIG.addressLines.join("<br>") + "</p></div></div>" +
    '<div class="contact-card">' +
    '<div class="contact-icon">' + iconSvg("facebook", 22) + "</div>" +
    '<div><h4 data-i18n="contact.fb">Facebook Page</h4><p><a href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">facebook.com/masjidbandarlabis</a></p></div></div>' +
    '<div class="contact-card">' +
    '<div class="contact-icon">' + iconSvg("tiktok", 22) + "</div>" +
    '<div><h4>TikTok</h4><p><a href="' + CONFIG.tiktokUrl + '" target="_blank" rel="noopener noreferrer">' + CONFIG.tiktokUsername + "</a></p></div></div>" +
    '<div class="contact-card">' +
    '<div class="contact-icon">' + iconSvg("mail", 22) + "</div>" +
    "<div><h4 data-i18n=\"contact.email\">E-mel</h4><p>" + CONFIG.email + "</p></div></div>" +
    '<div class="contact-card">' +
    '<div class="contact-icon">' + iconSvg("clock", 22) + "</div>" +
    '<div><h4 data-i18n="contact.waktu">Waktu Operasi</h4><p data-i18n-html="contact.waktu.d">Masjid: Buka <strong>24 jam</strong><br>Pejabat Pentadbiran: 8:30 pagi \u2013 5:00 petang</p></div></div>' +
    '<div class="hero-actions" style="justify-content:flex-start;">' +
    '<a class="btn btn-dark" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    iconSvg("facebook", 18) + '<span data-i18n="contact.fb.btn"> Facebook Page</span></a>' +
    '<a class="btn btn-outline" href="' + CONFIG.tiktokUrl + '" target="_blank" rel="noopener noreferrer">' +
    iconSvg("tiktok", 18) + "<span> TikTok</span></a>" +
    '<a class="btn btn-gold" href="mailto:' + CONFIG.email + '">' +
    iconSvg("mail", 18) + '<span data-i18n="contact.email.btn"> Hantar E-mel</span></a>' +
    "</div>" +
    "</div>" +
    '<div data-reveal>' +
    "<h3 style=\"margin-bottom:20px;font-size:1.35rem;\" data-i18n-html=\"contact.form.title\">Hantar <span style=\"color:var(--black);\">Maklum Balas</span></h3>" +
    '<form data-form="contact" id="contactForm">' +
    '<input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">' +
    '<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">' +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="ct-nama" data-i18n="contact.nama">Nama</label>' +
    '<input type="text" class="form-control" id="ct-nama" name="Nama" required maxlength="100"></div>' +
    '<div class="form-group"><label for="ct-emel" data-i18n="contact.emel">E-mel</label>' +
    '<input type="email" class="form-control" id="ct-emel" name="E-mel" required maxlength="150"></div>' +
    "</div>" +
    '<div class="form-group"><label for="ct-mesej" data-i18n="contact.mesej">Mesej</label>' +
    '<textarea class="form-control" id="ct-mesej" name="Mesej" required maxlength="1000"></textarea></div>' +
    '<input type="hidden" name="_subject" value="Maklum Balas \u2014 Masjid Bandar Labis">' +
    '<button type="submit" class="btn btn-gold btn-block" data-i18n="contact.hantar">Hantar Mesej</button>' +
    "</form>" +
    "</div>" +
    "</div>" +
    // ---------- Pejabat Kadi Daerah Segamat ----------
    '<div class="kadi-card" data-reveal>' +
    "<h3 data-i18n-html=\"kadi.title\">\u{1F3DB}\uFE0F <span>Bahagian Pengurusan Masjid Surau</span>, Pejabat Kadi Daerah Segamat</h3>" +
    '<p data-i18n="kadi.desc">Masjid Bandar Labis berada di bawah seliaan kerajaan melalui Pejabat Kadi Daerah Segamat, Jabatan Agama Islam Negeri Johor (JAINJ).</p>' +
    '<div class="kadi-grid">' +
    '<div class="kadi-item"><span class="kadi-icon">' + iconSvg("pin", 18) + "</span><span>" + CONFIG.kadiOffice.address + "</span></div>" +
    '<div class="kadi-item"><span class="kadi-icon">' + iconSvg("phone", 18) + "</span><span><strong data-i18n=\"kadi.tel\">Telefon:</strong> " + CONFIG.kadiOffice.phone + "</span></div>" +
    '<div class="kadi-item"><span class="kadi-icon">' + iconSvg("printer", 18) + "</span><span><strong data-i18n=\"kadi.faks\">Faks:</strong> " + CONFIG.kadiOffice.fax + "</span></div>" +
    "</div>" +
    "</div>" +
    // ---------- Peta ----------
    '<div class="map-frame" data-reveal>' +
    '<iframe src="https://maps.google.com/maps?q=Masjid%20Bandar%20Labis%2C%20Jalan%20Muar%2C%2085300%20Labis%2C%20Johor&t=m&z=15&output=embed&iwloc=near" ' +
    'title="Peta lokasi Masjid Bandar Labis" loading="lazy" referrerpolicy="no-referrer-when-downgrade" data-i18n-attr="title:map.title"></iframe>' +
    "</div>" +
    "</div></section>\n";

  write(
    "hubungi.html",
    page({
      title: "Hubungi Kami \u2014 Masjid Bandar Labis",
      titleKey: "title.hubungi",
      canonical: "https://" + CONFIG.customDomain + "/hubungi.html",
      description:
        "Alamat, e-mel, Facebook page, waktu operasi dan borang maklum balas Masjid Bandar Labis, Segamat, Johor.",
      active: "hubungi",
      body: body,
    })
  );
}

/* ============================================================
   MUKA SURAT 7 — privacy.html (Dasar Privasi)
   ============================================================ */
function buildPrivasi() {
  const body =
    pageHeader("Dasar <span>Privasi</span>", "Dasar Privasi", "privacy.header", "crumb.privacy") +
    '<section class="section"><div class="container">' +
    '<div class="legal-block" data-reveal>' +
    '<h2 data-i18n="privacy.title1">Data yang Kami Kumpul</h2>' +
    '<p data-i18n="privacy.p1a">Laman web ini bersifat maklumat dan tidak memerlukan pendaftaran akaun. Satu-satunya maklumat peribadi yang mungkin kami terima adalah melalui borang maklum balas, iaitu nama, alamat e-mel dan mesej anda. Maklumat ini dihantar terus ke e-mel pentadbir melalui perkhidmatan FormSubmit dan hanya digunakan untuk menjawab pertanyaan anda.</p>' +
    '<p data-i18n="privacy.p1b">Kami tidak menjual, menyewa atau berkongsi maklumat peribadi anda dengan mana-mana pihak ketiga, kecuali yang diperlukan oleh undang-undang Malaysia.</p>' +
    "</div>" +
    '<div class="legal-block" data-reveal>' +
    '<h2 data-i18n="privacy.title2">Data daripada Perkhidmatan Pihak Ketiga</h2>' +
    '<p data-i18n="privacy.p2">Waktu solat dipaparkan daripada API rasmi JAKIM e-Solat. Siaran media di halaman Aktiviti dipaparkan daripada halaman Facebook awam rasmi masjid. Laman ini tidak menyimpan data peribadi daripada perkhidmatan tersebut.</p>' +
    "</div>" +
    '<div class="legal-block" data-reveal>' +
    '<h2 data-i18n="privacy.title3">Kuki dan Pautan Luar</h2>' +
    '<p data-i18n="privacy.p3">Laman ini tidak menggunakan kuki pelacakan. Kami menyediakan pautan ke platform luar seperti Facebook, TikTok, YouTube dan Google Maps; dasar privasi platform tersebut adalah di luar kawalan kami.</p>' +
    "</div>" +
    '<div class="legal-block" data-reveal>' +
    '<h2 data-i18n="privacy.title4">Hubungi</h2>' +
    '<p><span data-i18n="privacy.p4a">Sebarang pertanyaan mengenai dasar privasi ini boleh dihantar kepada </span>' +
    '<a href="mailto:' + CONFIG.email + '">' + CONFIG.email + "</a>.</p>" +
    "</div>" +
    "</div></section>\n";

  write(
    "privacy.html",
    page({
      title: "Dasar Privasi \u2014 Masjid Bandar Labis",
      titleKey: "title.privacy",
      canonical: "https://" + CONFIG.customDomain + "/privacy.html",
      description: "Dasar privasi laman web rasmi Masjid Bandar Labis, Bandar Labis, Johor.",
      active: "",
      body: body,
    })
  );
}

/* ============================================================
   MUKA SURAT 8 — terms.html (Terma Penggunaan)
   ============================================================ */
function buildTerma() {
  const body =
    pageHeader("Terma <span>Penggunaan</span>", "Terma Penggunaan", "terms.header", "crumb.terms") +
    '<section class="section"><div class="container">' +
    '<div class="legal-block" data-reveal>' +
    '<h2 data-i18n="terms.title1">Penggunaan Kandungan</h2>' +
    '<p data-i18n="terms.p1">Maklumat di laman web ini disediakan untuk kegunaan umum jemaah dan masyarakat. Walaupun kami berusaha memastikan ketepatannya, pihak pengurusan berhak membuat kemas kini, pindaan atau pembuangan maklumat pada bila-bila masa tanpa notis awal.</p>' +
    "</div>" +
    '<div class="legal-block" data-reveal>' +
    '<h2 data-i18n="terms.title2">Hak Cipta</h2>' +
    '<p data-i18n="terms.p2">Kandungan laman ini adalah milik Masjid Bandar Labis melainkan dinyatakan sebaliknya. Pengagihan semula digalakkan untuk tujuan dakwah dengan menyatakan sumber asal.</p>' +
    "</div>" +
    '<div class="legal-block" data-reveal>' +
    '<h2 data-i18n="terms.title3">Pautan Pihak Ketiga</h2>' +
    '<p data-i18n="terms.p3">Laman ini mengandungi pautan ke platform dan laman pihak ketiga. Kami tidak bertanggungjawab ke atas kandungan, ketepatan atau dasar platform tersebut.</p>' +
    "</div>" +
    '<div class="legal-block" data-reveal>' +
    '<h2 data-i18n="terms.title4">Sumbangan</h2>' +
    '<p data-i18n="terms.p4">Maklumat akaun sumbangan yang dipaparkan adalah rasmi. Sila hubungi pejabat pentadbiran masjid untuk sebarang pengesahan sebelum membuat pindahan.</p>' +
    "</div>" +
    '<div class="legal-block" data-reveal>' +
    '<h2 data-i18n="terms.title5">Undang-Undang</h2>' +
    '<p><span data-i18n="terms.p5a">Terma ini ditadbir mengikut undang-undang Malaysia. Sebarang pertanyaan boleh diajukan melalui </span>' +
    '<a href="mailto:' + CONFIG.email + '">' + CONFIG.email + "</a>.</p>" +
    "</div>" +
    "</div></section>\n";

  write(
    "terms.html",
    page({
      title: "Terma Penggunaan \u2014 Masjid Bandar Labis",
      titleKey: "title.terms",
      canonical: "https://" + CONFIG.customDomain + "/terms.html",
      description: "Terma penggunaan laman web rasmi Masjid Bandar Labis, Bandar Labis, Johor.",
      active: "",
      body: body,
    })
  );
}

/* ============================================================
   KOMPONEN KECIL
   ============================================================ */
function card(icon, title, desc, link, titleKey, descKey) {
  return (
    '<div class="card" data-reveal>' +
    '<div class="card-icon" aria-hidden="true">' + icon + "</div>" +
    "<h3" + (titleKey ? ' data-i18n="' + titleKey + '"' : "") + ">" + title + "</h3>" +
    "<p" + (descKey ? ' data-i18n="' + descKey + '"' : "") + ">" + desc + "</p>" +
    (link ? '<a class="card-link" href="' + link + '"><span data-i18n="program.more">Baca lagi</span> &rarr;</a>' : "") +
    "</div>"
  );
}

// Inisial untuk avatar pegawai tanpa gambar
function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0] ? parts[0].charAt(0) : "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

function roomCard(icon, name, price, features, nameKey, featKeys) {
  const feats = features
    .map(function (f, i) {
      return "<li" + (featKeys && featKeys[i] ? ' data-i18n="' + featKeys[i] + '"' : "") + ">" + f + "</li>";
    })
    .join("");
  return (
    '<div class="room-card" data-reveal>' +
    '<div class="room-top"><div class="r-icon">' + icon + "</div>" +
    "<h4" + (nameKey ? ' data-i18n="' + nameKey + '"' : "") + ">" + name + '</h4><div class="r-price">' + price + ' <span data-i18n="room.rate">/ malam</span></div></div>' +
    '<div class="room-body"><ul>' + feats + "</ul></div>" +
    "</div>"
  );
}

/* ============================================================
   JALANKAN
   ============================================================ */
console.log("Bina website Masjid Bandar Labis...");
ensureDir(DIST);

buildIndex();
buildTentang();
buildAktiviti();
buildPerkhidmatan();
buildGaleri();
buildHubungi();
buildPrivasi();
buildTerma();

// Salin aset statik
console.log("Salin aset statik...");
copyDir(path.join(ROOT, "css"), path.join(DIST, "css"));
copyDir(path.join(ROOT, "js"), path.join(DIST, "js"));
copyDir(path.join(ROOT, "images"), path.join(DIST, "images"));

// Fail CNAME untuk domain khas (GitHub Pages)
write("CNAME", CONFIG.customDomain + "\n");

// robots.txt — pandu enjin carian
write(
  "robots.txt",
  "User-agent: *\n" +
  "Allow: /\n" +
  "Sitemap: https://" + CONFIG.customDomain + "/sitemap.xml\n"
);

// sitemap.xml — senarai halaman untuk enjin carian
const sitemapPages = [
  "",
  "tentang.html",
  "aktiviti.html",
  "perkhidmatan.html",
  "galeri.html",
  "hubungi.html",
  "privacy.html",
  "terms.html",
];
const sitemapXml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemapPages
    .map(function (p) {
      return "  <url><loc>https://" + CONFIG.customDomain + "/" + p + "</loc></url>";
    })
    .join("\n") +
  "\n</urlset>\n";
write("sitemap.xml", sitemapXml);

// Fail pengesahan Google Search Console (boleh dipadam selepas disahkan)
// Kandungan mesti TEPAT seperti fail asal daripada Google (termasuk .html)
write(
  "google9c1edd21c724fae2.html",
  "google-site-verification: google9c1edd21c724fae2.html\n"
);

console.log("\n=== BINAAN SELESAI ===");
console.log("Folder: " + DIST);
