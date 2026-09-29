import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../"+p, import.meta.url),"utf8");
test("project identity and memory approval exist in client",()=>{
 const page=read("app/page.tsx");
 assert.match(page,/projectId/);
 assert.match(page,/status:"draft"/);
 assert.match(page,/status:"approved"/);
});
test("secrets and non-functional integrations are explicitly disclaimed",()=>{
 const readme=read("README.md");
 assert.match(readme,/not production-ready/i);
 assert.match(readme,/no real account connections/i);
 const page=read("app/page.tsx");
 assert.match(page,/not encrypted/i);
});
test("catalog is read-only and no paid inference endpoint exists",()=>{
 const route=read("app/api/catalog/route.ts");
 assert.match(route,/openrouter.ai\/api\/v1\/models/);
 assert.doesNotMatch(route,/api\/v1\/chat\/completions/);
});
test("server-side schema includes authorization boundaries",()=>{
 const sql=read("supabase/migrations/0001_core.sql");
 for(const table of ["projects","memory_entries","project_connections","audit_events"]){
  assert.match(sql,new RegExp("alter table public\\."+table+" enable row level security"));
 }
 assert.match(sql,/auth.uid\(\)/);
});
test("no secrets are included in template or package",()=>{
 assert.doesNotMatch(read(".env.example"),/sk-[a-zA-Z0-9]{16,}/);
 assert.match(read(".gitignore"),/\.env/);
});
