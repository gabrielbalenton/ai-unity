import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const route=readFileSync(new URL("../app/api/private/routing/preflight/route.ts",import.meta.url),"utf8");

test("routing preflight verifies origin, actor and exact project ownership",()=>{
 assert.match(route,/checkWriteOrigin/);assert.match(route,/readBoundedJson/);assert.match(route,/getVerifiedUser/);
 assert.match(route,/eq\("id",parsed\.data\.projectId\)\.eq\("owner_id",user\.id\)/);
});

test("account discovery remains owner scoped and exposes no credentials",()=>{
 assert.match(route,/eq\("owner_id",user\.id\)\.in\("id",accountIds\)/);
 assert.doesNotMatch(route,/credential_reference/);assert.doesNotMatch(route,/accessToken/);assert.doesNotMatch(route,/refreshToken/);
});

test("browser cannot self-assert approval and route only returns an inert plan",()=>{
 assert.doesNotMatch(route,/approvalId/);assert.match(route,/planProjectRouting/);assert.match(route,/NextResponse\.json\(\{plan\}/);
 assert.doesNotMatch(route,/executionEnabled:true/);assert.doesNotMatch(route,/fetch\(/);assert.doesNotMatch(route,/vault\./);
});
