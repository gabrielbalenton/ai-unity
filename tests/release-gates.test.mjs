import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateReleaseGates} from "../lib/product/release-gates.mjs";
const file=JSON.parse(readFileSync(new URL("../config/release-gates.json",import.meta.url),"utf8"));
test("all critical release gates exist and none claims external validation",()=>{
 const snapshot=validateReleaseGates(file);
 assert.ok(snapshot.p0>=10);assert.equal(snapshot.evidenceVerified,0);
 assert.equal(snapshot.releaseAuthorized,false);
});
test("source-controlled files cannot self-certify deployment",()=>{
 const tampered=structuredClone(file);
 tampered.gates[0].status="verified";
 tampered.gates[0].evidence=["self-reported"];
 assert.throws(()=>validateReleaseGates(tampered),/unverified/);
});
test("owner approval remains an explicit, separately evidenced critical gate",()=>{
 const tampered=structuredClone(file);
 tampered.gates=tampered.gates.filter(g=>g.id!=="owner-approval");
 assert.throws(()=>validateReleaseGates(tampered),/critical/);
});
test("no public checklist contains credentials or client-specific state",()=>{
 const raw=readFileSync(new URL("../config/release-gates.json",import.meta.url),"utf8");
 assert.doesNotMatch(raw,/sk-[a-zA-Z0-9]{30,}/);
 assert.doesNotMatch(raw,/service_role_key/);
});
