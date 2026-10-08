import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const route=readFileSync(new URL("../app/api/private/connections/route.ts",import.meta.url),"utf8");

test("private connection route verifies backend, user and write origin",()=>{
 assert.match(route,/isSupabaseConfigured/);
 assert.match(route,/getVerifiedUser/);
 assert.match(route,/checkWriteOrigin/);
 assert.match(route,/Authentication required/);
 assert.match(route,/Untrusted request origin/);
});

test("connection write request is bounded and strict",()=>{
 assert.match(route,/readBoundedJson\(request,\{maxBytes:2500\}\)/);
 assert.match(route,/\.strict\(\)/);
 assert.doesNotMatch(route,/request\.json\(\)/);
});

test("browser payload schema cannot contain credential values or credential references",()=>{
 const schemaBlock=route.slice(route.indexOf("const draftSchema"),route.indexOf("export async function GET"));
 assert.doesNotMatch(schemaBlock,/apiKey|password|token|secretRef|credentialReference|credential_reference/);
 assert.match(schemaBlock,/connectionKey/);
 assert.match(schemaBlock,/accountLabel/);
 assert.match(schemaBlock,/signInMethod/);
});

test("GET never returns credential references",()=>{
 const getBlock=route.slice(route.indexOf("export async function GET"),route.indexOf("export async function POST"));
 assert.match(getBlock,/connection_key,provider,account_label,sign_in_method,status,created_at,updated_at/);
 assert.doesNotMatch(getBlock,/credential_reference/);
});

test("POST validates metadata but deliberately does not persist it",()=>{
 const postBlock=route.slice(route.indexOf("export async function POST"));
 assert.match(postBlock,/persisted:false/);
 assert.match(postBlock,/awaiting_secure_credential_link/);
 assert.doesNotMatch(postBlock,/\.insert\(/);
 assert.doesNotMatch(postBlock,/\.update\(/);
 assert.doesNotMatch(postBlock,/\.upsert\(/);
});
