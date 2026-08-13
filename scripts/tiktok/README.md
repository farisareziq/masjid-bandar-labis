# AutoPost Facebook Page -> TikTok (via Buffer)

Skrip tanpa dependency luar (Node.js built-in sahaja) untuk auto-post siaran
video daripada Facebook Page rasmi masjid ke akaun TikTok @masjidlabis.

Aliran: **Facebook Page (Graph API) -> muat turun video (semak tempoh) ->
Buffer API (GraphQL) -> TikTok**.

Mengapa Buffer? App TikTok rasmi tidak meluluskan penggunaan peribadi/internal
(seperti yang diterima semasa review). Buffer sudah ada sambungan TikTok yang
diluluskan, jadi tiada review TikTok diperlukan. Pelan Percuma Buffer cukup:
3 saluran, 10 post berjadual setiap saluran, dan 1 kunci API
(3,000 permintaan/bulan).

---

## 1. Persediaan Buffer (sekali sahaja)

1. Daftar akaun percuma di [buffer.com](https://buffer.com).
2. Sambung saluran:
   - **Facebook Page** (Masjid Bandar Labis)
   - **TikTok** (@masjidlabis)
3. Dapatkan API key: Settings -> API -> Generate key.
4. Salin ID saluran TikTok (atau biarkan kosong - skrip akan cari automatik):
   saluran TikTok masjid = `6a7bed08b2d9d577435f800f`.

## 2. Fail .env (di ROOT repo - JANGAN commit)

Fail `.env` di root repo sudah mengandungi `FB_ACCESS_TOKEN`. Tambah ini:

```env
BUFFER_API_KEY=...
BUFFER_CHANNEL_ID=6a7bed08b2d9d577435f800f
BUFFER_MAX_DURATION_SEC=600
```

> `BUFFER_API_KEY` adalah rahsia - jangan kongsi, jangan commit.
> `BUFFER_MAX_DURATION_SEC` = had tempoh video (saat). Video lebih panjang
> daripada had TikTok akan dilangkau dengan log.

## 3. Ujian tempatan

```bash
# Senarai apa yang akan dihantar (tanpa hantar apa-apa)
node scripts/tiktok/autopost.js --dry-run

# Hantar sebenar (video baharu ke TikTok via Buffer)
node scripts/tiktok/autopost.js
```

## 4. Auto-post berjadual (GitHub Actions)

Workflow `.github/workflows/autopost.yml` berjalan setiap 15 minit.
Ia memerlukan repository secrets berikut:

| Secret | Nilai |
|---|---|
| `FB_ACCESS_TOKEN` | Sedia ada (dari deploy lama) |
| `BUFFER_API_KEY` | API key Buffer |
| `BUFFER_CHANNEL_ID` | ID saluran TikTok |
| `BUFFER_MAX_DURATION_SEC` | `600` (10 minit) |

State (ID post yang sudah dipos) disimpan dalam `scripts/tiktok/state.json`
dan dikemas kini balik ke repo oleh workflow supaya tiada post duplikat.

## Nota

- Hanya siaran **video** dihantar (TikTok tidak terima teks/gambar sahaja).
- Had TikTok: 15-25 video sehari, 3 saat - 10 minit (ikut akaun), MP4/MOV.
- Video kuliah langsung Facebook yang lebih daripada 10 minit akan **dilangkau**
  secara automatik (had API TikTok). Untuk menghantar video panjang, video
  perlu dipangkas dahulu (ffmpeg) - boleh ditambah kemudian.
- Fail `scripts/tiktok/tokens.json` dan folder `scripts/tiktok/tmp/` tidak
  di-commit (token OAuth & fail sementara).
