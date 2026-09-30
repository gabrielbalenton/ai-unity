import test from "node:test";
import assert from "node:assert/strict";
import {listInstallationRepositories} from "../lib/github/repositories.mjs";
test("only explicitly permitted repository IDs are returned",async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({repositories:[
  {id:1,full_name:"owner/allowed",private:true,default_branch:"main"},
  {id:2,full_name:"owner/unapproved",private:true,default_branch:"main"}]})});
 const records=await listInstallationRepositories({token:"test-token-123456789",allowedRepoIds:[1],fetcher});
 assert.deepEqual(records,[{id:1,fullName:"owner/allowed",private:true,defaultBranch:"main"}]);
});
test("missing repository scope fails without network",async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error("Unexpected")};
 await assert.rejects(listInstallationRepositories({token:"test-token-123456789",allowedRepoIds:[],fetcher}),/Invalid repository/);
 assert.equal(calls,0);
});
test("unexpected GitHub errors never expose token or upstream text",async()=>{
 const fetcher=async()=>({ok:false,status:403,text:async()=>"Sensitive diagnostics"});
 await assert.rejects(listInstallationRepositories({token:"test-token-123456789",allowedRepoIds:[1],fetcher}),/metadata request failed/);
});
test("reject malformed repository names even when ID is permitted",async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({repositories:[{id:1,full_name:"malformed /bad",private:true}]})});
 assert.deepEqual(await listInstallationRepositories({token:"test-token-123456789",allowedRepoIds:[1],fetcher}),[]);
});
