# Pelan: Call Routing "Nombor Pejabat" → Telefon Peribadi Pegawai

Tarikh: 11 Ogos 2026
Status: **Pelan sahaja — belum dibina**

## 1. Apa yang Diminta

Orang awam mendail **satu nombor telefon pejabat** (contoh: nombor maya `07-xxxxxxx`),
tetapi panggilan itu **berdering di telefon bimbit pegawai masjid** (imam, bilal,
pentadbir) — serentak atau berurutan, dan sesiapa yang angkat dahulu akan meneruskan
perbualan.

Dalam istilah teleponi, ini dipanggil **PBX extension + Follow-Me / Ring Group**:

- 1 nombor masuk (DID) → PBX → kumpulan dering (extension) → forward ke nombor bimbit.
- Pilihan tambahan: sambutan automatik (IVR), waktu operasi, voicemail ke e-mel.

## 2. Realiti yang Perlu Diluruskan Dulu

Telefon awam (PSTN) ialah infrastruktur **berbayar**. Tiada pembekal yang menawarkan
nombor DID Malaysia secara 100% percuma. Ini semakan harga (Ogos 2026, boleh berubah):

| Pembekal | Nombor Malaysia | Anggaran kos |
|---|---|---|
| [voip.my](https://www.voip.my/voip-services/did-ddi-service) (sama dengan Sippals) | DID semua negeri, 2 saluran, panggilan masuk tanpa had | **RM10 sebulan** + setup RM10 |
| Sippals SIP trunk | Kadar rata tempatan | RM0.13/minit keluar |
| Zadarma | Hanya 1800 toll-free | US$45 setup + US$54/bulan (mahal) |
| Telnyx | Nombor MY (perlu KYC) | ~US$11/bulan |
| Twilio | Nombor antarabangsa/My | US$1.15/bulan ke atas |

Maka, "free" dalam pelan ini bermaksud:

- **Perisian & kod: 100% open source** (Asterisk/FreePBX, atau kod dalam repo ini).
- **Hosting: percuma** (Oracle Cloud Always Free, atau vendor PBX percuma).
- **Nombor + minit: bayaran minimum** (RM10–20/bulan sahaja untuk trafik masjid).

Jika keutamaan mutlak adalah **RM0 sebenar** (tanpa nombor baru, tanpa server), gunakan
ciri **pengalihan panggilan (call forwarding)** daripada talian sedia ada — tetapi ini
ciri telco, bukan open source (lihat Bahagian 6).

## 3. Perbandingan Pilihan

| Pilihan | Kos bulanan | Open source? | Server? | Kesesuaian |
|---|---|---|---|---|
| **A. Telco call forwarding** (talian pejabat sedia ada → bimbit) | RM3 + cas per panggilan (Maxis); semak TM/CelcomDigi | ❌ Ciri vendor | Tiada | Paling cepat (5 minit), tiada kod |
| **B. PBX open source sendiri** (FreePBX/Asterisk + Oracle Cloud free + DID RM10) | ~RM10–20 | ✅ Penuh | VPS percuma | Kawalan penuh, setup teknikal 1–2 hari |
| **C. PBX cloud vendor percuma** (Zadarma/3CX Free + nombor berbayar) | Harga nombor sahaja | ⚠️ Sebahagian | Tiada | Paling mudah; nombor MY mahal/terhad |
| **D. Fonoster** (OSS Twilio alternative) | Trunk + DID berbayar | ✅ Penuh | VPS | Berat untuk keperluan masjid |
| **E. Laman web sahaja** (`tel:` link) | RM0 | ✅ | Tiada | Tiada routing — pengunjung dail terus nombor peribadi/kadi |

## 4. Seni Bina yang Dicadangkan (Pilihan B — paling OSS)

```text
Orang awam
   │ dail nombor pejabat (DID RM10/bulan, cth. 07-xxxxxxx)
   ▼
SIP Trunk (Sippals RM0.13/min) ──► Oracle Cloud Always Free (VM)
                                     └─ FreePBX (Asterisk)
                                          ├─ Inbound Route: DID → Ring Group
                                          ├─ Ring serentak: imam, bilal, pentadbir
                                          │   (Follow-Me ke nombor bimbit masing-masing)
                                          ├─ Waktu operasi 8:30–5:00 → dering
                                          ├─ Di luar waktu → voicemail → e-mel Gmail
                                          └─ CDR (log panggilan) → simpanan percuma
```

Ciri yang perlu dikonfigurasi dalam FreePBX:

1. **Extensions** — satu extension bagi setiap pegawai.
2. **Follow-Me / Ring Group** — panggilan ke nombor pejabat menderng semua nombor bimbit.
3. **IVR** (pilihan) — sambutan "Assalamualaikum, anda menghubungi Masjid Bandar Labis…".
4. **Time Conditions** — luar waktu pejabat terus ke voicemail.
5. **Voicemail → e-mel** — mesej sampai ke `masjidbandarlabis@gmail.com` (sama macam pelan e-mel).

## 5. Kos Anggaran untuk Masjid

| Item | Kos |
|---|---|
| DID Malaysia (voip.my) | RM10/bulan (setup RM10 sekali) |
| Forward ke bimbit (Sippals) | RM0.13/minit — anggap 100 minit/bulan = RM13 |
| Oracle Cloud Always Free | RM0 |
| Jumlah anggaran | **RM10–25/bulan** |

## 6. Pilihan RM0 Sebenar (Tanpa Open Source)

### A1. Pengalihan panggilan telco

- Aktifkan ciri **Call Forwarding / Call Divert** pada talian pejabat sedia ada
  (TM Unifi, CelcomDigi, Maxis) ke nombor bimbit pegawai.
- Maxis: yuran bulanan RM3; panggilan dijawab dicaj sebagai panggilan tempatan.
- TM/CelcomDigi: hubungi pembekal — biasanya percuma diaktifkan, cas per panggilan.
- Kekurangan: satu destinasi sahaja (bukan serentak ke ramai), tiada log/IVR, bukan OSS.

### A2. Jika tiada talian pejabat langsung

- Gunakan nombor bimbit sedia ada (cth. Musafir Inn `019-7080656`) + WhatsApp Business.
- Bukan panggilan PSTN berbilang penerima; cuma paling murah.

## 7. Fasa Pelaksanaan

1. **Fasa 0 — Keputusan:** pilih laluan — (A) telco forwarding RM0 setup,
   (B) PBX OSS RM10–25/bulan, atau (C) vendor PBX cloud.
2. **Fasa 1 — Nombor:** daftar DID + trunk (voip.my/Sippals), sedia dokumen KYC masjid,
   uji terima panggilan masuk.
3. **Fasa 2 — PBX:** deploy FreePBX di Oracle Cloud, konfigurasi ring group/follow-me,
   IVR, waktu operasi, voicemail.
4. **Fasa 3 — Laman web:** tambah `phone` ke `CONFIG` dalam `src/build.js`, papar nombor
   pejabat di `hubungi.html` + butang `tel:`, kemas kini `docs/hubungi.html` & `dist/`.
5. **Fasa 4 — Ujian & dokumentasi:** ujian panggilan sebenar (dail dari telefon awam),
   semak log/CDR, tulis panduan penyelenggaraan.

## 8. Risiko & Catatan

- **KYC diperlukan** — nombor Malaysia memerlukan dokumen pendaftaran organisasi
  (MCMC). Masjid perlu sediakan dokumen pendaftaran.
- **Kos per minit** — trafik masjid rendah, jadi kecil; pantau CDR bulan pertama.
- **Oracle Cloud free tier** — VM idle boleh dihentikan; perlu pastikan ia aktif
  atau gunakan VM ARM yang lebih stabil.
- **Jangan papar nombor peribadi pegawai** di laman web — nombor pejabat sahaja.
- **"Open source" = perisian & kod kami** (FreePBX, konfigurasi, kod laman). Nombor dan
  trunk kekal perkhidmatan vendor berbayar — sama seperti pelan e-mel (Cloudflare/Resend).
- **"Extension"** di sini bermaksud extension PBX (nombor sambungan + follow-me).
  Jika yang dimaksudkan ialah *browser extension* (Chrome), ia tetap memerlukan backend
  teleponi yang sama — extension hanya menjadi kawalan/UI, bukan pengganti nombor.
