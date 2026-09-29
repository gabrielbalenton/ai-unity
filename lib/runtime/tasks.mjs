/**
 * Stateless task transition rules. Persistence, concurrency controls and a
 * trustworthy authenticated actor must be provided by a future backend.
 */
const transitions = Object.freeze({
 draft:["queued","cancelled"],
 queued:["running","cancelled"],
 running:["awaiting_approval","completed","failed","cancelled"],
 awaiting_approval:["queued","cancelled"],
 failed:["queued","cancelled"],
 completed:[],
 cancelled:[]
});
export function createTask({id,projectId,title,requiredCapability}) {
 if (![id,projectId,title,requiredCapability].every(v=>typeof v==="string"&&v.trim()))
  throw new Error("Invalid task identity");
 return Object.freeze({id,projectId,title,requiredCapability,state:"draft",revision:0,
  evidence:[],history:[]});
}
export function transitionTask(task,{state,actor,reason,evidence=[],expectedRevision,approvalId=null}) {
 if (!task || !Number.isInteger(task.revision) || expectedRevision!==task.revision)
  throw new Error("Revision conflict");
 if (!Array.isArray(transitions[task.state]) || !transitions[task.state].includes(state))
  throw new Error("Illegal task transition");
 if (typeof actor!=="string" || !actor.trim() || typeof reason!=="string" || !reason.trim() ||
     !Array.isArray(evidence) || !evidence.every(v=>typeof v==="string"&&v.trim()))
  throw new Error("Missing actor or task evidence");
 if (state==="completed" && evidence.length===0)
  throw new Error("Task completion requires verifiable evidence references");
 if (task.state==="awaiting_approval" && state==="queued" &&
    !(typeof approvalId==="string" && approvalId.trim()))
  throw new Error("Approval checkpoint is required");
 const event={from:task.state,to:state,actor,reason,evidence:[...evidence],approvalId};
 return Object.freeze({...task,state,revision:task.revision+1,
  evidence:[...(task.evidence||[]),...evidence],history:[...(task.history||[]),event]});
}
