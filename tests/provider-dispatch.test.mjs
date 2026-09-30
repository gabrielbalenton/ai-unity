import test from "node:test";
import assert from "node:assert/strict";
import {signEntitlementRecord} from "../lib/providers/entitlement.mjs";
import {dispatchVerifiedChat} from "../lib/providers/dispatch.mjs";
const now=1800000000000;
const secret="mock-signing-secret-for-unit-tests-1234567890";
const request={
 requestId:"request-123",actorId:"actor-123",projectId:"project-123",
 connectorId:"connector-123",provider:"openrouter",modelId:"provider/model",
 messages:[{role:"user",content:"This is a test"}],maxTokens:100
};
const record={...request,verifiedAt:now-1000,expiresAt:now+30000,
 estimatedPaidUsd:0,billingDisabled:true,entitlementVerified:true};
delete record.messages;delete record.maxTokens;
const signature=signEntitlementRecord(record,secret,now);
const policy={projectId:request.projectId,emergencyStop:false,maxPaidUsd:0,spentPaidUsd:0};
const connections=[{id:request.connectorId,projectId:request.projectId,
 status:"authorized",actions:["read"],resources:[request.modelId]}];
function options(changes={}){
 const calls={reserve:0,key:0,fetch:0,record:[]};
 const input={
  enabled:true,request,entitlement:signature,signingSecret:secret,policy,
  connections,nowMs:now,
  reserveRequestId:async()=>{calls.reserve++;return true},
  loadServerCredential:async()=>{calls.key++;return "mock-not-a-provider-key"},
  recordOutcome:async event=>{calls.record.push(event);return true},
  fetcher:async()=>{calls.fetch++;return{ok:true,
   text:async()=>JSON.stringify({choices:[{message:{content:"Synthetic result"}}]})}},
  ...changes
 };
 return {calls,input};
}
test("external inference remains disabled by default",async()=>{
 const {calls,input}=options();delete input.enabled;
 await assert.rejects(dispatchVerifiedChat(input),/disabled/);
 assert.equal(calls.reserve,0);assert.equal(calls.fetch,0);
});
test("signed zero-paid entitlement and project permission allow only the mocked transport",async()=>{
 const {calls,input}=options();
 const result=await dispatchVerifiedChat(input);
 assert.equal(result.text,"Synthetic result");assert.equal(result.independentlyVerified,false);
 assert.equal(calls.reserve,1);assert.equal(calls.key,1);assert.equal(calls.fetch,1);
 assert.equal(calls.record[0].outcome,"received_unverified");
 assert.match(calls.record[0].responseHash,/^[a-f0-9]{64}$/);
 assert.equal("text" in calls.record[0],false);
});
test("wrong project or missing signed proof fails before any reservation",async()=>{
 const {calls,input}=options({request:{...request,projectId:"other-project"}});
 await assert.rejects(dispatchVerifiedChat(input),/entitlement/);
 assert.equal(calls.reserve,0);
});
test("emergency stop and missing connector permission block requests before network",async()=>{
 for(const changes of [{policy:{...policy,emergencyStop:true}},{connections:[]}]){
  const {calls,input}=options(changes);
  await assert.rejects(dispatchVerifiedChat(input),/policy/);
  assert.equal(calls.reserve,0);assert.equal(calls.fetch,0);
 }
});
test("duplicate idempotency reservations never call the provider",async()=>{
 const {calls,input}=options({reserveRequestId:async()=>false});
 await assert.rejects(dispatchVerifiedChat(input),/already dispatched/);
 assert.equal(calls.fetch,0);
});
test("provider failures are sanitized and recorded without automatic retries",async()=>{
 const {calls,input}=options({fetcher:async()=>{
  calls.fetch++;throw Error("Sensitive key and remote details are here");
 }});
 await assert.rejects(dispatchVerifiedChat(input),/do not automatically retry/);
 assert.equal(calls.fetch,1);
 assert.equal(calls.record[0].outcome,"failed_or_unconfirmed");
});
