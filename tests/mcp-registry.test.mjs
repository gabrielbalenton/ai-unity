import test from "node:test";
import assert from "node:assert/strict";
import {normalizeRegistryPage} from "../lib/mcp-registry.mjs";
test("public registry metadata is inert and bounded",()=>{
 const result=normalizeRegistryPage({servers:[{server:{name:"io.demo/server",description:"Demo",version:"1.0.0"}}],metadata:{nextCursor:"next"}});
 assert.equal(result.servers[0].connectable,false);
 assert.equal(result.nextCursor,"next");
});
test("deleted registry entries are not recommended",()=>{
 const x=normalizeRegistryPage({servers:[{server:{name:"io.bad/server"},_meta:{"io.modelcontextprotocol.registry/official":{status:"deleted"}}}]});
 assert.equal(x.servers.length,0);
});
test("missing or malformed server lists are rejected",()=>{
 assert.throws(()=>normalizeRegistryPage({}),/Invalid/);
 assert.deepEqual(normalizeRegistryPage({servers:[{},null]}).servers,[]);
});
