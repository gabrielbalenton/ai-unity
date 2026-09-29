import test from "node:test";
import assert from "node:assert/strict";
import {inspectOpenApiJson,inspectOpenApiDocument} from "../lib/connectors/openapi.mjs";
const basic=()=>({openapi:"3.1.0",info:{title:"Demo API"},servers:[{url:"https://example.com/v1"}],
 paths:{"/items":{get:{summary:"List items"},post:{operationId:"createItem",security:[{apiKey:[]}]}}}});
test("valid specs yield inert operation descriptions",()=>{
 const r=inspectOpenApiDocument(basic());
 assert.equal(r.title,"Demo API");
 assert.equal(r.operations.length,2);
 assert.equal(r.operations[0].category,"potentially-read-only");
 assert.equal(r.operations[1].category,"modifying");
 assert.equal(r.operations[1].authorized,false);
 assert.equal(r.operations[1].executable,false);
});
test("documents never execute or fetch arbitrary URLs",()=>{
 const r=inspectOpenApiJson(JSON.stringify(basic()));
 assert.deepEqual(r.servers,["https://example.com/v1"]);
 assert.match(r.notice,/No service was connected/);
});
test("external references are not traversed",()=>{
 const b=basic();b.paths["/items"]={$ref:"https://attacker.example/malicious.json"};
 const r=inspectOpenApiDocument(b);
 assert.equal(r.referenceCount,1);
 assert.equal(r.operations.length,0);
});
test("unknown, unsafe and credential-bearing servers are not returned",()=>{
 const b=basic();b.servers=[{url:"http://insecure.example"},{url:"https://user:password@server.example/v1"},{url:"https://safe.example/path"}];
 const r=inspectOpenApiDocument(b);
 assert.deepEqual(r.servers,["https://safe.example/path"]);
});
test("unsupported documents fail closed",()=>{
 assert.throws(()=>inspectOpenApiDocument({swagger:"2.0",info:{title:"Legacy"},paths:{}}),/Only OpenAPI/);
 assert.throws(()=>inspectOpenApiJson("{"),/not valid JSON/);
 assert.throws(()=>inspectOpenApiJson(" ".repeat(400001)),/400 KB/);
});
test("paths are bounded and invalid references are rejected",()=>{
 const b=basic();b.paths=Object.fromEntries(Array.from({length:301},(_,i)=>["/p"+i,{}]));
 assert.throws(()=>inspectOpenApiDocument(b),/300-path/);
});
test("declared security cannot be assumed to grant access",()=>{
 const b=basic();b.security=[{bearerAuth:[]}];
 const r=inspectOpenApiDocument(b);
 assert.equal(r.operations[0].security,"declared-review-required");
 assert.equal(r.operations[1].security,"declared-review-required");
});
test("explicitly unauthenticated operation is still non-executable",()=>{
 const b=basic();b.paths["/items"].get.security=[];
 const r=inspectOpenApiDocument(b);
 assert.equal(r.operations[0].security,"none-declared");
 assert.equal(r.operations[0].executable,false);
});
