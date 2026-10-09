import test from "node:test";
import assert from "node:assert/strict";
import {
 buildSupabaseAuthorizationUrl,
 exchangeSupabaseAuthorizationCode,
 listSupabaseProjects,
 SUPABASE_MANAGEMENT_ENDPOINTS
} from "../lib/infrastructure/supabase-management-auth.mjs";

const clientId="unity-test-client";
const clientSecret="test-client-secret-not-real";
const state="s".repeat(32);
const challenge="c".repeat(43);
const verifier="v".repeat(64);
const redirectUri="https://unity.example.com/api/private/connect/supabase/callback";

test("Supabase OAuth authorization uses official endpoint, state and S256 PKCE",()=>{
 const url=new URL(buildSupabaseAuthorizationUrl({clientId,redirectUri,state,challenge}));
 assert.equal(url.toString().startsWith(SUPABASE_MANAGEMENT_ENDPOINTS.authorize),true);
 assert.equal(url.searchParams.get("client_id"),clientId);
 assert.equal(url.searchParams.get("redirect_uri"),redirectUri);
 assert.equal(url.searchParams.get("response_type"),"code");
 assert.equal(url.searchParams.get("state"),state);
 assert.equal(url.searchParams.get("code_challenge"),challenge);
 assert.equal(url.searchParams.get("code_challenge_method"),"S256");
});

test("Supabase OAuth exchange keeps client secret and verifier server-side",async()=>{
 let captured;
 const result=await exchangeSupabaseAuthorizationCode({
  clientId,clientSecret,code:"supabase-auth-code",verifier,redirectUri,
  fetchImpl:async(url,options)=>{
   captured={url,options};
   return {ok:true,json:async()=>({access_token:"fake-access-token-value",refresh_token:"fake-refresh-token-value",expires_in:3600,token_type:"Bearer"})};
  }
 });
 assert.equal(captured.url,SUPABASE_MANAGEMENT_ENDPOINTS.token);
 assert.equal(captured.options.method,"POST");
 const body=new URLSearchParams(captured.options.body);
 assert.equal(body.get("grant_type"),"authorization_code");
 assert.equal(body.get("client_id"),clientId);
 assert.equal(body.get("client_secret"),clientSecret);
 assert.equal(body.get("code_verifier"),verifier);
 assert.equal(body.get("redirect_uri"),redirectUri);
 assert.equal(result.accessToken,"fake-access-token-value");
 assert.equal(result.refreshToken,"fake-refresh-token-value");
});

test("Supabase project discovery returns only safe project metadata",async()=>{
 const projects=await listSupabaseProjects({
  accessToken:"fake-access-token-value",
  fetchImpl:async(url,options)=>{
   assert.equal(url,SUPABASE_MANAGEMENT_ENDPOINTS.projects);
   assert.equal(options.headers.Authorization,"Bearer fake-access-token-value");
   return {ok:true,json:async()=>[
    {ref:"alpha-ref",name:"Alpha",organization_id:"org-a",status:"ACTIVE_HEALTHY",database:{password:"must-not-pass"}},
    {bad:"entry"}
   ]};
  }
 });
 assert.deepEqual(projects,[{ref:"alpha-ref",name:"Alpha",organizationId:"org-a",status:"ACTIVE_HEALTHY"}]);
 assert.equal(JSON.stringify(projects).includes("must-not-pass"),false);
});

test("Supabase OAuth helpers fail closed on insecure redirect and provider errors",async()=>{
 assert.throws(()=>buildSupabaseAuthorizationUrl({clientId,redirectUri:"http://example.com/callback",state,challenge}),/HTTPS/);
 await assert.rejects(()=>exchangeSupabaseAuthorizationCode({
  clientId,clientSecret,code:"supabase-auth-code",verifier,redirectUri,fetchImpl:async()=>({ok:false})
 }),/exchange failed/);
 await assert.rejects(()=>listSupabaseProjects({accessToken:"fake-access-token-value",fetchImpl:async()=>({ok:false})}),/could not be retrieved/);
});
