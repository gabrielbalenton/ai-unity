import { summarizeArmy } from "./control-plane.mjs";

export function buildArmyReport(snapshot, events = []) {
  const summary = summarizeArmy(snapshot.agents);
  const noteworthy = events
    .filter((event) => ["BLOCKED","FAILED","READY_FOR_REVIEW","DONE","PAUSED","STALE"].includes(event.type))
    .slice(-20)
    .map((event) => ({ agentId: event.agentId, type: event.type, message: event.message, at: event.at }));
  return {
    generatedAt: new Date().toISOString(),
    executionEnabled: snapshot.executionEnabled,
    summary,
    noteworthy,
    requiresAttention: summary.blocked > 0 || summary.stale > 0 || noteworthy.some((event) => event.type === "FAILED")
  };
}

export function shouldNotifyArmyEvent(event) {
  return ["BLOCKED","FAILED","READY_FOR_REVIEW","DONE","PAUSED","STALE"].includes(event?.type);
}
