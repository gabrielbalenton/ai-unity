import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../supabase/schema-proposals/durable-jobs.sql",import.meta.url),"utf8");

test("durable job schema has strict project isolation and idempotency keys",()=>{
 assert.match(sql,/project_id uuid not null references public\.projects/);
 assert.match(sql,/unique\(project_id,idempotency_key\)/);
 assert.match(sql,/alter table public\.unity_jobs enable row level security/);
 assert.match(sql,/revoke all on public\.unity_jobs,public\.unity_job_events from public,anon,authenticated/);
});
test("concurrent worker claims use row locks and bounded leases",()=>{
 assert.match(sql,/for update skip locked/i);
 assert.match(sql,/p_lease_seconds not between 15 and 300/);
 assert.match(sql,/status='leased'/);
 assert.match(sql,/revision=revision\+1/);
});
test("expired external operations never qualify for automatic reclaimed execution",()=>{
 assert.match(sql,/j\.job_type='read_only'\s+and j\.lease_until/);
 assert.match(sql,/Failed mutating operations must enter manual review/);
});
test("definer function must be called with service role claim, never browser grants",()=>{
 assert.match(sql,/request\.jwt\.claim\.role/);
 assert.match(sql,/to service_role/);
 assert.match(sql,/revoke all on function public\.unity_claim_job/);
 assert.match(sql,/revoke all on function public\.unity_complete_job/);
});
