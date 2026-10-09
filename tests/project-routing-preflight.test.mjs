import test from "node:test";
import assert from "node:assert/strict";
import {planProjectRouting} from "../lib/infrastructure/project-routing-preflight.mjs";

const projectId="11111111-1111-4111-8111-111111111111";
const binding=(overrides={})=>({provider:"github",accountConnectionId:"acct-github",accountStatus:"ready",resourceId:"github:repo:owner/fpx",permissionMode:"read",...overrides});

test("exact GitHub read route is ready but remains non-executable",()=>{
 const plan=planProjectRouting({projectId,provider:"github",action:"read",bindings:[binding()]});
 assert.equal(plan.allowed,true);assert.equal(plan.status,"ready");assert.equal(plan.executionEnabled,false);assert.equal(plan.resourceId,"github:repo:owner/fpx");
});

test("provider capability ceiling blocks GitHub deploy and every send action",()=>{
 assert.equal(planProjectRouting({projectId,provider:"github",action:"deploy",bindings:[binding({permissionMode:"deploy"})]}).status,"denied");
 assert.equal(planProjectRouting({projectId,provider:"vercel",action:"send",bindings:[binding({provider:"vercel",accountConnectionId:"acct-vercel",resourceId:"vercel:project:prj_1",permissionMode:"send"})]}).status,"denied");
});

test("Vercel deploy and Supabase write stop for exact operation approval",()=>{
 const vercel=planProjectRouting({projectId,provider:"vercel",action:"deploy",bindings:[binding({provider:"vercel",accountConnectionId:"acct-vercel",resourceId:"vercel:project:prj_1",permissionMode:"deploy"})]});
 assert.equal(vercel.status,"approval_required");assert.equal(vercel.requiresApproval,true);assert.equal(vercel.executionEnabled,false);
 const supabase=planProjectRouting({projectId,provider:"supabase",action:"write",bindings:[binding({provider:"supabase",accountConnectionId:"acct-supabase",resourceId:"supabase:project:abcdefgh",permissionMode:"write"})]});
 assert.equal(supabase.status,"approval_required");assert.equal(supabase.requiresApproval,true);
});

test("read grants cannot write and unavailable accounts fail closed",()=>{
 assert.equal(planProjectRouting({projectId,provider:"github",action:"write",bindings:[binding()]}).status,"denied");
 assert.equal(planProjectRouting({projectId,provider:"github",action:"read",bindings:[binding({accountStatus:"revoked"})]}).status,"denied");
});

test("missing, wrong-prefix, or duplicate exact resources never get guessed",()=>{
 assert.equal(planProjectRouting({projectId,provider:"github",action:"read",bindings:[]}).status,"denied");
 assert.equal(planProjectRouting({projectId,provider:"github",action:"read",bindings:[binding({resourceId:"github:account"})]}).status,"denied");
 assert.equal(planProjectRouting({projectId,provider:"github",action:"read",bindings:[binding(),binding({accountConnectionId:"acct-2",resourceId:"github:repo:owner/other"})]}).reason,"Multiple exact project resource bindings exist; routing is ambiguous");
});
