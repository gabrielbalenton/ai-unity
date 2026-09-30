import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("supabase/schema-proposals/memory-approval.sql");
const route=read("app/api/private/memories/approve/route.ts");

test("approval is transactional and tied to an authenticated owner",()=>{
 assert.match(sql,/security definer/i);
 assert.match(sql,/set search_path = ''/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/p\.owner_id = v_actor/);
 assert.match(sql,/for update of m/);
 assert.match(sql,/v_record\.updated_at <> p_expected_updated_at/);
});
test("approval creates a revision and audit event in one function",()=>{
 assert.match(sql,/insert into public\.memory_revisions/);
 assert.match(sql,/insert into public\.audit_events/);
 assert.match(sql,/source_verification','not_performed'/);
 assert.match(sql,/revoke all on function public\.approve_memory_entry/);
 assert.match(sql,/to authenticated/);
});
test("the private route checks verified session, project scope and request origin",()=>{
 assert.match(route,/getVerifiedUser/);
 assert.match(route,/owner_id/);
 assert.match(route,/checkWriteOrigin/);
 assert.match(route,/expectedUpdatedAt/);
 assert.match(route,/\.rpc\("approve_memory_entry"/);
 assert.doesNotMatch(route,/SERVICE_ROLE/);
});
test("local imported approvals cannot bypass server approval",()=>{
 const workspace=read("lib/workspace-validation.mjs");
 assert.match(workspace,/importMode \? "draft" : m\.status/);
});
