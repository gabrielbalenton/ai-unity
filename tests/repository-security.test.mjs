import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("security-sensitive ownership and recovery policy are committed",()=>{
 for(const path of [".github/CODEOWNERS","SECURITY.md","docs/REPOSITORY_SECURITY.md","scripts/create-recovery-bundle.sh"]){
  assert.equal(existsSync(new URL("../"+path,import.meta.url)),true,path);
 }
 const owners=read(".github/CODEOWNERS");
 assert.match(owners,/\/lib\/security\//);
 assert.match(owners,/package\.json/);
});
test("repository checks detect common high-impact credential formats",()=>{
 const scan=read("scripts/check-repository.mjs");
 for(const label of ["GitHub token","Supabase secret","AWS access key","Google API key","Stripe live secret","private key PEM"])
  assert.ok(scan.includes(label),label);
});
test("dangerous workflow patterns are explicitly rejected",()=>{
 const scan=read("scripts/check-repository.mjs");
 for(const pattern of ["pull_request_target","write-all","secrets: inherit","remote script piping"])
  assert.ok(scan.includes(pattern),pattern);
});
test("independent recovery artifacts are excluded from source control",()=>{
 const ignore=read(".gitignore");
 assert.match(ignore,/recovery\//);
 assert.match(ignore,/\*\.bundle/);
});
test("security policy treats leaked credentials as compromised",()=>{
 const policy=read("SECURITY.md");
 assert.match(policy,/Rotate or revoke it/);
 assert.match(policy,/disaster-recovery incident/);
});
