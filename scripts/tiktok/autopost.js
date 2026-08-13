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
let FFMPEG_BIN = "ffmpeg";
const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
];

if (process.env.GITHUB_ACTIONS === "true") {
  console.log(
    "::notice::mode=" +
      (process.argv.indexOf("--test-dummy") !== -1 ? "dummy" : "normal")
  );
}

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

function findImage(post) {
  return post && post.full_picture && /^https?:/i.test(post.full_picture) ? post.full_picture : null;
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Gagal muat turun media: HTTP " + res.status);
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

function resolveFfmpeg() {
  const candidates = ["ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "C:\\ffmpeg\\bin\\ffmpeg.exe"];
  for (const c of candidates) {
    if (c === "ffmpeg" && hasCommand("ffmpeg")) return c;
    if (c !== "ffmpeg" && fs.existsSync(c)) return c;
  }
  return null;
}

// Pangkas video ke had tempoh TikTok (ffmpeg - tersedia pada ubuntu-latest)
function trimWithFfmpeg(input, output, seconds) {
  const r = runCmd(
    FFMPEG_BIN,
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

// Teks untuk kad video: buang emoji/aksara khas (ffmpeg drawtext tak sokong emoji)
function stripForCard(text) {
  return String(text || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{2B05}-\u{2B07}]/gu, "")
    .replace(/[^\x20-\x7E\u00A0-\u024F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text, maxLine) {
  const words = String(text).split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = (cur + " " + w).trim();
    if (next.length > maxLine && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length >= 6) break;
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < 6) lines.push(cur);
  let out = lines.slice(0, 6).join("\n");
  if (out.length > 260) out = out.slice(0, 257) + "...";
  return out;
}

// Video kad teks 6 saat (untuk post teks sahaja)
function buildTextCardVideo(text, outputPath) {
  const txtFile = outputPath.replace(/\.mp4$/i, "-text.txt");
  fs.writeFileSync(txtFile, wrapText(stripForCard(text), 30), "utf8");
  const font = FONT_CANDIDATES.find(function (f) { return fs.existsSync(f); }) || "DejaVuSans-Bold.ttf";
  const r = runCmd(
    FFMPEG_BIN,
    [
      "-y",
      "-f", "lavfi", "-i", "color=c=0x141414:s=1080x1920:d=6:r=30",
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
      "-vf",
      "drawtext=fontfile=" + font + ":textfile=" + txtFile +
        ":fontsize=52:fontcolor=white:line_spacing=18:x=(w-text_w)/2:y=(h-text_h)/2",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest",
      outputPath,
    ],
    {},
    300000
  );
  try { fs.unlinkSync(txtFile); } catch (e) { /* abaikan */ }
  if (r.status !== 0) {
    console.warn("    ffmpeg kad teks gagal: " + String(r.stderr || "").slice(-300));
    return false;
  }
  return true;
}

// Video foto 6 saat (untuk post gambar)
function buildImageVideo(imagePath, outputPath) {
  const r = runCmd(
    FFMPEG_BIN,
    [
      "-y",
      "-loop", "1",
      "-i", imagePath,
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
      "-t", "6",
      "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest",
      outputPath,
    ],
    {},
    300000
  );
  if (r.status !== 0) {
    console.warn("    ffmpeg video foto gagal: " + String(r.stderr || "").slice(-300));
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
  // gh release upload menamakan asset mengikut nama fail sebenar (basename)
  const name = path.basename(file);

  // Buang release video-cache lama (run sebelumnya sudah diambil Buffer)
  const old = runCmd(
    "gh",
    ["release", "list", "--repo", owner, "--limit", "50", "--json", "tagName", "--jq", ".[].tagName"],
    {},
    60000
  );
  if (old.status === 0) {
    for (const tagName of String(old.stdout).split(/\r?\n/).map(function (s) { return s.trim(); })) {
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
    const reason = "Gagal upload release: " + String(up.stderr || up.stdout || "").slice(-300);
    console.warn("    " + reason);
    return { error: reason };
  }
  return "https://github.com/" + owner + "/releases/download/" + tag + "/" + encodeURIComponent(name);
}

// Hos fail video sedia ada -> hantar ke Buffer
async function hostAndPost(filePath, postId, caption, channelId) {
  const url = await hostViaGithubRelease(filePath, postId);
  if (url && url.error) {
    return { posted: false, reason: url.error };
  }
  if (!url) {
    return { posted: false, reason: "gh/GITHUB_TOKEN tiada - tidak dapat hoskan video" };
  }
  console.log("    Video dihoskan: " + url);
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

// Pangkas fail video sedia ada -> hos -> hantar ke Buffer
async function trimHostAndPost(filePath, postId, caption, maxDuration, channelId) {
  const trimmedFile = filePath.replace(/\.mp4$/i, "-trim.mp4");
  console.log("    Memangkas video kepada " + Math.round(maxDuration / 60) + " minit (ffmpeg)...");
  if (!trimWithFfmpeg(filePath, trimmedFile, maxDuration)) {
    return { posted: false, reason: "ffmpeg tiada/gagal" };
  }
  return hostAndPost(trimmedFile, postId, caption, channelId);
}

// Video panjang dari Facebook: muat turun -> pangkas -> hos -> hantar
async function trimAndPostLongVideo(post, media, caption, tmpFile, maxDuration, channelId) {
  if (!fs.existsSync(tmpFile)) {
    await downloadFile(media.source, tmpFile);
  }
  const out = await trimHostAndPost(tmpFile, post.id, caption, maxDuration, channelId);
  try {
    fs.unlinkSync(tmpFile.replace(/\.mp4$/i, "-trim.mp4"));
  } catch (e) {
    // abaikan
  }
  return out;
}

// UJIAN DUMMY: cipta video ujian 11 minit -> pangkas -> hos -> hantar ke Buffer
async function testDummyMain() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  FFMPEG_BIN = resolveFfmpeg();
  if (!FFMPEG_BIN) {
    throw new Error("ffmpeg tidak dijumpai - jalankan ujian ini dalam GitHub Actions (ubuntu-latest).");
  }
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log("::notice::ffmpeg_bin=" + FFMPEG_BIN);
  }
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    throw new Error("GITHUB_TOKEN tidak dijumpai - jalankan ujian ini dalam GitHub Actions.");
  }
  const channel = await buffer.findTikTokChannel();
  const maxDuration = Number(tiktok.cfg("BUFFER_MAX_DURATION_SEC", "600")) || 600;
  const dummyFile = path.join(TMP_DIR, "dummy-long.mp4");
  console.log("Mencipta video ujian dummy 11 minit (ffmpeg testsrc)...");
  const gen = runCmd(
    FFMPEG_BIN,
    [
      "-y",
      "-f", "lavfi", "-i", "testsrc=duration=660:size=720x1280:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=660",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest",
      dummyFile,
    ],
    {},
    600000
  );
  if (gen.status !== 0) {
    throw new Error("Gagal cipta video dummy: " + String(gen.stderr || "").slice(-300));
  }
  const dur = mp4.durationSeconds(dummyFile);
  console.log("Video dummy: " + (dur === null ? "?" : Math.round(dur)) + " saat");

  const caption = withHashtag("UJIAN AUTO-POST: video dummy untuk menguji pangkas automatik");
  const out = await trimHostAndPost(dummyFile, "dummy-test", caption, maxDuration, channel.id);
  try {
    fs.unlinkSync(dummyFile);
  } catch (e) {
    // abaikan
  }
  if (!out.posted) {
    throw new Error("Ujian dummy gagal: " + out.reason);
  }
  console.log("UJIAN DUMMY SELESAI - video ujian dihantar ke TikTok (boleh dipadam selepas semak).");
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
      "/posts?fields=id,created_time,message,full_picture,permalink_url,attachments{media_type,media{source},url,title,description}&limit=" +
      POST_LIMIT,
    page.access_token
  );

  let tiktokChannel = null;
  let maxDuration = null;
  if (!DRY_RUN) {
    tiktokChannel = await buffer.findTikTokChannel();
    maxDuration = Number(tiktok.cfg("BUFFER_MAX_DURATION_SEC", "600")) || 600;
    FFMPEG_BIN = resolveFfmpeg();
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
    const image = media ? null : findImage(post);
    const hasText = !!(post.message && post.message.trim());
    const caption = withHashtag(
      post.message || (image ? "Foto Masjid Bandar Labis" : "Masjid Bandar Labis")
    );
    const postNum = String(post.id).replace(/[^0-9]/g, "");
    const tmpFile = path.join(TMP_DIR, "fb-" + postNum + ".mp4");
    const kind = media ? "video" : image ? "gambar" : hasText ? "teks" : "lain";

    if (DRY_RUN) {
      console.log("  > " + post.id + ": [DRY-RUN] jenis=" + kind);
      console.log("    [DRY-RUN] caption: " + caption.slice(0, 120));
      if (media) console.log("    [DRY-RUN] video: " + media.source);
      if (image) console.log("    [DRY-RUN] gambar: " + image);
      processed.add(post.id);
      continue;
    }

    if (kind === "lain") {
      console.log("  - " + post.id + ": tiada media (langkau)");
      processed.add(post.id);
      continue;
    }

    if (kind === "video") {
      console.log("  > " + post.id + ": semak tempoh video...");
      let dur = durationFromUrl(media.source);
      if (dur === null) {
        console.log("    Tempoh tidak diketahui - muat turun untuk semak...");
        try {
          await downloadFile(media.source, tmpFile);
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
        try { fs.unlinkSync(tmpFile); } catch (e) { /* abaikan */ }
        try { fs.unlinkSync(tmpFile.replace(/\.mp4$/i, "-trim.mp4")); } catch (e) { /* abaikan */ }
        continue;
      }
      if (dur !== null && dur < 3) {
        console.log("    Langkau: video terlalu pendek (" + dur.toFixed(1) + " saat).");
        processed.add(post.id);
        try { fs.unlinkSync(tmpFile); } catch (e) { /* abaikan */ }
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
        try { fs.unlinkSync(tmpFile); } catch (e) { /* fail sementara boleh kekal */ }
      }
      continue;
    }

    // Gambar atau teks -> tukar kepada video kad pendek (ffmpeg dalam CI)
    console.log("  > " + post.id + ": post " + kind + " -> cipta video kad...");
    if (!FFMPEG_BIN) {
      console.log("    ffmpeg tiada - post " + kind + " dilangkau (jalankan dalam GitHub Actions).");
      processed.add(post.id);
      continue;
    }
    const converted = tmpFile.replace(/\.mp4$/i, kind === "gambar" ? "-img.mp4" : "-card.mp4");
    let ok = false;
    if (kind === "gambar") {
      const imgFile = tmpFile.replace(/\.mp4$/i, ".jpg");
      try {
        await downloadFile(image, imgFile);
        ok = buildImageVideo(imgFile, converted);
      } catch (e) {
        console.warn("    Gagal muat turun gambar: " + e.message);
      }
      try { fs.unlinkSync(imgFile); } catch (e) { /* abaikan */ }
    } else {
      ok = buildTextCardVideo(post.message, converted);
    }
    if (!ok) {
      console.log("    Tidak dapat cipta video kad - langkau.");
      processed.add(post.id);
      try { fs.unlinkSync(converted); } catch (e) { /* abaikan */ }
      continue;
    }
    const res = await hostAndPost(converted, post.id, caption, tiktokChannel.id);
    if (res.posted) {
      posted++;
      processed.add(post.id);
    } else {
      console.log("    " + res.reason + " (akan cuba semula)");
    }
    try { fs.unlinkSync(converted); } catch (e) { /* abaikan */ }
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

const run = process.argv.indexOf("--test-dummy") !== -1 ? testDummyMain() : main();
run.catch(function (err) {
  const msg = "Ralat: " + err.message;
  console.error(msg);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log(
      "::error::" +
        String(msg)
          .replace(/%/g, "%25")
          .replace(/\r/g, "%0D")
          .replace(/\n/g, "%0A")
    );
  }
  process.exit(1);
});
