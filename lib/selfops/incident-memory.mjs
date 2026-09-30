/**
 * Offline self-operations incident knowledge.
 * This contract never executes repairs, reads logs, changes code, redeploys,
 * or treats an observed similarity as authorization to replay a past fix.
 * Real evidence, actor identities and approvals require server verification.
 */
const id=v=>typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,120}$/.test(v);
const time=v=>typeof v==="string"&&!Number.isNaN(Date.parse(v));
const short=v=>typeof v==="string"&&v.trim().length>=5&&v.length<=300;
const requireState=(ok,msg)=>{if(!ok)throw Error(msg)};
const PII=/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{12,})\b|-----BEGIN .*PRIVATE KEY-----/i;
const text=v=>short(v)&&!PII.test(v);
function context(incident,ctx){
 requireState(incident&&Number.isSafeInteger(incident.revision)&&
  ctx&&ctx.revision===incident.revision,"Incident revision conflict");
 requireState(ctx.projectId===incident.projectId&&id(ctx.actorId),"Incident scope mismatch");
 requireState(time(ctx.at)&&Date.parse(ctx.at)>=Date.parse(incident.updatedAt),"Invalid incident timestamp");
}
function advance(record,ctx,status,event,patch={}){
 const at=new Date(ctx.at).toISOString();
 return Object.freeze({...record,...patch,status,revision:record.revision+1,
  updatedAt:at,history:[...record.history,{type:event,actorId:ctx.actorId,at}]});
}
export function openIncident({id:incidentId,projectId,subsystem,fingerprint,symptom,detectedAt}){
 requireState([incidentId,projectId,subsystem,fingerprint].every(id)&&
  text(symptom)&&time(detectedAt),"Invalid incident; use sanitized symptoms");
 return Object.freeze({
  id:incidentId,projectId,subsystem,fingerprint,symptom,status:"observed",
  revision:0,detectedAt:new Date(detectedAt).toISOString(),
  updatedAt:new Date(detectedAt).toISOString(),diagnosis:null,repair:null,
  verification:null,approval:null,history:[]
 });
}
export function diagnoseIncident(record,ctx,{rootCause,evidenceRefs}){
 context(record,ctx);
 requireState(record.status==="observed","Incident is not awaiting diagnosis");
 requireState(text(rootCause)&&Array.isArray(evidenceRefs)&&evidenceRefs.length>0&&
  evidenceRefs.length<=20&&evidenceRefs.every(id),"Diagnosis requires sanitized cause and evidence");
 return advance(record,ctx,"diagnosed","diagnosed",
  {diagnosis:{rootCause,evidenceRefs:[...new Set(evidenceRefs)]}});
}
export function proposeRepair(record,ctx,{description,changeRef,risk}){
 context(record,ctx);
 requireState(record.status==="diagnosed","Diagnose before proposing repair");
 requireState(text(description)&&id(changeRef)&&["low","moderate","high"].includes(risk),
  "Invalid isolated repair proposal");
 return advance(record,ctx,"repair_proposed","repair_proposed",
  {repair:{description,changeRef,risk}});
}
export function verifyRepair(record,ctx,{verifierId,testEvidenceRefs,passed}){
 context(record,ctx);
 requireState(record.status==="repair_proposed","Repair not proposed");
 requireState(id(verifierId)&&verifierId!==ctx.actorId&&typeof passed==="boolean"&&
  Array.isArray(testEvidenceRefs)&&testEvidenceRefs.length>0&&
  testEvidenceRefs.length<=20&&testEvidenceRefs.every(id),
  "Independent test evidence required");
 if(!passed)return advance(record,ctx,"verification_failed","verification_failed",
  {verification:{verifierId,testEvidenceRefs:[...new Set(testEvidenceRefs)],passed:false}});
 return advance(record,ctx,"verified","independently_verified",
  {verification:{verifierId,testEvidenceRefs:[...new Set(testEvidenceRefs)],passed:true}});
}
export function requestRepairApproval(record,ctx){
 context(record,ctx);
 requireState(record.status==="verified"&&record.verification?.passed===true,
  "Unverified repair cannot request approval");
 return advance(record,ctx,"awaiting_approval","approval_requested");
}
export function approveRepair(record,ctx,{approvalRef,scope,expiresAt}){
 context(record,ctx);
 requireState(record.status==="awaiting_approval"&&id(approvalRef)&&
  scope==="isolated_change_review"&&time(expiresAt)&&
  Date.parse(expiresAt)>Date.parse(ctx.at),
  "Exact time-limited approval required");
 // Approval allows the isolated proposal to be reviewed by a trusted
 // deployment gateway; it does not execute it or confer prod privileges.
 return advance(record,ctx,"approved_for_review","approved_for_review",{
  approval:{approvalRef,scope,expiresAt}
 });
}
export function withdrawRepair(record,ctx){
 context(record,ctx);
 requireState(["observed","diagnosed","repair_proposed","verification_failed","verified","awaiting_approval","approved_for_review"].includes(record.status),
  "Cannot withdraw incident proposal");
 return advance(record,ctx,"withdrawn","withdrawn",{approval:null});
}
export function findSimilarVerifiedIncidents(records,{projectId,subsystem,fingerprint}){
 requireState(Array.isArray(records)&&records.length<=1000&&[projectId,subsystem,fingerprint].every(id),
  "Invalid incident knowledge search");
 // A prior verified fix is a candidate for investigation, never a
 // command to apply it: environments and root causes can differ.
 return records.filter(r=>r&&r.projectId===projectId&&r.subsystem===subsystem&&
  r.fingerprint===fingerprint&&r.verification?.passed===true&&
  r.repair&&r.status!=="withdrawn")
  .map(r=>Object.freeze({
   incidentId:r.id,changeRef:r.repair.changeRef,risk:r.repair.risk,
   evidenceRefs:[...r.verification.testEvidenceRefs],
   recommendation:"Investigate recurrence independently; never automatically replay a previous repair."
  }));
}
