import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const route=readFileSync(new URL("../app/api/private/projects/resolve-command/route.ts",import.meta.url),"utf8");

test("project command route is authenticated, owner scoped and origin checked",()=>{
 assert.match(route,/getVerifiedUser/);
 assert.match(route,/checkWriteOrigin/);
 assert.match(route,/readBoundedJson/);
 assert.match(route,/eq\("owner_id",user\.id\)/);
});

test("resolver route never performs fuzzy cross-project fallback",()=>{
 assert.match(route,/resolveProjectCommand/);
 assert.match(route,/No owned UNITY project matches that exact project name/);
 assert.match(route,/More than one owned UNITY project matches that name/);
 assert.doesNotMatch(route,/ilike\(/);
 assert.doesNotMatch(route,/similarity\(/);
});

test("successful resolver response contains identity only, not credentials or bindings",()=>{
 assert.match(route,/intent:"switch_project",project:resolution\.project/);
 assert.doesNotMatch(route,/credential_reference/);
 assert.doesNotMatch(route,/accessToken/);
 assert.doesNotMatch(route,/refreshToken/);
});
