import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const start=readFileSync(new URL("../app/api/private/connect/supabase/start/route.ts",import.meta.url),"utf8");
const callback=readFileSync(new URL("../app/api/private/connect/supabase/callback/route.ts",import.meta.url),"utf8");

test("Supabase connect start requires user, trusted origin, backend, vault and OAuth app config",()=>{
 assert.match(start,/getVerifiedUser/);
 assert.match(start,/checkWriteOrigin/);
 assert.match(start,/isSupabaseAdminConfigured/);
 assert.match(start,/isInfisicalConfigured/);
 assert.match(start,/isSupabaseIntegrationConfigured/);
 assert.match(start,/eq\("id",parsed\.data\.projectId\)\.eq\("owner_id",user\.id\)/);
 assert.match(start,/sealConnectionAuthSession/);
});

test("Supabase callback verifies state and project ownership before token exchange",()=>{
 const verifyAt=callback.indexOf("verifyConnectionAuthSession");
 const exchangeAt=callback.indexOf("exchangeSupabaseAuthorizationCode({");
 assert.ok(verifyAt>=0&&exchangeAt>verifyAt);
 assert.match(callback,/openConnectionAuthSession/);
 assert.match(callback,/eq\("id",verified\.projectId\)\.eq\("owner_id",user\.id\)/);
});

test("Supabase callback puts OAuth token bundle in Infisical and only a reference in metadata",()=>{
 assert.match(callback,/secret:supabase\/\$\{verified\.projectId\}\/oauth/);
 assert.match(callback,/secretName:"SUPABASE_OAUTH_BUNDLE"/);
 assert.match(callback,/await vault\.putSecret\(secretRef,JSON\.stringify/);
 assert.match(callback,/credential_reference:secretRef/);
 assert.match(callback,/auth_method:"oauth_ref"/);
 assert.doesNotMatch(callback,/credential_reference:exchanged\.accessToken/);
 assert.doesNotMatch(callback,/NextResponse\.json\([^\n]*accessToken/);
});

test("Supabase connection is initially account-level and read-only pending exact project selection",()=>{
 assert.match(callback,/resource_id:"supabase:account"/);
 assert.match(callback,/permission_mode:"read"/);
 assert.match(callback,/project_id:verified\.projectId/);
});
