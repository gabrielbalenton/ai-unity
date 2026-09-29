import test from "node:test";
import assert from "node:assert/strict";
import {normalizeOpenRouter,normalizeHuggingFace,deduplicateCatalog} from "../lib/catalog.mjs";
test("OpenRouter prices are metadata, not executable authorization",()=>{
 const output=normalizeOpenRouter({data:[{id:"provider/model",name:"Model",context_length:5000,pricing:{prompt:"0",completion:"0"}}]});
 assert.equal(output[0].zeroTextPrice,true);
 assert.equal(output[0].availableForExecution,false);
});
test("unknown pricing is never marked zero price",()=>{
 assert.equal(normalizeOpenRouter({data:[{id:"p/model"}]})[0].zeroTextPrice,false);
});
test("Hugging Face entries are discovery-only and pricing unknown",()=>{
 const result=normalizeHuggingFace([{id:"author/model"}]);
 assert.equal(result[0].source,"Hugging Face");
 assert.equal(result[0].zeroTextPrice,false);
 assert.equal(result[0].availableForExecution,false);
});
test("duplicate provider/model entries are deduplicated, distinct sources retained",()=>{
 const input=[...normalizeHuggingFace([{id:"x/y"},{id:"x/y"}]),...normalizeOpenRouter({data:[{id:"x/y"}]})];
 assert.equal(deduplicateCatalog(input).length,2);
});
test("invalid catalogs fail rather than being silently trusted",()=>{
 assert.throws(()=>normalizeOpenRouter({}),/Invalid/);
 assert.throws(()=>normalizeHuggingFace({}),/Invalid/);
});
