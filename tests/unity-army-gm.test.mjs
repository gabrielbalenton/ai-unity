import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {classifyArmyStatus,decideNextArmyAction,buildArmyReport} from "../lib/army/gm-policy.mjs";

test("GM-facing statuses map to working paused stopped and finished",()=>{
 assert.equal(classifyArmyStatus({status:"WORKING"}),"WORKING");
 assert.equal(classifyArmyStatus({status:"WAITING"}),"PAUSED");
 assert.equal(classifyArmyStatus({status:"FAILED"}),"STOPPED");
 assert.equal(classifyArmyStatus({status:"DONE"}),"FINISHED");
});

test("protected or owner decisions always pause for Gabriel",()=>{
 const decision=decideNextArmyAction({status:"WORKING",blockedBy:[]},{protectedReason:"deploy"});
 assert.equal(decision.decision,"NEEDS_GABRIEL");
 assert.equal(decision.mayAutoContinue,false);
});

test("GM may continue safe work and bounded recoveries without owner interruption",()=>{
 assert.equal(decideNextArmyAction({status:"WORKING"}).decision,"KEEP_WORKING");
 assert.equal(decideNextArmyAction({status:"FAILED"},{recoverable:true,retryCount:0,maxRetries:2}).decision,"RECOVER");
 assert.equal(decideNextArmyAction({status:"DONE"},{nextApprovedTask:"Next safe task"}).decision,"ASSIGN_NEXT");
});

test("army report separates status groups and owner decisions",()=>{
 const snapshot={agents:[
  {id:"a",name:"A",department:"Backend",status:"WORKING",taskTitle:"Build",blockedBy:[]},
  {id:"b",name:"B",department:"DevOps",status:"PAUSED",taskTitle:"Deploy",blockedBy:[]}
 ]};
 const report=buildArmyReport(snapshot,{b:{protectedReason:"deploy"}});
 assert.equal(report.working.length,1);
 assert.equal(report.paused.length,1);
 assert.equal(report.decisions.length,1);
});

test("interactive office exposes departments, right-click controls and truthful runtime state",()=>{
 const source=fs.readFileSync(new URL("../components/UnityArmyOffice.tsx",import.meta.url),"utf8");
 assert.match(source,/onContextMenu/);
 assert.match(source,/DEPARTMENT/);
 assert.match(source,/Continue working/);
 assert.match(source,/Request Gabriel decision/);
 assert.match(source,/CONTROL RUNTIME NOT CONNECTED/);
 assert.match(source,/60000/);
});
