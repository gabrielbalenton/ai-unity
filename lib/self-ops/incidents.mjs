/**
 * Offline contract for UNITY maintaining UNITY.
 * This layer records sanitized, reproducible incidents and proposes next
 * steps. It has NO providers, credential access, network operations,
 * repository mutation or deployment capability.
 */
const ident=value=>typeof value==="string"&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(value);
const text=(value,max)=>typeof value==="string"&&value.trim().length>0&&value.length<=max;
const iso=value=>typeof value==="string"&&Number.isFinite(Date.parse(value))&&
 new Date(value).toISOString()===value;
const fingerprints=value=>Array.isArray(value)&&value.length>0&&value.length<=12&&
 value.every(x=>ident(x));
const states=["observed","triaged","reproduced","repair_proposed","verified_in_isolation","approval_pending","closed"];
const redact=value=>value.replace(/\b(?:gh[pousr]_[A-Za-z0-9]+|sb_secret_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{12,})\b/g,"[REDACTED]");
const safeText=(value,max)=>text(value,max)&&value===redact(value)&&
 !/-----BEGIN [^-]*PRIVATE KEY-----|(?:postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^\s]+@/i.test(value);
function valid(input){
 if(!input||!ident(input.id)||!ident(input.projectId)||!ident(input.componentId)||
 !safeText(input.summary,240)||!fingerprints(input.symptoms)||
 !iso(input.detectedAt)||!states.includes(input.state)||
 !Array.isArray(input.evidenceRefs)||input.evidenceRefs.length>20||
 !input.evidenceRefs.every(ident)||!Array.isArray(input.history)||
 input.history.length>100||!Number.isInteger(input.revision)||input.revision<0)
 throw Error("Invalid incident");
}
export function observeIncident({id,projectId,componentId,summary,symptoms,detectedAt,evidenceRefs=[]}){
 const record={id,projectId,componentId,summary,symptoms:[...new Set(symptoms)],
  detectedAt,evidenceRefs:[...new Set(evidenceRefs)],state:"observed",revision:0,
  history:[{event:"observed",at:detectedAt}],proposedFix:null,verification:null};
 valid(record);
 return Object.freeze(record);
}
const transitions={
 observed:["triaged"],triaged:["reproduced","closed"],
 reproduced:["repair_proposed","closed"],
 repair_proposed:["verified_in_isolation","triaged"],
 verified_in_isolation:["approval_pending","closed"],
 approval_pending:["closed","triaged"],closed:[]
};
export function transitionIncident(record,{expectedRevision,next,at,evidenceRef=null,
 proposedFix=null,verification=null}){
 valid(record);
 if(expectedRevision!==record.revision)throw Error("Stale incident revision");
 if(!iso(at)||at<record.detectedAt||!transitions[record.state].includes(next))
 throw Error("Invalid incident transition");
 if(["reproduced","verified_in_isolation","closed"].includes(next)&&!ident(evidenceRef))
 throw Error("Independent evidence reference required");
 let fix=record.proposedFix;
 if(next==="repair_proposed"){
  if(!proposedFix||!safeText(proposedFix.summary,500)||
    !["test_only","isolated_code_change","manual_investigation"].includes(proposedFix.kind))
   throw Error("Invalid proposed repair");
  fix={summary:proposedFix.summary,kind:proposedFix.kind};
 }
 let check=record.verification;
 if(next==="verified_in_isolation"){
  if(!verification||verification.passed!==true||
     !ident(verification.verifierId)||!ident(verification.executorId)||
     verification.verifierId===verification.executorId)
   throw Error("Independent verification required");
  check={passed:true,verifierId:verification.verifierId,executorId:verification.executorId};
 }
 return Object.freeze({...record,revision:record.revision+1,state:next,
  proposedFix:fix,verification:check,
  history:[...record.history,{event:next,at,...(evidenceRef?{evidenceRef}:{})}]});
}
/** Evidence-backed symptom similarity is an investigation hint, not a repair decision. */
export function findSimilarIncidents(current,history,{projectId=current?.projectId,limit=5}={}){
 valid(current);
 if(!Array.isArray(history)||history.length>1000||!ident(projectId)||
 !Number.isInteger(limit)||limit<1||limit>20)throw Error("Invalid search");
 const tokens=new Set(current.symptoms);
 return history.filter(x=>{
  valid(x);return x.projectId===projectId&&x.componentId===current.componentId&&x.id!==current.id;
 }).map(x=>{
  const shared=x.symptoms.filter(y=>tokens.has(y));
  return {incidentId:x.id,sharedSymptoms:shared,score:shared.length/
   (new Set([...current.symptoms,...x.symptoms]).size),priorStatus:x.state};
 }).filter(x=>x.sharedSymptoms.length>0)
  .sort((a,b)=>b.score-a.score||a.incidentId.localeCompare(b.incidentId))
  .slice(0,limit);
}
/**
 * Fail-closed planning, never deployment authorization. Even repeated verified
 * incidents only yield proposals. A separate authenticated policy, tests,
 * independent approval and deployment controller are required in production.
 */
export function planSelfRepair(incident,{emergencyStop=false,projectId,allowAutomaticChanges=false}={}){
 valid(incident);
 if(projectId!==incident.projectId)return {allowed:false,reason:"Project mismatch",action:"none"};
 if(emergencyStop)return {allowed:false,reason:"Emergency stop enabled",action:"none"};
 if(incident.state!=="reproduced"&&incident.state!=="repair_proposed")
  return {allowed:false,reason:"Failure must be reproduced first",action:"investigate"};
 return Object.freeze({
  allowed:false,action:"propose_only",
  reason:allowAutomaticChanges?
   "Live mutation unavailable: separate authenticated execution and verified approval required":
   "Only a reviewed, test-backed repair proposal is permitted"
 });
}
export {states as INCIDENT_STATES};
