import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const route=readFileSync(new URL("../app/api/private/connections/project/route.ts",import.meta.url),"utf8");

test("project connection status verifies authenticated ownership",()=>{
 assert.match(route,/getVerifiedUser/);
 assert.match(route,/createSupabaseAdmin/);
 assert.match(route,/eq\("id",projectId\)\.eq\("owner_id",user\.id\)/);
});

test("project connection response contains safe metadata only",()=>{
 assert.match(route,/provider:account\.provider/);
 assert.match(route,/accountLabel:account\.account_label/);
 assert.match(route,/status:account\.status/);
 assert.match(route,/permissionMode:binding\.permission_mode/);
 assert.doesNotMatch(route,/credential_reference/);
 assert.doesNotMatch(route,/secretValue/);
 assert.doesNotMatch(route,/clientSecret/);
});

test("project connection status reads only bindings for exact project",()=>{
 assert.match(route,/project_account_bindings/);
 assert.match(route,/\.eq\("project_id",projectId\)/);
 assert.match(route,/account_connections/);
 assert.match(route,/\.eq\("owner_id",user\.id\)\.in\("id",connectionIds\)/);
});
