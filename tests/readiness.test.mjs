import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("deployment gate remains disabled until real integrations are verified",()=>{
 const script=read("scripts/readiness.mjs");
 assert.match(script,/deploymentReady:false/);
 assert.match(script,/verifiedLiveModelInference:false/);
 assert.match(script,/verifiedPersistentMemory:false/);
});
test("reproducible CI includes tests, build and safety checks",()=>{
 const ci=read(".github/workflows/verify.yml");
 assert.match(ci,/npm test/);
 assert.match(ci,/npm run typecheck/);
 assert.match(ci,/npm run build/);
 assert.match(ci,/npm run check:repo/);
});
test("database runtime schema is staged rather than applied to an unrelated project",()=>{
 const sql=read("supabase/schema-proposals/runtime.sql");
 assert.match(sql,/SCHEMA PROPOSAL ONLY/);
 for(const table of ["conversation_threads","conversation_messages","project_tasks",
   "task_events","operation_approvals","memory_revisions","model_usage_events","agent_profiles"]){
  assert.match(sql,new RegExp("alter table public\\."+table+" enable row level security"));
 }
});
