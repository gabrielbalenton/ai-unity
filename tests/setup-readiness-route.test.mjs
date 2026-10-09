import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const route=read("app/api/private/setup/readiness/route.ts");
const consoleSource=read("components/CloudCommandConsole.tsx");

test("setup readiness aggregates backend, vault and external integration configuration",()=>{
 for(const fn of ["isInfisicalConfigured","isGitHubIntegrationConfigured","isSupabaseIntegrationConfigured","isVercelIntegrationConfigured","isSupabaseAdminConfigured"])
  assert.match(route,new RegExp(fn));
 assert.match(route,/allConfigured/);
});

test("readiness endpoint requires an authenticated UNITY user and exposes names only",()=>{
 assert.match(route,/getVerifiedUser/);
 assert.match(route,/Authentication required/);
 assert.match(route,/secretValuesExposed:false/);
 assert.doesNotMatch(route,/process\.env\.INFISICAL_CLIENT_SECRET/);
 assert.doesNotMatch(route,/process\.env\.SUPABASE_INTEGRATION_CLIENT_SECRET/);
});

test("cloud command console displays setup-needed state without credential values",()=>{
 assert.match(consoleSource,/\/api\/private\/setup\/readiness/);
 assert.match(consoleSource,/SETUP NEEDED/);
 assert.match(consoleSource,/Needs:/);
 assert.doesNotMatch(consoleSource,/clientSecret|accessToken|refreshToken/);
});
