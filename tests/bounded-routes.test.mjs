import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const routes=[
 "app/api/private/projects/route.ts",
 "app/api/private/memories/route.ts",
 "app/api/private/memories/approve/route.ts",
 "app/api/private/connections/route.ts"
];
test("all authenticated JSON write routes use stream-aware size guards",()=>{
 for(const route of routes){
  const content=read(route);
  assert.match(content,/readBoundedJson/);
  assert.doesNotMatch(content,/request\.json\(\)/);
  assert.match(content,/checkWriteOrigin/);
 }
});
test("GitHub HMAC endpoint preserves raw bytes and rejects excessive chunks",()=>{
 const route=read("app/api/webhooks/github/route.ts");
 assert.match(route,/readBoundedBytes/);
 assert.match(route,/maxBytes:1_000_000/);
 assert.doesNotMatch(route,/request\.arrayBuffer\(\)/);
 assert.match(route,/prepareAndRecordWebhook/);
});
test("the readiness contract includes request-size validation",()=>{
 const script=read("scripts/readiness.mjs");
 assert.match(script,/bounded-body\.mjs/);
});
