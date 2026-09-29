import test from "node:test";
import assert from "node:assert/strict";
import {planModelRequest} from "../lib/runtime/model-router.mjs";
const policy={projectId:"p1",emergencyStop:false,maxPaidUsd:0,spentPaidUsd:0,approvedOperations:[]};
const connection={id:"gateway",projectId:"p1",status:"authorized",actions:["read"],resources:["model-a","model-b"]};
const model=(id,extras={})=>({id,connectorId:"gateway",capabilities:["reasoning"],estimatedPaidUsd:0,freeEligibilityVerified:true,...extras});
const run=(overrides={})=>planModelRequest({projectId:"p1",taskId:"t1",capability:"reasoning",models:[model("model-a")],connections:[connection],policy,...overrides});
test("router returns a plan but never executes a model",()=>{
 const result=run();assert.equal(result.chosen.id,"model-a");
 assert.equal(result.executionEnabled,false);assert.match(result.notice,/Planning result/);
});
test("free eligibility cannot be inferred from a catalog listing",()=>{
 const result=run({models:[model("model-a",{freeEligibilityVerified:false})]});
 assert.equal(result.chosen,null);assert.match(result.rejected[0].reason,/eligibility/);
});
test("unknown costs are rejected even with eligibility true",()=>{
 assert.equal(run({models:[model("model-a",{estimatedPaidUsd:undefined})]}).chosen,null);
});
test("another project cannot borrow an authorized connector",()=>{
 const result=run({projectId:"other"});
 assert.equal(result.chosen,null);assert.match(result.rejected[0].reason,/scope mismatch/);
});
test("only models supporting the requested capability are selected",()=>{
 const result=run({models:[model("model-a",{capabilities:["speech"]})]});
 assert.equal(result.chosen,null);
});
test("prefer verified zero-cost candidates under the budget",()=>{
 const result=run({models:[model("model-b",{priority:50}),model("model-a",{priority:1})]});
 assert.equal(result.chosen.id,"model-a");
});
test("emergency stop blocks all inference plans",()=>{
 const result=run({policy:{...policy,emergencyStop:true}});
 assert.equal(result.chosen,null);
});
