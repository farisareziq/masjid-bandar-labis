/* Debug: introspek + senarai queue Buffer */
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

  // Introspek jenis edge/node untuk tahu medan Post
  try {
    const t = await gql('{ __type(name: "PostsResults") { fields { name type { kind name ofType { kind name ofType { kind name } } } } } }');
    console.log("\nPostsResults: " + JSON.stringify(t.__type.fields.map(function (f) { return f.name; })));
    const edgeType = t.__type.fields.find(function (f) { return f.name === "edges"; });
    const nodeType = edgeType && edgeType.type.ofType && edgeType.type.ofType.ofType ? edgeType.type.ofType.ofType.name : null;
    console.log("edge node type: " + (edgeType && edgeType.type.ofType ? JSON.stringify(edgeType.type) : "?"));
    if (nodeType) {
      const nt = await gql('{ __type(name: "' + nodeType + '") { fields { name } } }');
      console.log("node fields: " + JSON.stringify(nt.__type.fields.map(function (f) { return f.name; })));
    }
  } catch (e) {
    console.log("Introspek gagal: " + e.message);
  }

  // Query queue dengan edges
  try {
    const d = await gql(
      "query ($org: OrganizationId!) { posts(input: { organizationId: $org }) { edges { node { id status dueAt text } } } }",
      { org: org }
    );
    const edges = (d.posts && d.posts.edges) || [];
    console.log("\n=== Queue (jumlah " + edges.length + " post) ===");
    for (const e of edges) {
      const p = e.node || {};
      console.log("- [" + p.status + "] due=" + (p.dueAt || "-") + " | " + String(p.text || "").replace(/\s+/g, " ").slice(0, 80));
    }
  } catch (e) {
    console.log("=== Queue gagal: " + e.message);
  }
}

main().catch(function (e) {
  console.error("Ralat: " + e.message);
  if (e.body) console.error(JSON.stringify(e.body, null, 2));
  process.exit(1);
});
