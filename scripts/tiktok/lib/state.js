/* ============================================================
   Keadaan setempat: token (tokens.json - JANGAN commit)
   dan senarai post yang telah diproses (state.json - commit)
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const TOKENS_FILE = path.join(DIR, "..", "tokens.json");
const STATE_FILE = path.join(DIR, "..", "state.json");

function readJson(file, def) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return def;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function loadTokens() {
  return readJson(TOKENS_FILE, {});
}

function saveTokens(tokens) {
  const saved = Object.assign({}, tokens, { saved_at: new Date().toISOString() });
  writeJson(TOKENS_FILE, saved);
  return saved;
}

function loadState() {
  return readJson(STATE_FILE, { processed: [], last_checked: null });
}

function saveState(st) {
  writeJson(STATE_FILE, st);
  return st;
}

async function ensureFreshToken(tiktok) {
  let tokens = loadTokens();
  if (!tokens.refresh_token && process.env.TIKTOK_REFRESH_TOKEN) {
    tokens = saveTokens({ refresh_token: process.env.TIKTOK_REFRESH_TOKEN });
  }
  if (!tokens.refresh_token) {
    throw new Error(
      "Tiada token TikTok. Jalankan auth-server (sambung akaun) atau set TIKTOK_REFRESH_TOKEN."
    );
  }
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0;
  if (tokens.access_token && Date.now() < expiresAt - 60000) {
    return tokens;
  }
  const refreshed = await tiktok.refreshTokens({ refreshToken: tokens.refresh_token });
  const fresh = Object.assign({}, tokens, refreshed, {
    expires_at: new Date(Date.now() + (refreshed.expires_in || 86400) * 1000).toISOString(),
  });
  saveTokens(fresh);
  console.log("Token TikTok disegarkan (valid " + (refreshed.expires_in || 86400) + " saat).");
  return fresh;
}

module.exports = {
  loadTokens: loadTokens,
  saveTokens: saveTokens,
  loadState: loadState,
  saveState: saveState,
  ensureFreshToken: ensureFreshToken,
  TOKENS_FILE: TOKENS_FILE,
  STATE_FILE: STATE_FILE,
};
