import test from "node:test";
import assert from "node:assert/strict";
import {createSSEDecoder,normalizeStreamEvent} from "../lib/ai/stream.mjs";
const bytes=s=>new TextEncoder().encode(s);
test("SSE parser handles UTF-8 text split across arbitrary network chunks",()=>{
 const stream=createSSEDecoder();
 const raw=bytes('event: delta\ndata: {"text":"hello 🌏"}\n\n');
 const emojiAt=raw.indexOf(0xf0);
 const halves=[raw.slice(0,emojiAt+2),raw.slice(emojiAt+2)];
 assert.deepEqual(stream.feed(halves[0]),[]);
 const data=stream.feed(halves[1]);
 assert.equal(data.length,1);
 const event=normalizeStreamEvent(data[0]);
 assert.equal(event.text,"hello 🌏");
 assert.equal(event.trust,"unverified_ai_output");
 assert.deepEqual(stream.finish(),[]);
});
test("multiple SSE frames can arrive in a single chunk",()=>{
 const stream=createSSEDecoder();
 const frames=stream.feed(bytes('event: delta\ndata: {"text":"A"}\n\nevent: done\ndata: [DONE]\n\n'));
 assert.equal(frames.length,2);
 assert.equal(normalizeStreamEvent(frames[0]).text,"A");
 assert.equal(normalizeStreamEvent(frames[1]).kind,"done");
});
test("unknown server event names and oversized payloads are rejected",()=>{
 assert.throws(()=>createSSEDecoder({maxFrameBytes:10}),/Invalid/);
 const unknown=createSSEDecoder();
 assert.throws(()=>unknown.feed(bytes("event: run_tool\ndata: please execute\n\n")),/Unsupported/);
 const oversized=createSSEDecoder({maxFrameBytes:100,maxBufferedBytes:256});
 assert.throws(()=>oversized.feed(bytes("data: "+"X".repeat(200)+"\n\n")),/Oversized/);
});
test("incomplete network responses never imply successful completion",()=>{
 const stream=createSSEDecoder();
 stream.feed(bytes('event: delta\ndata: {"text":"partial"}'));
 assert.throws(()=>stream.finish(),/Incomplete/);
});
test("usage metadata is informational, not billing authorization",()=>{
 const usage=normalizeStreamEvent({event:"usage",data:'{"inputTokens":10,"outputTokens":5,"reportedUsd":0}'});
 assert.equal(usage.billingVerified,false);
 assert.equal("reportedUsd" in usage,false);
});
test("errors hide arbitrary upstream text to avoid exposing provider secrets",()=>{
 const event=normalizeStreamEvent({event:"error",data:'{"secret":"never echo"}'});
 assert.equal(JSON.stringify(event).includes("never echo"),false);
 assert.equal(event.code,"PROVIDER_STREAM_FAILED");
});
