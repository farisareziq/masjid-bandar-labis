/* Debug: detail post error + introspek jenis Post */
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
    throw new Error("Buffer API: " + msg);
  }
  return json.data;
}

async function main() {
  const org = await buffer.getOrganizationId();

  // Medan pada jenis Post
  try {
    const t = await gql('{ __type(name: "Post") { fields { name } } }');
    console.log("Post fields: " + JSON.stringify(t.__type.fields.map(function (f) { return f.name; })));
  } catch (e) {
    console.log("Introspek Post gagal: " + e.message);
  }

  // Medan PostPublishingError
  try {
    const t = await gql('{ __type(name: "PostPublishingError") { fields { name } } }');
    console.log("PostPublishingError fields: " + JSON.stringify(t.__type.fields.map(function (f) { return f.name; })));
  } catch (e) {
    console.log("Introspek gagal: " + e.message);
  }

  // Detail penuh semua post (cari yang error)
  const d = await gql(
    "query ($org: OrganizationId!) { posts(input: { organizationId: $org }) { edges { node { id status dueAt error { message } text channel { id name service } } } } }",
    { org: org }
  );
  const edges = (d.posts && d.posts.edges) || [];
  for (const e of edges) {
    const p = e.node || {};
    const ch = p.channel ? p.channel.name + "/" + p.channel.service : "?";
    console.log("- [" + p.status + "] ch=" + ch + " id=" + p.id + " due=" + (p.dueAt || "-"));
    if (p.error) console.log("  ERROR: " + JSON.stringify(p.error));
  }
}

main().catch(function (e) {
  console.error("Ralat: " + e.message);
  if (e.body) console.error(JSON.stringify(e.body, null, 2));
  process.exit(1);
});
