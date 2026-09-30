/**
 * UNITY durable job lifecycle contract (OFFLINE ONLY).
 * In production, every transition must run in an atomic DB transaction and
 * the caller's identity/project permissions must be independently verified.
 * This module NEVER executes a tool, model, network request or billable action.
 */
const states=Object.freeze(["queued","leased","awaiting_verification","verified","retry_wait","dead","cancelled"]);
const ident=value=>typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,100}$/.test(value);
const moment=value=>Number.isInteger(value)&&value>=0;
const ensure=(condition,message)=>{if(!condition)throw Error(message)};
const copy=job=>({...job,history:[...job.history]});
const checkRevision=(job,revision)=>{
 ensure(job&&typeof job==="object"&&moment(job.revision),"Invalid job");
 ensure(revision===job.revision,"Job revision conflict");
};
const noLease={workerId:null,leaseUntil:null};
const history=(job,event)=>[...job.history,event];
export function createQueuedJob({id,projectId,taskId,capability,idempotencyKey,createdAt,maxAttempts=3}){
 ensure([id,projectId,taskId,capability,idempotencyKey].every(ident),"Invalid job identity");
 ensure(moment(createdAt),"Invalid creation timestamp");
 ensure(Number.isInteger(maxAttempts)&&maxAttempts>=1&&maxAttempts<=10,"Invalid retry policy");
 return Object.freeze({
  id,projectId,taskId,capability,idempotencyKey,createdAt,state:"queued",
  revision:0,attempts:0,maxAttempts,workerId:null,leaseUntil:null,
  runAfter:createdAt,evidenceRefs:[],verificationResult:null,history:[]
 });
}
export function enqueueUnique(existing,input){
 ensure(Array.isArray(existing),"Invalid existing queue");
 const candidate=createQueuedJob(input);
 const duplicate=existing.find(job=>job.projectId===candidate.projectId&&
   job.idempotencyKey===candidate.idempotencyKey);
 if(duplicate){
  ensure(duplicate.taskId===candidate.taskId&&duplicate.capability===candidate.capability,
   "Idempotency key collision with different operation");
  return {job:duplicate,created:false};
 }
 ensure(!existing.some(job=>job.id===candidate.id),"Duplicate job ID");
 return {job:candidate,created:true};
}
export function claimJob(job,{projectId,workerId,revision,now,leaseMs=60_000,emergencyStop=false}){
 checkRevision(job,revision);
 ensure(projectId===job.projectId,"Project scope mismatch");
 ensure(ident(workerId),"Invalid worker identity");
 ensure(moment(now)&&Number.isInteger(leaseMs)&&leaseMs>=1000&&leaseMs<=300_000,"Invalid lease parameters");
 ensure(emergencyStop!==true,"Emergency stop blocks all new leases");
 ensure(["queued","retry_wait"].includes(job.state)&&job.runAfter<=now,"Job not claimable");
 ensure(job.attempts<job.maxAttempts,"Job retry limit reached");
 const next={...copy(job),state:"leased",revision:job.revision+1,attempts:job.attempts+1,
  workerId,leaseUntil:now+leaseMs,
  history:history(job,{kind:"claimed",at:now,workerId,attempt:job.attempts+1})};
 return Object.freeze(next);
}
export function heartbeatJob(job,{projectId,workerId,revision,now,leaseMs=60_000,emergencyStop=false}){
 checkRevision(job,revision);
 ensure(projectId===job.projectId&&workerId===job.workerId,"Worker/project mismatch");
 ensure(!emergencyStop,"Emergency stop blocks renewed leases");
 ensure(job.state==="leased"&&moment(now)&&now<job.leaseUntil,"No live lease");
 ensure(Number.isInteger(leaseMs)&&leaseMs>=1000&&leaseMs<=300_000,"Invalid lease length");
 return Object.freeze({...copy(job),revision:job.revision+1,leaseUntil:now+leaseMs,
  history:history(job,{kind:"heartbeat",at:now,workerId})});
}
export function submitJobEvidence(job,{projectId,workerId,revision,now,evidenceRefs}){
 checkRevision(job,revision);
 ensure(job.projectId===projectId&&job.workerId===workerId,"Worker/project mismatch");
 ensure(job.state==="leased"&&moment(now)&&now<job.leaseUntil,"No live lease");
 ensure(Array.isArray(evidenceRefs)&&evidenceRefs.length>=1&&evidenceRefs.length<=20&&
   evidenceRefs.every(ident),"Evidence reference required");
 return Object.freeze({...copy(job),...noLease,revision:job.revision+1,state:"awaiting_verification",
  evidenceRefs:[...new Set(evidenceRefs)],
  history:history(job,{kind:"evidence_submitted",at:now,workerId,claimCount:evidenceRefs.length})});
}
export function verifyJob(job,{projectId,verifierId,revision,now,passed,evidenceRefs}){
 checkRevision(job,revision);
 ensure(projectId===job.projectId&&ident(verifierId),"Verifier/project mismatch");
 ensure(job.state==="awaiting_verification"&&moment(now),"Job is not awaiting verification");
 ensure(typeof passed==="boolean","Invalid verification result");
 ensure(Array.isArray(evidenceRefs)&&evidenceRefs.length>=1&&evidenceRefs.every(ident),
  "Independent evidence references required");
 const nextState=passed?"verified":"dead";
 return Object.freeze({...copy(job),revision:job.revision+1,state:nextState,
  verificationResult:{passed,verifierId,evidenceRefs:[...new Set(evidenceRefs)],verifiedAt:now},
  history:history(job,{kind:passed?"independently_verified":"verification_rejected",at:now,verifierId})});
}
export function failJob(job,{projectId,workerId,revision,now,retryable,emergencyStop=false}){
 checkRevision(job,revision);
 ensure(job.projectId===projectId&&job.workerId===workerId,"Worker/project mismatch");
 ensure(job.state==="leased"&&moment(now)&&now<job.leaseUntil,"No live lease");
 ensure(typeof retryable==="boolean","Invalid failure classification");
 const shouldRetry=retryable&&job.attempts<job.maxAttempts&&!emergencyStop;
 const nextState=shouldRetry?"retry_wait":"dead";
 // Capped deterministic backoff; not a guarantee that a provider request is
 // idempotent. Every real adapter still needs provider-specific idempotency.
 const delay=shouldRetry?Math.min(2**(job.attempts-1)*60_000,600_000):0;
 return Object.freeze({...copy(job),...noLease,revision:job.revision+1,
  state:nextState,runAfter:shouldRetry?now+delay:job.runAfter,
  history:history(job,{kind:nextState==="retry_wait"?"retry_scheduled":"failed_permanently",at:now,workerId,attempt:job.attempts})});
}
export function recoverExpiredJob(job,{projectId,revision,now,emergencyStop=false}){
 checkRevision(job,revision);
 ensure(projectId===job.projectId,"Project scope mismatch");
 ensure(moment(now)&&job.state==="leased"&&now>=job.leaseUntil,"Lease is still active");
 const retry=job.attempts<job.maxAttempts&&!emergencyStop;
 return Object.freeze({...copy(job),...noLease,revision:job.revision+1,
  state:retry?"retry_wait":"dead",runAfter:retry?now+60_000:job.runAfter,
  history:history(job,{kind:retry?"expired_lease_recovery":"expired_lease_dead",at:now})});
}
export function cancelJob(job,{projectId,revision,now,actorId}){
 checkRevision(job,revision);
 ensure(job.projectId===projectId&&ident(actorId)&&moment(now),"Invalid cancel request");
 ensure(["queued","retry_wait","leased"].includes(job.state),"Job cannot be cancelled at this stage");
 return Object.freeze({...copy(job),...noLease,state:"cancelled",revision:job.revision+1,
  history:history(job,{kind:"cancelled",at:now,actorId})});
}
export {states as JOB_STATES};
