# 🕌 Masjid Bandar Labis — Website Rasmi

Laman web statik untuk **Masjid Bandar Labis**, Bandar Labis, Daerah Segamat, Johor.
Tema: **Royal Yellow & Black**.

- ✅ **Open Source** (lesen MIT)
- ✅ **Hosting PERCUMA** — GitHub Pages + SSL percuma
- ✅ Tiada server, tiada pangkalan data, tiada kos bulanan
- ✅ Waktu solat automatik daripada API rasmi **JAKIM e-Solat** (zon `JHR04`)

---

## 📄 Struktur Laman

| Halaman | Kandungan |
|---|---|
| `index.html` | Utama — hero, waktu solat, program, **sumbangan** (Bank Rakyat + QR) |
| `tentang.html` | Sejarah, visi & misi, carta organisasi |
| `aktiviti.html` | **Jadual Kuliah** + **Siaran Media** (Facebook, video, pengumuman) |
| `perkhidmatan.html` | **Urusan Harian** (jenazah, perkahwinan, lawatan) + **Musafir Inn** |
| `galeri.html` | Galeri foto |
| `hubungi.html` | Alamat, telefon, e-mel, peta + borang maklum balas |

---

## 🚀 Cara Guna

### Prasyarat
- [Node.js](https://nodejs.org) (versi 18+)

### Bina website (hasil ke folder `dist/`)
```bash
node src/build.js
```

### Pra-tonton secara lokal
```bash
node src/serve.js
```
Kemudian buka `http://localhost:8080` dalam pelayar.

> Tiada `npm install` diperlukan — projek ini **sifar dependency** (lebih selamat,
> tiada pakej pihak ketiga yang boleh diserang/diaudit).

---

## 🌍 Deploy ke GitHub Pages (PERCUMA)

1. Buka [github.com](https://github.com) dan daftar akaun (percuma) jika belum ada.
2. Cipta **repo public** bernama `masjid-bandar-labis`.
3. Muat naik semua fail projek ini ke repo tersebut.
4. Pergi ke **Settings → Pages** dan tetapkan **Source: GitHub Actions**.
5. Setiap kali anda `push` ke branch `main`, workflow `.github/workflows/deploy.yml`
   akan automatik:
   - Bina website (`node src/build.js`)
   - Semak pautan & keselamatan (`node src/check-links.js`)
   - **Deploy** ke GitHub Pages

Website akan live di:
```
https://<username>.github.io/masjid-bandar-labis/
```

---

## ⚙️ Perkara yang Perlu Dikemas Kini

| # | Perkara | Lokasi | Penerangan |
|---|---|---|---|
| 1 | **QR sumbangan** | `images/qr-sumbangan.png` | Simpan **DuitNow QR rasmi** daripada app Bank Rakyat di sini — muncul automatik |
| 2 | **Logo masjid** | `images/logo.png` | Logo dipaparkan di navbar & footer. PNG latar telus digalakkan. Jika tiada, emoji 🕌 digunakan |
| 3 | **URL Facebook** | `src/build.js` → `CONFIG.facebookUrl` | Ganti dengan URL page rasmi masjid |
| 4 | **E-mel borang** | `js/main.js` → `SITE_CONFIG.formEmail` | Ditetapkan kepada `masjidbandarlabis@gmail.com`. **Penting:** pada penghantaran pertama, FormSubmit hantar e-mel pengesahan ke alamat ini — klik pautan itu sekali untuk aktifkan |
| 5 | **Kandungan jadual kuliah / pengumuman** | `src/build.js` | Edit teks dalam fungsi `buildAktiviti()` |
| 6 | **Galeri & gambar masjid** | `images/` | Ganti placeholder dengan foto sebenar |

> **Saluran perhubungan:** Facebook page, e-mel (`masjidbandarlabis@gmail.com`)
> dan borang laman web. Tiada nombor telefon/WhatsApp dipaparkan.

Selepas sebarang perubahan: jalankan `node src/build.js` dan push ke GitHub.

---

## 🧪 Bug & Security (disertakan dalam build)

| Isu | Penyelesaian |
|---|---|
| Pautan patah | `src/check-links.js` sahkan semua pautan dalaman wujud sebelum deploy |
| XSS dari data API | Waktu solat dibina dengan `textContent` (DOM), bukan `innerHTML` |
| Tabnabbing | Semua pautan luaran (`target="_blank"`) ada `rel="noopener noreferrer"` |
| Skrip inline | Dilarang oleh CSP (`script-src 'self'`) dan disemak oleh CI |
| Pautan `http://` | Ditolak oleh CI — semua pautan mesti `https://` |
| Borang palsu | Disambungkan ke **FormSubmit.co** → e-mel `masjidbandarlabis@gmail.com` + fallback e-mel/Facebook + honeypot anti-spam |
| Supply-chain | Sifar dependency npm |

> **Amaran:** Fail dalam repo ini adalah **awam**. Jangan commit kata laluan,
> kunci API peribadi, atau maklumat sensitif.

---

## 📜 Lesen

Dikeluarkan di bawah [MIT License](LICENSE). Sila guna, ubah suai dan kongsi
untuk manfaat ummah.

---

## 📧 Borang & E-mel

Ketiga-tiga borang (maklum balas, lawatan, tempahan Musafir Inn) menghantar terus
ke **`masjidbandarlabis@gmail.com`** melalui [FormSubmit.co](https://formsubmit.co)
— percuma dan tanpa pendaftaran.

**Aktivasi sekali sahaja:**
1. Pergi ke website dan hantar sebarang borang.
2. FormSubmit menghantar **e-mel pengesahan** kepada `masjidbandarlabis@gmail.com`.
3. Buka e-mel tersebut dan klik pautan pengesahan.
4. Selepas itu, semua penghantaran borang akan terus tiba ke e-mel masjid.

> Nota: Pelan percuma FormSubmit mengehadkan bilangan penghantaran setiap bulan.
> Sekiranya mencecah had, boleh naik taraf atau tukar pembekal lain.

## 🙏 Kredit

- Data waktu solat: [JAKIM e-Solat](https://www.e-solat.gov.my)
- Borang percuma: [FormSubmit](https://formsubmit.co)
- Hosting percuma: [GitHub Pages](https://pages.github.com)
- Ikon: Feather & Font Awesome (lesen MIT / CC BY 4.0)
