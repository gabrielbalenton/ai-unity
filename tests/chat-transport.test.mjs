import test from "node:test";
import assert from "node:assert/strict";
import {validateChatRequest,prepareChatHttp,normalizeChatResult,executeTransport} from "../lib/providers/chat-transport.mjs";

const base={model:"provider/model",messages:[{role:"user",content:"Mock test"}],maxTokens:120};
test("both providers have exact fixed HTTPS endpoints and normalized messages",()=>{
 for(const [provider,expected] of [
  ["openrouter","https://openrouter.ai/api/v1/chat/completions"],
  ["huggingface","https://router.huggingface.co/v1/chat/completions"]
 ]){
  const item=prepareChatHttp({...base,provider,apiKey:"not-a-real-test-key"});
  assert.equal(item.url,expected);
  assert.deepEqual(JSON.parse(item.options.body),{model:base.model,messages:base.messages,max_tokens:120,stream:false});
  assert.equal(item.options.headers.Authorization,"Bearer not-a-real-test-key");
  assert.equal(item.options.redirect,"error");
 }
});
test("malformed providers, suspicious roles, giant prompts and missing keys are rejected",()=>{
 assert.throws(()=>validateChatRequest({...base,provider:"custom://localhost"}),/Invalid/);
 assert.throws(()=>validateChatRequest({...base,provider:"openrouter",messages:[{role:"tool",content:"hi"}]}),/Invalid/);
 assert.throws(()=>validateChatRequest({...base,provider:"openrouter",messages:[{role:"user",content:"x".repeat(16001)}]}),/Invalid/);
 assert.throws(()=>prepareChatHttp({...base,provider:"openrouter",apiKey:"bad"}),/credential/);
});
test("Referer accepts only safe HTTPS origins",()=>{
 const valid=prepareChatHttp({...base,provider:"openrouter",apiKey:"not-a-real-test-key",siteUrl:"https://unity.example"});
 const invalid=prepareChatHttp({...base,provider:"openrouter",apiKey:"not-a-real-test-key",siteUrl:"http://localhost:3000"});
 assert.equal(valid.options.headers["HTTP-Referer"],"https://unity.example");
 assert.equal(invalid.options.headers["HTTP-Referer"],undefined);
});
test("provider result is normalized but not independently verified",()=>{
 const result=normalizeChatResult({choices:[{message:{content:"Test"},finish_reason:"stop"}],
  usage:{prompt_tokens:3,completion_tokens:5}},"openrouter","provider/model");
 assert.equal(result.text,"Test");
 assert.deepEqual(result.usage,{inputTokens:3,outputTokens:5});
 assert.equal(result.independentlyVerified,false);
});
test("an injected fake transport demonstrates the planned capability without a live provider call",async()=>{
 let calls=0;
 const req=prepareChatHttp({...base,provider:"huggingface",apiKey:"not-a-real-test-key"});
 const result=await executeTransport(req,{fetcher:async url=>{
  calls++;
  assert.equal(url,"https://router.huggingface.co/v1/chat/completions");
  return {ok:true,text:async()=>JSON.stringify({choices:[{message:{content:"Mock answer"}}]})};
 }});
 assert.equal(calls,1);
 assert.equal(result.text,"Mock answer");
 assert.equal(result.independentlyVerified,false);
});
test("arbitrary endpoint swapping fails before any network request",async()=>{
 let calls=0;
 const req=prepareChatHttp({...base,provider:"openrouter",apiKey:"not-a-real-test-key"});
 await assert.rejects(executeTransport({...req,url:"http://localhost/internal"},{
  fetcher:async()=>{calls++;throw Error("No network expected")}
 }),/Invalid provider transport/);
 assert.equal(calls,0);
});
test("provider error messages cannot leak remote content",async()=>{
 const req=prepareChatHttp({...base,provider:"openrouter",apiKey:"not-a-real-test-key"});
 await assert.rejects(executeTransport(req,{
  fetcher:async()=>({ok:false,status:401,text:async()=>"Sensitive upstream response"})
 }),/Provider request rejected/);
});
