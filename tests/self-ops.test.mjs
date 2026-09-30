import test from "node:test";
import assert from "node:assert/strict";
import {observeIncident,transitionIncident,findSimilarIncidents,planSelfRepair}
 from "../lib/self-ops/incidents.mjs";
const input=(x={})=>({id:"i-1",projectId:"unity",componentId:"github-webhook",
 summary:"Webhook parser fails on missing field",
 symptoms:["missing-field","parser-error"],detectedAt:"2026-09-30T03:00:00.000Z",
 evidenceRefs:["log:redacted"],...x});
const observed=()=>observeIncident(input());
test("creates a bounded, sanitized observation, never live self-repair",()=>{
 const r=observed();
 assert.equal(r.state,"observed");
 assert.equal(r.revision,0);
 assert.deepEqual(r.history.map(x=>x.event),["observed"]);
 assert.throws(()=>observeIncident(input({summary:"Leak ghp_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH"})),/Invalid/);
 assert.throws(()=>observeIncident(input({summary:"postgres://db:password@host"})),/Invalid/);
});
test("incident moves through evidence-backed reproducible lifecycle",()=>{
 let r=observed();
 r=transitionIncident(r,{expectedRevision:0,next:"triaged",at:"2026-09-30T03:10:00.000Z"});
 r=transitionIncident(r,{expectedRevision:1,next:"reproduced",at:"2026-09-30T03:20:00.000Z",evidenceRef:"test:repro"});
 r=transitionIncident(r,{expectedRevision:2,next:"repair_proposed",at:"2026-09-30T03:30:00.000Z",
 proposedFix:{kind:"isolated_code_change",summary:"Add missing-field guard and regression"}});
 assert.equal(r.state,"repair_proposed");
 assert.equal(planSelfRepair(r,{projectId:"unity",allowAutomaticChanges:true}).allowed,false);
 r=transitionIncident(r,{expectedRevision:3,next:"verified_in_isolation",at:"2026-09-30T03:50:00.000Z",
 evidenceRef:"ci:verify",verification:{passed:true,executorId:"worker-a",verifierId:"worker-b"}});
 assert.equal(r.verification.verifierId,"worker-b");
 r=transitionIncident(r,{expectedRevision:4,next:"approval_pending",at:"2026-09-30T04:00:00.000Z"});
 assert.equal(r.state,"approval_pending");
});
test("stale updates, skipping reproduction and self-verification are rejected",()=>{
 assert.throws(()=>transitionIncident(observed(),{expectedRevision:5,next:"triaged",at:"2026-09-30T03:10:00.000Z"}),/Stale/);
 assert.throws(()=>transitionIncident(observed(),{expectedRevision:0,next:"repair_proposed",at:"2026-09-30T03:10:00.000Z"}),/transition/);
 let r=transitionIncident(observed(),{expectedRevision:0,next:"triaged",at:"2026-09-30T03:10:00.000Z"});
 assert.throws(()=>transitionIncident(r,{expectedRevision:1,next:"reproduced",at:"2026-09-30T03:20:00.000Z"}),/evidence/);
 r=transitionIncident(r,{expectedRevision:1,next:"reproduced",at:"2026-09-30T03:20:00.000Z",evidenceRef:"repro:1"});
 r=transitionIncident(r,{expectedRevision:2,next:"repair_proposed",at:"2026-09-30T03:22:00.000Z",
 proposedFix:{kind:"test_only",summary:"Add regression"}});
 assert.throws(()=>transitionIncident(r,{expectedRevision:3,next:"verified_in_isolation",
 at:"2026-09-30T03:25:00.000Z",evidenceRef:"ci:1",
 verification:{passed:true,executorId:"worker-a",verifierId:"worker-a"}}),/Independent/);
});
test("similar past incidents are investigative hints, never permission to apply a fix",()=>{
 const current=observed();
 const match=observeIncident(input({id:"i-2"}));
 const wrongProject=observeIncident(input({id:"i-3",projectId:"client-private"}));
 const wrongComponent=observeIncident(input({id:"i-4",componentId:"mail"}));
 const results=findSimilarIncidents(current,[wrongProject,wrongComponent,match]);
 assert.deepEqual(results.map(x=>x.incidentId),["i-2"]);
 assert.equal(results[0].score,1);
 assert.equal(planSelfRepair(current,{projectId:"unity",allowAutomaticChanges:true}).allowed,false);
});
test("cross-project and emergency-stop policy always fail closed",()=>{
 const r=observed();
 assert.match(planSelfRepair(r,{projectId:"other"}).reason,/Project mismatch/);
 assert.match(planSelfRepair(r,{projectId:"unity",emergencyStop:true}).reason,/Emergency stop/);
});
test("self-operations implementation has no network or repository mutation",async()=>{
 const {readFileSync}=await import("node:fs");
 const src=readFileSync(new URL("../lib/self-ops/incidents.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(src,/\bfetch\(|execFile|writeFile|import\(.+https?:/);
});
