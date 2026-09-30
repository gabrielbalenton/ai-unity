import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessProjectHealth,validateHealthReceipt} from "../lib/self-ops/health.mjs";

const time=1_800_000;
const receipt=(overrides={})=>({
 projectId:"unity",componentId:"github-sync",collectorId:"trusted-worker",
 status:"healthy",checkedAt:time-1_000,evidenceRef:"monitor:check-1",...overrides
});
const input=(overrides={})=>({
 projectId:"unity",expectedComponents:["github-sync","task-worker"],
 receipts:[receipt()],now:time,...overrides
});
test("missing monitoring coverage is unknown, never healthy",()=>{
 const assessment=assessProjectHealth(input());
 assert.equal(assessment.overall,"incomplete");
 assert.deepEqual(assessment.counts,{healthy:1,degraded:0,down:0,unknown:1});
 assert.equal(assessment.complete,false);
 assert.deepEqual(assessment.proposedNextSteps,[{
  componentId:"task-worker",action:"verify_monitoring",requiresReview:true,evidenceRef:null
 }]);
});
test("only authenticated externally supplied source receipts can be evaluated",()=>{
 const assessment=assessProjectHealth(input({
  receipts:[receipt(),receipt({componentId:"task-worker",status:"healthy",evidenceRef:"check:2"})]
 }));
 assert.equal(assessment.overall,"healthy");
 assert.equal(assessment.complete,true);
 assert.equal(assessment.proposedNextSteps.length,0);
 assert.match(assessment.notice,/no repair or deployment/);
});
test("failing component is visible and requires human review",()=>{
 const assessment=assessProjectHealth(input({receipts:[
  receipt({status:"down"}),receipt({componentId:"task-worker",status:"healthy"})
 ]}));
 assert.equal(assessment.overall,"down");
 assert.deepEqual(assessment.proposedNextSteps,[{
  componentId:"github-sync",action:"investigate_incident",requiresReview:true,
  evidenceRef:"monitor:check-1"
 }]);
});
test("degraded system suggests investigation without an automatic write",()=>{
 const assessment=assessProjectHealth(input({receipts:[
  receipt({status:"degraded"}),receipt({componentId:"task-worker",status:"healthy"})
 ]}));
 assert.equal(assessment.overall,"degraded");
 assert.equal(assessment.proposedNextSteps[0].action,"inspect_component");
 assert.equal(assessment.proposedNextSteps[0].requiresReview,true);
});
test("stale receipts invalidate previously healthy status",()=>{
 const assessment=assessProjectHealth(input({
  now:time+400_000,receipts:[receipt()],
  expectedComponents:["github-sync"]
 }));
 assert.equal(assessment.overall,"incomplete");
 assert.equal(assessment.components[0].reason,"stale_receipt");
 assert.equal(assessment.components[0].evidenceRef,undefined);
});
test("future-dated receipts cannot imply successful monitoring",()=>{
 const assessment=assessProjectHealth(input({
  expectedComponents:["github-sync"],receipts:[receipt({checkedAt:time+60_000})]
 }));
 assert.equal(assessment.overall,"incomplete");
 assert.equal(assessment.components[0].status,"unknown");
});
test("newer receipts win, conflicting same-time receipts fail closed",()=>{
 const assessment=assessProjectHealth(input({
  expectedComponents:["github-sync"],
  receipts:[receipt({status:"down",checkedAt:time-2000}),
   receipt({status:"healthy",checkedAt:time-1000})]
 }));
 assert.equal(assessment.overall,"healthy");
 assert.throws(()=>assessProjectHealth(input({
  expectedComponents:["github-sync"],
  receipts:[receipt(),receipt({status:"down"})]
 })),/Conflicting/);
});
test("foreign project and unknown components never enter the requested project",()=>{
 const assessment=assessProjectHealth(input({receipts:[
  receipt(),receipt({componentId:"task-worker",projectId:"private",status:"down"}),
  {projectId:"foreign",componentId:"github-sync",status:"not-a-status"}
 ]}));
 assert.equal(assessment.overall,"incomplete");
 assert.equal(JSON.stringify(assessment).includes("private"),false);
});
test("invalid scoped health receipts are rejected, rather than hidden",()=>{
 assert.throws(()=>validateHealthReceipt(receipt({status:"invalid"})),/Invalid/);
 assert.throws(()=>assessProjectHealth(input({receipts:[receipt({status:"invalid"})]})),/Invalid/);
 assert.throws(()=>assessProjectHealth(input({expectedComponents:["bad component"]})),/Invalid/);
});
test("an empty monitoring inventory is unconfigured, not healthy",()=>{
 const assessment=assessProjectHealth(input({expectedComponents:[],receipts:[]}));
 assert.equal(assessment.overall,"unconfigured");
 assert.equal(assessment.complete,false);
});
test("the assessment has no network, repository mutation or secret access",()=>{
 const src=readFileSync(new URL("../lib/self-ops/health.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(src,/\bfetch\s*\(|execFile|writeFile|child_process|process\.env/);
});
