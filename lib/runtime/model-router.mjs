import {evaluateExecution} from "./policy.mjs";
/**
 * Provider-neutral inference PLANNER. Deliberately has no network calls and
 * never executes generated plans. Catalog discovery alone is not authorization.
 */
const validId = v => typeof v==="string" && v.trim().length>0;
export function planModelRequest({projectId,taskId,capability,models,connections,policy}) {
 if (![projectId,taskId,capability].every(validId) || !Array.isArray(models) ||
    !Array.isArray(connections) || !policy) throw new Error("Invalid model routing request");
 const rejected=[];
 const options=[];
 for (const m of models) {
  if (!m || !validId(m.id) || !validId(m.connectorId) ||
      !Array.isArray(m.capabilities) || !m.capabilities.includes(capability)) continue;
  const request={
   projectId,connectorId:m.connectorId,resourceId:m.id,
   action:"read",type:"model_inference",estimatedPaidUsd:m.estimatedPaidUsd,
   freeEligibilityVerified:m.freeEligibilityVerified===true
  };
  const decision=evaluateExecution(request,policy,connections);
  if (!decision.allowed){rejected.push({id:m.id,reason:decision.reason});continue}
  options.push({id:m.id,connectorId:m.connectorId,
   estimatedPaidUsd:m.estimatedPaidUsd,freeEligibilityVerified:m.freeEligibilityVerified===true,
   // Catalog order is deterministic; prefer authorized lower-cost options.
   priority:Number.isInteger(m.priority)&&m.priority>=0?m.priority:1000});
 }
 options.sort((a,b)=>a.estimatedPaidUsd-b.estimatedPaidUsd||a.priority-b.priority||a.id.localeCompare(b.id));
 const chosen=options[0] ?? null;
 return {taskId,projectId,capability,chosen,rejected,
  executionEnabled:false,
  notice:chosen
   ?"Planning result only. Server-side authorization, live quota checking and adapter execution are not implemented."
   :"No eligible model available within permissions and cost policy."};
}
