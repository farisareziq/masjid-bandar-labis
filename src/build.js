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
  // Video aerial masjid (YouTube embed)
  videoAerial: "https://www.youtube-nocookie.com/embed/YbEaCgKmAC8",
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
function head(title, description) {
  return (
    "<!DOCTYPE html>\n" +
    '<html lang="ms">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    "<title>" + title + "</title>\n" +
    '<meta name="description" content="' + description + '">\n' +
    '<meta name="theme-color" content="#ffc72c">\n' +
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
    "img-src 'self' data:; " +
    "connect-src 'self' https://www.e-solat.gov.my https://formsubmit.co; " +
    "frame-src https://maps.google.com https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com; " +
    "form-action 'self' https://formsubmit.co; " +
    "base-uri 'self'; " +
    "frame-ancestors 'self'" +
    '">\n' +
    // Favicon: guna logo masjid (images/logo.png)
    '<link rel="icon" type="image/png" href="images/logo.png">\n' +
    '<link rel="apple-touch-icon" href="images/logo.png">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n' +
    '<link rel="stylesheet" href="css/style.css">\n' +
    "</head>\n<body>\n"
  );
}

function nav(active) {
  const item = function (href, label, isActive, extra) {
    return (
      '<li class="nav-item">' +
      '<a href="' + href + '" class="nav-link' +
      (isActive ? " active" : "") +
      (extra ? " " + extra : "") +
      '">' + label + "</a></li>"
    );
  };
  const dropdown = function (href, label, isActive, children) {
    const links = children
      .map(function (c) {
        return '<li><a href="' + c.href + '">' + c.label + "</a></li>";
      })
      .join("");
    return (
      '<li class="nav-item has-dropdown">' +
      '<a href="' + href + '" class="nav-link' + (isActive ? " active" : "") + '">' + label + "</a>" +
      '<ul class="dropdown-menu">' + links + "</ul></li>"
    );
  };

  return (
    '<nav class="navbar" id="navbar">\n' +
    '<div class="container nav-container">\n' +
    '<a href="index.html" class="nav-logo">' +
    '<img src="images/logo.png" class="nav-logo-img logo-img" alt="Logo Masjid Bandar Labis" hidden>' +
    '<span class="nav-logo-icon logo-fallback">\u{1F54C}</span>' +
    '<span class="nav-logo-text">Masjid <b>Bandar Labis</b></span>' +
    "</a>\n" +
    '<ul class="nav-menu" id="navMenu">' +
    item("index.html", "Utama", active === "index") +
    item("tentang.html", "Tentang", active === "tentang") +
    dropdown("aktiviti.html", "Aktiviti", active === "aktiviti", [
      { href: "aktiviti.html#jadual-kuliah", label: "Jadual Kuliah" },
      { href: "aktiviti.html#siaran-media", label: "Siaran Media" },
    ]) +
    dropdown("perkhidmatan.html", "Perkhidmatan", active === "perkhidmatan", [
      { href: "perkhidmatan.html#urusan-harian", label: "Urusan Harian" },
      { href: "perkhidmatan.html#musafir-inn", label: "Musafir Inn" },
    ]) +
    item("galeri.html", "Galeri", active === "galeri") +
    item("hubungi.html", "Hubungi", active === "hubungi") +
    item("index.html#sumbangan", "Sumbangan", false, "nav-cta") +
    "</ul>\n" +
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
    '<img src="images/logo.png" class="footer-logo logo-img" alt="Logo Masjid Bandar Labis" hidden>' +
    "<h3>Masjid <b>Bandar Labis</b></h3>" +
    "<p>Jalan Muar, 85300 Labis, Johor Darul Ta'azim.</p>" +
    "<p>Di bawah seliaan " + CONFIG.admin + "</p>" +
    '<p>Jabatan Agama Islam Negeri Johor (JAINJ)</p>' +
    '<a class="social-link" href="' + faUrl + '" target="_blank" rel="noopener noreferrer">' +
    iconSvg("facebook", 18) + " Facebook Masjid Bandar Labis</a>" +
    "</div>\n" +
    '<div class="footer-col">' +
    "<h4>Pautan</h4><ul>" +
    '<li><a href="index.html">Utama</a></li>' +
    '<li><a href="tentang.html">Tentang</a></li>' +
    '<li><a href="galeri.html">Galeri</a></li>' +
    '<li><a href="hubungi.html">Hubungi</a></li>' +
    '<li><a href="index.html#sumbangan">Sumbangan</a></li>' +
    "</ul></div>\n" +
    '<div class="footer-col">' +
    "<h4>Perkhidmatan</h4><ul>" +
    '<li><a href="aktiviti.html#jadual-kuliah">Jadual Kuliah</a></li>' +
    '<li><a href="aktiviti.html#siaran-media">Siaran Media</a></li>' +
    '<li><a href="perkhidmatan.html#urusan-harian">Urusan Harian</a></li>' +
    '<li><a href="perkhidmatan.html#musafir-inn">Musafir Inn</a></li>' +
    "</ul></div>\n" +
    '<div class="footer-col">' +
    "<h4>Sumbangan</h4>" +
    '<p>Infaq ikhlas anda amat dihargai.</p>' +
    '<div class="footer-bank">' +
    '<span class="bn">' + CONFIG.bank.name + "</span><br>" +
    '<span class="ba">' + CONFIG.bank.account + "</span>" +
    "</div></div>\n" +
    "</div>\n" +
    '<div class="footer-bottom"><div class="container">' +
    '<p>&copy; <span data-year></span> ' + CONFIG.copyright +
    ' &nbsp;|&nbsp; Dibina oleh komuniti dengan <span class="heart">\u2665</span> &nbsp;|&nbsp; Open Source (MIT)</p>' +
    "</div></div>\n</footer>\n" +
    '<button class="scroll-top" id="scrollTop" aria-label="Kembali ke atas">\u2191</button>\n'
  );
}

function page(opts) {
  const scripts =
    opts.prayer ? '<script src="js/prayer-times.js" defer></script>\n' : "";
  return (
    head(opts.title, opts.description) +
    nav(opts.active) +
    opts.body +
    footer() +
    '<script src="js/main.js" defer></script>\n' +
    scripts +
    "</body>\n</html>\n"
  );
}

function pageHeader(title, crumb) {
  return (
    '<section class="page-header"><div class="container">' +
    "<h1>" + title + "</h1>" +
    '<p class="breadcrumb"><a href="index.html">Utama</a> &raquo; ' + crumb + "</p>" +
    "</div></section>"
  );
}

function sectionHeader(title, subtitle, dark) {
  return (
    '<div class="section-header" data-reveal>' +
    '<h2 class="section-title">' + title + "</h2>" +
    (subtitle ? "<p>" + subtitle + "</p>" : "") +
    '<div class="divider"></div></div>'
  );
}

/* ============================================================
   MUKA SURAT 1 — index.html (Utama + Sumbangan)
   ============================================================ */
function buildIndex() {
  // Slider gambar masjid: baca semua gambar dari folder images/Galeri
  const galDir = path.join(ROOT, "images", "Galeri");
  let galFiles = [];
  if (fs.existsSync(galDir)) {
    galFiles = fs
      .readdirSync(galDir)
      .filter(function (f) {
        return /\.[jJ][pP][gG]$|\.[jJ][pP][eE][gG]$|\.png$|\.webp$/.test(f);
      })
      .sort();
  }
  const sliderSlides = galFiles.length
    ? galFiles
        .map(function (file, idx) {
          return (
            '<img src="images/Galeri/' +
            encodeURIComponent(file) +
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
    '<p class="hero-subtitle">Memakmurkan Masjid, Menyantuni Ummah</p>' +
    '<p class="hero-admin">Di bawah seliaan ' + CONFIG.admin + " \u00B7 JAINJ</p>" +
    '<div class="hero-actions">' +
    '<a href="tentang.html" class="btn btn-gold">Kenali Kami</a>' +
    '<a href="#sumbangan" class="btn btn-outline">Sumbangan</a>' +
    "</div>" +
    "</div></section>\n" +

    // ---------- Widget waktu solat ----------
    '<div class="prayer-widget" id="prayerWidget">' +
    '<div class="container"><div class="prayer-loading">Memuatkan waktu solat...</div></div>' +
    "</div>\n" +

    // ---------- Ringkasan tentang ----------
    '<section class="section">' +
    '<div class="container about-grid">' +
    '<div class="about-text" data-reveal>' +
    '<h2 class="section-title">Selamat Datang ke <span>Masjid Bandar Labis</span></h2>' +
    "<p>Pusat ibadah dan kebajikan umat Islam di Bandar Labis, Daerah Segamat, Johor. Masjid ini menjadi nadi kegiatan keagamaan, pendidikan dan kemasyarakatan setempat, di bawah seliaan " +
    CONFIG.admin + ".</p>" +
    '<div class="stats">' +
    '<div class="stat"><div class="stat-num">500+</div><div class="stat-label">Jemaah</div></div>' +
    '<div class="stat"><div class="stat-num">5</div><div class="stat-label">Waktu Solat</div></div>' +
    '<div class="stat"><div class="stat-num">12+</div><div class="stat-label">Program</div></div>' +
    '<div class="stat"><div class="stat-num">1</div><div class="stat-label">Musafir Inn</div></div>' +
    "</div>" +
    "</div>" +
    '<div class="mosque-slider" id="mosqueSlider" data-reveal role="region" aria-label="Galeri gambar Masjid Bandar Labis">' +
    sliderSlides +
    '<a class="mosque-badge" href="galeri.html">\u{1F4F8} Lihat Galeri</a>' +
    "</div>" +
    "</div></section>\n" +

    // ---------- Program ----------
    '<section class="section section--dark">' +
    '<div class="container">' +
    sectionHeader(
      "Program <span>Masjid</span>",
      "Kegiatan utama yang dikendalikan sepanjang tahun.",
      true
    ) +
    '<div class="cards-grid">' +
    card("\u{1F54C}", "Solat Berjemaah", "Solat fardhu berjemaah lima waktu sehari semalam.", "aktiviti.html") +
    card("\u{1F4D6}", "Tadarus Al-Quran", "Mengaji dan tadarus bersama setiap pagi Ahad.", "aktiviti.html#jadual-kuliah") +
    card("\u{1F393}", "Kuliah Agama", "Kuliah tafsir, fiqh dan hadis pada malam hari.", "aktiviti.html#jadual-kuliah") +
    card("\u{1F4DD}", "Kelas Fardhu Ain", "Pendidikan asas agama untuk dewasa dan kanak-kanak.", "aktiviti.html#jadual-kuliah") +
    card("\u{1F48D}", "Perkahwinan & Sewaan", "Pendaftaran perkahwinan dan sewaan dewan masjid.", "perkhidmatan.html#urusan-harian") +
    card("\u{1F54A}\uFE0F", "Pengurusan Jenazah", "Bantuan pengurusan jenazah 24 jam untuk umat Islam.", "perkhidmatan.html#urusan-harian") +
    "</div>" +
    "</div></section>\n" +

    // ---------- Sumbangan ----------
    '<section class="section section--cream" id="sumbangan">' +
    '<div class="container">' +
    sectionHeader(
      "Sumbangan & <span>Infaq</span>",
      "Sumbangan ikhlas anda menyokong program dan kebajikan masjid. Semoga Allah membalas kebaikan anda."
    ) +
    '<div class="donation-grid">' +
    // Kad akaun bank
    '<div class="donation-card" data-reveal>' +
    "<h3>\u{1F3E6} <span>Sumbangan Terus ke Akaun</span></h3>" +
    "<p>Salurkan infaq anda melalui akaun rasmi masjid:</p>" +
    '<div class="bank-box">' +
    '<span class="bank-name">' + CONFIG.bank.name + "</span>" +
    '<span class="bank-account" id="bankAccount">' + CONFIG.bank.account + "</span><br>" +
    '<button type="button" class="btn btn-gold" id="copyAccount">Salin Nombor Akaun</button>' +
    '<span class="copy-msg" id="copyMsg" style="display:none"></span>' +
    "</div>" +
    "<p>Semua kutipan digunakan untuk pengurusan masjid, program ilmiah dan kebajikan ummah. Mohon sertakan rujukan \u201CInfaq\u201D sekiranya membuat pindahan.</p>" +
    "</div>" +
    // Kad QR
    '<div class="donation-card" data-reveal>' +
    "<h3>\u{1F4F1} <span>Scan QR</span></h3>" +
    "<p>Imbas kod QR di bawah menggunakan aplikasi perbankan (DuitNow QR):</p>" +
    '<div class="qr-frame">' +
    '<button type="button" class="qr-click" id="qrOpen" aria-label="Perbesar kod QR untuk scan">' +
    '<img src="' +
    CONFIG.qrImage +
    '" id="qrDonation" alt="DuitNow QR sumbangan Masjid Bandar Labis" class="qr-image" width="200" height="200">' +
    '<div class="qr-placeholder" id="qrPlaceholder" hidden>' +
    "<span>\u{1F4F1}</span>" +
    "<p>QR Code akan dipaparkan di sini.</p>" +
    "<p><small>Sila letakkan fail <code>images/qr-sumbangan.jpg</code> (DuitNow QR rasmi daripada app Bank Rakyat).</small></p>" +
    "</div>" +
    "</button>" +
    '<span class="qr-hint">\u{1F446} Klik untuk besarkan &amp; scan</span>' +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div></section>\n" +

    // ---------- CTA ----------
    '<section class="section">' +
    '<div class="container"><div class="cta-banner" data-reveal>' +
    "<h3>Jom Sertai <span>Aktiviti Masjid</span></h3>" +
    "<p>Lawati kami, sertai kuliah, atau hubungi pihak pengurusan untuk sebarang pertanyaan.</p>" +
    '<div class="hero-actions">' +
    '<a href="aktiviti.html" class="btn btn-gold">Lihat Aktiviti</a>' +
    '<a href="hubungi.html" class="btn btn-dark">Hubungi Kami</a>' +
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
    '<p class="modal-text">Imbas QR untuk sumbangan<br><strong>' +
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
  const body =
    pageHeader("Tentang <span>Masjid</span>", "Tentang Masjid") +

    // ---------- Sejarah ----------
    '<section class="section">' +
    '<div class="container">' +
    sectionHeader(
      "Sejarah <span>Masjid</span>",
      "Riwayat Masjid Jamik Labis dari awal pembinaan hingga ke tapak sekarang di Jalan Muar."
    ) +
    // Gambar lama masjid
    '<figure class="history-photo" data-reveal>' +
    '<img src="' +
    CONFIG.sejarahImage +
    '" alt="Masjid Jamik Labis (gambar lama)" loading="lazy">' +
    '<figcaption class="history-caption">Masjid Jamik Labis &mdash; gambar lama</figcaption>' +
    "</figure>" +
    // Era 1
    '<div class="history-era" data-reveal>' +
    '<h3><span class="era-year">1960-an</span> Masjid Jamik Labis Pertama &mdash; Jalan Tenang</h3>' +
    "<p>Sebelum terdirinya bangunan Masjid Bandar Labis di Jalan Muar sekarang, Masjid Jamik Labis yang awal terletak di Jalan Tenang, bersebelahan betul-betul dengan rumah En. Ibrahim (mantan YB ADUN Tenang). Tapak masjid tersebut masih wujud sehingga hari ini, dan di atas tapak masjid awal ini kini terdapat sebuah warung orang kampung Paya Merah yang menumpang sementara.</p>" +
    "<p>Masjid ini dibina oleh masyarakat setempat sekitar tahun 1960-an. Seni binanya bercirikan Islamik dan keseluruhan bangunannya terdiri daripada binaan kayu, serta dikatakan tiada menara. Ia mampu memuatkan kira-kira 200 orang jemaah dalam satu-satu masa.</p>" +
    "<p>Dari segi pentadbiran, masjid ini ditadbir oleh jawatankuasa daripada masyarakat setempat di Labis. Imam pertama yang berkhidmat ialah Imam Talib dan Imam Haji Khalid bin Chidun, manakala bilalnya bernama Bilal Mohd Deli.</p>" +
    "</div>" +
    // Era 2
    '<div class="history-era" data-reveal>' +
    '<h3><span class="era-year">1968</span> Masjid Jamik Labis Kedua &mdash; Jalan Yong Peng</h3>' +
    "<p>Dengan perubahan suasana dan perkembangan semasa, Masjid Jamik Labis yang pertama di Jalan Tenang berpindah ke tempat baharu di Jalan Yong Peng, bersebelahan dengan Sekolah Kebangsaan Labis, pada tahun 1968.</p>" +
    "<p>Keadaan binaan masjid yang kedua ini lebih baik, cantik dan sempurna, dengan keseluruhan binaannya daripada batu bata. Reka bentuknya lebih menarik dan selesa, sama ada di bahagian dalaman mahupun halaman persekitaran luar. Kawasan penempatan kenderaan agak luas dan menepati keperluan jemaah. Terdapat satu menara yang tinggi dengan corong pembesar suara, dan masjid ini boleh memuatkan kira-kira 500 orang jemaah dalam satu-satu masa.</p>" +
    "<p>Pada permulaannya, pentadbiran masjid dipimpin oleh pengerusi daripada ahli kariah setempat, dan kemudiannya bertukar kepada Haji Wagiman. Imam pertama yang berkhidmat ialah Imam Haji Khalid bin Chindun, Imam Tukiran dan Imam Abdul Rafar bin Yusof.</p>" +
    "<p>Selepas itu, pentadbiran Masjid Jamik Labis di Jalan Yong Peng diambil alih oleh Kerajaan Johor dan berada di bawah pentadbiran " +
    CONFIG.admin +
    ". Pengerusinya ialah Assyekh Haji Azman bin Mokhsin, disusuli Assyekh Haji Ahmad Faisal bin Mohamad, dan Assyekh Haji Sulaiman bin Maiden.</p>" +
    "</div>" +
    // Era 3
    '<div class="history-era" data-reveal>' +
    '<h3><span class="era-year">Kini</span> Perpindahan ke Jalan Muar (Masjid Bandar Labis)</h3>' +
    "<p>Saban tahun, Labis menyaksikan perubahan kepadatan penduduk, perkembangan ekonomi dan pembangunan yang semakin berkembang. Justeru, beberapa pihak yang bertanggungjawab &mdash; termasuk pihak Pejabat Kadi Daerah Segamat beserta AJK, YB ADUN Tenang dan Majlis Daerah Labis &mdash; bersetuju bahawa Masjid Jamik Labis di Jalan Yong Peng perlu diperbaharui.</p>" +
    "<p>Bagi menjayakan hasrat ini, semua pihak bersetuju untuk berpindah ke tapak yang lebih luas dan selesa, iaitu sebuah padang milik Majlis Daerah Labis di Jalan Muar, bersebelahan dengan dewan Majlis Daerah Labis. Tapak inilah yang menjadi lokasi Masjid Bandar Labis yang ada pada hari ini, di bawah seliaan " +
    CONFIG.admin +
    ", Jabatan Agama Islam Negeri Johor (JAINJ).</p>" +
    "</div>" +
    "</div></section>\n" +

    // ---------- Visi & Misi ----------
    '<section class="section section--cream">' +
    '<div class="container">' +
    sectionHeader("Visi & <span>Misi</span>") +
    '<div class="cards-grid">' +
    card("\u{1F4A1}", "Visi", "Menjadi pusat kecemerlangan ibadah dan pembangunan ummah di Bandar Labis.", "tentang.html") +
    card("\u{1F3AF}", "Misi", "Memakmurkan masjid dengan ibadah, pendidikan, kebajikan dan perpaduan komuniti.", "tentang.html") +
    card("\u{1F4AD}", "Nilai", "Ikhlas, Amanah, Ilmu dan Kebersamaan dalam setiap urusan.", "tentang.html") +
    "</div>" +
    "</div></section>\n" +

    // ---------- Carta Organisasi ----------
    '<section class="section" id="carta">' +
    '<div class="container">' +
    sectionHeader("Carta <span>Organisasi</span>") +
    '<figure class="carta-figure" data-reveal>' +
    '<img src="' +
    CONFIG.cartaImage +
    '" alt="Carta pentadbiran Masjid Bandar Labis" loading="lazy">' +
    "</figure>" +
    "</div></section>\n";

  write(
    "tentang.html",
    page({
      title: "Tentang Masjid \u2014 Masjid Bandar Labis",
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
function buildAktiviti() {
  const body =
    pageHeader("Aktiviti <span>Masjid</span>", "Aktiviti") +

    // ---------- Jadual kuliah ----------
    '<section class="section" id="jadual-kuliah">' +
    '<div class="container">' +
    sectionHeader(
      "Jadual <span>Kuliah</span>",
      "Kuliah mingguan diadakan selepas solat, terbuka kepada semua."
    ) +
    '<div class="table-wrap" data-reveal>' +
    "<table>" +
    "<thead><tr><th>Hari</th><th>Masa</th><th>Tajuk / Aktiviti</th><th>Penceramah / Pihak</th></tr></thead>" +
    "<tbody>" +
    '<tr><td><span class="badge-day">Isnin</span></td><td>9:30 malam</td><td>Tafsir Al-Quran</td><td>Ustaz Jemputan</td></tr>' +
    '<tr><td><span class="badge-day">Selasa</span></td><td>9:30 malam</td><td>Fiqh Ibadah</td><td>Imam Masjid</td></tr>' +
    '<tr><td><span class="badge-day">Rabu</span></td><td>9:30 malam</td><td>Hadis & Sirah</td><td>Ustaz Jemputan</td></tr>' +
    '<tr><td><span class="badge-day">Khamis</span></td><td>9:30 malam</td><td>Tazkirah & Doa</td><td>Imam Masjid</td></tr>' +
    '<tr><td><span class="badge-day">Jumaat</span></td><td>1:15 petang</td><td>Khutbah Jumaat</td><td>Khatib / Panel</td></tr>' +
    '<tr><td><span class="badge-day">Sabtu</span></td><td>10:00 pagi</td><td>Kelas Fardhu Ain</td><td>Jawatankuasa Pendidikan</td></tr>' +
    '<tr><td><span class="badge-day">Ahad</span></td><td>10:00 pagi</td><td>Tadarus & Tafsir</td><td>Bilal / Fasilitator</td></tr>' +
    "</tbody></table>" +
    "</div>" +
    '<p class="form-note" style="margin-top:16px;text-align:center;">* Jadual boleh berubah. Sila rujuk pengumuman rasmi masjid atau Facebook page untuk pengesahan.</p>' +
    "</div></section>\n" +

    // ---------- Siaran media ----------
    '<section class="section section--dark" id="siaran-media">' +
    '<div class="container">' +
    sectionHeader(
      "Siaran <span>Media</span>",
      "Ikuti siaran, video dan pengumuman terkini masjid.",
      true
    ) +

    // Facebook card
    '<div class="fb-card" data-reveal>' +
    '<div class="fb-icon">' + iconSvg("facebook", 30) + "</div>" +
    "<div>" +
    "<h3>Ikuti Facebook Rasmi Masjid Bandar Labis</h3>" +
    "<p>Siaran langsung kuliah, video program dan pengumuman terkini dikongsi melalui page rasmi.</p>" +
    '<a class="btn btn-gold" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    iconSvg("facebook", 18) + " Lawati Facebook Page</a>" +
    "</div></div>\n" +

    // Video grid
    "<h3 style=\"text-align:center;color:var(--white);margin-bottom:24px;font-size:1.25rem;\">Video &amp; Siaran Terkini</h3>" +
    '<div class="media-grid">' +
    '<a class="media-tile" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    '<span class="media-play">\u25B6</span><span class="media-caption">Kuliah Tafsir Al-Quran</span></a>' +
    '<a class="media-tile" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    '<span class="media-play">\u25B6</span><span class="media-caption">Sambutan Maulidur Rasul</span></a>' +
    '<a class="media-tile" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    '<span class="media-play">\u25B6</span><span class="media-caption">Program Ihya\u2019 Ramadan</span></a>' +
    "</div>\n" +
    '<p style="text-align:center;color:#b8b8b8;font-size:0.85rem;margin-top:16px;">Video akan dikemas kini dari semasa ke semasa melalui page rasmi masjid.</p>' +

    // Pengumuman
    '<div style="margin-top:52px;">' +
    "<h3 style=\"text-align:center;color:var(--white);margin-bottom:24px;font-size:1.25rem;\">Pengumuman &amp; Surat Berita</h3>" +
    '<div class="news-list">' +
    newsItem("01", "Jun", "Kursus Pra Perkahwinan", "Pendaftaran dibuka untuk sesi akan datang. Hubungi pejabat kadi untuk maklumat lanjut.") +
    newsItem("16", "Mei", "Program Kutipan Dana Musafir Inn", "Kutipan tahunan untuk penyelenggaraan dan naik taraf Musafir Inn dijalankan.") +
    newsItem("01", "Mei", "Kelas Al-Quran Kanak-Kanak", "Pendaftaran kelas mengaji untuk kanak-kanak dibuka sepanjang tahun.") +
    newsItem("20", "Apr", "Gotong-Royong Perdana", "Terima kasih kepada semua sukarelawan yang menyertai gotong-royong membersihkan masjid.") +
    "</div></div>\n" +
    "</div></section>\n";

  write(
    "aktiviti.html",
    page({
      title: "Aktiviti \u2014 Masjid Bandar Labis",
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
    pageHeader("Perkhidmatan <span>Masjid</span>", "Perkhidmatan") +

    // ---------- Urusan harian ----------
    '<section class="section" id="urusan-harian">' +
    '<div class="container">' +
    sectionHeader(
      "Urusan <span>Harian</span>",
      "Perkhidmatan harian yang disediakan kepada masyarakat."
    ) +
    '<div class="cards-grid">' +
    card("\u{1F54A}\uFE0F", "Pengurusan Jenazah", "Bantuan mandi, kafan, solat jenazah dan urusan pengkebumian. Beroperasi 24 jam.", "perkhidmatan.html#urusan-harian") +
    card("\u{1F48D}", "Perkahwinan & Sewaan", "Pendaftaran perkahwinan mengikut prosedur dan sewaan dewan untuk majlis.", "perkhidmatan.html#urusan-harian") +
    card("\u{1F9F3}", "Borang Lawatan", "Tempahan lawatan ke masjid untuk sekolah, institusi atau kumpulan.", "perkhidmatan.html#urusan-harian") +
    "</div>" +
    "</div></section>\n" +

    // ---------- Butiran urusan harian ----------
    '<section class="section section--cream">' +
    '<div class="container">' +
    '<div class="about-grid">' +
    '<div data-reveal>' +
    "<h2 class=\"section-title\">Pengurusan <span>Jenazah</span></h2>" +
    "<p style=\"color:var(--muted);margin-top:10px;\">Masjid menyediakan perkhidmatan pengurusan jenazah untuk umat Islam di kawasan Bandar Labis dan sekitarnya:</p>" +
    "<ul style=\"margin:16px 0 0 20px;display:grid;gap:8px;color:var(--muted);list-style:disc;\">" +
    "<li>Mandi dan kafan jenazah</li>" +
    "<li>Solat jenazah di masjid</li>" +
    "<li>Urusan tanah perkuburan</li>" +
    "<li>Koordinasi bersama pihak berkuasa agama</li>" +
    "</ul>" +
    '<p style="margin-top:16px;"><a class="btn btn-gold" href="hubungi.html">Hubungi Pihak Masjid</a></p>' +
    "</div>" +
    '<div class="table-wrap" data-reveal>' +
    '<h2 class="section-title" style="font-size:1.35rem;margin-bottom:16px;padding:0 18px;padding-top:18px;">Sewaan <span style="color:var(--gold-600);">Dewan Imam Malik</span></h2>' +
    "<table>" +
    "<thead><tr><th>Pakej Sewaan Dewan</th><th>Kadar</th></tr></thead>" +
    "<tbody>" +
    "<tr><td>Dewan Imam Malik (Pagi)</td><td><strong>RM500</strong></td></tr>" +
    "<tr><td>Dewan Imam Malik (Petang)</td><td><strong>RM700</strong></td></tr>" +
    "<tr><td>Dewan Kecil</td><td><strong>RM300</strong></td></tr>" +
    "<tr><td>Kenduri / Majlis Kecil</td><td><strong>RM200</strong></td></tr>" +
    "</tbody></table>" +
    '<p class="form-note" style="margin-top:10px;padding:0 18px;">Dewan Imam Malik, Masjid Bandar Labis. Kadar boleh berubah &mdash; mohon semak dengan pihak pengurusan.</p>' +
    "</div>" +
    "</div>" +
    "</div></section>\n" +

    // ---------- Borang lawatan ----------
    '<section class="section">' +
    '<div class="container">' +
    '<div class="cta-banner" data-reveal>' +
    "<h3>Borang <span>Lawatan</span></h3>" +
    "<p>Rancang lawatan kumpulan anda ke masjid. Isi borang di bawah dan pihak kami akan menghubungi anda.</p>" +
    '<form data-form="lawatan" style="max-width:560px;margin:0 auto;text-align:left;">' +
    '<input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">' +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="lv-nama">Nama Organisasi / Kumpulan</label>' +
    '<input type="text" class="form-control" id="lv-nama" name="Nama Organisasi" required maxlength="100"></div>' +
    '<div class="form-group"><label for="lv-hubungi">Nama Wakil</label>' +
    '<input type="text" class="form-control" id="lv-hubungi" name="Nama Wakil" required maxlength="100"></div>' +
    "</div>" +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="lv-tarikh">Tarikh Cadangan</label>' +
    '<input type="date" class="form-control" id="lv-tarikh" name="Tarikh" required></div>' +
    '<div class="form-group"><label for="lv-bilangan">Bilangan Peserta</label>' +
    '<input type="number" class="form-control" id="lv-bilangan" name="Bilangan" min="1" max="999" required></div>' +
    "</div>" +
    '<div class="form-group"><label for="lv-nota">Maklumat Tambahan</label>' +
    '<textarea class="form-control" id="lv-nota" name="Maklumat Tambahan" maxlength="500"></textarea></div>' +
    '<input type="hidden" name="_subject" value="Permohonan Lawatan \u2014 Masjid Bandar Labis">' +
    '<button type="submit" class="btn btn-gold btn-block">Hantar Permohonan</button>' +
    "</form>" +
    "</div></div></section>\n" +

    // ---------- Musafir Inn ----------
    '<section class="section section--dark" id="musafir-inn">' +
    '<div class="container">' +
    sectionHeader(
      "Musafir <span>Inn</span>",
      "Penginapan untuk musafir dan tetamu dengan kadar berpatutan.",
      true
    ) +
    innPhoto +
    '<div class="room-grid">' +
    roomCard("\u{1F6CC}", "Bilik Single", "RM60 / malam", ["1 katil single", "Aircond & kipas", "Mandi & tandas", "Wi-Fi"]) +
    roomCard("\u{1F6CB}\uFE0F", "Bilik Double", "RM90 / malam", ["1 katil queen", "Aircond & kipas", "Mandi & tandas", "Wi-Fi & TV"]) +
    roomCard("\u{1F6C6}", "Bilik Keluarga", "RM130 / malam", ["2 katil double", "Aircond & kipas", "Mandi & tandas", "Wi-Fi & TV"]) +
    "</div>" +
    '<p style="text-align:center;color:#b8b8b8;font-size:0.85rem;margin:20px 0 40px;">Kemudahan: tempat wuduk, surau, parking dan kawasan makan. Sila tempah awal.</p>' +

    '<div class="cta-banner" data-reveal>' +
    "<h3>Tempahan <span>Bilik</span></h3>" +
    "<p>Isi borang di bawah untuk membuat tempahan. Kami akan sahkan melalui e-mel atau Facebook page.</p>" +
    '<form data-form="booking" style="max-width:560px;margin:0 auto;text-align:left;">' +
    '<input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">' +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="bk-nama">Nama Penuh</label>' +
    '<input type="text" class="form-control" id="bk-nama" name="Nama" required maxlength="100"></div>' +
    '<div class="form-group"><label for="bk-ic">No. K/P atau Passport</label>' +
    '<input type="text" class="form-control" id="bk-ic" name="No KP" required maxlength="20"></div>' +
    "</div>" +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="bk-emel">E-mel</label>' +
    '<input type="email" class="form-control" id="bk-emel" name="E-mel" required maxlength="150"></div>' +
    '<div class="form-group"><label for="bk-bilik">Jenis Bilik</label>' +
    '<select class="form-control" id="bk-bilik" name="Jenis Bilik" required>' +
    '<option value="">-- Pilih --</option>' +
    '<option value="Single RM60">Single (RM60)</option>' +
    '<option value="Double RM90">Double (RM90)</option>' +
    '<option value="Keluarga RM130">Keluarga (RM130)</option>' +
    "</select></div>" +
    "</div>" +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="bk-masuk">Tarikh Masuk</label>' +
    '<input type="date" class="form-control" id="bk-masuk" name="Tarikh Masuk" required></div>' +
    '<div class="form-group"><label for="bk-keluar">Tarikh Keluar</label>' +
    '<input type="date" class="form-control" id="bk-keluar" name="Tarikh Keluar" required></div>' +
    "</div>" +
    '<div class="form-group"><label for="bk-nota">Nota (pilihan)</label>' +
    '<textarea class="form-control" id="bk-nota" name="Nota" maxlength="500"></textarea></div>' +
    '<input type="hidden" name="_subject" value="Tempahan Musafir Inn \u2014 Masjid Bandar Labis">' +
    '<button type="submit" class="btn btn-gold btn-block">Hantar Tempahan</button>' +
    '<p class="form-note" style="text-align:center;margin-top:10px;">Tempahan hanya disahkan selepas pihak masjid menghubungi anda.</p>' +
    "</form>" +
    "</div>" +
    "</div></section>\n";

  write(
    "perkhidmatan.html",
    page({
      title: "Perkhidmatan \u2014 Masjid Bandar Labis",
      description:
        "Urusan harian masjid — pengurusan jenazah, perkahwinan, sewaan dewan, borang lawatan — dan tempahan Musafir Inn.",
      active: "perkhidmatan",
      body: body,
    })
  );
}

/* ============================================================
   MUKA SURAT 5 — galeri.html
   ============================================================ */
function buildGaleri() {
  // Baca semua gambar dari folder images/Galeri
  const dir = path.join(ROOT, "images", "Galeri");
  let files = [];
  if (fs.existsSync(dir)) {
    files = fs
      .readdirSync(dir)
      .filter(function (f) {
        return /\.[jJ][pP][gG]$|\.[jJ][pP][eE][gG]$|\.png$|\.webp$/.test(f);
      })
      .sort();
  }

  let tiles;
  if (!files.length) {
    // Fallback placeholder jika folder kosong
    tiles =
      '<div class="gallery-item" data-reveal>' +
      '<span aria-hidden="true">\u{1F54C}</span>' +
      '<span class="gallery-cap">Masjid Bandar Labis</span>' +
      "</div>";
  } else {
    tiles = files
      .map(function (file) {
        const isAerial = /^DJI_/i.test(file);
        const cap = isAerial
          ? "Pandangan Aerial Masjid Bandar Labis"
          : "Galeri Masjid Bandar Labis";
        return (
          '<figure class="gallery-item" data-reveal>' +
          '<img src="images/Galeri/' +
          encodeURIComponent(file) +
          '" alt="' +
          cap +
          '" loading="lazy">' +
          '<figcaption class="gallery-cap">' +
          cap +
          "</figcaption></figure>"
        );
      })
      .join("");
  }

  const body =
    pageHeader("Galeri <span>Masjid</span>", "Galeri") +
    '<section class="section">' +
    '<div class="container">' +
    sectionHeader(
      "Galeri <span>Foto</span>",
      "Gambar aktiviti dan suasana Masjid Bandar Labis."
    ) +
    // ---------- Video aerial ----------
    '<div class="video-feature" data-reveal>' +
    '<div class="video-frame">' +
    '<iframe src="' +
    CONFIG.videoAerial +
    '" title="Video aerial Masjid Bandar Labis" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>' +
    "</div>" +
    '<p class="video-caption">\u{1F3A5} Video aerial Masjid Bandar Labis</p>' +
    "</div>" +
    '<div class="gallery-grid">' + tiles + "</div>" +
    '<p class="form-note" style="text-align:center;margin-top:24px;">Untuk foto terkini, ikuti Facebook page masjid.</p>' +
    "</div></section>\n";

  write(
    "galeri.html",
    page({
      title: "Galeri \u2014 Masjid Bandar Labis",
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
    pageHeader("Hubungi <span>Kami</span>", "Hubungi") +
    '<section class="section">' +
    '<div class="container">' +
    '<div class="contact-grid">' +
    '<div class="contact-info" data-reveal>' +
    '<div class="contact-card">' +
    '<div class="contact-icon">' + iconSvg("pin", 22) + "</div>" +
    "<div><h4>Alamat</h4><p>" + CONFIG.addressLines.join("<br>") + "</p></div></div>" +
    '<div class="contact-card">' +
    '<div class="contact-icon">' + iconSvg("facebook", 22) + "</div>" +
    '<div><h4>Facebook Page</h4><p><a href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">facebook.com/masjidbandarlabis</a></p></div></div>' +
    '<div class="contact-card">' +
    '<div class="contact-icon">' + iconSvg("mail", 22) + "</div>" +
    "<div><h4>E-mel</h4><p>" + CONFIG.email + "</p></div></div>" +
    '<div class="contact-card">' +
    '<div class="contact-icon">' + iconSvg("clock", 22) + "</div>" +
    "<div><h4>Waktu Operasi</h4><p>Masjid: Buka <strong>24 jam</strong><br>Pejabat Pentadbiran: 8:30 pagi \u2013 5:00 petang</p></div></div>" +
    '<div class="hero-actions" style="justify-content:flex-start;">' +
    '<a class="btn btn-dark" href="' + CONFIG.facebookUrl + '" target="_blank" rel="noopener noreferrer">' +
    iconSvg("facebook", 18) + " Facebook Page</a>" +
    '<a class="btn btn-gold" href="mailto:' + CONFIG.email + '">' +
    iconSvg("mail", 18) + " Hantar E-mel</a>" +
    "</div>" +
    "</div>" +
    '<div data-reveal>' +
    "<h3 style=\"margin-bottom:20px;font-size:1.35rem;\">Hantar <span style=\"color:var(--gold-600);\">Maklum Balas</span></h3>" +
    '<form data-form="contact" id="contactForm">' +
    '<input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">' +
    '<div class="form-grid-2">' +
    '<div class="form-group"><label for="ct-nama">Nama</label>' +
    '<input type="text" class="form-control" id="ct-nama" name="Nama" required maxlength="100"></div>' +
    '<div class="form-group"><label for="ct-emel">E-mel</label>' +
    '<input type="email" class="form-control" id="ct-emel" name="E-mel" required maxlength="150"></div>' +
    "</div>" +
    '<div class="form-group"><label for="ct-mesej">Mesej</label>' +
    '<textarea class="form-control" id="ct-mesej" name="Mesej" required maxlength="1000"></textarea></div>' +
    '<input type="hidden" name="_subject" value="Maklum Balas \u2014 Masjid Bandar Labis">' +
    '<button type="submit" class="btn btn-gold btn-block">Hantar Mesej</button>' +
    "</form>" +
    "</div>" +
    "</div>" +
    // ---------- Pejabat Kadi Daerah Segamat ----------
    '<div class="kadi-card" data-reveal>' +
    "<h3>\u{1F3DB}\uFE0F <span>Bahagian Pengurusan Masjid Surau</span>, Pejabat Kadi Daerah Segamat</h3>" +
    "<p>Masjid Bandar Labis berada di bawah seliaan kerajaan melalui Pejabat Kadi Daerah Segamat, Jabatan Agama Islam Negeri Johor (JAINJ).</p>" +
    '<div class="kadi-grid">' +
    '<div class="kadi-item"><span class="kadi-icon">' + iconSvg("pin", 18) + "</span><span>" + CONFIG.kadiOffice.address + "</span></div>" +
    '<div class="kadi-item"><span class="kadi-icon">' + iconSvg("phone", 18) + "</span><span><strong>Telefon:</strong> " + CONFIG.kadiOffice.phone + "</span></div>" +
    '<div class="kadi-item"><span class="kadi-icon">' + iconSvg("printer", 18) + "</span><span><strong>Faks:</strong> " + CONFIG.kadiOffice.fax + "</span></div>" +
    "</div>" +
    "</div>" +
    // ---------- Peta ----------
    '<div class="map-frame" data-reveal>' +
    '<iframe src="https://maps.google.com/maps?q=Masjid%20Bandar%20Labis%2C%20Jalan%20Muar%2C%2085300%20Labis%2C%20Johor&t=m&z=15&output=embed&iwloc=near" ' +
    'title="Peta lokasi Masjid Bandar Labis" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
    "</div>" +
    "</div></section>\n";

  write(
    "hubungi.html",
    page({
      title: "Hubungi Kami \u2014 Masjid Bandar Labis",
      description:
        "Alamat, e-mel, Facebook page, waktu operasi dan borang maklum balas Masjid Bandar Labis, Segamat, Johor.",
      active: "hubungi",
      body: body,
    })
  );
}

/* ============================================================
   KOMPONEN KECIL
   ============================================================ */
function card(icon, title, desc, link) {
  return (
    '<div class="card" data-reveal>' +
    '<div class="card-icon" aria-hidden="true">' + icon + "</div>" +
    "<h3>" + title + "</h3>" +
    "<p>" + desc + "</p>" +
    (link ? '<a class="card-link" href="' + link + '">Baca lagi &rarr;</a>' : "") +
    "</div>"
  );
}

function newsItem(day, month, title, desc) {
  return (
    '<div class="news-item" data-reveal>' +
    '<div class="news-date"><span class="d">' + day + '</span><span class="m">' + month + "</span></div>" +
    "<div><h4>" + title + "</h4><p>" + desc + "</p></div>" +
    "</div>"
  );
}

function roomCard(icon, name, price, features) {
  const feats = features.map(function (f) { return "<li>" + f + "</li>"; }).join("");
  return (
    '<div class="room-card" data-reveal>' +
    '<div class="room-top"><div class="r-icon">' + icon + "</div>" +
    "<h4>" + name + '</h4><div class="r-price">' + price + "</div></div>" +
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

// Salin aset statik
console.log("Salin aset statik...");
copyDir(path.join(ROOT, "css"), path.join(DIST, "css"));
copyDir(path.join(ROOT, "js"), path.join(DIST, "js"));
copyDir(path.join(ROOT, "images"), path.join(DIST, "images"));

// Fail CNAME untuk domain khas (GitHub Pages)
write("CNAME", CONFIG.customDomain + "\n");

console.log("\n=== BINAAN SELESAI ===");
console.log("Folder: " + DIST);
