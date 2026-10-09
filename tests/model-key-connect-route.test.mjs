import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const route=readFileSync(new URL("../app/api/private/connect/model-key/route.ts",import.meta.url),"utf8");

test("manual model credentials are limited to reviewed vault providers",()=>{
 for(const provider of ["gemini","groq","mistral","huggingface","cerebras"])assert.ok(route.includes(`\"${provider}\"`));
 assert.doesNotMatch(route,/z\.enum\(\[[^\]]*\"openrouter\"/);
});

test("credential goes straight to Infisical and only a secret reference is persisted",()=>{
 assert.match(route,/isInfisicalConfigured/);
 assert.match(route,/vault\.putSecret\(secretRef,parsed\.data\.credential\.trim\(\)\)/);
 assert.match(route,/credential_reference:secretRef/);
 assert.match(route,/permission_mode:\"read\"/);
 assert.match(route,/resourceId=`\$\{parsed\.data\.provider\}:models`/);
});

test("route verifies ownership, origin and bounded body",()=>{
 assert.match(route,/checkWriteOrigin/);assert.match(route,/readBoundedJson/);
 assert.match(route,/eq\(\"owner_id\",user\.id\)/);
 assert.match(route,/eq\(\"id\",parsed\.data\.projectId\)/);
});

test("response never returns the submitted credential or secret reference",()=>{
 const responseLine=route.split("\n").find(line=>line.includes("secretStored:true"))||"";
 assert.ok(responseLine.includes("provider:parsed.data.provider"));
 assert.ok(!responseLine.includes("credential"));
 assert.ok(!responseLine.includes("secretRef"));
 assert.ok(!responseLine.includes("credential_reference"));
});
