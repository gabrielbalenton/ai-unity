/**
 * Durable worker contract. Every backend method is a required server-owned
 * implementation; this module NEVER claims or mutates an actual queue alone.
 */
const validId=id=>typeof id==="string"&&/^[a-zA-Z0-9_.:-]{3,120}$/.test(id);
export function retryDecision({jobType,attempt,maxAttempts,ambiguity}){
 if(!["read_only","external_operation"].includes(jobType)||
   !Number.isInteger(attempt)||attempt<0||!Number.isInteger(maxAttempts)||
   maxAttempts<1||maxAttempts>10)throw Error("Invalid retry state");
 // A mutating external action might have succeeded before a network failure.
 if(jobType==="external_operation"||ambiguity===true)
  return {action:"manual_review",delaySeconds:null,reason:"Unverified external side effects cannot be replayed automatically"};
 if(attempt>=maxAttempts)
  return {action:"dead_letter",delaySeconds:null,reason:"Retry allowance exhausted"};
 return {action:"retry",delaySeconds:Math.min(3600,15*(2**attempt)),reason:"Bounded read-only retry"};
}
export async function runOneWorkerCycle({
 workerId,capabilities,backend,authorize,execute,verify,
 maxLeaseSeconds=120
}={}){
 if(!validId(workerId)||!Array.isArray(capabilities)||capabilities.length===0||
   !capabilities.every(validId)||!backend||typeof backend.claim!=="function"||
   typeof backend.complete!=="function"||typeof backend.fail!=="function"||
   typeof authorize!=="function"||typeof execute!=="function"||
   typeof verify!=="function"||!Number.isInteger(maxLeaseSeconds)||
   maxLeaseSeconds<15||maxLeaseSeconds>300)
   throw Error("Worker dependencies are not configured");
 const job=await backend.claim({workerId,capabilities,maxLeaseSeconds});
 if(job===null)return {status:"idle",jobId:null};
 if(!job||!validId(job.id)||!validId(job.projectId)||
   !validId(job.capability)||!capabilities.includes(job.capability)||
   !["read_only","external_operation"].includes(job.jobType)||
   !Number.isInteger(job.revision)||job.revision<1)
  throw Error("Claimed job was invalid");
 try{
  // Always reauthorize against CURRENT account/project/permission state. This
  // cannot be the same LLM or tool that asks to perform the operation.
  const permission=await authorize({job,workerId});
  if(permission?.allowed!==true)throw Error("Dispatch authorization denied");
  const result=await execute({job,workerId,permission});
  const proof=await verify({job,result,workerId});
  if(proof?.verified!==true||!Array.isArray(proof.evidenceRefs)||
     proof.evidenceRefs.length<1||!proof.evidenceRefs.every(validId))
   throw Error("Completion evidence was not independently verified");
  const stored=await backend.complete({
   workerId,jobId:job.id,projectId:job.projectId,expectedRevision:job.revision,
   evidenceRefs:proof.evidenceRefs
  });
  if(stored!==true)throw Error("Durable completion was not confirmed");
  return {status:"completed",jobId:job.id,evidenceRefs:proof.evidenceRefs};
 }catch{
  const decision=retryDecision({
   jobType:job.jobType,attempt:job.attempt,maxAttempts:job.maxAttempts,
   // Unless proven otherwise, assume the executor may have performed an
   // external side effect even when it threw or returned no answer.
   ambiguity:job.jobType==="external_operation"
  });
  try{
   await backend.fail({workerId,jobId:job.id,projectId:job.projectId,
    expectedRevision:job.revision,decision});
  }catch{/* Keep the lease for operator-controlled recovery; no second dispatch. */}
  return {status:decision.action==="retry"?"retry_scheduled":
   decision.action==="dead_letter"?"dead_letter":"manual_review",jobId:job.id};
 }
}
