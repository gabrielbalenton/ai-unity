import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const discovery=readFileSync(new URL("../app/api/private/connect/supabase/projects/route.ts",import.meta.url),"utf8");
const selection=readFileSync(new URL("../app/api/private/connect/supabase/select-project/route.ts",import.meta.url),"utf8");

test("Supabase project discovery verifies exact UNITY owner and exact connection",()=>{
 assert.match(discovery,/getVerifiedUser/);
 assert.match(discovery,/eq\("id",projectId\)\.eq\("owner_id",user\.id\)/);
 assert.match(discovery,/eq\("provider","supabase"\)/);
 assert.match(discovery,/eq\("connection_key",`supabase:\$\{projectId\}`\)/);
 assert.match(discovery,/account\.credential_reference!==expectedRef/);
});

test("Supabase project discovery resolves OAuth only inside Infisical callback",()=>{
 assert.match(discovery,/vault\.useSecret\(expectedRef,async\s*\(?(?:raw)(?::string)?\)?=>/);
 assert.match(discovery,/listSupabaseProjects\(\{accessToken:typed\.accessToken\}\)/);
 assert.match(discovery,/Supabase authorization expired\. Reconnect Supabase/);
 assert.doesNotMatch(discovery,/NextResponse\.json\([^\n]*accessToken/);
 assert.doesNotMatch(discovery,/credential_reference:/);
});

test("Supabase project selection re-fetches provider list instead of trusting browser ref",()=>{
 assert.match(selection,/checkWriteOrigin/);
 assert.match(selection,/readBoundedJson/);
 assert.match(selection,/listSupabaseProjects\(\{accessToken:typed\.accessToken\}\)/);
 assert.match(selection,/allowedProjects\.find\(\(?item(?::SupabaseProject)?\)?=>item\.ref===parsed\.data\.supabaseProjectRef\)/);
 assert.match(selection,/not authorized for this account/);
});

test("Supabase selected project remains read-only and exact-resource scoped",()=>{
 assert.match(selection,/resourceId=`supabase:project:\$\{chosen\.ref\}`/);
 assert.match(selection,/permission_mode:"read"/);
 assert.match(selection,/eq\("project_id",parsed\.data\.projectId\)/);
 assert.match(selection,/eq\("account_connection_id",account\.id\)/);
});

test("selection response exposes safe project metadata only",()=>{
 assert.match(selection,/selected:\{ref:chosen\.ref,name:chosen\.name,status:chosen\.status\}/);
 assert.doesNotMatch(selection,/selected:\{[^}]*accessToken/);
 assert.doesNotMatch(selection,/selected:\{[^}]*refreshToken/);
 assert.doesNotMatch(selection,/selected:\{[^}]*credential_reference/);
});
