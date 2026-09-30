/**
 * Immutable, project-scoped memory revision contract. The caller must verify
 * the acting human and project ownership on a trusted server. These functions
 * never independently establish authorization.
 */
const validId=x=>typeof x==="string"&&/^[A-Za-z0-9_.:-]{1,120}$/.test(x);
const validTime=x=>typeof x==="string"&&Number.isFinite(Date.parse(x))&&x.length<50;
const validContent=(title,body)=>typeof title==="string"&&title.trim().length>=2&&title.length<=140&&
 typeof body==="string"&&body.trim().length>=2&&body.length<=200000;
const sanitizeRefs=refs=>{
 if(!Array.isArray(refs)||refs.length>25||!refs.every(r=>typeof r==="string"&&r.length<=400&&r.trim()))
  throw Error("Invalid evidence references");
 return [...new Set(refs)];
};
function assertRecord(record){
 if(!record||!validId(record.id)||!validId(record.projectId)||
   !Array.isArray(record.revisions)||!Number.isInteger(record.version)||record.version!==record.revisions.length)
  throw Error("Invalid memory record");
}
export function createMemoryDraft({id,projectId,title,body,authorId,sourceRefs=[],at}){
 if(![id,projectId,authorId].every(validId)||!validContent(title,body)||!validTime(at))
  throw Error("Invalid draft");
 return {id,projectId,version:1,revoked:false,revisions:[{
  revision:1,title:title.trim(),body:body.trim(),authorId,sourceRefs:sanitizeRefs(sourceRefs),
  status:"draft",createdAt:at,approvedBy:null,approvedAt:null
 }],events:[{event:"draft_created",actorId:authorId,at,revision:1}]};
}
export function proposeMemoryRevision(record,{projectId,expectedVersion,title,body,authorId,sourceRefs=[],at}){
 assertRecord(record);
 if(record.revoked||record.projectId!==projectId||expectedVersion!==record.version)
  throw Error("Revoked memory, wrong project or revision conflict");
 if(!validId(authorId)||!validContent(title,body)||!validTime(at))throw Error("Invalid revision");
 const next=record.version+1;
 return {...record,version:next,revisions:[...record.revisions,{
  revision:next,title:title.trim(),body:body.trim(),authorId,sourceRefs:sanitizeRefs(sourceRefs),
  status:"draft",createdAt:at,approvedBy:null,approvedAt:null
 }],events:[...record.events,{event:"revision_proposed",actorId:authorId,at,revision:next}]};
}
export function approveMemoryRevision(record,{projectId,revision,approverId,at,authenticatedHumanApproval}){
 assertRecord(record);
 if(record.revoked||record.projectId!==projectId)throw Error("Revoked memory or wrong project");
 if(authenticatedHumanApproval!==true||!validId(approverId)||!validTime(at))
  throw Error("Verified human approval is required");
 // Require the latest draft; approval is not silently inherited by imported notes.
 if(record.version!==revision||record.revisions[revision-1]?.status!=="draft")
  throw Error("Cannot approve stale or non-draft revision");
 const next=record.revisions.map((r,i)=>i!==revision-1?r:{...r,status:"approved",approvedBy:approverId,approvedAt:at});
 return {...record,revisions:next,events:[...record.events,{event:"revision_approved",actorId:approverId,at,revision}]};
}
export function revokeMemory(record,{projectId,actorId,at,authenticatedHumanApproval}){
 assertRecord(record);
 if(record.projectId!==projectId||record.revoked||!validId(actorId)||!validTime(at)||
   authenticatedHumanApproval!==true)throw Error("Cannot revoke memory without verified in-scope authorization");
 return {...record,revoked:true,events:[...record.events,{event:"memory_revoked",actorId,at,revision:record.version}]};
}
export function getApprovedMemory(record,projectId){
 assertRecord(record);
 if(record.projectId!==projectId||record.revoked)return null;
 const active=[...record.revisions].reverse().find(r=>r.status==="approved");
 return active?{id:record.id,projectId,title:active.title,body:active.body,
  revision:active.revision,sourceRefs:[...active.sourceRefs],approvedBy:active.approvedBy,approvedAt:active.approvedAt,
  provenance:active.sourceRefs.length?"approved_note_with_source_references":"approved_user_note_unverified"}:null;
}
