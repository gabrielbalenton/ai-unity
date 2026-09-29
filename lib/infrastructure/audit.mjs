/**
 * Redact structured events BEFORE persistence. Do not log raw model prompts or
 * untrusted tool payloads; allowlisted fields avoid accidental credential leaks.
 */
const id = v => typeof v==="string" && /^[a-zA-Z0-9_.:-]{1,120}$/.test(v);
const action = v => typeof v==="string" && /^[a-z][a-z0-9_-]{1,60}$/.test(v);
export function createAuditEvent({eventId,projectId,actorId,actionName,resourceType,
 resourceId,outcome,evidenceIds=[],occurredAt}) {
 if(!id(eventId)||!id(projectId)||!id(actorId)||!action(actionName)||
  !action(resourceType)||!id(resourceId)||!["allowed","blocked","proposed","failed","completed"].includes(outcome)||
  !Array.isArray(evidenceIds)||evidenceIds.length>25||!evidenceIds.every(id)||
  !occurredAt||Number.isNaN(Date.parse(occurredAt)))
  throw new Error("Invalid audit event");
 return Object.freeze({
  eventId,projectId,actorId,actionName,resourceType,resourceId,outcome,
  evidenceIds:[...evidenceIds],occurredAt
 });
}
export function sanitizeDiagnostic(error) {
 // Do not attempt to regex-redact secret-bearing arbitrary error messages.
 // Error strings can contain credentials, URL query parameters or user content.
 return Object.freeze({code:"INTERNAL_ERROR",message:"Operation failed; consult restricted server diagnostics."});
}
