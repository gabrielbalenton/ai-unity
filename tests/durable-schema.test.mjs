import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const sql=read("supabase/schema-proposals/execution-queue.sql");
test("durable database proposal scopes idempotency keys and task references per project",()=>{
 assert.match(sql,/unique\(project_id,idempotency_key\)/);
 assert.match(sql,/foreign key\(task_id,project_id\)/);
 assert.match(sql,/references public\.project_tasks\(id,project_id\)/);
});
test("leases are constrained, and the worker store is not exposed to browser sessions",()=>{
 assert.match(sql,/lease_state_consistency/);
 assert.match(sql,/enable row level security/g);
 assert.match(sql,/revoke all on public\.execution_jobs,public\.execution_job_events/);
 assert.match(sql,/service_role/);
});
test("reviewed SQL does not claim to implement a live atomic worker claim",()=>{
 assert.match(sql,/functions below are intentionally NOT included/);
 const doc=read("docs/DURABLE_EXECUTION.md");
 assert.match(doc,/OFFLINE/i);
 assert.match(doc,/FOR UPDATE SKIP LOCKED/);
});
test("readiness includes the worker contract but never marks deployment ready",()=>{
 const readiness=read("scripts/readiness.mjs");
 assert.match(readiness,/lib\/runtime\/worker-queue\.mjs/);
 assert.match(readiness,/deploymentReady:false/);
});
