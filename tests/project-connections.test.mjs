import test from "node:test";
import assert from "node:assert/strict";
import {
  createProjectConnectionBundle,
  resolveProjectConnections,
  allowedActionsForMode,
  effectiveConnectorActions
} from "../lib/infrastructure/project-connections.mjs";

const records = [
  {
    id: "github-fpx",
    projectId: "fpx",
    provider: "github",
    status: "active",
    allowedActions: ["discover", "read", "propose", "write"]
  },
  {
    id: "vercel-fpx",
    projectId: "fpx",
    provider: "vercel",
    status: "active",
    allowedActions: ["discover", "read", "deploy"]
  },
  {
    id: "supabase-pebble",
    projectId: "pebble",
    provider: "supabase",
    status: "active",
    allowedActions: ["discover", "read", "write"]
  }
];

test("builds a project bundle without storing credentials", () => {
  const bundle = createProjectConnectionBundle({
    projectId: "fpx",
    mode: "audit",
    connections: { github: "github-fpx", vercel: "vercel-fpx" }
  });
  assert.deepEqual(bundle.connections, { github: "github-fpx", vercel: "vercel-fpx" });
  assert.equal(Object.hasOwn(bundle, "token"), false);
});

test("blocks connector records belonging to another project", () => {
  const bundle = createProjectConnectionBundle({
    projectId: "fpx",
    connections: { supabase: "supabase-pebble" }
  });
  assert.throws(() => resolveProjectConnections(bundle, records), /Cross-project connector blocked/);
});

test("audit mode cannot write or deploy", () => {
  assert.deepEqual(allowedActionsForMode("audit"), ["discover", "read"]);
});

test("development mode does not include production deployment", () => {
  assert.deepEqual(allowedActionsForMode("development"), ["discover", "read", "propose", "write"]);
});

test("effective actions are the intersection of mode and connector grant", () => {
  const bundle = createProjectConnectionBundle({
    projectId: "fpx",
    mode: "audit",
    connections: { github: "github-fpx", vercel: "vercel-fpx" }
  });
  const resolved = resolveProjectConnections(bundle, records);
  const actions = effectiveConnectorActions(resolved);
  assert.deepEqual(actions.github, ["discover", "read"]);
  assert.deepEqual(actions.vercel, ["discover", "read"]);
});
