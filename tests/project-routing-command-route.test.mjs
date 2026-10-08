import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const route=readFileSync(new URL("../app/api/private/routing/resolve-command/route.ts",import.meta.url),"utf8");

test("combined routing command reuses the strict resolver, control plane and preflight",()=>{
 assert.match(route,/resolveProjectCommand/);assert.match(route,/buildProjectControlPlane/);assert.match(route,/planProjectRouting/);
 assert.match(route,/intent:"project_context",project,controlPlane,plan/);
});

test("project resolution is owner scoped before exact project bindings are loaded",()=>{
 assert.match(route,/from\("projects"\)\.select\("id,name"\)\.eq\("owner_id",user\.id\)/);
 assert.match(route,/eq\("project_id",project\.id\)/);
 assert.match(route,/eq\("owner_id",user\.id\)\.in\("id",accountIds\)/);
});

test("provider and action are paired and the browser cannot assert an approval",()=>{
 assert.match(route,/Provider and action must be supplied together/);
 assert.doesNotMatch(route,/approvalId/);assert.doesNotMatch(route,/approvedOperations/);
});

test("combined command endpoint stays inert and secret free",()=>{
 assert.match(route,/checkWriteOrigin/);assert.match(route,/readBoundedJson/);
 assert.doesNotMatch(route,/credential_reference/);assert.doesNotMatch(route,/accessToken/);assert.doesNotMatch(route,/refreshToken/);
 assert.doesNotMatch(route,/executionEnabled:true/);assert.doesNotMatch(route,/vault\./);
});
