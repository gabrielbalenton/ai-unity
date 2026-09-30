import test from "node:test";
import assert from "node:assert/strict";
import {signEntitlementRecord,verifyEntitlementRecord} from "../lib/providers/entitlement.mjs";
const now=1800000000000;
const secret="not-a-real-secret-used-for-test-signing-12345";
const record={
 requestId:"request-123",actorId:"actor-123",projectId:"project-123",connectorId:"connector-123",
 provider:"openrouter",modelId:"provider/model",verifiedAt:now-5000,expiresAt:now+30000,
 estimatedPaidUsd:0,billingDisabled:true,entitlementVerified:true
};
const sign=()=>signEntitlementRecord(record,secret,now);
const verify=(envelope,overrides={})=>verifyEntitlementRecord(envelope,{
 secret,nowMs:now,request:record,...overrides
});
test("valid proof is signed to the exact requested actor, project and model",()=>{
 const envelope=sign();
 assert.equal(verify(envelope),true);
 assert.equal(verify(envelope,{request:{...record,projectId:"other-project"}}),false);
 assert.equal(verify(envelope,{request:{...record,modelId:"p/another"}}),false);
});
test("modifying cost, account or signature invalidates proof",()=>{
 const signed=sign();
 assert.equal(verify({...signed,record:{...signed.record,estimatedPaidUsd:0.01}}),false);
 assert.equal(verify({...signed,record:{...signed.record,actorId:"another"}}),false);
 assert.equal(verify({...signed,signature:"0".repeat(64)}),false);
});
test("proof expires quickly and cannot be issued too far in the future",()=>{
 const signed=sign();
 assert.equal(verify(signed,{nowMs:now+40000}),false);
 assert.throws(()=>signEntitlementRecord({...record,expiresAt:now+600000},secret,now),/stale/);
});
test("unknown provider billing controls are never assumed safe",()=>{
 assert.throws(()=>signEntitlementRecord({...record,billingDisabled:false},secret,now),/entitlement/);
 assert.throws(()=>signEntitlementRecord({...record,entitlementVerified:false},secret,now),/entitlement/);
 assert.throws(()=>signEntitlementRecord({...record,estimatedPaidUsd:undefined},secret,now),/entitlement/);
});
test("secret must exist and meet minimum length",()=>{
 assert.throws(()=>signEntitlementRecord(record,"short",now),/signer/);
 assert.equal(verifyEntitlementRecord(sign(),{secret:"short",request:record,nowMs:now}),false);
});
