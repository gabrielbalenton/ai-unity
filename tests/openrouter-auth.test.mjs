import test from "node:test";
import assert from "node:assert/strict";
import {
 buildOpenRouterAuthorizationUrl,
 exchangeOpenRouterAuthorizationCode,
 OPENROUTER_AUTH_ENDPOINTS
} from "../lib/infrastructure/openrouter-auth.mjs";

const challenge="A".repeat(43);
const state="B".repeat(32);
const verifier="C".repeat(64);
const code="auth_code_abc123def456";

test("OpenRouter authorization URL uses HTTPS callback, state and S256 PKCE",()=>{
 const url=new URL(buildOpenRouterAuthorizationUrl({
  callbackUrl:"https://unity.example.com/api/private/connect/openrouter/callback",
  challenge,state
 }));
 assert.equal(url.origin,"https://openrouter.ai");
 assert.equal(url.pathname,"/auth");
 assert.equal(url.searchParams.get("code_challenge"),challenge);
 assert.equal(url.searchParams.get("code_challenge_method"),"S256");
 const callback=new URL(url.searchParams.get("callback_url"));
 assert.equal(callback.origin,"https://unity.example.com");
 assert.equal(callback.searchParams.get("state"),state);
});

test("OpenRouter authorization allows localhost only for local development",()=>{
 const url=buildOpenRouterAuthorizationUrl({
  callbackUrl:"http://localhost:3000/api/private/connect/openrouter/callback",
  challenge,state
 });
 assert.match(url,/openrouter\.ai\/auth/);
 assert.throws(()=>buildOpenRouterAuthorizationUrl({
  callbackUrl:"http://unity.example.com/callback",challenge,state
 }),/HTTPS/);
});

test("OpenRouter code exchange sends verifier server-side and returns key to caller memory only",async()=>{
 let request;
 const result=await exchangeOpenRouterAuthorizationCode({
  code,verifier,
  fetchImpl:async(url,options)=>{
   request={url,options};
   return {ok:true,json:async()=>({key:"test-openrouter-key-value-not-real",user_id:"user_test"})};
  }
 });
 assert.equal(request.url,OPENROUTER_AUTH_ENDPOINTS.exchange);
 assert.equal(request.options.method,"POST");
 const body=JSON.parse(request.options.body);
 assert.equal(body.code,code);
 assert.equal(body.code_verifier,verifier);
 assert.equal(body.code_challenge_method,"S256");
 assert.equal(result.userId,"user_test");
 assert.equal(result.key,"test-openrouter-key-value-not-real");
});

test("OpenRouter exchange fails closed on provider or response errors",async()=>{
 await assert.rejects(()=>exchangeOpenRouterAuthorizationCode({
  code,verifier,fetchImpl:async()=>({ok:false})
 }),/exchange failed/);
 await assert.rejects(()=>exchangeOpenRouterAuthorizationCode({
  code,verifier,fetchImpl:async()=>({ok:true,json:async()=>({user_id:"x"})})
 }),/missing key/);
});
