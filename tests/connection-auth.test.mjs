import test from "node:test";
import assert from "node:assert/strict";
import {
  planConnectionAuthorization,
  canOfferOneClick,
  listConnectionStrategies
} from "../lib/infrastructure/connection-auth.mjs";

test("verified redirect-capable services can offer one-click setup",()=>{
  assert.equal(canOfferOneClick("github"),true);
  assert.equal(canOfferOneClick("supabase"),true);
  assert.equal(canOfferOneClick("openrouter"),true);
});

test("unverified or key-based services do not pretend to support one-click OAuth",()=>{
  for(const service of ["vercel","gemini","groq","mistral","huggingface","cerebras"]){
    assert.equal(canOfferOneClick(service),false);
  }
});

test("connection planning remains inert and project scoped",()=>{
  const plan=planConnectionAuthorization({service:"openrouter",projectId:"fpx-project"});
  assert.equal(plan.service,"openrouter");
  assert.equal(plan.projectId,"fpx-project");
  assert.equal(plan.kind,"oauth_pkce");
  assert.equal(plan.interactive,true);
  assert.equal(plan.secretDestination,"server_vault");
  assert.equal(plan.executable,false);
});

test("unknown providers and malformed projects fail closed",()=>{
  assert.throws(()=>planConnectionAuthorization({service:"made-up-provider",projectId:"fpx-project"}),/Unsupported/);
  assert.throws(()=>planConnectionAuthorization({service:"github",projectId:"x"}),/Invalid project/);
});

test("every configured strategy has an explicit non-executable authorization mode",()=>{
  const items=listConnectionStrategies();
  assert.ok(items.length>=9);
  for(const item of items){
    assert.ok(item.service);
    assert.ok(item.kind);
    assert.ok(item.status);
  }
});
