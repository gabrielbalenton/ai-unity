import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/army/page.tsx", import.meta.url), "utf8");
const docs = fs.readFileSync(new URL("../docs/UNITY_ARMY.md", import.meta.url), "utf8");
const schema = fs.readFileSync(new URL("../supabase/schema-proposals/unity-army.sql", import.meta.url), "utf8");

test("UNITY Army control room states that runtime is not connected", () => {
  assert.match(page, /Runtime: NOT CONNECTED/);
  assert.match(page, /WORKING is only valid while a real task has a fresh heartbeat/);
  assert.match(docs, /Principal Engineer/);
});

test("UNITY Army schema is read-only to browser by default", () => {
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /Browser writes are intentionally omitted/);
  assert.doesNotMatch(schema, /for insert/i);
});
