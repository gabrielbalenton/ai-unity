import test from "node:test";
import assert from "node:assert/strict";
import {readBoundedBytes,readBoundedJson} from "../lib/security/bounded-body.mjs";
const json=(value,headers={})=>new Request("http://localhost/test",{
 method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify(value)});
test("bounded JSON accepts normal short requests without altering content",async()=>{
 const value={title:"Small JSON",body:"UTF-8 🌿"};
 assert.deepEqual(await readBoundedJson(json(value),{maxBytes:400}),value);
});
test("fake short Content-Length cannot bypass streamed byte counting",async()=>{
 const source=new ReadableStream({start(controller){
  controller.enqueue(new TextEncoder().encode('{"text":"'+ "a".repeat(500)+'"}'));
  controller.close();
 }});
 const request=new Request("http://localhost/test",{method:"POST",
  headers:{"content-type":"application/json","content-length":"0"},body:source,duplex:"half"});
 await assert.rejects(readBoundedJson(request,{maxBytes:80}),/BODY_TOO_LARGE/);
});
test("a claimed oversized request is rejected before the stream is read",async()=>{
 const source=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode("{}"));controller.close()}});
 const request=new Request("http://localhost/test",{method:"POST",
  headers:{"content-length":"1000000"},body:source,duplex:"half"});
 await assert.rejects(readBoundedBytes(request,{maxBytes:128}),/BODY_TOO_LARGE_OR_MALFORMED/);
});
test("malformed UTF-8 and unsupported compressed bodies are rejected",async()=>{
 const badUtf8=new Request("http://localhost/test",{method:"POST",
  headers:{"content-type":"application/json"},body:new Uint8Array([0xff,0xfe])});
 await assert.rejects(readBoundedJson(badUtf8,{maxBytes:100}),/INVALID_UTF8/);
 const compressed=new Request("http://localhost/test",{method:"POST",
  headers:{"content-type":"application/json","content-encoding":"gzip"},body:"{}"});
 await assert.rejects(readBoundedJson(compressed,{maxBytes:100}),/ENCODED_BODY_NOT_SUPPORTED/);
});
test("webhook readers preserve the exact signed raw bytes",async()=>{
 const raw='{"action":"created","message":"do not normalize 🌿"}';
 const req=new Request("http://localhost/webhook",{method:"POST",body:raw});
 const bytes=await readBoundedBytes(req,{maxBytes:200});
 assert.deepEqual(bytes,new TextEncoder().encode(raw));
});
test("unknown JSON content types fail closed before parsing",async()=>{
 const req=new Request("http://localhost/test",{method:"POST",
  headers:{"content-type":"text/plain"},body:'{"a":1}'});
 await assert.rejects(readBoundedJson(req,{maxBytes:100}),/JSON_CONTENT_TYPE_REQUIRED/);
});
test("an empty body is never interpreted as a valid object",async()=>{
 const req=new Request("http://localhost/test",{method:"POST",
  headers:{"content-type":"application/json"}});
 await assert.rejects(readBoundedJson(req,{maxBytes:100}),/INVALID_JSON/);
});
