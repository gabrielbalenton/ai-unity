import test from "node:test";
import assert from "node:assert/strict";
import {inspectConfiguration,assertNoClientSecretExposure} from "../lib/infrastructure/config.mjs";
import {createAuditEvent,sanitizeDiagnostic} from "../lib/infrastructure/audit.mjs";
import {describeAdapter,planAdapterAction,makeInertAdapter} from "../lib/infrastructure/adapter.mjs";
import {defineMission} from "../lib/infrastructure/mission.mjs";

test("missing configuration cannot enable external execution",()=>{
 const c=inspectConfiguration({});
 assert.equal(c.externalExecutionEnabled,false);
 assert.equal(c.deploymentReady,false);
});
test("even complete-looking environment configuration cannot bypass feature gate",()=>{
 const c=inspectConfiguration({NODE_ENV:"production",NEXT_PUBLIC_SUPABASE_URL:"https://abc.supabase.co",
 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"public-test",GITHUB_APP_ID:"123",
 GITHUB_APP_PRIVATE_KEY:"placeholder",GITHUB_WEBHOOK_SECRET:"placeholder",
 OPENROUTER_API_KEY:"placeholder",UNITY_WORKER_SIGNING_SECRET:"placeholder",
 UNITY_ENABLE_EXTERNAL_EXECUTION:"true"});
 assert.equal(c.backendAuthConfigurationPresent,true);
 assert.equal(c.externalExecutionRequested,true);
 assert.equal(c.externalExecutionEnabled,false);
 assert.equal(c.deploymentReady,false);
});
test("reject dangerous public credential names",()=>{
 assert.throws(()=>assertNoClientSecretExposure({NEXT_PUBLIC_GITHUB_SECRET:"oops"}),/sensitive/);
 assert.equal(assertNoClientSecretExposure({NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"public"}),true);
});
test("auditing stores only allowlisted non-secret metadata",()=>{
 const e=createAuditEvent({eventId:"event-1",projectId:"project-1",actorId:"user-1",actionName:"read",
 resourceType:"repo",resourceId:"repo-1",outcome:"allowed",evidenceIds:[],occurredAt:"2026-09-30T01:00:00Z",
 apiKey:"secret",prompt:"private user text"});
 assert.equal("apiKey" in e,false);assert.equal("prompt" in e,false);
 assert.equal(e.outcome,"allowed");
 assert.equal(JSON.stringify(sanitizeDiagnostic(new Error("sk-secret"))).includes("sk-secret"),false);
});
test("registered connectors are inert until independently enabled",async()=>{
 const inert=makeInertAdapter({id:"demo:adapter",kind:"github",capabilities:["repo:read"]});
 assert.equal(inert.descriptor.canExecute,false);
 await assert.rejects(inert.execute(),/No external adapter/);
 const planned=planAdapterAction({request:{projectId:"p1"},policy:{projectId:"p1"},connections:[],adapter:inert.descriptor});
 assert.equal(planned.allowed,false);
 assert.equal(describeAdapter({id:"demo:adapter",kind:"github",capabilities:["repo:read"]}).status,"unconfigured");
});
test("mission blueprints reject cycles and cannot execute",()=>{
 const mission=defineMission({id:"m1",projectId:"p1",title:"Inspect project",steps:[
  {id:"read-repo",capability:"repo:read",dependsOn:[]},
  {id:"review",capability:"analysis",dependsOn:["read-repo"],requiresApproval:true}
 ]});
 assert.equal(mission.executionEnabled,false);
 assert.equal(mission.steps[1].requiresApproval,true);
 assert.throws(()=>defineMission({id:"m",projectId:"p",title:"Bad mission",
  steps:[{id:"second",capability:"review",dependsOn:["later"]},{id:"later",capability:"read",dependsOn:[]}]}),/dependency/);
});
