import test from "node:test";
import assert from "node:assert/strict";
import {validateWorkspace,parseWorkspaceImport} from "../lib/workspace-validation.mjs";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const base=()=>({
 version:1,
 projects:[{id:"p1",name:"Alpha",description:"Project",createdAt:"2026-09-30T00:00:00Z"}],
 memories:[],githubLinks:[],messages:[],tasks:[],
 automations:[{id:"a1",projectId:"p1",title:"Morning briefing",trigger:"schedule",
  action:"Prepare yesterday summary",status:"draft",createdAt:"2026-09-30T00:00:00Z",updatedAt:"2026-09-30T00:00:00Z"}]
});
test("automation drafts validate and remain non-executable",()=>{
 const safe=validateWorkspace(base());
 assert.equal(safe.automations[0].status,"draft");
 assert.equal("enabled" in safe.automations[0],false);
 assert.equal("secret" in safe.automations[0],false);
});
test("automation cannot escape its project or import executable state",()=>{
 const cross=base();cross.automations[0].projectId="other";
 assert.throws(()=>validateWorkspace(cross),/cross-project/);
 const active=base();active.automations[0].status="running";
 assert.throws(()=>parseWorkspaceImport(JSON.stringify(active)),/automation/);
});
test("automation UI explicitly says drafts do not execute",()=>{
 const ui=read("components/AutomationRoom.tsx");
 assert.match(ui,/do not run anything yet/);
 assert.match(ui,/Execution is not connected/);
 assert.doesNotMatch(ui,/fetch\(|WebSocket|EventSource/);
});
test("Automations has its own navigation room",()=>{
 const page=read("app/page.tsx");
 const nav=read("lib/navigation.ts");
 assert.match(page,/label:"Automations"/);
 assert.match(page,/tab==="Automations"/);
 assert.match(nav,/"Automations"/);
});
