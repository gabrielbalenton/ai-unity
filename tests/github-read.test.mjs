import test from "node:test";
import assert from "node:assert/strict";
import {readGitHubRepository,readGitHubFile} from "../lib/connectors/github-read.mjs";
const token="fake-server-token-12345";
const policy={projectId:"p",emergencyStop:false,maxPaidUsd:0,spentPaidUsd:0,approvedOperations:[]};
const connections=[{id:"gh",projectId:"p",status:"authorized",actions:["read"],resources:["owner/repo"]}];
const args={projectId:"p",connectorId:"gh",repo:"owner/repo",policy,connections,token};
function fake(data,status=200){
 const calls=[];
 return {calls,transport:async(url,init)=>{
  calls.push({url,init});
  return {status,ok:status>=200&&status<300,text:async()=>JSON.stringify(data)};
 }};
}
test("authorized repo metadata uses only official GitHub HTTPS host",async()=>{
 const f=fake({full_name:"owner/repo",default_branch:"main",private:true,html_url:"https://github.com/owner/repo"});
 const r=await readGitHubRepository({...args,transport:f.transport});
 assert.equal(r.private,true);
 assert.equal(f.calls[0].url,"https://api.github.com/repos/owner/repo");
 assert.equal(f.calls[0].init.method,"GET");
 assert.equal(f.calls[0].init.headers.Authorization,"Bearer "+token);
 assert.equal(JSON.stringify(r).includes(token),false);
});
test("another project's grant is rejected without network activity",async()=>{
 const f=fake({});
 await assert.rejects(readGitHubRepository({...args,projectId:"other",transport:f.transport}),/denied/);
 assert.equal(f.calls.length,0);
});
test("ungranted repo and missing tokens fail before the fetch",async()=>{
 const f=fake({});
 await assert.rejects(readGitHubRepository({...args,repo:"owner/other",transport:f.transport}),/denied/);
 await assert.rejects(readGitHubRepository({...args,token:"",transport:f.transport}),/token required/);
 assert.equal(f.calls.length,0);
});
test("validated branch and file paths are encoded and bounded",async()=>{
 const f=fake({type:"file",sha:"abc",content:"SGVsbG8=",encoding:"base64",size:5});
 const r=await readGitHubFile({...args,path:"src/app.ts",ref:"feature/test",transport:f.transport});
 assert.equal(r.sha,"abc");
 assert.equal(f.calls[0].url,"https://api.github.com/repos/owner/repo/contents/src/app.ts?ref=feature%2Ftest");
});
test("rejects unsafe relative traversal before calling GitHub",async()=>{
 const f=fake({});
 await assert.rejects(readGitHubFile({...args,path:"../secrets",ref:"main",transport:f.transport}),/Invalid/);
 await assert.rejects(readGitHubFile({...args,path:"a.txt",ref:"../head",transport:f.transport}),/validated/);
 assert.equal(f.calls.length,0);
});
test("file adapter refuses directories or oversized files",async()=>{
 await assert.rejects(readGitHubFile({...args,path:"src/app.ts",ref:"main",transport:fake([{type:"file"}]).transport}),/supported file/);
 await assert.rejects(readGitHubFile({...args,path:"src/app.ts",ref:"main",transport:fake({type:"file",sha:"x",content:"abcd",encoding:"base64",size:999999}).transport}),/safe read/);
});
test("provider errors never return token or raw private response bodies",async()=>{
 const f=fake({message:"secret from private repository"},403);
 await assert.rejects(readGitHubRepository({...args,transport:f.transport}),e=>{
  assert.equal(e.message.includes(token),false);
  assert.equal(e.message.includes("secret from private"),false);
  return true;
 });
});
test("repository identity spoofing fails",async()=>{
 await assert.rejects(readGitHubRepository({...args,transport:fake({full_name:"other/private"}).transport}),/identity mismatch/);
});
