import test from "node:test";
import assert from "node:assert/strict";
import {buildProjectControlPlane,permissionModeToControlMode} from "../lib/infrastructure/project-connections.mjs";

test("permission grants map to the intended control ceilings",()=>{
 assert.equal(permissionModeToControlMode("read"),"audit");
 assert.equal(permissionModeToControlMode("propose"),"development");
 assert.equal(permissionModeToControlMode("write"),"development");
 assert.equal(permissionModeToControlMode("deploy"),"production");
 assert.equal(permissionModeToControlMode("send"),"production");
});

test("control plane keeps exact providers separate and uses the most restrictive bound mode",()=>{
 const summary=buildProjectControlPlane({projectId:"fpx",projectName:"FPX",connections:[
  {provider:"github",accountLabel:"GitHub A",status:"ready",resourceId:"github:repo:owner/fpx",permissionMode:"write"},
  {provider:"vercel",accountLabel:"Vercel Team",status:"ready",resourceId:"vercel:project:prj_123",permissionMode:"read"},
  {provider:"supabase",accountLabel:"Supabase A",status:"ready",resourceId:"supabase:project:abcdef12",permissionMode:"write"}
 ]});
 assert.equal(summary.providers.github.routingReady,true);
 assert.equal(summary.providers.vercel.resourceId,"vercel:project:prj_123");
 assert.equal(summary.providers.supabase.controlMode,"development");
 assert.equal(summary.effectiveMode,"audit");
 assert.equal(summary.productionRequiresApproval,true);
});

test("authorized account without exact resource is not routing ready",()=>{
 const summary=buildProjectControlPlane({projectId:"p1",projectName:"Project",connections:[
  {provider:"github",accountLabel:"GitHub",status:"ready",resourceId:"github:account",permissionMode:"read"}
 ]});
 assert.equal(summary.providers.github.state,"authorized");
 assert.equal(summary.providers.github.routingReady,false);
 assert.equal(summary.providers.vercel.state,"not_connected");
});
