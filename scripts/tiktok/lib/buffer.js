/* ============================================================
   BUFFER API (GraphQL) - hantar video ke TikTok via Buffer
   Buffer sudah ada sambungan TikTok yang diluluskan, jadi
   tiada lagi keperluan review app TikTok.
   ============================================================ */
"use strict";

const tiktok = require("./tiktok");

function apiKey() {
  return tiktok.cfg("BUFFER_API_KEY", "");
}

async function gql(query, variables) {
  const key = apiKey();
  if (!key) {
    throw new Error("Tiada BUFFER_API_KEY dalam .env / environment.");
  }
  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ query: query, variables: variables || {} }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    const msg =
      (json.errors && json.errors.map(function (e) { return e.message; }).join("; ")) ||
      "HTTP " + res.status;
    const err = new Error("Buffer API: " + msg);
    err.body = json;
    throw err;
  }
  return json.data;
}

async function getOrganizationId() {
  const d = await gql("query { account { organizations { id } } }");
  const orgs = (d.account && d.account.organizations) || [];
  if (!orgs.length) {
    throw new Error("Tiada organisasi dalam akaun Buffer.");
  }
  return orgs[0].id;
}

async function getChannels(orgId) {
  const d = await gql(
    "query ($org: OrganizationId!) { channels(input: { organizationId: $org }) { id name displayName service isDisconnected } }",
    { org: orgId }
  );
  return d.channels || [];
}

async function findTikTokChannel() {
  const fixed = tiktok.cfg("BUFFER_CHANNEL_ID", "");
  if (fixed) return { id: fixed, name: "(ditetapkan oleh BUFFER_CHANNEL_ID)" };
  const org = await getOrganizationId();
  const channels = await getChannels(org);
  const found = channels.find(function (c) {
    return c.service === "tiktok";
  });
  if (!found) {
    throw new Error(
      "Tiada saluran TikTok dalam Buffer. Sambung TikTok di buffer.com dahulu."
    );
  }
  if (found.isDisconnected) {
    throw new Error("Saluran TikTok " + found.name + " dalam keadaan disconnected.");
  }
  return found;
}

function normalizeText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

// Semak post dengan teks sama pada saluran tersebut dalam tetingkap masa -
// elak duplikasi jika dua run automation bertindih
async function findRecentDuplicate(channelId, text, windowMs) {
  const org = await getOrganizationId();
  const d = await gql(
    "query ($org: OrganizationId!) { posts(input: { organizationId: $org }) { edges { node { id channelId text createdAt status } } } }",
    { org: org }
  );
  const edges = (d.posts && d.posts.edges) || [];
  const want = normalizeText(text);
  const cutoff = Date.now() - (windowMs || 6 * 60 * 60 * 1000);
  for (const e of edges) {
    const p = e.node || {};
    if (p.channelId !== channelId) continue;
    if (normalizeText(p.text) !== want) continue;
    if (!p.createdAt || Date.parse(p.createdAt) < cutoff) continue;
    return p;
  }
  return null;
}

async function createVideoPost(opts) {
  // Buffer memerlukan masa jadual pada masa hadapan - tetapkan +1 minit
  const dueAt = new Date(Date.now() + 60000).toISOString();
  const query =
    "mutation CreatePost($input: CreatePostInput!) { " +
    "createPost(input: $input) { " +
    "... on PostActionSuccess { post { id status dueAt } } " +
    "... on MutationError { message } " +
    "} }";
  const d = await gql(query, {
    input: {
      text: String(opts.text || "").slice(0, 2200),
      channelId: opts.channelId,
      schedulingType: "automatic",
      mode: "customScheduled",
      dueAt: dueAt,
      assets: [{ video: { url: String(opts.videoUrl || "") } }],
    },
  });
  return d.createPost;
}

module.exports = {
  getOrganizationId: getOrganizationId,
  getChannels: getChannels,
  findTikTokChannel: findTikTokChannel,
  findRecentDuplicate: findRecentDuplicate,
  createVideoPost: createVideoPost,
};
