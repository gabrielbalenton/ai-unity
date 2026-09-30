import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessProjectHealth} from "../lib/self-ops/health.mjs";
import {planHealthTriage} from "../lib/self-ops/triage.mjs";

const now=1_900_000;
const receipt=(overrides={})=>({
 projectId:"unity",componentId:"api",collectorId:"collector-a",
 evidenceRef:"check:api",status:"down",checkedAt:now-1000,...overrides
});
const assessment=(options={})=>assessProjectHealth({
 projectId:"unity",expectedComponents:["api","worker"],
 receipts:[receipt()],now,...options
});
const evaluate=(options={})=>planHealthTriage({
 assessment:assessment(),projectId:"unity",...options
});
test("verified failure produces a proposal, not an automatic repair",()=>{
 const result=evaluate();
 assert.equal(result.plans[0].action,"propose_incident");
 assert.equal(result.plans[0].severityHint,"high");
 assert.equal(result.plans[0].evidenceRef,"check:api");
 assert.equal(result.plans[0].requiresReview,true);
 assert.equal(result.plans[1].action,"verify_monitoring");
 assert.equal(result.plans[1].incidentId,null);
 assert.match(result.notice,/do not authorize/i);
});
test("repeated component failures reuse existing active incident instead of duplicating it",()=>{
 const result=evaluate({existingIncidents:[{
  id:"incident:1",projectId:"unity",componentId:"api",state:"triaged"
 }]});
 assert.equal(result.plans[0].action,"review_existing_incident");
 assert.equal(result.plans[0].incidentId,"incident:1");
});
test("closed incidents do not authorize replay of prior repairs",()=>{
 const result=evaluate({existingIncidents:[{
  id:"incident:old",projectId:"unity",componentId:"api",state:"closed"
 }]});
 assert.equal(result.plans[0].action,"propose_incident");
 assert.equal(result.plans[0].incidentId,null);
});
test("the same component in another project cannot suppress this incident",()=>{
 const result=evaluate({existingIncidents:[{
  id:"incident:private",projectId:"private",componentId:"api",state:"triaged"
 }]});
 assert.equal(result.plans[0].action,"propose_incident");
 assert.equal(JSON.stringify(result).includes("private"),false);
});
test("a missing monitor is not mislabeled a failed service",()=>{
 const result=planHealthTriage({
  projectId:"unity",assessment:assessment({receipts:[]})
 });
 assert.equal(result.plans.every(p=>p.action==="verify_monitoring"),true);
});
test("degraded source receipt proposes triage but cannot execute action",()=>{
 const result=planHealthTriage({
  projectId:"unity",assessment:assessment({receipts:[
   receipt({status:"degraded"})]})
 });
 assert.equal(result.plans[0].severityHint,"medium");
 assert.equal(result.plans[0].requiresReview,true);
});
test("unscoped input, forged evidence and duplicate active incidents fail closed",()=>{
 assert.throws(()=>evaluate({projectId:"other"}),/scope/);
 const bad=assessment();
 bad.components[0]={...bad.components[0],evidenceRef:undefined};
 assert.throws(()=>planHealthTriage({projectId:"unity",assessment:bad}),/evidence/);
 assert.throws(()=>evaluate({existingIncidents:[
  {id:"i-1",projectId:"unity",componentId:"api",state:"triaged"},
  {id:"i-2",projectId:"unity",componentId:"api",state:"reproduced"}
 ]}),/Duplicate/);
});
test("triage module has no network access or external mutation",()=>{
 const source=readFileSync(new URL("../lib/self-ops/triage.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(source,/\bfetch\s*\(|execFile|writeFile|child_process|process\.env/);
});
