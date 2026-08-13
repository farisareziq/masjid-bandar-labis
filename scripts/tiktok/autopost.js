/* ============================================================
   AUTO-POSTER: Facebook Page -> TikTok (via Buffer)
   Jalankan:  node scripts/tiktok/autopost.js [--dry-run]

   - Baca siaran baharu halaman Facebook (Graph API)
   - Untuk siaran video sahaja: muat turun video (semak tempoh),
     kemudian hantar ke TikTok melalui Buffer API (GraphQL)
   - Buffer sudah ada sambungan TikTok yang diluluskan, jadi
     tiada keperluan review app TikTok
   - Simpan ID siaran yang sudah diproses dalam state.json
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const tiktok = require("./lib/tiktok");
const state = require("./lib/state");
const mp4 = require("./lib/mp4");
const buffer = require("./lib/buffer");

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

function isVideoFileUrl(u) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u) || /fbcdn/i.test(u);
}

// Tempoh video (saat) daripada parameter `efg` dalam URL fbcdn, atau null.
function durationFromUrl(u) {
  try {
    const m = String(u).match(/[?&]efg=([^&]+)/);
    if (!m) return null;
    const json = JSON.parse(Buffer.from(decodeURIComponent(m[1]), "base64").toString("utf8"));
    const d = json.duration_s;
    return typeof d === "number" && d > 0 ? d : null;
  } catch (e) {
    return null;
  }
}

function findVideo(post) {
  const sources = collectSources(post.attachments ? post.attachments.data : null, []);
  return (
    sources.find(function (s) {
      return String(s.mediaType).toLowerCase().indexOf("video") !== -1 && isVideoFileUrl(s.source);
    }) ||
    sources.find(function (s) {
      return isVideoFileUrl(s.source);
    }) ||
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

function withHashtag(caption) {
  const c = String(caption || "").trim();
  const tag = "#MasjidBandarLabis";
  if (!c) return tag;
  return (c.indexOf(tag) === -1 ? c + "\n\n" + tag : c).slice(0, 2200);
}

function runCmd(cmd, args, env, timeoutMs) {
  try {
    return spawnSync(cmd, args, {
      encoding: "utf8",
      timeout: timeoutMs || 300000,
      env: Object.assign({}, process.env, env || {}),
    });
  } catch (e) {
    return { status: -1, error: e };
  }
}

function hasCommand(cmd) {
  return runCmd(cmd, ["--version"], {}, 15000).status === 0;
}

// Pangkas video ke had tempoh TikTok (ffmpeg - tersedia pada ubuntu-latest)
function trimWithFfmpeg(input, output, seconds) {
  const r = runCmd(
    "ffmpeg",
    [
      "-y",
      "-ss", "0",
      "-i", input,
      "-t", String(seconds),
      "-vf", "scale=-2:720",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "28",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      output,
    ],
    {},
    600000
  );
  if (r.status !== 0) {
    console.warn("    ffmpeg gagal: " + String(r.stderr || "").slice(-300));
    return false;
  }
  return true;
}

// Hoskan video yang dipangkas sebagai GitHub Release asset (URL awam percuma)
async function hostViaGithubRelease(file, postId) {
  const owner = process.env.GITHUB_REPOSITORY || "";
  if (!owner || !(process.env.GITHUB_TOKEN || process.env.GH_TOKEN) || !hasCommand("gh")) {
    return null;
  }
  const tag = "video-cache-" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
  const name = "kuliah-" + String(postId).replace(/[^0-9]/g, "") + "-trim.mp4";

  // Buang release video-cache lama (run sebelumnya sudah diambil Buffer)
  const old = runCmd("gh", ["release", "list", "--repo", owner, "--limit", "50"], {}, 60000);
  if (old.status === 0) {
    for (const line of String(old.stdout).split(/\r?\n/)) {
      const tagName = line.split(/\s+/)[0];
      if (tagName && tagName.indexOf("video-cache-") === 0) {
        runCmd("gh", ["release", "delete", tagName, "--repo", owner, "--yes", "--cleanup-tag"], {}, 60000);
      }
    }
  }

  const create = runCmd(
    "gh",
    ["release", "create", tag, "--repo", owner, "--title", "Video cache", "--notes", "Video sementara untuk auto-post TikTok"],
    {},
    60000
  );
  if (create.status !== 0) {
    console.warn("    Gagal cipta release: " + String(create.stderr || "").slice(-300));
    return null;
  }
  const up = runCmd("gh", ["release", "upload", tag, file, "--repo", owner, "--clobber"], {}, 300000);
  if (up.status !== 0) {
    console.warn("    Gagal upload release: " + String(up.stderr || "").slice(-300));
    return null;
  }
  return "https://github.com/" + owner + "/releases/download/" + tag + "/" + encodeURIComponent(name);
}

// Video panjang: muat turun -> pangkas -> hos -> hantar ke Buffer
async function trimAndPostLongVideo(post, media, caption, tmpFile, maxDuration, channelId) {
  if (!fs.existsSync(tmpFile)) {
    await downloadVideo(media.source, tmpFile);
  }
  const trimmedFile = tmpFile.replace(/\.mp4$/i, "-trim.mp4");
  console.log("    Memangkas video kepada " + Math.round(maxDuration / 60) + " minit (ffmpeg)...");
  if (!trimWithFfmpeg(tmpFile, trimmedFile, maxDuration)) {
    return { posted: false, reason: "ffmpeg tiada/gagal" };
  }
  const url = await hostViaGithubRelease(trimmedFile, post.id);
  if (!url) {
    return { posted: false, reason: "gh/GITHUB_TOKEN tiada - tidak dapat hoskan video" };
  }
  console.log("    Video dipangkas dihoskan: " + url);
  const result = await buffer.createVideoPost({
    channelId: channelId,
    text: caption,
    videoUrl: url,
  });
  if (result && result.post) {
    console.log("    Dihantar ke Buffer (post " + result.post.id + ", status " + result.post.status + ")");
    return { posted: true };
  }
  return { posted: false, reason: (result && result.message) || "respons tidak dijangka" };
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

  let tiktokChannel = null;
  let maxDuration = null;
  if (!DRY_RUN) {
    tiktokChannel = await buffer.findTikTokChannel();
    maxDuration = Number(tiktok.cfg("BUFFER_MAX_DURATION_SEC", "600")) || 600;
    console.log(
      "Saluran TikTok Buffer: " + tiktokChannel.name + " (had tempoh: " + maxDuration + " saat)"
    );
  }

  const st = state.loadState();
  const processed = new Set(st.processed || []);
  const list = posts.data || [];
  let posted = 0;
  let skipped = 0;
  let tooLong = 0;

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
    const caption = withHashtag(post.message || "Video Masjid Bandar Labis");
    const tmpFile = path.join(TMP_DIR, "fb-" + String(post.id).replace(/[^0-9]/g, "") + ".mp4");
    console.log("  > " + post.id + ": semak tempoh video...");

    if (DRY_RUN) {
      console.log("    [DRY-RUN] caption: " + caption.slice(0, 120));
      console.log("    [DRY-RUN] video: " + media.source);
      processed.add(post.id);
      continue;
    }

    let dur = durationFromUrl(media.source);
    if (dur === null) {
      console.log("    Tempoh tidak diketahui - muat turun untuk semak...");
      try {
        await downloadVideo(media.source, tmpFile);
      } catch (e) {
        console.warn("    Gagal muat turun: " + e.message + " (langkau)");
        processed.add(post.id);
        continue;
      }
      dur = mp4.durationSeconds(tmpFile);
    } else {
      console.log("    Tempoh: " + Math.round(dur) + " saat");
    }

    if (dur !== null && maxDuration && dur > maxDuration) {
      console.log(
        "    Video " + Math.round(dur / 60) + " minit melebihi had " +
          Math.round(maxDuration / 60) + " minit - cuba pangkas..."
      );
      const trimmed = await trimAndPostLongVideo(
        post,
        media,
        caption,
        tmpFile,
        maxDuration,
        tiktokChannel.id
      );
      if (trimmed.posted) {
        posted++;
      } else {
        tooLong++;
        console.log("    " + trimmed.reason + " (langkau)");
      }
      processed.add(post.id);
      try {
        fs.unlinkSync(tmpFile);
      } catch (e) {
        // abaikan
      }
      try {
        fs.unlinkSync(tmpFile.replace(/\.mp4$/i, "-trim.mp4"));
      } catch (e) {
        // abaikan
      }
      continue;
    }
    if (dur !== null && dur < 3) {
      console.log("    Langkau: video terlalu pendek (" + dur.toFixed(1) + " saat).");
      processed.add(post.id);
      try {
        fs.unlinkSync(tmpFile);
      } catch (e) {
        // abaikan
      }
      continue;
    }

    try {
      const result = await buffer.createVideoPost({
        channelId: tiktokChannel.id,
        text: caption,
        videoUrl: media.source,
      });
      if (result && result.post) {
        console.log(
          "    Dihantar ke Buffer (post " + result.post.id + ", status " + result.post.status + ")"
        );
        posted++;
        processed.add(post.id);
      } else if (result && result.message) {
        console.log("    Buffer tolak: " + result.message + " (akan cuba semula)");
      } else {
        console.log("    Respons Buffer tidak dijangka.");
      }
    } catch (e) {
      console.warn("    Ralat hantar ke Buffer: " + e.message);
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch (e) {
        // fail sementara boleh kekal
      }
    }
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
