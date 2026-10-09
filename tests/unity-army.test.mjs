import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildArmySnapshot, canAgentAcceptArea, deriveAgentStatus, validateArmyRoster } from "../lib/army/control-plane.mjs";
import { buildMastraSupervisorPlan } from "../lib/army/mastra-adapter.mjs";
import { buildArmyReport, shouldNotifyArmyEvent } from "../lib/army/reporting.mjs";

const roster = JSON.parse(fs.readFileSync(new URL("../config/unity-army-roster.json", import.meta.url), "utf8"));

test("UNITY Army roster has one valid principal and valid reporting lines", () => {
  assert.equal(validateArmyRoster(roster), true);
  assert.equal(roster.agents.filter((a) => a.level === "principal").length, 1);
  assert.equal(roster.principalAgentId, "principal-engineer");
});

test("specialists reject work outside their specialty", () => {
  const oauth = roster.agents.find((a) => a.id === "oauth-engineer");
  assert.equal(canAgentAcceptArea(oauth, "oauth").allowed, true);
  assert.equal(canAgentAcceptArea(oauth, "visual-design").allowed, false);
  const supabase = roster.agents.find((a) => a.id === "supabase-engineer");
  assert.equal(canAgentAcceptArea(supabase, "supabase").allowed, true);
  assert.equal(canAgentAcceptArea(supabase, "oauth-protocol").allowed, false);
});

test("working agent with expired heartbeat becomes stale", () => {
  const now = Date.parse("2026-10-09T01:00:00Z");
  assert.equal(deriveAgentStatus({ status:"WORKING", lastHeartbeatAt:"2026-10-09T00:59:00Z" }, { now, staleAfterMs:120000 }), "WORKING");
  assert.equal(deriveAgentStatus({ status:"WORKING", lastHeartbeatAt:"2026-10-09T00:50:00Z" }, { now, staleAfterMs:120000 }), "STALE");
  assert.equal(deriveAgentStatus({ status:"PAUSED", lastHeartbeatAt:null }, { now }), "PAUSED");
});

test("snapshot is honest when no workers are connected", () => {
  const snapshot = buildArmySnapshot(roster, []);
  assert.equal(snapshot.executionEnabled, false);
  assert.equal(snapshot.summary.active, 0);
  assert.ok(snapshot.agents.every((a) => a.status === "IDLE"));
});

test("Mastra adapter preserves hierarchy but stays inert", () => {
  const plan = buildMastraSupervisorPlan(roster);
  assert.equal(plan.orchestrator, "mastra");
  assert.equal(plan.executionEnabled, false);
  assert.ok(plan.agents.find((a) => a.id === "lead-integrations").subagents.includes("oauth-engineer"));
});

test("army reports flag meaningful events", () => {
  const snapshot = buildArmySnapshot(roster, [{ agentId:"oauth-engineer", status:"BLOCKED", lastHeartbeatAt:"2026-10-09T00:00:00Z" }], { now:Date.parse("2026-10-09T00:01:00Z") });
  const report = buildArmyReport(snapshot, [{ agentId:"oauth-engineer", type:"BLOCKED", message:"Waiting for provider contract", at:"2026-10-09T00:01:00Z" }]);
  assert.equal(report.requiresAttention, true);
  assert.equal(shouldNotifyArmyEvent({ type:"BLOCKED" }), true);
  assert.equal(shouldNotifyArmyEvent({ type:"WORKING" }), false);
});
