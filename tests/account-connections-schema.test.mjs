import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync(new URL("../supabase/schema-proposals/account-connections.sql",import.meta.url),"utf8");

test("account schema separates account identity from project resource binding",()=>{
 assert.match(sql,/create table if not exists public\.account_connections/i);
 assert.match(sql,/create table if not exists public\.project_account_bindings/i);
 assert.match(sql,/account_connection_id uuid not null references public\.account_connections/i);
 assert.match(sql,/resource_id text not null/i);
});

test("connection schema stores references only and keeps browser writes disabled",()=>{
 assert.match(sql,/credential_reference text/i);
 assert.match(sql,/Never store API keys/i);
 assert.match(sql,/revoke all on public\.account_connections, public\.project_account_bindings/i);
 assert.match(sql,/grant select on public\.account_connections, public\.project_account_bindings/i);
 assert.doesNotMatch(sql,/grant\s+(insert|update|delete|all).*account_connections/i);
});

test("account and project rows are owner isolated",()=>{
 assert.match(sql,/owner_id = \(select auth\.uid\(\)\)/i);
 assert.match(sql,/p\.owner_id = \(select auth\.uid\(\)\)/i);
 assert.match(sql,/a\.owner_id = \(select auth\.uid\(\)\)/i);
});

test("account status and permissions fail closed",()=>{
 assert.match(sql,/status in \('unconfigured','ready','suspended','revoked'\)/i);
 assert.match(sql,/permission_mode in \('read','propose','write','deploy','send'\)/i);
 assert.match(sql,/fresh approval gate/i);
});
