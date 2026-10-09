import test from "node:test";
import assert from "node:assert/strict";
import { createToolInventory, planToolUse } from "../lib/runtime/tool-registry.mjs";

const inventory = createToolInventory([
  { id: "github.read-file", provider: "github", name: "Read file", action: "read", capability: "repository:file-read" },
  { id: "github.write-file", provider: "github", name: "Write file", action: "write", capability: "repository:file-write" },
  { id: "vercel.deploy", provider: "vercel", name: "Deploy project", action: "deploy", capability: "deployment:create" }
]);

const bundle = {
  projectId: "fpx",
  mode: "audit",
  connectors: {
    github: {
      id: "github-fpx",
      projectId: "fpx",
      provider: "github",
      resourceIds: ["repo:fpx"],
      allowedActions: ["discover", "read", "write"]
    },
    vercel: {
      id: "vercel-fpx",
      projectId: "fpx",
      provider: "vercel",
      resourceIds: ["project:fpx"],
      allowedActions: ["discover", "read", "deploy"]
    }
  }
};

test("tool definitions are inert and protected actions are classified", () => {
  assert.equal(inventory[0].executable, false);
  assert.equal(inventory[0].protected, false);
  assert.equal(inventory[1].protected, true);
  assert.equal(inventory[2].protected, true);
});

test("read tool can be planned against the exact project resource", () => {
  const plan = planToolUse({
    projectId: "fpx",
    toolId: "github.read-file",
    resourceId: "repo:fpx",
    inventory,
    resolvedBundle: bundle,
    effectiveActions: { github: ["discover", "read"], vercel: ["discover", "read"] }
  });
  assert.equal(plan.executionEnabled, false);
  assert.equal(plan.connectorId, "github-fpx");
  assert.equal(plan.approvalRequired, false);
});

test("audit mode blocks write even when connector itself was granted write", () => {
  assert.throws(() => planToolUse({
    projectId: "fpx",
    toolId: "github.write-file",
    resourceId: "repo:fpx",
    inventory,
    resolvedBundle: bundle,
    effectiveActions: { github: ["discover", "read"] }
  }), /exceeds project mode/);
});

test("tool cannot target an ungranted resource", () => {
  assert.throws(() => planToolUse({
    projectId: "fpx",
    toolId: "github.read-file",
    resourceId: "repo:pebble",
    inventory,
    resolvedBundle: bundle,
    effectiveActions: { github: ["discover", "read"] }
  }), /outside connector scope/);
});

test("cross-project bundles cannot be reused", () => {
  assert.throws(() => planToolUse({
    projectId: "pebble",
    toolId: "github.read-file",
    resourceId: "repo:fpx",
    inventory,
    resolvedBundle: bundle,
    effectiveActions: { github: ["discover", "read"] }
  }), /Project scope mismatch/);
});
