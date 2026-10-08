import test from "node:test";
import assert from "node:assert/strict";
import { validateUpstreamSource, canPromoteUpstreamSource, isRestrictedPath } from "../lib/infrastructure/upstream-intake.mjs";

const base = {
  id: "example",
  name: "Example",
  repository: "owner/repo",
  role: "reference",
  capabilities: ["feature"],
  unityTargets: ["agents"],
  restrictedPaths: ["ee/**"],
  licenseReview: "required",
  dependencyReview: "required",
  promotionState: "blocked"
};

test("validates complete upstream source records", () => {
  assert.equal(validateUpstreamSource(base).valid, true);
});

test("fails closed before license and dependency reviews", () => {
  const result = canPromoteUpstreamSource(base, { testsPassed: true, capabilityMapApproved: true });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /License review/);
});

test("requires every promotion gate", () => {
  const approved = {
    ...base,
    licenseReview: "verified",
    dependencyReview: "verified",
    promotionState: "approved"
  };
  assert.equal(canPromoteUpstreamSource(approved, { testsPassed: false, capabilityMapApproved: true }).allowed, false);
  assert.equal(canPromoteUpstreamSource(approved, { testsPassed: true, capabilityMapApproved: false }).allowed, false);
  assert.equal(canPromoteUpstreamSource(approved, { testsPassed: true, capabilityMapApproved: true }).allowed, true);
});

test("blocks explicitly restricted upstream paths", () => {
  assert.equal(isRestrictedPath(base, "ee"), true);
  assert.equal(isRestrictedPath(base, "ee/license.ts"), true);
  assert.equal(isRestrictedPath(base, "packages/core/index.ts"), false);
});
