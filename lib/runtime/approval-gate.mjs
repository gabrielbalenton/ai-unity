const nonempty = value => typeof value === "string" && value.trim().length > 0;
const protectedActions = new Set(["write", "deploy", "send"]);

export function createApprovalRequest({id, projectId, taskId, connectorId, resourceId, action, summary}) {
  if (![id, projectId, taskId, connectorId, resourceId, action, summary].every(nonempty)) {
    throw new Error("Invalid approval request");
  }
  if (!protectedActions.has(action)) throw new Error("Approval request must target a protected action");
  return Object.freeze({id, projectId, taskId, connectorId, resourceId, action, summary, status: "pending"});
}

export function suspendForApproval(task, approval) {
  if (!task || !nonempty(task.id) || !approval || approval.status !== "pending") throw new Error("Invalid suspension request");
  if (task.id !== approval.taskId || task.projectId !== approval.projectId) throw new Error("Approval scope mismatch");
  return Object.freeze({...task, state: "waiting_approval", approvalId: approval.id});
}

export function resolveApproval(approval, {decision, decidedBy, decidedAt = new Date().toISOString()}) {
  if (!approval || approval.status !== "pending" || !["approved", "denied"].includes(decision) || !nonempty(decidedBy)) {
    throw new Error("Invalid approval resolution");
  }
  return Object.freeze({...approval, status: decision, decidedBy, decidedAt});
}

export function resumeAfterApproval(task, approval) {
  if (!task || task.state !== "waiting_approval" || task.approvalId !== approval?.id) throw new Error("Task is not waiting for this approval");
  if (approval.projectId !== task.projectId || approval.taskId !== task.id) throw new Error("Approval scope mismatch");
  if (approval.status === "denied") return Object.freeze({...task, state: "cancelled", resolution: "approval_denied"});
  if (approval.status !== "approved") throw new Error("Approval is unresolved");
  return Object.freeze({...task, state: "queued", resolution: "approval_granted"});
}
