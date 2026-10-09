export const ARMY_STATUSES = Object.freeze([
  "IDLE","ASSIGNED","WORKING","WAITING","BLOCKED","REVIEWING","READY_FOR_REVIEW","PAUSED","FAILED","DONE","CANCELLED","STALE"
]);

const ACTIVE = new Set(["ASSIGNED","WORKING","WAITING","BLOCKED","REVIEWING","READY_FOR_REVIEW"]);

function text(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

export function validateArmyRoster(roster) {
  if (!roster || !Array.isArray(roster.agents) || roster.agents.length === 0) throw new TypeError("UNITY Army roster must contain agents");
  const ids = new Set();
  for (const agent of roster.agents) {
    const id = text(agent.id, "agent.id");
    if (ids.has(id)) throw new Error(`Duplicate UNITY Army agent: ${id}`);
    ids.add(id);
    if (!Array.isArray(agent.specialties) || agent.specialties.length === 0) throw new Error(`Agent ${id} requires at least one specialty`);
  }
  for (const agent of roster.agents) {
    if (agent.reportsTo !== null && !ids.has(agent.reportsTo)) throw new Error(`Agent ${agent.id} reports to unknown agent ${agent.reportsTo}`);
    if (agent.id === agent.reportsTo) throw new Error(`Agent ${agent.id} cannot report to itself`);
  }
  if (!ids.has(roster.principalAgentId)) throw new Error("Principal agent is missing from UNITY Army roster");
  return true;
}

export function canAgentAcceptArea(agent, area) {
  const requested = text(area, "area");
  if (agent.forbiddenAreas?.includes(requested)) return { allowed: false, reason: `${agent.name} is explicitly forbidden from ${requested}` };
  if (agent.allowedAreas?.includes(requested) || agent.specialties?.includes(requested)) return { allowed: true, reason: "Specialty scope matches" };
  return { allowed: false, reason: `${agent.name} is not specialized for ${requested}` };
}

export function deriveAgentStatus(state = {}, options = {}) {
  const now = Number(options.now ?? Date.now());
  const staleAfterMs = Number(options.staleAfterMs ?? 10 * 60 * 1000);
  const status = ARMY_STATUSES.includes(state.status) ? state.status : "IDLE";
  if (!ACTIVE.has(status)) return status;
  if (!state.lastHeartbeatAt) return status === "ASSIGNED" ? "ASSIGNED" : "STALE";
  const heartbeat = Date.parse(state.lastHeartbeatAt);
  if (!Number.isFinite(heartbeat) || now - heartbeat > staleAfterMs) return "STALE";
  return status;
}

export function buildArmySnapshot(roster, states = [], options = {}) {
  validateArmyRoster(roster);
  const stateById = new Map(states.map((state) => [state.agentId, state]));
  const agents = roster.agents.map((agent) => {
    const state = stateById.get(agent.id) || {};
    return {
      id: agent.id,
      name: agent.name,
      level: agent.level,
      department: agent.department,
      reportsTo: agent.reportsTo,
      specialties: [...agent.specialties],
      status: deriveAgentStatus(state, options),
      taskId: state.taskId ?? null,
      taskTitle: state.taskTitle ?? null,
      progressCurrent: Number.isFinite(state.progressCurrent) ? state.progressCurrent : null,
      progressTotal: Number.isFinite(state.progressTotal) ? state.progressTotal : null,
      lastHeartbeatAt: state.lastHeartbeatAt ?? null,
      lastAction: state.lastAction ?? null,
      blockedBy: Array.isArray(state.blockedBy) ? [...state.blockedBy] : [],
      branch: state.branch ?? null
    };
  });
  return {
    name: roster.name,
    version: roster.version,
    executionEnabled: roster.executionEnabled === true,
    principalAgentId: roster.principalAgentId,
    agents,
    summary: summarizeArmy(agents)
  };
}

export function summarizeArmy(agents) {
  const counts = Object.fromEntries(ARMY_STATUSES.map((status) => [status, 0]));
  for (const agent of agents) counts[agent.status] = (counts[agent.status] || 0) + 1;
  return {
    total: agents.length,
    active: agents.filter((agent) => ["ASSIGNED","WORKING","REVIEWING"].includes(agent.status)).length,
    waiting: counts.WAITING,
    blocked: counts.BLOCKED,
    stale: counts.STALE,
    done: counts.DONE,
    counts
  };
}

export function buildDepartmentTree(snapshot) {
  const byParent = new Map();
  for (const agent of snapshot.agents) {
    const key = agent.reportsTo ?? "ROOT";
    const bucket = byParent.get(key) || [];
    bucket.push(agent);
    byParent.set(key, bucket);
  }
  const expand = (agent) => ({ ...agent, reports: (byParent.get(agent.id) || []).map(expand) });
  return (byParent.get("ROOT") || []).map(expand);
}
