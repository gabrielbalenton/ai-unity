import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("engineering rules keep external execution gated",()=>{
 const rules=read("AGENTS.md");
 assert.match(rules,/GitHub development first/i);
 assert.match(rules,/never commit api keys/i);
 assert.match(rules,/model listings are not verified free endpoints/i);
});
test("feature status does not falsely claim enabled integrations",()=>{
 const matrix=read("docs/FEATURE_MATRIX.md");
 assert.match(matrix,/Public discovery is not provider connection/);
 assert.match(matrix,/Not implemented/);
});
test("published documentation links to authoritative decisions",()=>{
 const readme=read("README.md");
 assert.match(readme,/AGENTS.md/);
 assert.match(readme,/docs\/DECISIONS.md/);
});
