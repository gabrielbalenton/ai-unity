import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const root=new URL("../",import.meta.url);
const path=name=>new URL(name,root);
test("Next.js 16 uses the supported Proxy convention instead of deprecated middleware",()=>{
 assert.equal(existsSync(path("proxy.ts")),true);
 assert.equal(existsSync(path("middleware.ts")),false);
 const src=readFileSync(path("proxy.ts"),"utf8");
 assert.match(src,/export async function proxy\(request:NextRequest\)/);
 assert.match(src,/matcher:\["\/auth\/:path\*","\/api\/private\/:path\*"\]/);
});
test("proxy never becomes the authorization authority and keeps cookie refresh private",()=>{
 const src=readFileSync(path("proxy.ts"),"utf8");
 assert.match(src,/supabase\.auth\.getClaims\(\)/);
 assert.match(src,/private, no-store/);
 assert.match(src,/request\.cookies\.set/);
 assert.match(src,/response\.cookies\.set/);
 assert.doesNotMatch(src,/service_role|sb_secret_|\.auth\.getSession\(/);
 const server=readFileSync(path("lib/supabase/server.ts"),"utf8");
 assert.match(server,/\.auth\.getUser\(\)/);
});
test("Auth documentation names actual version and does not claim activation",()=>{
 const docs=readFileSync(path("docs/AUTH_INTEGRATION.md"),"utf8");
 assert.match(docs,/Next\.js \*\*16\*\* `proxy\.ts`/);
 assert.match(docs,/not an authorization substitute/);
 assert.match(docs,/No Supabase project has been created or modified/);
});
