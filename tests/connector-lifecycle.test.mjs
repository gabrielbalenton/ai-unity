import test from "node:test";
import assert from "node:assert/strict";
import {
 createConnectorDraft,prepareConnector,requestAuthorization,recordAuthorization,
 recordVerification,activateConnector,suspendConnector,revokeConnector,
 canDispatchConnector
} from "../lib/infrastructure/connector-lifecycle.mjs";
const ctx=(revision,at="2026-09-30T09:00:00Z",more={})=>
 ({ownerId:"owner1",projectId:"project1",actorId:"owner1",revision,at,...more});
const draft=()=>createConnectorDraft({id:"conn1",ownerId:"owner1",projectId:"project1",
 provider:"calendar",createdAt:"2026-09-30T08:00:00Z"});
const prepared=()=>prepareConnector(draft(),ctx(0),{
 resourceIds:["calendar:primary","calendar:shared"],allowedActions:["read","propose"]});
const authorized=()=>{
 const pending=requestAuthorization(prepared(),ctx(1));
 return recordAuthorization(pending,ctx(2),{
  grantReference:"vault:grant123",approvedResourceIds:["calendar:primary"],
  approvedActions:["read"]});
};
const verified=()=>recordVerification(authorized(),ctx(3,"2026-09-30T09:15:00Z"),
 {verifierId:"worker2",evidenceReference:"audit:test43",passed:true});
test("discovery is inert; owner authorizes scope and independent worker verifies",()=>{
 const d=draft();
 assert.equal(d.status,"discovered");
 assert.equal(canDispatchConnector(d,{ownerId:"owner1",projectId:"project1",resourceId:"calendar:primary",action:"read"}),false);
 const a=authorized();
 assert.equal(a.status,"authorized");
 assert.equal(canDispatchConnector(a,{ownerId:"owner1",projectId:"project1",resourceId:"calendar:primary",action:"read"}),false);
 const v=verified();
 assert.equal(v.status,"verified");
 assert.equal(canDispatchConnector(v,{ownerId:"owner1",projectId:"project1",resourceId:"calendar:primary",action:"read"}),false);
 const active=activateConnector(v,ctx(4,"2026-09-30T09:20:00Z"),{ownerApproved:true});
 assert.equal(active.status,"active");
 assert.equal(canDispatchConnector(active,{ownerId:"owner1",projectId:"project1",resourceId:"calendar:primary",action:"read"}),true);
 assert.equal(active.history.length,5);
 assert.equal(active.grantReference,"vault:grant123");
 assert.equal(JSON.stringify(active).includes("access_token"),false);
});
test("owner, project, resource and action isolation remains enforced at every stage",()=>{
 assert.throws(()=>prepareConnector(draft(),ctx(0,undefined,{projectId:"other"}),{
  resourceIds:["calendar:primary"],allowedActions:["read"]}),/scope mismatch/);
 const a=activateConnector(verified(),ctx(4,"2026-09-30T09:20:00Z"),{ownerApproved:true});
 const request={ownerId:"owner1",projectId:"project1",resourceId:"calendar:primary",action:"read"};
 assert.equal(canDispatchConnector(a,{...request,projectId:"other"}),false);
 assert.equal(canDispatchConnector(a,{...request,ownerId:"other"}),false);
 assert.equal(canDispatchConnector(a,{...request,resourceId:"calendar:shared"}),false);
 assert.equal(canDispatchConnector(a,{...request,action:"send"}),false);
 assert.equal(canDispatchConnector(a,{...request,emergencyStop:true}),false);
});
test("authorization can only narrow explicitly requested capabilities",()=>{
 const pending=requestAuthorization(prepared(),ctx(1));
 assert.throws(()=>recordAuthorization(pending,ctx(2),{
  grantReference:"vault:grant123",approvedResourceIds:["other"],approvedActions:["read"]}),/resources/);
 assert.throws(()=>recordAuthorization(pending,ctx(2),{
  grantReference:"vault:grant123",approvedResourceIds:["calendar:primary"],approvedActions:["deploy"]}),/capabilities/);
 assert.throws(()=>recordAuthorization(pending,ctx(2),{
  grantReference:"rawBearerToken",approvedResourceIds:["calendar:primary"],approvedActions:["read"]}),/vault reference/);
});
test("independent verification and explicit owner approval required",()=>{
 assert.throws(()=>recordVerification(authorized(),ctx(3),{
  verifierId:"owner1",evidenceReference:"audit:test43",passed:true}),/Independent/);
 const v=verified();
 assert.throws(()=>activateConnector(v,ctx(4),{ownerApproved:false}),/owner-approved/);
});
test("stale revisions and out-of-order transitions fail closed",()=>{
 assert.throws(()=>requestAuthorization(prepared(),ctx(0)),/Stale/);
 assert.throws(()=>activateConnector(authorized(),ctx(3),{ownerApproved:true}),/verified/);
 assert.throws(()=>prepareConnector(draft(),ctx(0,"2026-09-30T07:00:00Z"),{
  resourceIds:["a"],allowedActions:["read"]}),/Out-of-order/);
});
test("failed verification and suspension cannot silently reactivate",()=>{
 const failed=recordVerification(authorized(),ctx(3),{
  verifierId:"worker2",evidenceReference:"audit:failed",passed:false});
 assert.equal(failed.status,"suspended");
 assert.throws(()=>activateConnector(failed,ctx(4),{ownerApproved:true}),/verified/);
 const active=activateConnector(verified(),ctx(4,"2026-09-30T09:20:00Z"),{ownerApproved:true});
 const stopped=suspendConnector(active,ctx(5,"2026-09-30T09:30:00Z"));
 assert.equal(canDispatchConnector(stopped,{ownerId:"owner1",projectId:"project1",resourceId:"calendar:primary",action:"read"}),false);
});
test("revocation is terminal, clears credential references and is auditable",()=>{
 const active=activateConnector(verified(),ctx(4,"2026-09-30T09:20:00Z"),{ownerApproved:true});
 const revoked=revokeConnector(active,ctx(5,"2026-09-30T09:30:00Z"));
 assert.equal(revoked.grantReference,null);
 assert.deepEqual(revoked.resourceIds,[]);
 assert.deepEqual(revoked.allowedActions,[]);
 assert.equal(revoked.history.at(-1).kind,"revoked");
 assert.throws(()=>prepareConnector(revoked,ctx(6,"2026-09-30T09:31:00Z"),{resourceIds:["calendar:primary"],allowedActions:["read"]}),/discoverable/);
});
