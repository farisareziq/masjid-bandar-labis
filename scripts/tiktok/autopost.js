/* ============================================================
   AUTO-POSTER: Facebook Page -> TikTok
   Jalankan:  node scripts/tiktok/autopost.js [--dry-run]

   - Baca siaran baharu halaman Facebook (Graph API)
   - Untuk siaran video sahaja: muat turun video, hantar ke TikTok
   - Simpan ID siaran yang sudah diproses dalam state.json
   - Privasi: TIKTOK_PRIVACY (SELF_ONLY sehingga review TikTok lulus)
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const tiktok = require("./lib/tiktok");
const state = require("./lib/state");
const mp4 = require("./lib/mp4");

const PAGE_REF = tiktok.cfg("FB_PAGE_USERNAME", "masjidbandarlabis");
const POST_LIMIT = 10;
const GRAPH_VERSION = "v21.0";
const TIMEOUT_MS = 30000;
const TMP_DIR = path.join(__dirname, "tmp");
const DRY_RUN = process.argv.indexOf("--dry-run") !== -1;

function fbToken() {
  return tiktok.cfg("FB_ACCESS_TOKEN", "");
}

async function fbGet(pathname, token) {
  const sep = pathname.indexOf("?") === -1 ? "?" : "&";
  const url =
    "https://graph.facebook.com/" +
    GRAPH_VERSION +
    pathname +
    sep +
    "access_token=" +
    encodeURIComponent(token);
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error((json.error && json.error.message) || "HTTP " + res.status);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function resolvePage(token) {
  const accounts = await fbGet("/me/accounts?fields=id,name,access_token", token);
  const pages = accounts.data || [];
  const normalize = function (s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  };
  let page = pages.find(function (p) {
    return normalize(p.name) === normalize(PAGE_REF) || p.id === PAGE_REF;
  });
  if (!page && pages.length === 1) {
    page = pages[0];
    console.log("Guna halaman tunggal: " + page.name);
  }
  if (!page) {
    throw new Error("Halaman '" + PAGE_REF + "' tiada dalam /me/accounts");
  }
  return page;
}

function collectSources(node, out) {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const n of node) collectSources(n, out);
    return out;
  }
  if (typeof node !== "object") return out;
  if (node.media && node.media.source) {
    out.push({ mediaType: node.media_type || "", source: node.media.source });
  }
  if (node.subattachments && node.subattachments.data) {
    collectSources(node.subattachments.data, out);
  }
  if (node.data && Array.isArray(node.data)) {
    collectSources(node.data, out);
  }
  return out;
}

function findVideo(post) {
  const sources = collectSources(post.attachments ? post.attachments.data : null, []);
  return (
    sources.find(function (s) {
      return String(s.mediaType).toLowerCase().indexOf("video") !== -1;
    }) ||
    sources[0] ||
    null
  );
}

async function downloadVideo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Gagal muat turun video: HTTP " + res.status);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

async function main() {
  const token = fbToken();
  if (!token) {
    throw new Error("Tiada FB_ACCESS_TOKEN dalam .env / environment.");
  }

  const page = await resolvePage(token);
  const posts = await fbGet(
    "/" +
      page.id +
      "/posts?fields=id,created_time,message,permalink_url,attachments{media_type,media{source},url,title,description}&limit=" +
      POST_LIMIT,
    page.access_token
  );

  const st = state.loadState();
  const processed = new Set(st.processed || []);
  const list = posts.data || [];
  let posted = 0;
  let skipped = 0;
  let tooLong = 0;

  let maxDuration = null;
  let tokens = null;
  let privacy = "SELF_ONLY";
  if (!DRY_RUN) {
    tokens = await state.ensureFreshToken(tiktok);
    privacy = tiktok.cfg("TIKTOK_PRIVACY", "SELF_ONLY");
    try {
      const info = await tiktok.creatorInfo(tokens.access_token);
      const ci = info && info.data && info.data.creator_info ? info.data.creator_info : {};
      maxDuration = ci.max_video_post_duration_sec || null;
      console.log(
        "Akaun: " + (ci.display_name || tokens.open_id) +
          " | had tempoh video: " + (maxDuration ? Math.round(maxDuration / 60) + " minit" : "tidak diketahui")
      );
    } catch (e) {
      console.warn("Amaran: tidak dapat semak had tempoh video -> " + e.message);
    }
  }

  fs.mkdirSync(TMP_DIR, { recursive: true });

  for (const post of list) {
    if (processed.has(post.id)) {
      skipped++;
      continue;
    }
    const media = findVideo(post);
    if (!media) {
      console.log("  - " + post.id + ": tiada video (langkau)");
      processed.add(post.id);
      continue;
    }
    const caption = (post.message || "Video Masjid Bandar Labis").slice(0, 2200);
    const tmpFile = path.join(TMP_DIR, "fb-" + String(post.id).replace(/[^0-9]/g, "") + ".mp4");
    console.log("  > " + post.id + ": muat turun video...");
    if (!DRY_RUN) {
      await downloadVideo(media.source, tmpFile);
      const dur = mp4.durationSeconds(tmpFile);
      if (dur !== null && maxDuration && dur > maxDuration) {
        console.log(
          "    Langkau: video " + Math.round(dur / 60) + " minit melebihi had TikTok " +
            Math.round(maxDuration / 60) + " minit."
        );
        try {
          fs.unlinkSync(tmpFile);
        } catch (e) {
          // abaikan
        }
        tooLong++;
        processed.add(post.id);
        continue;
      }
      if (dur !== null && dur < 3) {
        console.log("    Langkau: video terlalu pendek (" + dur.toFixed(1) + " saat).");
        try {
          fs.unlinkSync(tmpFile);
        } catch (e) {
          // abaikan
        }
        processed.add(post.id);
        continue;
      }
      const init = await tiktok.videoInit(tokens.access_token, {
        title: caption,
        privacyLevel: privacy,
      });
      console.log("    Publish ID: " + init.data.publish_id + " - upload...");
      await tiktok.uploadVideo(init.data.upload_url, tmpFile);
      await tiktok.videoFinalize(tokens.access_token, init.data.publish_id);
      console.log("    Finalize dihantar (semak status di akaun TikTok).");
      try {
        fs.unlinkSync(tmpFile);
      } catch (e) {
        // fail sementara boleh kekal
      }
      posted++;
    } else {
      console.log("    [DRY-RUN] caption: " + caption.slice(0, 120));
      console.log("    [DRY-RUN] video: " + media.source);
    }
    processed.add(post.id);
  }

  st.processed = Array.from(processed);
  st.last_checked = new Date().toISOString();
  if (!DRY_RUN) {
    state.saveState(st);
  }

  console.log(
    "Selesai: " + posted + " dihantar, " + skipped + " sudah diproses, " +
      tooLong + " terlalu panjang, " + list.length + " disemak."
  );
  if (DRY_RUN) {
    console.log("(DRY-RUN - tiada video dihantar ke TikTok)");
  }
}

main().catch(function (err) {
  console.error("Ralat: " + err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
