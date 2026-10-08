import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const config=readFileSync(new URL("../lib/security/infisical-config.ts",import.meta.url),"utf8");
const route=readFileSync(new URL("../app/api/private/vault/status/route.ts",import.meta.url),"utf8");
const env=readFileSync(new URL("../.env.example",import.meta.url),"utf8");

test("Infisical status exposes readiness only, never secret values",()=>{
 assert.match(config,/secretValuesExposed:false/);
 assert.match(config,/provider:"infisical"/);
 assert.match(config,/mode:"machine_identity"/);
 assert.doesNotMatch(route,/INFISICAL_CLIENT_SECRET|INFISICAL_CLIENT_ID|INFISICAL_PROJECT_ID/);
 assert.doesNotMatch(route,/clientSecret|clientId|secretValue/);
});

test("vault status remains private and authenticated",()=>{
 assert.match(route,/isSupabaseConfigured/);
 assert.match(route,/getVerifiedUser/);
 assert.match(route,/Authentication required/);
 assert.match(route,/Cache-Control":"private, no-store/);
});

test("environment template contains blank Infisical bootstrap fields only",()=>{
 for(const name of ["INFISICAL_CLIENT_ID","INFISICAL_CLIENT_SECRET","INFISICAL_PROJECT_ID","INFISICAL_ENVIRONMENT","INFISICAL_SECRET_PATH"]){
  assert.match(env,new RegExp(`^${name}=`,"m"));
 }
 assert.match(env,/INFISICAL_CLIENT_SECRET=\n/);
 assert.match(env,/INFISICAL_CLIENT_ID=\n/);
 assert.doesNotMatch(env,/INFISICAL_CLIENT_SECRET=\S+/);
 assert.doesNotMatch(env,/INFISICAL_CLIENT_ID=\S+/);
});

test("bootstrap configuration cannot claim verified vault access",()=>{
 assert.match(config,/Presence check only/);
 assert.match(config,/not that Infisical authentication or secret access has succeeded/);
});
