import test from "node:test";
import assert from "node:assert/strict";
import {
 openIncident,diagnoseIncident,proposeRepair,verifyRepair,
 requestRepairApproval,approveRepair,withdrawRepair,
 findSimilarVerifiedIncidents
} from "../lib/selfops/incident-memory.mjs";
const base={id:"inc1",projectId:"unitycore",subsystem:"webhook",fingerprint:"missing-field",
 symptom:"Webhook parser rejected an optional field",detectedAt:"2026-09-30T08:00:00Z"};
const ctx=(revision,at="2026-09-30T09:00:00Z",other={})=>({
 projectId:"unitycore",actorId:"repair_worker",revision,at,...other});
const observed=()=>openIncident(base);
const diagnosed=()=>diagnoseIncident(observed(),ctx(0),{
 rootCause:"Parser assumed optional field always existed",evidenceRefs:["repro:123"]});
const proposed=()=>proposeRepair(diagnosed(),ctx(1),{
 description:"Handle missing field with a bounded default",
 changeRef:"branch:incident-1",risk:"moderate"});
const verified=()=>verifyRepair(proposed(),ctx(2),{
 verifierId:"independent_qa",testEvidenceRefs:["test:regression-123"],passed:true});
test("observed incidents cannot claim a verified or automatic fix",()=>{
 const i=observed();
 assert.equal(i.status,"observed");
 assert.equal(i.verification,null);
 assert.equal(i.approval,null);
 assert.equal("execute" in i,false);
 assert.throws(()=>requestRepairApproval(i,ctx(0)),/Unverified/);
});
test("diagnosis requires source-backed evidence and rejects secrets",()=>{
 assert.throws(()=>openIncident({...base,symptom:"ghp_"+ "x".repeat(32)}),/sanitized/);
 assert.throws(()=>diagnoseIncident(observed(),ctx(0),{
  rootCause:"A plausible cause with no proof",evidenceRefs:[]}),/evidence/);
 assert.equal(diagnosed().diagnosis.evidenceRefs[0],"repro:123");
});
test("repair proposals require isolated change references and declared risk",()=>{
 assert.throws(()=>proposeRepair(diagnosed(),ctx(1),{
  description:"Guess and patch all production systems",changeRef:"branch:incident-1",risk:"unknown"}),/proposal/);
 const i=proposed();
 assert.equal(i.status,"repair_proposed");
 assert.equal(i.repair.risk,"moderate");
});
test("independent failing verification does not allow approval",()=>{
 assert.throws(()=>verifyRepair(proposed(),ctx(2),{
  verifierId:"repair_worker",testEvidenceRefs:["test:1"],passed:true}),/Independent/);
 const failed=verifyRepair(proposed(),ctx(2),{
  verifierId:"independent_qa",testEvidenceRefs:["test:failed"],passed:false});
 assert.equal(failed.status,"verification_failed");
 assert.throws(()=>requestRepairApproval(failed,ctx(3)),/Unverified/);
});
test("approval is exact and time-limited, never an execution command",()=>{
 const i=verified();
 const requested=requestRepairApproval(i,ctx(3));
 assert.equal(requested.status,"awaiting_approval");
 assert.throws(()=>approveRepair(requested,ctx(4),{
  approvalRef:"approval:1",scope:"production_deploy",expiresAt:"2026-10-01T00:00:00Z"}),/time-limited/);
 assert.throws(()=>approveRepair(requested,ctx(4),{
  approvalRef:"approval:1",scope:"isolated_change_review",expiresAt:"2026-09-29T00:00:00Z"}),/time-limited/);
 const approved=approveRepair(requested,ctx(4),{
  approvalRef:"approval:1",scope:"isolated_change_review",expiresAt:"2026-10-01T00:00:00Z"});
 assert.equal(approved.status,"approved_for_review");
 assert.equal("deploy" in approved,false);
 assert.equal(approved.history.at(-1).type,"approved_for_review");
});
test("project and revision mismatches reject transitions",()=>{
 assert.throws(()=>diagnoseIncident(observed(),ctx(0,undefined,{projectId:"someone_else"}),{
  rootCause:"A plausible documented cause",evidenceRefs:["repro:1"]}),/scope/);
 assert.throws(()=>proposeRepair(diagnosed(),ctx(0),{
  description:"A regression-backed safe repair",changeRef:"branch:1",risk:"low"}),/revision/);
});
test("only same-project verified past repairs become suggestions, never execution",()=>{
 const other=Object.freeze({...verified(),id:"inc-other",projectId:"another"});
 const found=findSimilarVerifiedIncidents([observed(),proposed(),verified(),other],{
  projectId:"unitycore",subsystem:"webhook",fingerprint:"missing-field"});
 assert.equal(found.length,1);
 assert.equal(found[0].incidentId,"inc1");
 assert.match(found[0].recommendation,/never automatically replay/);
 assert.equal("execute" in found[0],false);
 const dismissed=withdrawRepair(verified(),ctx(3));
 assert.equal(findSimilarVerifiedIncidents([dismissed],{
  projectId:"unitycore",subsystem:"webhook",fingerprint:"missing-field"}).length,0);
});
