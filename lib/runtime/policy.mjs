/**
 * UNITY policy core. Pure deterministic preflight. This is NOT authorization by itself:
 * every live tool adapter must check authenticated ownership and service-level credentials.
 * Unknown provider prices, missing project grants and missing approvals fail closed.
 */
const own = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key);
const nonempty = v => typeof v === "string" && v.trim().length > 0;
const validMoney = n => typeof n === "number" && Number.isFinite(n) && n >= 0;
export const ACTIONS = Object.freeze(["discover", "read", "propose", "write", "deploy", "send"]);
export function evaluateExecution(request, policy, connections = []) {
 const deny = reason => Object.freeze({ allowed: false, reason });
 if (!request || typeof request !== "object" || !policy || typeof policy !== "object")
  return deny("Invalid request or policy");
 if (!nonempty(request.projectId) || !nonempty(request.connectorId) ||
     !ACTIONS.includes(request.action)) return deny("Invalid target or action");
 if (policy.emergencyStop === true) return deny("Emergency stop is enabled");
 if (policy.projectId !== request.projectId) return deny("Project scope mismatch");
 const connection = connections.find(c => c && c.id === request.connectorId &&
   c.projectId === request.projectId && c.status === "authorized");
 if (!connection) return deny("Connector is not authorized for this project");
 if (!Array.isArray(connection.actions) || !connection.actions.includes(request.action))
  return deny("Requested operation exceeds connector permissions");
 if (!nonempty(request.resourceId) || !Array.isArray(connection.resources) ||
     !connection.resources.includes(request.resourceId))
  return deny("Target resource is not authorized");
 if (["write","deploy","send"].includes(request.action) &&
     !(nonempty(request.approvalId) && Array.isArray(policy.approvedOperations) &&
       policy.approvedOperations.includes(request.approvalId)))
  return deny("Explicit operation approval required");
 if (request.estimatedPaidUsd !== undefined || request.usesPaidProvider === true ||
     request.type === "model_inference") {
  if (!validMoney(policy.maxPaidUsd) || !validMoney(request.estimatedPaidUsd))
   return deny("Unknown spending policy or request cost");
  if (!validMoney(policy.spentPaidUsd)) return deny("Unknown recorded spend");
  // The caller must separately verify actual provider billing eligibility.
  if (policy.spentPaidUsd + request.estimatedPaidUsd > policy.maxPaidUsd)
   return deny("Request exceeds authorized spending limit");
  if (request.type === "model_inference" && request.freeEligibilityVerified !== true &&
      policy.maxPaidUsd === 0)
   return deny("Free inference eligibility has not been verified");
 }
 return Object.freeze({allowed:true,reason:"Preflight passed; adapter authorization and billing checks still required"});
}
