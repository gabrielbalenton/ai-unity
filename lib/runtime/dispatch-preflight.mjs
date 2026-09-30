/**
 * Final offline dispatch gate between a leased task and an authorized adapter.
 * This function returns a PLAN ONLY. No network requests, tools or model calls.
 * Production must re-run equivalent checks with a signed actor, live connector
 * permissions, transactional approval consumption and authoritative billing.
 */
import {evaluateExecution} from "./policy.mjs";
const deny=reason=>Object.freeze({allowed:false,reason,executionEnabled:false});
export function planLeasedDispatch({job,projectId,workerId,revision,now,request,policy,connections,emergencyStop=false}){
 if(!job||typeof job!=="object"||!Number.isInteger(job.revision)||
   !Number.isInteger(now)||now<0)return deny("Invalid leased job");
 if(job.projectId!==projectId||job.state!=="leased"||job.workerId!==workerId)
  return deny("Leased job, project or worker identity mismatch");
 if(revision!==job.revision||!Number.isInteger(job.leaseUntil)||now>=job.leaseUntil)
  return deny("Stale or expired worker lease");
 if(emergencyStop||policy?.emergencyStop===true)return deny("Emergency stop blocks dispatch");
 if(!request||request.projectId!==projectId||request.resourceId==null||
   typeof request.action!=="string"||request.connectorId==null)
  return deny("Invalid connector dispatch target");
 if(!Array.isArray(connections))return deny("Invalid connector grants");
 const result=evaluateExecution(request,policy,connections);
 if(!result.allowed)return deny(result.reason);
 return Object.freeze({allowed:true,reason:"Offline preflight passed; live adapter must reauthorize",
  executionEnabled:false,jobId:job.id,revision,projectId,request:{
   connectorId:request.connectorId,resourceId:request.resourceId,action:request.action
  }});
}
