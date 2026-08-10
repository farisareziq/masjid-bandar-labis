# Pelan: Serverless Mailbox + Inquiry untuk masjidlabis.my

Tarikh: 11 Ogos 2026
Status: **Pelan sahaja — belum dibina**

## 1. Status Semasa

- Website statik di GitHub Pages; domain `masjidlabis.my` DNS di **Cloudflare**.
- 3 borang inquiry (maklum balas, sewa dewan, Musafir Inn) semuanya melalui **FormSubmit.co** → `masjidbandarlabis@gmail.com`.
- Tiada rekod MX/SPF/DMARC lagi di DNS domain.

## 2. Perkara yang Perlu Diluruskan Dulu

"Mailbox sebenar dengan webmail/log masuk" yang **100% open source + percuma + serverless** tidak wujud secara siap pakai:

- Zoho Mail free (5 pengguna) bukan open source.
- Mailu/Mailcow (open source) perlukan VPS — bukan serverless.

Yang memang wujud dan percuma:

1. **Terima e-mel** ke alamat domain → forward ke Gmail sedia ada.
2. **Hantar e-mel automatik** (borang website) dari alamat domain melalui API percuma.
3. **Bina inbox ringan sendiri** guna Cloudflare Email Workers + D1 (open source, serverless, RM0) — tetapi kena urus kod sendiri.

Cadangan: gabungkan (1)+(2) sebagai pelan utama, dan (3) sebagai fasa pilihan kemudian.

## 3. Perbandingan Pilihan

| Komponen | Pilihan | Kos | Open source? | Nota |
|---|---|---|---|---|
| Terima (mailbox) | **Cloudflare Email Routing** ⭐ | Percuma, unlimited | Perkhidmatan vendor, bukan OSS | Domain dah di Cloudflare; auto-tambah MX/SPF/DKIM; tak simpan e-mel |
| Terima (alternatif) | Forward Email | Percuma (forward sahaja) | ✅ 100% MIT | Hantar kena bayar; perlu tukar MX ke mereka |
| Hantar borang | **MailChannels Email API** | Percuma 100 e-mel/hari | Perkhidmatan vendor | Integrasi code sendiri OSS |
| Hantar borang (alternatif) | Resend | Percuma 3,000/bln, 100/hari | Perkhidmatan vendor | Lebih matang, API stabil |
| Hantar (bukan free) | Cloudflare Email Sending | ❌ Perlukan Workers Paid $5/bln | Perkhidmatan vendor | Elak, sebab mahal untuk keperluan masjid |
| Inbox ber-UI sendiri (pilihan) | Mailflare / mercury / vmail | RM0 (Workers + D1 free) | ✅ OSS | Projek baru/bersaiz kecil; ada kos penyelenggaraan |

## 4. Seni Bina yang Dicadangkan

### Terima

Cipta alias di Cloudflare Email Routing:

- `info@masjidlabis.my` — umum
- `dewan@masjidlabis.my` — sewaan dewan
- `inn@masjidlabis.my` — Musafir Inn
- `admin@masjidlabis.my` — dalaman (pilihan)

Semua alias forward ke Gmail masjid yang sedia ada. Laman hanya paparkan `info@masjidlabis.my`, bukan alamat Gmail asal.

### Hantar

Gantikan FormSubmit.co dengan **Cloudflare Worker** (kod disimpan dalam repo, jadi open source):

1. Borang hantar terus ke Worker.
2. Worker sahkan honeypot + had kadar (rate limit).
3. Worker hantar e-mel ke Gmail pentadbir melalui MailChannels/Resend free tier, dengan pengirim `info@masjidlabis.my`.
4. Pilihan: auto-reply ringkas kepada pengirim.

### Rekod DNS Baru (di dashboard Cloudflare)

| Rekod | Nilai | Cara |
|---|---|---|
| `MX` | `route1/2/3.mx.cloudflare.net` | Auto apabila Email Routing diaktifkan |
| `SPF` | `v=spf1 include:_spf.mx.cloudflare.net include:… ~all` | Auto + tambah include pembekal hantar |
| `DKIM` | Auto oleh Cloudflare + pembekal hantar | Auto + ikut arahan pembekal |
| `DMARC` | `v=DMARC1; p=quarantine; rua=mailto:masjidbandarlabis@gmail.com` | Manual — penting elak spoofing |

### Kos

RM0 sebulan. Had terbesar: 100 e-mel keluar/hari (MailChannels) — lebih daripada cukup untuk inquiry masjid.

## 5. Skop Fail (bila mula bina nanti)

- `src/build.js` — 3 borang (action, `_subject`) dan CSP `connect-src`
- `js/main.js` — logik fetch borang (baris ±244–310), tukar FormSubmit → Worker
- `docs/hubungi.html` — papar `info@masjidlabis.my`
- `js/i18n.js` — mesej hasil borang
- Folder `worker/` baru — kod Worker + `wrangler.toml`

## 6. Fasa Pelaksanaan

1. **Fasa 0 — Keputusan:** pilih alias akhir, pembekal hantar (cadangan: MailChannels dulu, Resend fallback), dan sama ada mahu auto-reply.
2. **Fasa 1 — Terima e-mel:** aktifkan Email Routing, sahkan Gmail, tambah DMARC, uji hantar ke `info@masjidlabis.my`.
3. **Fasa 2 — Kemas kini laman:** papar alamat domain di `hubungi.html`.
4. **Fasa 3 — Worker:** deploy, sambung 3 borang, uji hantar/terima + semak SPF/DKIM/DMARC.
5. **Fasa 4 (pilihan):** auto-reply, kemudian inbox D1 + halaman admin (pakai projek OSS atau bina ringkas).
6. **Fasa 5 — Ujian & dokumentasi:** ujian deliverability (cth. mail-tester), catat cara penyelenggaraan.

## 7. Risiko & Catatan

- Elak **catch-all** — alias eksplisit sahaja, kalau tidak inbox Gmail dibanjiri spam.
- Free tier MailChannels/Resend ada had harian; jika perlu lebih, naik taraf atau tukar pembekal (kod Worker tidak berubah banyak).
- "Open source" di sini bermaksud **kod sendiri** (Worker/inbox) terbuka; perkhidmatan Cloudflare/MailChannels/Resend itu sendiri adalah vendor percuma, bukan open source.
- Jika 100% open source adalah keutamaan mutlak: Forward Email (terima sahaja) atau bina inbox D1 sendiri (Fasa 4).
- Cloudflare Email Routing tidak menyimpan e-mel — Gmail kekal sebagai inbox utama.
