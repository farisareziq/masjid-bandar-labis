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
| `tentang.html` | Sejarah, visi & misi, carta organisasi, senarai pegawai |
| `aktiviti.html` | **Jadual Kuliah** + **Siaran Media** (Facebook, TikTok, video) |
| `perkhidmatan.html` | **Urusan Harian** (jenazah, perkahwinan, tempahan dewan) + **Musafir Inn** |
| `galeri.html` | Galeri foto |
| `hubungi.html` | Alamat, telefon, e-mel, TikTok, peta + borang maklum balas |

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

### Optimumkan gambar (pilihan)
```powershell
powershell -ExecutionPolicy Bypass -File scripts\optimize-images.ps1
```
Gambar asal disalin ke `backup-images/` sebelum fail dikompres (maks. 1600px, kualiti 82).

### Siaran Facebook (pilihan - guna token System User)
1. Cipta fail `.env` di root projek (FAIL INI TIDAK BOLEH DI-COMMIT):
   ```bash
   FB_ACCESS_TOKEN=token-system-user-anda
   ```
2. Token mesti daripada **System User** Facebook dengan permission `pages_read_engagement`, dan halaman `masjidbandarlabis` perlu di-assign kepada system user itu.
3. Setiap kali `scripts\deploy-branch.ps1` dijalankan, skrip akan muat turun **6 siaran terkini** halaman dan memasukkannya ke laman utama (bahagian **Aktiviti Masjid**) dan `aktiviti.html` (bahagian **Siaran Media**).
4. Jika token tiada / gagal / luar talian, laman menggunakan cache terakhir (`src/fb-posts.json`, kandungan awam sahaja) sebagai fallback.

> Skrip mendapatkan **Page Access Token** secara automatik melalui `/me/accounts`
> (diperlukan oleh Facebook untuk endpoint /posts) — anda hanya perlu sediakan
> token System User dalam `.env`.

> **Keselamatan:** Token hanya digunakan pada komputer anda semasa bina dan TIDAK PERNAH
> dimasukkan ke dalam kod website yang di-deploy. Jangan kongsi token atau fail `.env`.

### Auto-deploy (GitHub Actions) - kemas kini automatik
Workflow `.github/workflows/deploy.yml` berjalan secara automatik:
- **Setiap 30 minit** (cron) - siaran baharu muncul di laman dalam masa <=30 minit.
- Setiap kali ada push ke `main`.
- Manual: GitHub -> **Actions** -> "Auto-deploy siaran Facebook" -> **Run workflow**.

Sediakan sekali sahaja:
1. Buka repo di GitHub -> **Settings -> Secrets and variables -> Actions -> New repository secret**.
2. Nama: `FB_ACCESS_TOKEN` - Nilai: token System User (sama seperti dalam `.env`).
3. Token hanya digunakan oleh runner Actions (disulitkan oleh GitHub), tidak pernah masuk ke kod website.

Jika fetch gagal atau token belum diset, workflow menggunakan cache terakhir
(`src/fb-posts.json`) - laman tidak terjejas.

Status fetch disimpan dalam `src/fetch-status.json` (`ok: true/false` + bilangan
siaran) - berguna untuk mengesahkan token Actions berfungsi.

> Tiada `npm install` diperlukan — projek ini **sifar dependency** (lebih selamat,
> tiada pakej pihak ketiga yang boleh diserang/diaudit).

---

## 🌍 Deploy ke GitHub Pages (PERCUMA)

Kaedah ini **tidak memerlukan GitHub Actions** — GitHub Pages berkhidmat terus
daripada folder `docs/` dalam repo (tiada kos, tiada isu bil).

### Kali pertama (deploy awal)

1. Buka [github.com](https://github.com) dan daftar akaun (percuma) jika belum ada.
2. Pastikan GitHub CLI `gh` sudah log masuk:
   ```bash
   gh auth login
   ```
3. Jalankan skrip satu-klik:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\push-to-github.ps1
   ```
   Skrip ini akan: init repo → commit → cipta repo public → push → aktifkan Pages.

### Kemas kini website (selepas sebarang perubahan)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-branch.ps1
```

Skrip ini akan: bina website → salin ke `docs/` → commit → push.

Website akan live di:
```
https://<username>.github.io/masjid-bandar-labis/
```

> **Nota:** GitHub Actions (auto-deploy) boleh diaktifkan kemudian dengan
> memulangkan semula fail `.github/workflows/deploy.yml` — cuma pastikan akaun
> GitHub tidak dikunci oleh isu bil.

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
| 7 | **URL TikTok** | `src/build.js` → `CONFIG.tiktokUrl` | Akaun TikTok rasmi masjid: `https://www.tiktok.com/@masjidlabis` |

> **Saluran perhubungan:** Facebook page, TikTok (`@masjidlabis`), e-mel (`masjidbandarlabis@gmail.com`)
> dan borang laman web. Tiada nombor telefon/WhatsApp dipaparkan.

Selepas sebarang perubahan: jalankan `node src/build.js` dan push ke GitHub.

---

## 🧪 Bug & Security (disertakan dalam build)

| Isu | Penyelesaian |
|---|---|
| Pautan patah | `src/check-links.js` sahkan semua pautan dalaman (fail + `#anchor`) wujud sebelum deploy |
| XSS dari data API | Waktu solat dibina dengan `textContent` (DOM), bukan `innerHTML` |
| Tabnabbing | Semua pautan luaran (`target="_blank"`) ada `rel="noopener noreferrer"` |
| Skrip inline | Dilarang oleh CSP (`script-src 'self'`) dan disemak oleh CI |
| Pautan `http://` | Ditolak oleh CI — semua pautan mesti `https://` |
| Borang palsu | Disambungkan ke **FormSubmit.co** → e-mel `masjidbandarlabis@gmail.com` + fallback e-mel/Facebook + honeypot anti-spam (`botcheck` + `_honey` sisi pelayan) |
| Supply-chain | Sifar dependency npm |
| Clickjacking | `frame-ancestors` tidak berfungsi dalam meta CSP — set header HTTP di Cloudflare untuk `masjidlabis.my` |

> **Amaran:** Fail dalam repo ini adalah **awam**. Jangan commit kata laluan,
> kunci API peribadi, atau maklumat sensitif.

---

## 📜 Lesen

Dikeluarkan di bawah [MIT License](LICENSE). Sila guna, ubah suai dan kongsi
untuk manfaat ummah.

---

## 📧 Borang & E-mel

Ketiga-tiga borang (maklum balas, tempahan Dewan Imam Malik, pertanyaan Musafir Inn) menghantar terus
ke **`masjidbandarlabis@gmail.com`** melalui [FormSubmit.co](https://formsubmit.co)
— percuma dan tanpa pendaftaran.

**Aktivasi sekali sahaja:**
1. Pergi ke website dan hantar sebarang borang.
2. FormSubmit menghantar **e-mel pengesahan** kepada `masjidbandarlabis@gmail.com`.
3. Buka e-mel tersebut dan klik pautan pengesahan.
4. Selepas itu, semua penghantaran borang akan terus tiba ke e-mel masjid.

> Nota: Pelan percuma FormSubmit mengehadkan bilangan penghantaran setiap bulan.
> Sekiranya mencecah had, boleh naik taraf atau tukar pembekal lain.

> Privasi: Borang pertanyaan Musafir Inn hanya meminta Nama dan No. Telefon —
> untuk sebarang pertanyaan atau tempahan, hubungi WhatsApp terus.

## 🙏 Kredit

- Data waktu solat: [JAKIM e-Solat](https://www.e-solat.gov.my)
- Borang percuma: [FormSubmit](https://formsubmit.co)
- Hosting percuma: [GitHub Pages](https://pages.github.com)
- Ikon: Feather & Font Awesome (lesen MIT / CC BY 4.0)
