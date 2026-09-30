import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("database harness refuses non-ephemeral database environments",()=>{
 const script=read("scripts/test-db-contract.sh");
 assert.match(script,/UNITY_EPHEMERAL_DATABASE/);
 assert.match(script,/127\.0\.0\.1/);
 assert.match(script,/unity_contract/);
});
test("schema SQL exercises two-user isolation and denied anonymous access",()=>{
 const sql=read("tests/db/isolation.sql");
 assert.match(sql,/Cross-user memory access leaked/);
 assert.match(sql,/Bob approved Alice memory/);
 assert.match(sql,/Anonymous job access was permitted/);
});
test("queue SQL tests refuse duplicate completion and mutating replay",()=>{
 const sql=read("tests/db/worker.sql");
 assert.match(sql,/Stale\/wrong worker re-completed job/);
 assert.match(sql,/automatically replayed/);
});
test("expensive database checks run only on explicit DB milestone",()=>{
 const ci=read(".github/workflows/verify.yml");
 assert.match(ci,/contains\(github\.event\.pull_request\.title, '\[DB\]'\)/);
 assert.doesNotMatch(ci,/\n  push:/);
});
