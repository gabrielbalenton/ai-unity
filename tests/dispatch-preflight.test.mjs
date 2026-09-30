import test from "node:test";
import assert from "node:assert/strict";
import {createQueuedJob,claimJob,cancelJob} from "../lib/runtime/worker-queue.mjs";
import {planLeasedDispatch} from "../lib/runtime/dispatch-preflight.mjs";
const fresh=()=>createQueuedJob({id:"job-A",projectId:"alpha",taskId:"inspect-a",
 capability:"repo:read",idempotencyKey:"inspect-a",createdAt:1000});
const claimed=()=>claimJob(fresh(),{projectId:"alpha",workerId:"worker-1",revision:0,now:2000});
const grant={id:"github",projectId:"alpha",status:"authorized",actions:["read"],resources:["org/repo"]};
const request={projectId:"alpha",connectorId:"github",resourceId:"org/repo",action:"read"};
const policy={projectId:"alpha",emergencyStop:false,maxPaidUsd:0,spentPaidUsd:0,approvedOperations:[]};
const plan=overrides=>planLeasedDispatch({job:claimed(),projectId:"alpha",workerId:"worker-1",
 revision:1,now:3000,request,policy,connections:[grant],...overrides});
test("authorized leased read returns only an inert plan",()=>{
 const next=plan();
 assert.equal(next.allowed,true);assert.equal(next.executionEnabled,false);
 assert.equal("token" in next,false);
});
test("wrong project or unapproved repo cannot reach dispatch",()=>{
 assert.equal(plan({projectId:"beta"}).allowed,false);
 assert.equal(plan({request:{...request,resourceId:"other/private"}}).allowed,false);
 assert.equal(plan({connections:[{...grant,status:"revoked"}]}).allowed,false);
});
test("expired or stale leases cannot dispatch even with a valid connector",()=>{
 assert.equal(plan({now:62_000}).allowed,false);
 assert.equal(plan({revision:0}).allowed,false);
 assert.equal(plan({workerId:"worker-2"}).allowed,false);
});
test("emergency stop blocks dispatch after a worker obtained its lease",()=>{
 assert.equal(plan({emergencyStop:true}).allowed,false);
 assert.equal(plan({policy:{...policy,emergencyStop:true}}).allowed,false);
});
test("zero-budget inference needs both a known zero cost and verified free eligibility",()=>{
 const inference={...request,type:"model_inference",estimatedPaidUsd:0,freeEligibilityVerified:false};
 assert.equal(plan({request:inference}).allowed,false);
 assert.equal(plan({request:{...inference,freeEligibilityVerified:true}}).allowed,true);
 assert.equal(plan({request:{...inference,estimatedPaidUsd:0.02,freeEligibilityVerified:true}}).allowed,false);
});
test("external writes require exact approved action scope, not just a connector grant",()=>{
 const write={...request,action:"write",approvalId:"approval-1"};
 const approved={
  id:"approval-1",projectId:"alpha",connectorId:"github",
  resourceId:"org/repo",action:"write",status:"approved"
 };
 const expanded=[{...grant,actions:["read","write"]}];
 assert.equal(plan({request:write,connections:expanded}).allowed,false);
 assert.equal(plan({request:write,connections:expanded,
  policy:{...policy,approvedOperations:[approved]}}).allowed,true);
 assert.equal(plan({request:{...write,resourceId:"different/repo"},
  connections:[{...expanded[0],resources:["org/repo","different/repo"]}],
  policy:{...policy,approvedOperations:[approved]}}).allowed,false);
});
