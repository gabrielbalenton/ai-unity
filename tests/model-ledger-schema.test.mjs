import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../supabase/schema-proposals/model-dispatch-ledger.sql",import.meta.url),"utf8");
const fixture=readFileSync(new URL("../tests/db/model-ledger.sql",import.meta.url),"utf8");
const harness=readFileSync(new URL("../scripts/test-db-contract.sh",import.meta.url),"utf8");
test("inference requests are never exposed through browser policies",()=>{
 assert.match(sql,/alter table public\.unity_model_requests enable row level security/);
 assert.match(sql,/revoke all on public\.unity_model_requests,public\.unity_model_request_events\s+from public,anon,authenticated/);
 assert.match(sql,/request\.jwt\.claim\.role/);
});
test("reservations bind exact project, actor, selected connector and model",()=>{
 for(const term of ["p.owner_id=p_actor_id","c.id=p_connector_id","c.provider=p_provider","c.resource_id=p_model_id","c.permission_mode='read'"])assert.ok(sql.includes(term),term);
 assert.match(sql,/on conflict\(request_id\) do nothing/);
});
test("models cannot self-report verified billing or silently replay",()=>{
 assert.match(sql,/actual_billed_usd numeric/);
 assert.match(sql,/status='reserved'/);
 assert.match(sql,/received_unverified/);
 assert.match(sql,/failed_or_unconfirmed/);
 assert.doesNotMatch(sql,/default\s+0\s*[,\n]/i);
});
test("disposable SQL test executes end-to-end failure and unauthorized cases",()=>{
 assert.match(harness,/model-dispatch-ledger\.sql/);
 assert.match(harness,/model-ledger\.sql/);
 assert.match(fixture,/Duplicate inference reserved/);
 assert.match(fixture,/Unknown actual billed cost must remain NULL/);
 assert.match(fixture,/Anonymous could reserve inference/);
});
