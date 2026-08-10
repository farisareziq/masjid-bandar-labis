/* ============================================================
   Hantar satu video ke TikTok (untuk ujian/demo)
   Guna:  node scripts/tiktok/post-video.js <video.mp4> [caption]
   Privasi: TIKTOK_PRIVACY (default SELF_ONLY sehingga review lulus)
   ============================================================ */
"use strict";

const fs = require("fs");
const tiktok = require("./lib/tiktok");
const state = require("./lib/state");
const mp4 = require("./lib/mp4");

const WAIT_MS = 15000;
const MAX_POLLS = 12;

async function main() {
  const file = process.argv[2];
  const caption = process.argv[3] || tiktok.cfg("TIKTOK_CAPTION", "Video Masjid Bandar Labis");
  if (!file) {
    console.error("Guna: node scripts/tiktok/post-video.js <video.mp4> [caption]");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error("Fail tidak dijumpai: " + file);
    process.exit(1);
  }

  const tokens = await state.ensureFreshToken(tiktok);
  const privacy = tiktok.cfg("TIKTOK_PRIVACY", "SELF_ONLY");

  const info = await tiktok.creatorInfo(tokens.access_token);
  const ci = info && info.data && info.data.creator_info ? info.data.creator_info : {};
  console.log("Akaun: " + (ci.display_name || tokens.open_id || "?"));
  console.log(
    "Pilihan privasi dibenarkan: " + ((ci.privacy_level_options || []).join(", ") || "(semak akaun)")
  );

  const maxDuration = ci.max_video_post_duration_sec || null;
  const dur = mp4.durationSeconds(file);
  if (dur !== null) {
    console.log("Tempoh video: " + Math.round(dur) + " saat");
    if (maxDuration && dur > maxDuration) {
      console.error(
        "GAGAL: video " + Math.round(dur / 60) + " minit melebihi had akaun " +
          Math.round(maxDuration / 60) + " minit."
      );
      process.exit(1);
    }
    if (dur < 3) {
      console.error("GAGAL: video terlalu pendek (minimum 3 saat).");
      process.exit(1);
    }
  }

  const init = await tiktok.videoInit(tokens.access_token, {
    title: caption,
    privacyLevel: privacy,
  });
  const publishId = init.data.publish_id;
  const uploadUrl = init.data.upload_url;
  console.log("Publish ID: " + publishId);
  console.log("Muat naik video (" + fs.statSync(file).size + " bytes)...");
  await tiktok.uploadVideo(uploadUrl, file);
  console.log("Upload selesai - finalize...");
  await tiktok.videoFinalize(tokens.access_token, publishId);

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(function (r) {
      setTimeout(r, WAIT_MS);
    });
    const st = await tiktok.publishStatus(tokens.access_token, publishId);
    const d = st.data || {};
    console.log("  Status: " + (d.status || "?") + (d.fail_reason ? " (" + d.fail_reason + ")" : ""));
    if (d.status === "PUBLISH_COMPLETE") {
      console.log("BERJAYA - video dihantar ke TikTok" + (d.share_url ? ": " + d.share_url : ""));
      return;
    }
    if (d.status === "FAILED") {
      console.error("GAGAL: " + (d.fail_reason || "tiada sebab diberikan"));
      process.exitCode = 1;
      return;
    }
  }
  console.log("Masa tamat menunggu status - semak akaun TikTok (privacy " + privacy + ").");
}

main().catch(function (err) {
  console.error("Ralat: " + err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
