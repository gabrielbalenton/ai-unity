import test from "node:test";
import assert from "node:assert/strict";
import {evaluateExecution} from "../lib/runtime/policy.mjs";
import {validateConnectorManifest,summarizeRegistry} from "../lib/runtime/registry.mjs";
import {buildTaskContext} from "../lib/runtime/context.mjs";
const policy = {projectId:"project-a",emergencyStop:false,maxPaidUsd:0,spentPaidUsd:0,approvedOperations:[]};
const connection = {id:"github-1",projectId:"project-a",status:"authorized",actions:["read","write"],resources:["owner/repo"]};
const request = {projectId:"project-a",connectorId:"github-1",action:"read",resourceId:"owner/repo"};
test("read-only authorized project and resource can pass preflight",()=>{
 assert.equal(evaluateExecution(request,policy,[connection]).allowed,true);
});
test("another project's connector cannot pass",()=>{
 assert.equal(evaluateExecution({...request,projectId:"project-b"},policy,[connection]).allowed,false);
 assert.equal(evaluateExecution(request,{...policy,projectId:"project-b"},[connection]).allowed,false);
});
test("an ungranted repository is blocked",()=>{
 assert.equal(evaluateExecution({...request,resourceId:"other/private"},policy,[connection]).allowed,false);
});
test("revoked connection and emergency stop both fail closed",()=>{
 assert.equal(evaluateExecution(request,policy,[{...connection,status:"revoked"}]).allowed,false);
 assert.equal(evaluateExecution(request,{...policy,emergencyStop:true},[connection]).allowed,false);
});
test("writes require an operation-specific human approval",()=>{
 const write={...request,action:"write",approvalId:"a1"};
 assert.equal(evaluateExecution(write,policy,[connection]).allowed,false);
 const granted={id:"a1",projectId:"project-a",connectorId:"github-1",resourceId:"owner/repo",action:"write",status:"approved"};
 assert.equal(evaluateExecution(write,{...policy,approvedOperations:[granted]},[connection]).allowed,true);
 assert.equal(evaluateExecution({...write,resourceId:"owner/other"},{...policy,approvedOperations:[granted]},[{...connection,resources:["owner/repo","owner/other"]}]).allowed,false);
 assert.equal(evaluateExecution({...write,action:"deploy"},{...policy,approvedOperations:[granted]},[{...connection,actions:["read","write","deploy"]}]).allowed,false);
});
test("the default zero-dollar rule blocks paid, unknown and unverified free inference",()=>{
 const model={...request,type:"model_inference"};
 assert.equal(evaluateExecution({...model,estimatedPaidUsd:0.01,freeEligibilityVerified:true},policy,[connection]).allowed,false);
 assert.equal(evaluateExecution({...model,freeEligibilityVerified:true},policy,[connection]).allowed,false);
 assert.equal(evaluateExecution({...model,estimatedPaidUsd:0},policy,[connection]).allowed,false);
 assert.equal(evaluateExecution({...model,estimatedPaidUsd:0,freeEligibilityVerified:true},policy,[connection]).allowed,true);
});
test("missing spending history cannot pass preflight",()=>{
 assert.equal(evaluateExecution({...request,estimatedPaidUsd:0}, {...policy,spentPaidUsd:undefined},[connection]).allowed,false);
});
test("catalog manifests are always inert and deduplicated",()=>{
 const raw={id:"example:code",kind:"mcp",displayName:"Code tool",capabilities:["repo:read","repo:read"]};
 const result=validateConnectorManifest(raw);
 assert.equal(result.authorized,false); assert.equal(result.executable,false);
 assert.equal(result.capabilities.length,1);
 assert.equal(summarizeRegistry([raw,raw]).length,1);
});
test("invalid manifests cannot masquerade as authorized connectors",()=>{
 assert.throws(()=>validateConnectorManifest({id:"a",kind:"mcp",displayName:"X",capabilities:[],authorized:true}));
});
test("only approved in-scope memories enter the context",()=>{
 const ctx=buildTaskContext({projectId:"project-a",taskId:"t1",
  memories:[{id:"m1",projectId:"project-a",status:"approved",title:"Rule",body:"Follow source",sourceId:"s1"},
   {id:"m2",projectId:"project-b",status:"approved",title:"Secret",body:"Never disclose"},
   {id:"m3",projectId:"project-a",status:"draft",title:"Draft",body:"Not approved"}],
  sourceRecords:[{id:"s1",projectId:"project-a",verified:true,reference:"commit:123"}]});
 assert.equal(ctx.memories.length,1);assert.equal(ctx.memories[0].evidence.type,"verified_source");
 assert.equal(JSON.stringify(ctx).includes("Never disclose"),false);
});
test("approved but unsourced notes are never labeled verified evidence",()=>{
 const ctx=buildTaskContext({projectId:"p",taskId:"t",
  memories:[{id:"m",projectId:"p",status:"approved",title:"Note",body:"Human preference"}],sourceRecords:[]});
 assert.equal(ctx.memories[0].evidence.type,"user_approved_note");
});
