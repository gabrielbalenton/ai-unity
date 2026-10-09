import test from "node:test";
import assert from "node:assert/strict";
import {buildProjectProviderPlan} from "../lib/ai/project-provider-plan.mjs";

const definitions=[
 {id:"openrouter",displayName:"OpenRouter",priority:10,zeroPaidOnly:true},
 {id:"gemini",displayName:"Gemini",priority:20,zeroPaidOnly:true},
 {id:"groq",displayName:"Groq",priority:30,zeroPaidOnly:true}
];

test("fallback plan includes only exact ready model bindings in priority order",()=>{
 const plan=buildProjectProviderPlan({providerDefinitions:definitions,connections:[
  {provider:"groq",status:"ready",resourceId:"groq:models"},
  {provider:"openrouter",status:"ready",resourceId:"openrouter:models"},
  {provider:"gemini",status:"suspended",resourceId:"gemini:models"}
 ]});
 assert.deepEqual([...plan.fallbackOrder],["openrouter","groq"]);
 assert.equal(plan.liveFreeEligibilityRequired,true);
 assert.equal(plan.automaticPaidFallback,false);
 assert.equal(plan.executionEnabled,false);
 assert.ok(plan.providers.every(item=>item.freeEligibility==="verify_live"));
});

test("ambiguous duplicate bindings and wrong resources fail closed",()=>{
 const plan=buildProjectProviderPlan({providerDefinitions:definitions,connections:[
  {provider:"gemini",status:"ready",resourceId:"gemini:models"},
  {provider:"gemini",status:"ready",resourceId:"gemini:models"},
  {provider:"groq",status:"ready",resourceId:"groq:other"}
 ]});
 const gemini=plan.providers.find(item=>item.providerId==="gemini");
 const groq=plan.providers.find(item=>item.providerId==="groq");
 assert.equal(gemini.ambiguous,true);assert.equal(gemini.connected,false);
 assert.equal(groq.connected,false);
 assert.deepEqual([...plan.fallbackOrder],[]);
});
