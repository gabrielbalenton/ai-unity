import test from "node:test";
import assert from "node:assert/strict";
import {planProviderFallbacks,createModelHandoff} from "../lib/ai/fallback.mjs";
const policy={projectId:"alpha",emergencyStop:false,maxPaidUsd:0,spentPaidUsd:0,approvedOperations:[]};
const providers=[
 {id:"model-a",connectorId:"gatewayA",capabilities:["reasoning"],estimatedPaidUsd:0,freeEligibilityVerified:true,priority:1},
 {id:"model-b",connectorId:"gatewayB",capabilities:["reasoning"],estimatedPaidUsd:0,freeEligibilityVerified:true,priority:2},
 {id:"model-c",connectorId:"gatewayC",capabilities:["reasoning"],estimatedPaidUsd:0.1,freeEligibilityVerified:true,priority:0}
];
const grants=providers.map(m=>({id:m.connectorId,projectId:"alpha",status:"authorized",actions:["read"],resources:[m.id]}));
const plan=overrides=>planProviderFallbacks({projectId:"alpha",taskId:"task1",capability:"reasoning",
 models:providers,connections:grants,policy,...overrides});
test("offline fallback order includes only separately authorized zero-budget providers",()=>{
 const result=plan();
 assert.deepEqual(result.choices.map(x=>x.connectorId),["gatewayA","gatewayB"]);
 assert.equal(result.executionEnabled,false);
});
test("revoked gateway cannot be silently used as fallback",()=>{
 const reduced=grants.map(g=>g.id==="gatewayB"?{...g,status:"revoked"}:g);
 const result=plan({connections:reduced});
 assert.deepEqual(result.choices.map(x=>x.connectorId),["gatewayA"]);
});
test("default budget and emergency stop deny every nonfree or emergency request",()=>{
 assert.equal(plan({policy:{...policy,emergencyStop:true}}).choices.length,0);
 assert.equal(plan({models:[providers[2]]}).choices.length,0);
});
test("a fallback plan cannot include multiple models from the same provider twice",()=>{
 const result=plan({models:[
  {...providers[0],id:"model-a2",priority:0},
  ...providers
 ],connections:[{...grants[0],resources:["model-a2","model-a"]},...grants.slice(1)]});
 assert.equal(result.choices.filter(x=>x.connectorId==="gatewayA").length,1);
});
test("cross-model handoff retains only source references and unverified summary",()=>{
 const handoff=createModelHandoff({projectId:"alpha",taskId:"task1",
  fromModelId:"a",toModelId:"b",summary:"Validated tests remain pending",
  evidenceRefs:["commit:abc","commit:abc"],completedStepIds:["step1"]});
 assert.equal(handoff.summaryTrust,"unverified_ai_draft");
 assert.deepEqual(handoff.evidenceRefs,["commit:abc"]);
 assert.equal(handoff.requiresIndependentVerification,true);
 assert.equal("hiddenReasoning" in handoff,false);
});
test("invalid or same-model transfers are rejected",()=>{
 assert.throws(()=>createModelHandoff({projectId:"alpha",taskId:"task1",
  fromModelId:"a",toModelId:"a",summary:"x"}),/Invalid/);
});
