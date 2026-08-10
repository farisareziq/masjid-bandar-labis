# AutoPost Facebook Page -> TikTok

Skrip tanpa dependency luar (guna Node.js built-in sahaja) untuk auto-post
siaran video daripada Facebook Page rasmi masjid ke akaun TikTok @masjidlabis,
menggunakan API rasmi:

- **Meta Graph API** - baca siaran baharu halaman
- **TikTok Content Posting API** - hantar video ke TikTok

---

## 1. Persediaan portal TikTok (sekali sahaja)

1. Buka [developers.tiktok.com](https://developers.tiktok.com) dan login guna
   akaun TikTok masjid.
2. Buka app **AutoPost Masjid Bandar Labis**.
3. Pastikan produk **Login Kit** dan **Content Posting API** ditambah.
4. Pastikan scope berikut diaktifkan:
   - `user.info.basic`
   - `video.publish`
5. Tambah **Redirect URL**: `http://localhost:8080/callback`
   (dalam Manage Apps -> app -> Redirect URL).
6. Hantar app untuk **review** jika belum (sebelum lulus, video hanya boleh
   dihantar sebagai `SELF_ONLY`/private).

## 2. Fail .env (di ROOT repo - JANGAN commit)

Fail `.env` di root repo sudah mengandungi `FB_ACCESS_TOKEN`. Tambah ini:

```env
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
TIKTOK_REDIRECT_URI=http://localhost:8080/callback
TIKTOK_SCOPES=user.info.basic,video.publish
TIKTOK_PRIVACY=SELF_ONLY
```

> `TIKTOK_PRIVACY` ditukar kepada `PUBLIC_TO_EVERYONE` hanya selepas app
> TikTok lulus review.

## 3. Sambung akaun TikTok (OAuth) - sekali sahaja

```bash
node scripts/tiktok/auth-server.js
```

Buka `http://localhost:8080`, klik **Login dengan TikTok**, login akaun masjid
dan benarkan akses. Token disimpan dalam `scripts/tiktok/tokens.json`
(fail ini **tidak** di-commit).

## 4. Hantar video ujian (untuk demo / review)

```bash
node scripts/tiktok/post-video.js video-anda.mp4 "Kapsyen ujian"
```

Video ujian dihantar sebagai `SELF_ONLY` (private) sehingga review lulus.

## 5. Auto-post berjadual (GitHub Actions)

Workflow `.github/workflows/autopost.yml` berjalan setiap 15 minit.
Ia memerlukan repository secrets berikut:

| Secret | Nilai |
|---|---|
| `FB_ACCESS_TOKEN` | Sedia ada (dari deploy lama) |
| `TIKTOK_CLIENT_KEY` | Client Key app |
| `TIKTOK_CLIENT_SECRET` | Client Secret app |
| `TIKTOK_REFRESH_TOKEN` | Refresh token dari `scripts/tiktok/tokens.json` |
| `TIKTOK_PRIVACY` | `SELF_ONLY` (uji) / `PUBLIC_TO_EVERYONE` (selepas review) |

State (ID post yang sudah dipos) disimpan dalam `scripts/tiktok/state.json`
dan dikemas kini balik ke repo oleh workflow supaya tiada post duplikat.

## 6. Ujian tempatan

```bash
# Senarai apa yang akan dihantar (tanpa hantar apa-apa)
node scripts/tiktok/autopost.js --dry-run

# Hantar sebenar (SELF_ONLY)
node scripts/tiktok/autopost.js
```

## Nota

- Hanya siaran **video** dihantar ke TikTok (TikTok API tidak terima teks
  atau gambar sahaja).
- Had TikTok: 15-25 video sehari, 3 saat - 10 minit, MP4/MOV/WebM.
- Access token tamat ~24 jam; skrip auto-refresh guna refresh token
  (valid 365 hari, berputar setiap kali refresh).
- Jangan kongsi `TIKTOK_CLIENT_SECRET` atau refresh token dengan sesiapa.
