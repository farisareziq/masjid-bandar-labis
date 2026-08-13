/* ============================================================
   TIKTOK API - klien kecil tanpa dependency luar
   Endpoint: open.tiktokapis.com (Content Posting API)
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const ENV_FILE = path.join(ROOT, ".env");
const BASE = "https://open.tiktokapis.com";
const AUTHORIZE_BASE = "https://www.tiktok.com/v2/auth/authorize/";

function readDotEnv() {
  const env = {};
  try {
    const raw = fs.readFileSync(ENV_FILE, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  } catch (e) {
    // Tiada fail .env - guna pemboleh ubah persekitaran sahaja
  }
  return env;
}

function cfg(name, def) {
  const env = readDotEnv();
  return process.env[name] || env[name] || def || "";
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomString(bytes) {
  return b64url(crypto.randomBytes(bytes || 32));
}

function pkcePair() {
  const verifier = randomString(64);
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier: verifier, challenge: challenge };
}

function authorizeUrl(opts) {
  const params = new URLSearchParams();
  params.set("client_key", opts.clientKey || cfg("TIKTOK_CLIENT_KEY"));
  params.set("response_type", "code");
  params.set(
    "scope",
    opts.scope || cfg("TIKTOK_SCOPES", "user.info.basic,video.publish,video.upload")
  );
  params.set(
    "redirect_uri",
    opts.redirectUri || cfg("TIKTOK_REDIRECT_URI", "http://localhost:8080/callback")
  );
  params.set("state", opts.state || randomString(12));
  if (opts.codeChallenge) {
    params.set("code_challenge", opts.codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  return AUTHORIZE_BASE + "?" + params.toString();
}

async function requestJson(url, options) {
  const res = await fetch(url, options || {});
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    json = null;
  }
  if (!res.ok || (json && json.error)) {
    const err = new Error(
      (json && (json.error.message || json.error.code)) || "HTTP " + res.status
    );
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function api(pathname, options) {
  const headers = Object.assign({ "Content-Type": "application/json" }, (options && options.headers) || {});
  const body =
    options && options.body && typeof options.body === "string"
      ? options.body
      : JSON.stringify((options && options.body) || {});
  return requestJson(BASE + pathname, { method: (options && options.method) || "POST", headers: headers, body: body });
}

async function exchangeCode(opts) {
  const form = new URLSearchParams();
  form.set("client_key", opts.clientKey || cfg("TIKTOK_CLIENT_KEY"));
  form.set("client_secret", opts.clientSecret || cfg("TIKTOK_CLIENT_SECRET"));
  form.set("code", opts.code);
  form.set("grant_type", "authorization_code");
  form.set(
    "redirect_uri",
    opts.redirectUri || cfg("TIKTOK_REDIRECT_URI", "http://localhost:8080/callback")
  );
  form.set("code_verifier", opts.codeVerifier);
  return requestJson(BASE + "/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

async function refreshTokens(opts) {
  const form = new URLSearchParams();
  form.set("client_key", opts.clientKey || cfg("TIKTOK_CLIENT_KEY"));
  form.set("client_secret", opts.clientSecret || cfg("TIKTOK_CLIENT_SECRET"));
  form.set("grant_type", "refresh_token");
  form.set("refresh_token", opts.refreshToken);
  return requestJson(BASE + "/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

function authHeaders(accessToken) {
  return { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" };
}

async function creatorInfo(accessToken) {
  return api("/v2/post/publish/creator_info/query/", {
    headers: authHeaders(accessToken),
    body: {},
  });
}

async function videoInit(accessToken, opts) {
  return api("/v2/post/publish/video/init/", {
    headers: authHeaders(accessToken),
    body: {
      post_info: {
        title: String(opts.title || "").slice(0, 2200),
        privacy_level: opts.privacyLevel || "SELF_ONLY",
        disable_comment: !!opts.disableComment,
        disable_duet: !!opts.disableDuet,
        disable_stitch: !!opts.disableStitch,
        video_cover_timestamp_ms: opts.videoCoverTimestampMs || 0,
      },
      source_info: { source: "FILE_UPLOAD" },
    },
  });
}

async function uploadVideo(uploadUrl, filePath) {
  const data = fs.readFileSync(filePath);
  const contentType = /\.mov$/i.test(filePath) ? "video/quicktime" : "video/mp4";
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: data,
  });
  if (res.status < 200 || res.status >= 300) {
    const text = await res.text();
    const err = new Error("Gagal upload video: HTTP " + res.status + " " + text.slice(0, 200));
    err.status = res.status;
    throw err;
  }
  return res;
}

async function videoFinalize(accessToken, publishId) {
  return api("/v2/post/publish/video/finalize/", {
    headers: authHeaders(accessToken),
    body: { publish_id: publishId },
  });
}

async function publishStatus(accessToken, publishId) {
  return api("/v2/post/publish/status/fetch/", {
    headers: authHeaders(accessToken),
    body: { publish_id: publishId },
  });
}

module.exports = {
  cfg: cfg,
  authorizeUrl: authorizeUrl,
  pkcePair: pkcePair,
  exchangeCode: exchangeCode,
  refreshTokens: refreshTokens,
  creatorInfo: creatorInfo,
  videoInit: videoInit,
  uploadVideo: uploadVideo,
  videoFinalize: videoFinalize,
  publishStatus: publishStatus,
  requestJson: requestJson,
};
