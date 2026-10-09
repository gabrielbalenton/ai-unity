const PROTECTED = new Set(["production-write","deploy","send","paid-inference","secret-access","cross-project","architecture-change","owner-decision"]);

export function classifyArmyStatus(agent) {
  switch (agent?.status) {
    case "WORKING": case "ASSIGNED": case "REVIEWING": return "WORKING";
    case "WAITING": case "PAUSED": case "READY_FOR_REVIEW": return "PAUSED";
    case "BLOCKED": case "FAILED": case "STALE": case "CANCELLED": return "STOPPED";
    case "DONE": return "FINISHED";
    default: return "IDLE";
  }
}

export function decideNextArmyAction(agent, context = {}) {
  const displayStatus = classifyArmyStatus(agent);
  const blockers = Array.isArray(agent?.blockedBy) ? agent.blockedBy : [];
  const protectedReason = context.protectedReason || blockers.find((item) => PROTECTED.has(item));

  if (protectedReason) {
    return {
      decision: "NEEDS_GABRIEL",
      action: "PAUSE",
      reason: context.reason || `Gabriel approval required: ${protectedReason}`,
      mayAutoContinue: false
    };
  }

  if (displayStatus === "WORKING") return { decision:"KEEP_WORKING", action:"CONTINUE", reason:"Task is active with a fresh heartbeat", mayAutoContinue:true };
  if (displayStatus === "PAUSED") {
    if (context.dependencyReady === true) return { decision:"RESUME", action:"CONTINUE", reason:"Dependency is ready and no owner decision is required", mayAutoContinue:true };
    return { decision:"WAIT", action:"PAUSE", reason:context.reason || "Waiting for dependency, review, or task input", mayAutoContinue:false };
  }
  if (displayStatus === "STOPPED") {
    if (context.recoverable === true && Number(context.retryCount || 0) < Number(context.maxRetries || 2)) {
      return { decision:"RECOVER", action:"RETRY_OR_REASSIGN", reason:context.reason || "Recoverable failure within bounded retry policy", mayAutoContinue:true };
    }
    return { decision:"ESCALATE", action:"STOP", reason:context.reason || "Blocked, failed, stale, or cancelled; lead review required", mayAutoContinue:false };
  }
  if (displayStatus === "FINISHED") {
    if (context.nextApprovedTask) return { decision:"ASSIGN_NEXT", action:"ASSIGN", reason:`Next approved task: ${context.nextApprovedTask}`, mayAutoContinue:true };
    return { decision:"WAIT_FOR_WORK", action:"IDLE", reason:"Finished current task; no approved next task is queued", mayAutoContinue:false };
  }
  if (context.nextApprovedTask) return { decision:"ASSIGN_NEXT", action:"ASSIGN", reason:`Next approved task: ${context.nextApprovedTask}`, mayAutoContinue:true };
  return { decision:"IDLE", action:"IDLE", reason:"No approved task assigned", mayAutoContinue:false };
}

export function buildArmyReport(snapshot, contexts = {}) {
  const items = snapshot.agents.map((agent) => {
    const decision = decideNextArmyAction(agent, contexts[agent.id] || {});
    return {
      agentId:agent.id,
      name:agent.name,
      department:agent.department,
      status:classifyArmyStatus(agent),
      task:agent.taskTitle || null,
      reason:decision.reason,
      gmDecision:decision.decision,
      needsGabriel:decision.decision === "NEEDS_GABRIEL"
    };
  });
  return {
    generatedAt:new Date().toISOString(),
    working:items.filter((x)=>x.status==="WORKING"),
    paused:items.filter((x)=>x.status==="PAUSED"),
    stopped:items.filter((x)=>x.status==="STOPPED"),
    finished:items.filter((x)=>x.status==="FINISHED"),
    decisions:items.filter((x)=>x.needsGabriel),
    items
  };
}
