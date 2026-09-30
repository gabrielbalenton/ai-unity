import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildKnowledgeGraph} from "../lib/knowledge/graph.mjs";
const workspace={
 version:1,
 projects:[{id:"p1",name:"Alpha",description:"",createdAt:"2026-09-30T00:00:00Z"},{id:"p2",name:"Private",description:"",createdAt:"2026-09-30T00:00:00Z"}],
 memories:[
  {id:"m1",projectId:"p1",title:"Decision",body:"x",status:"approved",createdAt:"2026-09-30T00:00:00Z",updatedAt:"2026-09-30T00:00:00Z"},
  {id:"m2",projectId:"p2",title:"Private memory",body:"x",status:"approved",createdAt:"2026-09-30T00:00:00Z",updatedAt:"2026-09-30T00:00:00Z"}],
 githubLinks:[{id:"g1",projectId:"p1",fullName:"owner/repo",url:"https://github.com/owner/repo",defaultBranch:"main",checkedAt:"2026-09-30T00:00:00Z"}],
 messages:[],automations:[],
 tasks:[{id:"t1",projectId:"p1",title:"Check facts",requiredCapability:"research",state:"draft",revision:0,evidence:[],history:[]}]
};
test("graph derives project relationships without inventing semantic links",()=>{
 const graph=buildKnowledgeGraph(workspace,{projectId:"p1"});
 assert.deepEqual(graph.nodes.map(n=>n.type),["project","knowledge","task","source"]);
 assert.equal(graph.edges.length,3);
 assert.ok(graph.edges.every(e=>e.from==="project:p1"));
 assert.match(graph.notice,/no hidden or AI-inferred relationships/);
});
test("project graph never leaks another project's records",()=>{
 const graph=buildKnowledgeGraph(workspace,{projectId:"p1"});
 assert.equal(JSON.stringify(graph).includes("Private memory"),false);
 assert.equal(JSON.stringify(graph).includes("project:p2"),false);
});
test("graph stays bounded",()=>{
 const many={...workspace,memories:Array.from({length:200},(_,i)=>({...workspace.memories[0],id:"m"+(i+10),title:"Memory "+i}))};
 const graph=buildKnowledgeGraph(many,{projectId:"p1",maxNodes:20});
 assert.ok(graph.nodes.length<=20);
 assert.equal(graph.truncated,true);
});
test("Knowledge keeps the map behind user-controlled disclosure",()=>{
 const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
 assert.match(page,/knowledge-map-disclosure/);
 assert.match(page,/See how this knowledge connects/);
});
