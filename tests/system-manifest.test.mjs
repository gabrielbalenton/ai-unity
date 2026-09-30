import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateProductManifest} from "../lib/product/manifest.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const valid=JSON.parse(read("config/system-manifest.json"));
test("all fourteen planned systems are represented and dependencies form a DAG",()=>{
 const result=validateProductManifest(valid);
 assert.equal(result.total,14);
 assert.equal(result.dependencyOrder.length,14);
});
test("product flags preserve no-deployment and zero-paid-budget requirements",()=>{
 assert.equal(valid.deploymentAuthorized,false);
 assert.equal(valid.paidApiBudgetDefaultUsd,0);
});
test("unconnected or discovery components cannot claim live operation",()=>{
 for(const module of valid.modules){
  assert.match(module.acceptance,/.{20,}/);
  assert.ok(["local","offline","planned"].includes(module.status));
 }
 assert.equal(valid.modules.find(m=>m.id==="cloud").status,"planned");
 assert.equal(valid.modules.find(m=>m.id==="models").status,"offline");
 assert.equal(valid.modules.find(m=>m.id==="agents").status,"planned");
});
test("unknown dependencies and dependency cycles are rejected",()=>{
 const missing=structuredClone(valid);missing.modules[0].dependencies=["missing"];
 assert.throws(()=>validateProductManifest(missing),/dependency/);
 const cyclic=structuredClone(valid);
 cyclic.modules.find(m=>m.id==="workspace").dependencies=["knowledge"];
 assert.throws(()=>validateProductManifest(cyclic),/Cyclic/);
});
test("the visible product dashboard uses the shared feature manifest",()=>{
 const source=read("components/CommandCenter.tsx");
 assert.match(source,/import systemManifest/);
 assert.match(source,/systemManifest.modules.map/);
 assert.match(source,/selectedFuture/);
});
