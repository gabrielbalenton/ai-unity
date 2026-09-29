import test from "node:test";
import assert from "node:assert/strict";
import {addUserMessage,previewProjectContext} from "../lib/chat.mjs";
const start=()=>({version:1,projects:[{id:"a",name:"Alpha"},{id:"b",name:"Beta"}],memories:[
 {id:"ok",projectId:"a",status:"approved",title:"Approved",body:"Approved note"},
 {id:"draft",projectId:"a",status:"draft",title:"Draft",body:"No"},
 {id:"other",projectId:"b",status:"approved",title:"Private",body:"Other project secret"}
],messages:[]});
const input={id:"m1",projectId:"a",text:"Review my project",createdAt:"2026-09-29T10:00:00Z"};
test("conversation is project scoped",()=>{
 const workspace=addUserMessage(start(),input);
 assert.equal(workspace.messages[0].projectId,"a");assert.equal(workspace.messages[0].role,"user");
 assert.equal(start().messages.length,0);
});
test("nonexistent project cannot receive messages",()=>{
 assert.throws(()=>addUserMessage(start(),{...input,projectId:"c"}),/Project does not exist/);
});
test("messages have bounded size and unique IDs",()=>{
 const current=addUserMessage(start(),input);
 assert.throws(()=>addUserMessage(current,input),/duplicate/);
 assert.throws(()=>addUserMessage(start(),{...input,text:"x".repeat(8001)}),/8000/);
});
test("local context preview uses approved in-project notes only",()=>{
 const c=previewProjectContext(start(),"a");
 assert.deepEqual(c.memories.map(x=>x.id),["ok"]);
 assert.equal(JSON.stringify(c).includes("Other project secret"),false);
 assert.match(c.notice,/not been sent/);
});
