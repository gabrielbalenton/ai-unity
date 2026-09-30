import test from "node:test";
import assert from "node:assert/strict";
import {retryDecision,runOneWorkerCycle} from "../lib/runtime/worker-contract.mjs";
const job={id:"job-123",projectId:"project-1",capability:"repo:read",
 jobType:"read_only",revision:1,attempt:0,maxAttempts:3};
function make(changes={}){
 const events=[];
 const backend={
  claim:async()=>job,
  complete:async record=>{events.push(["completed",record]);return true},
  fail:async record=>{events.push(["failed",record]);return true}
 };
 return {events,args:{
  workerId:"worker-123",capabilities:["repo:read"],backend,
  authorize:async()=>({allowed:true}),
  execute:async()=>({text:"Done"}),
  verify:async()=>({verified:true,evidenceRefs:["commit:abc123"]}),
  ...changes
 }};
}
test("idle queue never executes an agent",async()=>{
 let calls=0;const {args}=make({backend:{
  claim:async()=>null,complete:async()=>{calls++},fail:async()=>{calls++}
 }});
 const result=await runOneWorkerCycle(args);
 assert.equal(result.status,"idle");assert.equal(calls,0);
});
test("valid read-only job completes only with independent evidence",async()=>{
 const {args,events}=make();
 const result=await runOneWorkerCycle(args);
 assert.equal(result.status,"completed");
 assert.equal(events.length,1);assert.equal(events[0][0],"completed");
 assert.deepEqual(events[0][1].evidenceRefs,["commit:abc123"]);
});
test("denied permission produces no tool call and schedules read-only recovery",async()=>{
 let calls=0;
 const {args,events}=make({authorize:async()=>({allowed:false}),
  execute:async()=>{calls++;throw Error("Unexpected")}});
 const result=await runOneWorkerCycle(args);
 assert.equal(result.status,"retry_scheduled");assert.equal(calls,0);
 assert.equal(events[0][0],"failed");
});
test("unverified completion is never recorded as done",async()=>{
 const {args,events}=make({verify:async()=>({verified:false,evidenceRefs:[]})});
 const result=await runOneWorkerCycle(args);
 assert.equal(result.status,"retry_scheduled");
 assert.equal(events[0][0],"failed");
});
test("external operations never automatically replay ambiguous failures",async()=>{
 const {args}=make({backend:{
  claim:async()=>({...job,jobType:"external_operation"}),
  complete:async()=>true,fail:async record=>{
   assert.equal(record.decision.action,"manual_review");return true}
  },execute:async()=>{throw Error("May have dispatched")}});
 assert.equal((await runOneWorkerCycle(args)).status,"manual_review");
});
test("bounded retry exhaustion and argument validation",()=>{
 assert.equal(retryDecision({jobType:"read_only",attempt:3,maxAttempts:3}).action,"dead_letter");
 assert.equal(retryDecision({jobType:"read_only",attempt:1,maxAttempts:3}).delaySeconds,30);
 assert.throws(()=>retryDecision({jobType:"read_only",attempt:12,maxAttempts:99}),/Invalid/);
});
