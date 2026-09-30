import test from "node:test";
import assert from "node:assert/strict";
import {createMemoryDraft,proposeMemoryRevision,approveMemoryRevision,revokeMemory,getApprovedMemory} from "../lib/memory/revisions.mjs";
const at="2026-09-30T01:00:00.000Z";
const created=()=>createMemoryDraft({id:"memory-1",projectId:"p1",title:"Requirement",
 body:"Keep project isolation enabled",authorId:"owner",sourceRefs:[],at});
const approve=(r,overrides={})=>approveMemoryRevision(r,{projectId:"p1",revision:r.version,approverId:"owner",
 at,authenticatedHumanApproval:true,...overrides});
test("draft memory is never included as approved",()=>{
 assert.equal(getApprovedMemory(created(),"p1"),null);
});
test("approval requires verified human action and project match",()=>{
 assert.throws(()=>approve(created(),{authenticatedHumanApproval:false}),/Verified human/);
 assert.throws(()=>approve(created(),{projectId:"other"}),/wrong project/);
 const approved=approve(created());
 assert.equal(getApprovedMemory(approved,"p1").revision,1);
 assert.equal(getApprovedMemory(approved,"other"),null);
});
test("new unapproved revision cannot silently overwrite prior approved content",()=>{
 const old=approve(created());
 const next=proposeMemoryRevision(old,{projectId:"p1",expectedVersion:1,title:"Updated",
  body:"The draft is not approved",authorId:"owner",sourceRefs:["commit:abc123"],at});
 assert.equal(getApprovedMemory(next,"p1").body,"Keep project isolation enabled");
 const updated=approve(next);
 assert.equal(getApprovedMemory(updated,"p1").body,"The draft is not approved");
 assert.equal(getApprovedMemory(updated,"p1").provenance,"approved_note_with_source_references");
 assert.equal(updated.events.length,4);
});
test("stale versions and stale approvals fail",()=>{
 const next=proposeMemoryRevision(created(),{projectId:"p1",expectedVersion:1,
  title:"Updated",body:"Version two",authorId:"owner",at});
 assert.throws(()=>proposeMemoryRevision(next,{projectId:"p1",expectedVersion:1,title:"Bad",
  body:"Bad update",authorId:"owner",at}),/revision conflict/);
 assert.throws(()=>approveMemoryRevision(next,{projectId:"p1",revision:1,approverId:"owner",at,
  authenticatedHumanApproval:true}),/stale/);
});
test("revocation blocks reads and new revisions",()=>{
 const old=approve(created());
 const revoked=revokeMemory(old,{projectId:"p1",actorId:"owner",at,authenticatedHumanApproval:true});
 assert.equal(getApprovedMemory(revoked,"p1"),null);
 assert.throws(()=>proposeMemoryRevision(revoked,{projectId:"p1",expectedVersion:1,
  title:"Changed",body:"Not allowed",authorId:"owner",at}),/Revoked/);
});
test("revisions return new records and preserve prior histories",()=>{
 const old=created();const newer=approve(old);
 assert.equal(old.revisions[0].status,"draft");
 assert.equal(newer.revisions[0].status,"approved");
 assert.equal(old.events.length,1);
});
test("unknown evidence refs and missing time are rejected",()=>{
 assert.throws(()=>createMemoryDraft({id:"m",projectId:"p",title:"Valid",
  body:"Record",authorId:"actor",at,sourceRefs:[null]}),/evidence/);
 assert.throws(()=>createMemoryDraft({id:"m",projectId:"p",title:"Valid",
  body:"Record",authorId:"actor",at:"not-a-time"}),/draft/);
});
