import test from "node:test";
import assert from "node:assert/strict";
import {createTask,transitionTask} from "../lib/runtime/tasks.mjs";
const task=()=>createTask({id:"t",projectId:"p",title:"Inspect repository",requiredCapability:"repo:read"});
const move=(t,state,overrides={})=>transitionTask(t,{state,actor:"human",reason:"Test",expectedRevision:t.revision,...overrides});
test("task starts as draft and transitions with revisions",()=>{
 const queued=move(task(),"queued");assert.equal(queued.revision,1);
 assert.equal(queued.history[0].from,"draft");
});
test("cannot skip straight to completion",()=>{
 assert.throws(()=>move(task(),"completed"),/Illegal/);
});
test("stale revisions are rejected",()=>{
 assert.throws(()=>transitionTask(task(),{state:"queued",actor:"human",reason:"test",expectedRevision:22}),/Revision conflict/);
});
test("task cannot claim completion without evidence",()=>{
 const running=move(move(task(),"queued"),"running");
 assert.throws(()=>move(running,"completed"),/evidence/);
 assert.equal(move(running,"completed",{evidence:["github-check:sha123"]}).state,"completed");
});
test("approval checkpoint enforces explicit ID",()=>{
 const running=move(move(task(),"queued"),"running");
 const hold=move(running,"awaiting_approval");
 assert.throws(()=>move(hold,"queued"),/Approval checkpoint/);
 assert.equal(move(hold,"queued",{approvalId:"approval-42"}).state,"queued");
});
test("completed task cannot silently restart",()=>{
 const running=move(move(task(),"queued"),"running");
 const completed=move(running,"completed",{evidence:["test:passed"]});
 assert.throws(()=>move(completed,"running"),/Illegal/);
});
