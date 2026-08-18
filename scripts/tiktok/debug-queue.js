/* Debug: introspek skema GraphQL Buffer untuk jenis PostsResults */
"use strict";

const tiktok = require("./lib/tiktok");

async function introspect(typeName) {
  const key = tiktok.cfg("BUFFER_API_KEY", "");
  const query =
    '{ __type(name: "' + typeName + '") { fields { name type { name kind ofType { name kind } } } } }';
  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ query: query }),
  });
  const json = await res.json();
  if (json.errors) {
    console.log(typeName + ": " + json.errors.map(function (e) { return e.message; }).join("; "));
    return;
  }
  const t = json.data.__type;
  if (!t) {
    console.log(typeName + ": tiada jenis dijumpai");
    return;
  }
  console.log("=== " + typeName + " ===");
  for (const f of t.fields || []) {
    const ft = f.type.ofType ? f.type.ofType.name + (f.type.kind === "LIST" ? "[]" : "") : f.type.name;
    console.log("  " + f.name + " : " + ft);
  }
}

async function main() {
  await introspect("PostsResults");
  await introspect("PostsInput");
}

main().catch(function (e) {
  console.error("Ralat: " + e.message);
  process.exit(1);
});
