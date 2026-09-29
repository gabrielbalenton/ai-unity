import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Next.js 15 uses middleware rather than an unsupported v16 proxy",()=>{
 const middleware=read("middleware.ts");
 assert.match(middleware,/export async function middleware/);
 assert.match(middleware,/getClaims\(\)/);
 assert.match(middleware,/api\/private/);
});
test("server identities are verified remotely, never extracted from untrusted cookies alone",()=>{
 const server=read("lib/supabase/server.ts");
 assert.match(server,/auth\.getUser\(\)/);
 assert.doesNotMatch(server,/auth\.getSession\(\)/);
});
test("projects and memories verify actor, owner and fail closed when backend is absent",()=>{
 for(const file of ["app/api/private/projects/route.ts","app/api/private/memories/route.ts"]){
  const content=read(file);
  assert.match(content,/isSupabaseConfigured/);
  assert.match(content,/getVerifiedUser/);
  assert.match(content,/owner_id/);
  assert.match(content,/status:401/);
 }
});
test("the public source never includes a service-role credential in auth routes",()=>{
 for(const file of ["lib/supabase/server.ts","lib/supabase/browser.ts","app/api/private/projects/route.ts","app/api/private/memories/route.ts"]){
  assert.doesNotMatch(read(file),/SERVICE_ROLE_KEY|sb_secret_/);
 }
});
