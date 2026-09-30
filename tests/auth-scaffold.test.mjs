import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Next.js 16 uses the Proxy session-refresh boundary",()=>{
 const proxy=read("proxy.ts");
 assert.match(proxy,/export async function proxy/);
 assert.match(proxy,/getClaims\(\)/);
 assert.match(proxy,/api\/private/);
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
