const nonempty = value => typeof value === "string" && value.trim().length > 0;
const protectedActions = new Set(["write", "deploy", "send"]);
const DEFAULT_APPROVAL_TTL_MS = 15 * 60 * 1000;

const toEpoch = value => {
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) throw new Error("Invalid approval timestamp");
  return epoch;
};

const isExpiredAt = (approval, at) => toEpoch(at) >= toEpoch(approval.expiresAt);

export function createApprovalRequest({
  id,
  projectId,
  taskId,
  connectorId,
  resourceId,
  action,
  summary,
  requestedAt = new Date().toISOString(),
  expiresAt
}) {
  if (![id, projectId, taskId, connectorId, resourceId, action, summary].every(nonempty)) {
    throw new Error("Invalid approval request");
  }
  if (!protectedActions.has(action)) throw new Error("Approval request must target a protected action");

  const requestedEpoch = toEpoch(requestedAt);
  const resolvedExpiresAt = expiresAt ?? new Date(requestedEpoch + DEFAULT_APPROVAL_TTL_MS).toISOString();
  if (toEpoch(resolvedExpiresAt) <= requestedEpoch) throw new Error("Approval expiry must be after request time");

  return Object.freeze({
    id,
    projectId,
    taskId,
    connectorId,
    resourceId,
    action,
    summary,
    requestedAt,
    expiresAt: resolvedExpiresAt,
    status: "pending"
  });
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
  if (!nonempty(approval.expiresAt)) throw new Error("Approval expiry is missing");
  if (isExpiredAt(approval, decidedAt)) throw new Error("Approval request expired");
  return Object.freeze({...approval, status: decision, decidedBy, decidedAt});
}

export function resumeAfterApproval(task, approval, {resumedAt = new Date().toISOString()} = {}) {
  if (!task || task.state !== "waiting_approval" || task.approvalId !== approval?.id) throw new Error("Task is not waiting for this approval");
  if (approval.projectId !== task.projectId || approval.taskId !== task.id) throw new Error("Approval scope mismatch");
  if (approval.status === "denied") return Object.freeze({...task, state: "cancelled", resolution: "approval_denied"});
  if (approval.status !== "approved") throw new Error("Approval is unresolved");
  if (!nonempty(approval.expiresAt)) throw new Error("Approval expiry is missing");
  if (isExpiredAt(approval, resumedAt)) throw new Error("Approval expired before execution resumed");
  return Object.freeze({...task, state: "queued", resolution: "approval_granted"});
}
