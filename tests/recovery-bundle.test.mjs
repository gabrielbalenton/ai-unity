import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync,mkdirSync,writeFileSync,readdirSync,readFileSync,rmSync} from "node:fs";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";

const script=fileURLToPath(new URL("../scripts/create-recovery-bundle.sh",import.meta.url));
const run=(cwd,...args)=>execFileSync("git",args,{cwd,encoding:"utf8"});

test("recovery bundle restores original commits and files without remote access",()=>{
 const dir=mkdtempSync(join(tmpdir(),"unity-recovery-test-"));
 const source=join(dir,"source"),restored=join(dir,"restored");
 try{
  mkdirSync(source);
  run(source,"init","-q","-b","main");
  run(source,"config","user.email","local-recovery-test@example.invalid");
  run(source,"config","user.name","UNITY offline recovery test");
  writeFileSync(join(source,".gitignore"),"recovery/\n");
  writeFileSync(join(source,"project-note.txt"),"original verified UNITY recovery content\n");
  run(source,"add",".");
  run(source,"commit","-qm","Initial local project");
  const original=run(source,"rev-parse","HEAD").trim();
  execFileSync("bash",[script],{cwd:source,encoding:"utf8"});
  const files=readdirSync(join(source,"recovery"));
  const bundleName=files.find(name=>name.endsWith(".bundle"));
  assert.ok(bundleName,"expected an actual Git bundle");
  const bundle=join(source,"recovery",bundleName);
  const storedChecksum=readFileSync(bundle+".sha256","utf8").trim().split(/\s+/)[0];
  const actualChecksum=createHash("sha256").update(readFileSync(bundle)).digest("hex");
  assert.equal(storedChecksum,actualChecksum,"bundle checksum must match actual backup");
  run(source,"bundle","verify",bundle);
  execFileSync("git",["clone","-q",bundle,restored],{encoding:"utf8"});
  assert.equal(run(restored,"rev-parse","HEAD").trim(),original,"recovered HEAD must match original");
  assert.equal(readFileSync(join(restored,"project-note.txt"),"utf8"),
   "original verified UNITY recovery content\n");
  assert.equal(readdirSync(restored).includes("recovery"),false,
   "backup artifacts must not enter backed-up project content");
 }finally{
  rmSync(dir,{recursive:true,force:true});
 }
});
