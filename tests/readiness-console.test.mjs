import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("readiness has its own functional navigation destination",()=>{
 const source=read("app/page.tsx");
 assert.match(source,/import ReadinessPanel/);
 assert.match(source,/tab:"Readiness"/);
 assert.match(source,/tab==="Readiness"&&<ReadinessPanel\/>/);
});
test("a public source release checklist cannot claim real readiness",()=>{
 const ui=read("components/ReadinessPanel.tsx");
 const json=JSON.parse(read("config/release-gates.json"));
 assert.equal(json.deploymentAuthorized,false);
 assert.ok(json.gates.every(g=>g.status==="needs_evidence" && g.evidence.length===0));
 assert.match(ui,/RELEASE LOCKED/);
 assert.match(ui,/NOT VERIFIED/);
 assert.match(ui,/cannot authorize its own completion/);
});
test("readiness command includes exact evidence requirements and filters",()=>{
 const ui=read("components/ReadinessPanel.tsx");
 assert.match(ui,/aria-label="Release gate categories"/);
 assert.match(ui,/Evidence required:/);
 assert.match(ui,/setLevel\(item.id\)/);
 assert.match(ui,/releaseGates.gates.filter/);
});
test("release registry is included in GitHub-only readiness report",()=>{
 const script=read("scripts/readiness.mjs");
 assert.match(script,/validateReleaseGates/);
 assert.match(script,/releaseGates,/);
 assert.match(script,/deploymentReady:false/);
});
