/* Debug satu kali: semak saluran & senarai post dalam queue Buffer.
   Jalankan dalam GitHub Actions dengan secret BUFFER_API_KEY. */
"use strict";

const buffer = require("./lib/buffer");
const tiktok = require("./lib/tiktok");

async function gql(query, variables) {
  const key = tiktok.cfg("BUFFER_API_KEY", "");
  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ query: query, variables: variables || {} }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    const msg = (json.errors && json.errors.map(function (e) { return e.message; }).join("; ")) || "HTTP " + res.status;
    const err = new Error("Buffer API: " + msg);
    err.body = json;
    throw err;
  }
  return json.data;
}

async function main() {
  const org = await buffer.getOrganizationId();
  console.log("Organization ID: " + org);

  const channels = await buffer.getChannels(org);
  for (const c of channels) {
    console.log("Channel: " + c.displayName + " | service=" + c.service + " | id=" + c.id + " | disconnected=" + c.isDisconnected);
  }

  // Senarai post (queue) setiap saluran
  for (const c of channels) {
    try {
      const d = await gql(
        "query ($org: OrganizationId!) { posts(input: { organizationId: $org }) { ... on PostConnection { edges { node { id status dueAt text } } } } }",
        { org: org }
      );
      const edges = (d.posts && d.posts.edges) || [];
      console.log("\n=== Queue " + c.displayName + " (-org-wide " + edges.length + " post) ===");
      for (const e of edges) {
        const p = e.node || {};
        console.log("- [" + p.status + "] channel=" + (p.channelId || c.id) + " due=" + (p.dueAt || "-") + " | " + String(p.text || "").replace(/\s+/g, " ").slice(0, 80));
      }
      break; // query ini org-wide, sekali cukup
    } catch (e) {
      console.log("\n=== Queue " + c.displayName + ": gagal dapatkan - " + e.message);
    }
  }
}

main().catch(function (e) {
  console.error("Ralat: " + e.message);
  if (e.body) console.error(JSON.stringify(e.body, null, 2));
  process.exit(1);
});
