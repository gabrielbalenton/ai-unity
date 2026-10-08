import test from "node:test";
import assert from "node:assert/strict";
import {
 createCredentialGrant,
 validateCredentialGrant,
 makeInertCredentialVault,
 withCredential
} from "../lib/security/credential-broker.mjs";

const grant=()=>createCredentialGrant({
 id:"grant-openrouter-1",
 projectId:"fpx",
 provider:"openrouter",
 connectionId:"openrouter-main",
 secretRef:"secret:accounts/openrouter/main",
 purpose:"model:chat",
 issuedAt:"2026-10-08T04:00:00.000Z",
 expiresAt:"2026-10-08T04:05:00.000Z"
});

test("credential grants contain references and scope, never secret values",()=>{
 const item=grant();
 assert.equal(item.secretRef,"secret:accounts/openrouter/main");
 assert.equal("secret" in item,false);
 assert.equal(item.projectId,"fpx");
});

test("wrong project, provider, connection or purpose cannot reuse a grant",()=>{
 const item=grant();
 for(const request of [
  {projectId:"pebble",provider:"openrouter",connectionId:"openrouter-main",purpose:"model:chat"},
  {projectId:"fpx",provider:"gemini",connectionId:"openrouter-main",purpose:"model:chat"},
  {projectId:"fpx",provider:"openrouter",connectionId:"openrouter-other",purpose:"model:chat"},
  {projectId:"fpx",provider:"openrouter",connectionId:"openrouter-main",purpose:"model:embed"}
 ]){
  assert.throws(()=>validateCredentialGrant(item,{...request,at:"2026-10-08T04:01:00.000Z"}),/scope mismatch/);
 }
});

test("credential grants expire quickly",()=>{
 const item=grant();
 assert.throws(()=>validateCredentialGrant(item,{
  projectId:"fpx",provider:"openrouter",connectionId:"openrouter-main",purpose:"model:chat",at:"2026-10-08T04:05:00.000Z"
 }),/expired/);
});

test("inert vault cannot resolve credentials",async()=>{
 await assert.rejects(()=>makeInertCredentialVault().useSecret("secret:accounts/openrouter/main",async()=>null),/not configured/);
});

test("broker uses a secret inside callback without returning it",async()=>{
 const vault={configured:true,async useSecret(ref,callback){
  assert.equal(ref,"secret:accounts/openrouter/main");
  return callback("example-credential-value");
 }};
 const result=await withCredential({
  grant:grant(),
  request:{projectId:"fpx",provider:"openrouter",connectionId:"openrouter-main",purpose:"model:chat",at:"2026-10-08T04:01:00.000Z"},
  vault
 },async secret=>({ok:secret.length>0,provider:"openrouter"}));
 assert.deepEqual(result,{ok:true,provider:"openrouter"});
});

test("broker blocks an operation that echoes the credential",async()=>{
 const vault={configured:true,async useSecret(_ref,callback){return callback("example-credential-value")}};
 await assert.rejects(()=>withCredential({
  grant:grant(),
  request:{projectId:"fpx",provider:"openrouter",connectionId:"openrouter-main",purpose:"model:chat",at:"2026-10-08T04:01:00.000Z"},
  vault
 },async secret=>({debug:secret})),/leakage blocked/);
});
