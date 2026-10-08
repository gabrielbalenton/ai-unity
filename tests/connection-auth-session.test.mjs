import test from "node:test";
import assert from "node:assert/strict";
import {
  createConnectionAuthSession,
  verifyConnectionAuthSession,
  publicConnectionAuthStart
} from "../lib/security/connection-auth-session.mjs";

test("connection authorization creates bounded PKCE material",()=>{
  const session=createConnectionAuthSession({service:"openrouter",projectId:"fpx-project",now:0,ttlMs:600000});
  assert.equal(session.service,"openrouter");
  assert.equal(session.projectId,"fpx-project");
  assert.equal(session.challengeMethod,"S256");
  assert.ok(session.state.length>=40);
  assert.ok(session.verifier.length>=40);
  assert.ok(session.challenge.length>=40);
  assert.equal(session.expiresAt,"1970-01-01T00:10:00.000Z");
});

test("public start data never exposes PKCE verifier",()=>{
  const session=createConnectionAuthSession({service:"openrouter",projectId:"fpx-project"});
  const safe=publicConnectionAuthStart(session);
  assert.equal("verifier" in safe,false);
  assert.equal(safe.challenge,session.challenge);
  assert.equal(safe.state,session.state);
});

test("matching provider project and state can resume before expiry",()=>{
  const session=createConnectionAuthSession({service:"supabase",projectId:"pebble-project",now:1000,ttlMs:60000});
  const verified=verifyConnectionAuthSession(session,{
    service:"supabase",projectId:"pebble-project",state:session.state,now:2000
  });
  assert.equal(verified.verified,true);
  assert.equal(verified.verifier,session.verifier);
});

test("wrong state, project, provider or expired sessions fail closed",()=>{
  const session=createConnectionAuthSession({service:"openrouter",projectId:"fpx-project",now:0,ttlMs:60000});
  assert.throws(()=>verifyConnectionAuthSession(session,{service:"openrouter",projectId:"fpx-project",state:"wrong",now:1000}),/state mismatch/);
  assert.throws(()=>verifyConnectionAuthSession(session,{service:"openrouter",projectId:"pebble-project",state:session.state,now:1000}),/scope mismatch/);
  assert.throws(()=>verifyConnectionAuthSession(session,{service:"supabase",projectId:"fpx-project",state:session.state,now:1000}),/scope mismatch/);
  assert.throws(()=>verifyConnectionAuthSession(session,{service:"openrouter",projectId:"fpx-project",state:session.state,now:60000}),/expired/);
});

test("authorization lifetime is deliberately short",()=>{
  assert.throws(()=>createConnectionAuthSession({service:"github",projectId:"fpx-project",ttlMs:30_000}),/lifetime/);
  assert.throws(()=>createConnectionAuthSession({service:"github",projectId:"fpx-project",ttlMs:16*60_000}),/lifetime/);
});
