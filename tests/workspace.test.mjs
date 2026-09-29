import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkspace, parseWorkspaceImport } from "../lib/workspace-validation.mjs";
const base = () => ({
 version:1,
 projects:[{id:"p1",name:"Alpha",description:"Project",createdAt:"2026-09-29T10:00:00Z"}],
 memories:[{id:"m1",projectId:"p1",title:"Decision",body:"Human-approved requirement",status:"approved",createdAt:"2026-09-29T10:00:00Z",updatedAt:"2026-09-29T10:00:00Z"}],
 githubLinks:[{id:"g1",projectId:"p1",fullName:"owner/repo",url:"https://github.com/owner/repo",defaultBranch:"main",checkedAt:"2026-09-29T10:00:00Z"}]
});
test("normal local backup remains valid",()=>assert.equal(validateWorkspace(base()).memories[0].status,"approved"));
test("imported approvals require new manual approval",()=>assert.equal(parseWorkspaceImport(JSON.stringify(base())).memories[0].status,"draft"));
test("invalid JSON rejected without mutating any existing workspace",()=>assert.throws(()=>parseWorkspaceImport("{invalid"),/invalid JSON/));
test("unknown versions rejected",()=>{const b=base();b.version=2;assert.throws(()=>validateWorkspace(b),/v1/);});
test("cross-project references cannot be imported",()=>{const b=base();b.memories[0].projectId="another";assert.throws(()=>validateWorkspace(b),/cross-project/);});
test("duplicate project IDs rejected",()=>{const b=base();b.projects.push({...b.projects[0]});assert.throws(()=>validateWorkspace(b),/duplicated/);});
test("malicious GitHub links rejected",()=>{const b=base();b.githubLinks[0].url="https://fake.github.com/owner/repo";assert.throws(()=>validateWorkspace(b),/Invalid GitHub/);});
test("extra fields are removed from imported records",()=>{const b=base();b.projects[0].secret="do-not-keep";assert.equal("secret" in validateWorkspace(b).projects[0],false);});
test("large imports rejected",()=>assert.throws(()=>parseWorkspaceImport(" ".repeat(2_000_001)),/smaller than/));
test("GitHub link cannot reference absent project",()=>{const b=base();b.githubLinks[0].projectId="p2";assert.throws(()=>validateWorkspace(b),/cross-project/);});

test("legacy v1 backups load with empty conversations",()=>{
 const parsed=validateWorkspace(base());
 assert.deepEqual(parsed.messages,[]);
});
test("local messages survive validation without claiming to be AI output",()=>{
 const b=base(); b.messages=[{id:"chat1",projectId:"p1",text:"Status?",role:"user",createdAt:"2026-09-29T10:00:00Z"}];
 const parsed=validateWorkspace(b);
 assert.equal(parsed.messages[0].text,"Status?");
 assert.equal(parsed.messages[0].role,"user");
});
test("import cannot inject AI messages or another project's chat",()=>{
 const b=base(); b.messages=[{id:"chat1",projectId:"different",text:"Injected",role:"assistant",createdAt:"2026-09-29T10:00:00Z"}];
 assert.throws(()=>validateWorkspace(b),/conversation/);
});
