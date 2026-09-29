/**
 * Deterministic mission blueprint; no actual tools are invoked.
 * A future durable executor must verify every step against current, live policy.
 */
export function defineMission({id,projectId,title,steps}) {
 if(typeof id!=="string"||!id.trim()||typeof projectId!=="string"||
  !projectId.trim()||typeof title!=="string"||title.trim().length<3||
  !Array.isArray(steps)||steps.length<1||steps.length>30)
  throw new Error("Invalid mission specification");
 const ids=new Set();
 const clean=steps.map((s,i)=>{
  if(!s||typeof s.id!=="string"||!/^[a-z0-9_-]{2,80}$/.test(s.id)||
    ids.has(s.id)||typeof s.capability!=="string"||!s.capability.trim()||
    !Array.isArray(s.dependsOn)||s.dependsOn.length>30)
   throw new Error("Invalid or repeated mission step");
  ids.add(s.id);
  return {id:s.id,capability:s.capability,dependsOn:[...s.dependsOn],
   requiresApproval:s.requiresApproval===true,status:"planned"};
 });
 // Require dependencies to reference earlier steps; this prohibits cycles.
 const seen=new Set();
 for(const step of clean){
  if(step.dependsOn.some(d=>!seen.has(d)))throw new Error("Missing, forward or cyclic dependency");
  seen.add(step.id);
 }
 return Object.freeze({id,projectId,title,steps:clean,executionEnabled:false,
  notice:"Blueprint only; no external tools or models have been invoked."});
}
