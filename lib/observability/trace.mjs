const nonempty = value => typeof value === "string" && value.trim().length > 0;
const nowIso = () => new Date().toISOString();

export function createTrace({traceId, projectId, taskId, actor = "unity", startedAt = nowIso(), metadata = {}}) {
  if (![traceId, projectId, taskId, actor].every(nonempty)) throw new Error("Invalid trace identity");
  return Object.freeze({traceId, projectId, taskId, actor, startedAt, metadata: Object.freeze({...metadata})});
}

export function createTraceEvent(trace, {name, status = "ok", connectorId = null, resourceId = null, costUsd = 0, attributes = {}, at = nowIso()}) {
  if (!trace || !nonempty(trace.traceId) || !nonempty(name)) throw new Error("Invalid trace event");
  if (!["ok", "error", "blocked", "pending"].includes(status)) throw new Error("Invalid trace status");
  if (typeof costUsd !== "number" || !Number.isFinite(costUsd) || costUsd < 0) throw new Error("Invalid trace cost");
  return Object.freeze({
    traceId: trace.traceId,
    projectId: trace.projectId,
    taskId: trace.taskId,
    name,
    status,
    connectorId,
    resourceId,
    costUsd,
    attributes: Object.freeze({...attributes}),
    at
  });
}

export function summarizeTrace(trace, events = []) {
  if (!trace || !Array.isArray(events)) throw new Error("Invalid trace summary input");
  const scoped = events.filter(event => event && event.traceId === trace.traceId);
  return Object.freeze({
    traceId: trace.traceId,
    projectId: trace.projectId,
    taskId: trace.taskId,
    eventCount: scoped.length,
    blockedCount: scoped.filter(event => event.status === "blocked").length,
    errorCount: scoped.filter(event => event.status === "error").length,
    totalCostUsd: scoped.reduce((sum, event) => sum + (event.costUsd || 0), 0),
    finished: scoped.some(event => event.name === "task.completed" && event.status === "ok")
  });
}
