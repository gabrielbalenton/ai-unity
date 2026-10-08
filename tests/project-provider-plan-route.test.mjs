import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const route=readFileSync(new URL("../app/api/private/models/provider-plan/route.ts",import.meta.url),"utf8");

test("provider plan is owner-scoped and secret-free",()=>{
 assert.match(route,/eq\(\"owner_id\",user\.id\)/);
 assert.match(route,/buildProjectProviderPlan/);
 assert.match(route,/select\(\"id,provider,status\"\)/);
 assert.doesNotMatch(route,/credential_reference/);
 assert.doesNotMatch(route,/secretRef/);
 assert.doesNotMatch(route,/executionEnabled:true/);
});
