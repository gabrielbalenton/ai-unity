import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {readFileSync} from "node:fs";
import {prepareAndRecordWebhook} from "../lib/github/webhook-ingestion.mjs";
const secret="test-webhook-secret-not-a-real-value";
const eventName="installation";
const deliveryId="12345678-1234-1234-1234-123456789000";
const rawBody=Buffer.from(JSON.stringify({action:"created",installation:{id:123},
 repositories:[{id:20},{id:21}]}));
const signature=(body=rawBody)=>"sha256="+createHmac("sha256",secret).update(body).digest("hex");
const defaults={rawBody,eventName,deliveryId,signature:signature(),secret};
test("valid installation event stores only inert metadata after HMAC validation",async()=>{
 let received;
 const result=await prepareAndRecordWebhook({...defaults,recordDelivery:async x=>{received=x;return "inserted"}});
 assert.deepEqual(result,{status:202,code:"STORED"});
 assert.deepEqual(received.repositoryIds,[20,21]);
 assert.equal(received.status,"unapplied");
 assert.equal("rawBody" in received,false);
 assert.equal("secret" in received,false);
});
test("invalid signatures fail before touching durable storage",async()=>{
 let count=0;
 const result=await prepareAndRecordWebhook({...defaults,signature:"sha256="+"0".repeat(64),
  recordDelivery:async()=>{count++;return "inserted"}});
 assert.deepEqual(result,{status:401,code:"INVALID_SIGNATURE"});
 assert.equal(count,0);
});
test("without a durable store the handler retries instead of silently dropping",async()=>{
 const result=await prepareAndRecordWebhook({...defaults});
 assert.deepEqual(result,{status:503,code:"DURABLE_DELIVERY_STORE_UNAVAILABLE"});
});
test("store failures fail closed for GitHub redelivery",async()=>{
 const result=await prepareAndRecordWebhook({...defaults,recordDelivery:async()=>{throw Error("db offline")}});
 assert.equal(result.status,503);
});
test("matching durable replays are idempotently acknowledged",async()=>{
 const result=await prepareAndRecordWebhook({...defaults,recordDelivery:async()=> "duplicate"});
 assert.deepEqual(result,{status:202,code:"DUPLICATE"});
});
test("inert ping receives no storage write",async()=>{
 let count=0;
 const result=await prepareAndRecordWebhook({...defaults,eventName:"ping",
  recordDelivery:async()=>{count++;return "inserted"}});
 assert.equal(result.status,204);assert.equal(count,0);
});
test("invalid installation payload is rejected even when correctly signed",async()=>{
 const body=Buffer.from(JSON.stringify({action:"created",installation:{id:-1}}));
 const result=await prepareAndRecordWebhook({...defaults,rawBody:body,signature:signature(body),
  recordDelivery:async()=> "inserted"});
 assert.equal(result.status,400);
});
test("webhook endpoint is OFF without an explicit feature flag",()=>{
 const route=readFileSync(new URL("../app/api/webhooks/github/route.ts",import.meta.url),"utf8");
 assert.match(route,/UNITY_ENABLE_GITHUB_WEBHOOK_INGESTION!=="true"/);
 assert.match(route,/prepareAndRecordWebhook/);
 assert.doesNotMatch(route,/\.from\("project_connections"\)\.insert/);
});
test("database store is service-only with no client RLS grant",()=>{
 const sql=readFileSync(new URL("../supabase/schema-proposals/github-webhook-deliveries.sql",import.meta.url),"utf8");
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/revoke all.*anon,authenticated/i);
 assert.match(sql,/unapplied/);
});
