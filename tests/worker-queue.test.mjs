import test from "node:test";
import assert from "node:assert/strict";
import {
 createQueuedJob,enqueueUnique,claimJob,heartbeatJob,
 submitJobEvidence,verifyJob,failJob,recoverExpiredJob,cancelJob
} from "../lib/runtime/worker-queue.mjs";
const base={id:"job1",projectId:"projectA",taskId:"task1",capability:"repo:read",
 idempotencyKey:"task1-inspect",createdAt:1000,maxAttempts:3};
const fresh=()=>createQueuedJob(base);
const claim=()=>claimJob(fresh(),{projectId:"projectA",workerId:"worker1",revision:0,now:2000});
test("project-scoped idempotency does not create duplicate jobs",()=>{
 const first=enqueueUnique([] ,base);
 const again=enqueueUnique([first.job],base);
 assert.equal(first.created,true);assert.equal(again.created,false);
 assert.throws(()=>enqueueUnique([first.job],{...base,taskId:"different"}),/collision/);
});
test("different projects can safely reuse an idempotency key",()=>{
 const first=fresh();
 const second=enqueueUnique([first],{...base,id:"job2",projectId:"projectB"});
 assert.equal(second.created,true);
});
test("emergency stop rejects new leases and heartbeat renewals",()=>{
 assert.throws(()=>claimJob(fresh(),{projectId:"projectA",workerId:"worker1",revision:0,now:2000,emergencyStop:true}),/Emergency stop/);
 const leased=claim();
 assert.throws(()=>heartbeatJob(leased,{projectId:"projectA",workerId:"worker1",revision:1,now:3000,emergencyStop:true}),/Emergency stop/);
});
test("stale revision, wrong project and wrong worker are rejected",()=>{
 assert.throws(()=>claimJob(fresh(),{projectId:"projectB",workerId:"worker1",revision:0,now:2000}),/scope/);
 const leased=claim();
 assert.throws(()=>submitJobEvidence(leased,{projectId:"projectA",workerId:"other",revision:1,now:3000,evidenceRefs:["check:1"]}),/mismatch/);
 assert.throws(()=>heartbeatJob(leased,{projectId:"projectA",workerId:"worker1",revision:0,now:3000}),/revision/);
});
test("a worker cannot claim completion; only a distinct verified evidence step can",()=>{
 const leased=claim();
 const submitted=submitJobEvidence(leased,{projectId:"projectA",workerId:"worker1",revision:1,now:3000,evidenceRefs:["commit:abc"]});
 assert.equal(submitted.state,"awaiting_verification");
 assert.deepEqual(submitted.evidenceRefs,["commit:abc"]);
 assert.throws(()=>verifyJob(submitted,{projectId:"projectA",verifierId:"worker1",revision:2,now:4000,passed:true,evidenceRefs:["self:asserted"]}),/Independent verifier/);
 const verified=verifyJob(submitted,{projectId:"projectA",verifierId:"verifier1",revision:2,now:4000,passed:true,evidenceRefs:["test:123"]});
 assert.equal(verified.state,"verified");
 assert.equal(verified.verificationResult.verifierId,"verifier1");
 assert.throws(()=>claimJob(verified,{projectId:"projectA",workerId:"worker1",revision:3,now:5000}),/claimable/);
});
test("failed verification is not misreported as success",()=>{
 const submitted=submitJobEvidence(claim(),{projectId:"projectA",workerId:"worker1",revision:1,now:3000,evidenceRefs:["claimed:1"]});
 const rejected=verifyJob(submitted,{projectId:"projectA",verifierId:"verifier1",revision:2,now:4000,passed:false,evidenceRefs:["test:fail"]});
 assert.equal(rejected.state,"dead");
});
test("retryable failures back off, then reach dead letter without infinite loops",()=>{
 let job=failJob(claim(),{projectId:"projectA",workerId:"worker1",revision:1,now:3000,retryable:true});
 assert.equal(job.state,"retry_wait");
 assert.equal(job.runAfter,63000);
 assert.throws(()=>claimJob(job,{projectId:"projectA",workerId:"worker1",revision:2,now:3100}),/claimable/);
 job=claimJob(job,{projectId:"projectA",workerId:"worker1",revision:2,now:63000});
 job=failJob(job,{projectId:"projectA",workerId:"worker1",revision:3,now:64000,retryable:true});
 assert.equal(job.runAfter,184000);
 job=claimJob(job,{projectId:"projectA",workerId:"worker1",revision:4,now:184000});
 job=failJob(job,{projectId:"projectA",workerId:"worker1",revision:5,now:185000,retryable:true});
 assert.equal(job.state,"dead");
});
test("expired leases recover without using the old worker's identity",()=>{
 const job=recoverExpiredJob(claim(),{projectId:"projectA",revision:1,now:62000});
 assert.equal(job.state,"retry_wait");assert.equal(job.workerId,null);
 assert.throws(()=>recoverExpiredJob(claim(),{projectId:"projectA",revision:1,now:61000}),/active/);
});
test("cancelled jobs cannot be restarted by this contract",()=>{
 const cancelled=cancelJob(fresh(),{projectId:"projectA",revision:0,now:2000,actorId:"owner"});
 assert.equal(cancelled.state,"cancelled");
 assert.throws(()=>claimJob(cancelled,{projectId:"projectA",workerId:"worker1",revision:1,now:3000}),/claimable/);
});
test("inert contract contains no live provider or network requests",async()=>{
 const job=claim();
 assert.equal(job.state,"leased");assert.equal("execute" in job,false);
});
