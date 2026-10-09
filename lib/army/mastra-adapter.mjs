import { validateArmyRoster } from "./control-plane.mjs";

export function buildMastraSupervisorPlan(roster) {
  validateArmyRoster(roster);
  const children = new Map();
  for (const agent of roster.agents) {
    const bucket = children.get(agent.reportsTo) || [];
    bucket.push(agent.id);
    children.set(agent.reportsTo, bucket);
  }
  return {
    orchestrator: "mastra",
    executionEnabled: false,
    principalAgentId: roster.principalAgentId,
    agents: roster.agents.map((agent) => ({
      id: agent.id,
      role: agent.name,
      reportsTo: agent.reportsTo,
      subagents: children.get(agent.id) || [],
      instructions: [
        `Stay inside these specialties: ${agent.specialties.join(", ")}.`,
        `Allowed areas: ${(agent.allowedAreas || []).join(", ") || "none"}.`,
        `Forbidden areas: ${(agent.forbiddenAreas || []).join(", ") || "none"}.`,
        "Do not merge, deploy, send, or perform production writes without the Principal Engineer and required human approval."
      ].join(" ")
    })),
    note: "Adapter contract only. Live Mastra agent execution remains disabled until model providers, durable execution, persistence and approvals are connected."
  };
}
