import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const start=readFileSync(new URL("../app/api/private/connect/openrouter/start/route.ts",import.meta.url),"utf8");
const callback=readFileSync(new URL("../app/api/private/connect/openrouter/callback/route.ts",import.meta.url),"utf8");

test("OpenRouter start route requires auth, trusted origin, backend and vault readiness",()=>{
 assert.match(start,/getVerifiedUser/);
 assert.match(start,/checkWriteOrigin/);
 assert.match(start,/isSupabaseAdminConfigured/);
 assert.match(start,/isInfisicalConfigured/);
 assert.match(start,/account_connections/);
 assert.match(start,/sealConnectionAuthSession/);
 assert.match(start,/httpOnly:CONNECTION_AUTH_COOKIE\.httpOnly/);
});

test("OpenRouter callback verifies redirect state before exchanging authorization code",()=>{
 const verifyAt=callback.indexOf("verifyConnectionAuthSession");
 const exchangeAt=callback.indexOf("exchangeOpenRouterAuthorizationCode({code");
 assert.ok(verifyAt>=0);
 assert.ok(exchangeAt>verifyAt);
 assert.match(callback,/openConnectionAuthSession/);
 assert.match(callback,/eq\("owner_id",user\.id\)/);
});

test("OpenRouter callback writes provider key to Infisical and stores only a reference in account metadata",()=>{
 assert.match(callback,/await vault\.putSecret\(secretRef,exchanged\.key\)/);
 assert.match(callback,/credential_reference:secretRef/);
 assert.match(callback,/auth_method:"api_key_ref"/);
 assert.doesNotMatch(callback,/NextResponse\.json\([^\n]*exchanged\.key/);
 assert.doesNotMatch(callback,/credential_reference:exchanged\.key/);
});

test("OpenRouter callback binds the exact connection to the exact owned project",()=>{
 assert.match(callback,/project_account_bindings/);
 assert.match(callback,/project_id:verified\.projectId/);
 assert.match(callback,/account_connection_id:connection\.id/);
 assert.match(callback,/resource_id:"openrouter:models"/);
});
