import test from "node:test";
import assert from "node:assert/strict";
import {
  createApprovalRequest,
  suspendForApproval,
  resolveApproval,
  resumeAfterApproval
} from "../lib/runtime/approval-gate.mjs";

const baseApproval = () => createApprovalRequest({
  id: "approval-1",
  projectId: "fpx",
  taskId: "task-1",
  connectorId: "github-fpx",
  resourceId: "repo:fpx",
  action: "write",
  summary: "Update one repository file",
  requestedAt: "2026-10-08T02:00:00.000Z",
  expiresAt: "2026-10-08T02:15:00.000Z"
});

const baseTask = Object.freeze({ id: "task-1", projectId: "fpx", state: "running" });

test("approval requests default to protected actions and fixed scope", () => {
  const approval = baseApproval();
  assert.equal(approval.status, "pending");
  assert.equal(approval.projectId, "fpx");
  assert.equal(approval.connectorId, "github-fpx");
  assert.equal(approval.expiresAt, "2026-10-08T02:15:00.000Z");
});

test("approval can suspend, resolve, and resume within its lifetime", () => {
  const approval = baseApproval();
  const waiting = suspendForApproval(baseTask, approval);
  const resolved = resolveApproval(approval, {
    decision: "approved",
    decidedBy: "gabriel",
    decidedAt: "2026-10-08T02:05:00.000Z"
  });
  const resumed = resumeAfterApproval(waiting, resolved, { resumedAt: "2026-10-08T02:06:00.000Z" });
  assert.equal(waiting.state, "waiting_approval");
  assert.equal(resumed.state, "queued");
  assert.equal(resumed.resolution, "approval_granted");
});

test("expired pending approval cannot be approved", () => {
  const approval = baseApproval();
  assert.throws(() => resolveApproval(approval, {
    decision: "approved",
    decidedBy: "gabriel",
    decidedAt: "2026-10-08T02:15:00.000Z"
  }), /expired/);
});

test("approved action cannot resume after the approval expires", () => {
  const approval = baseApproval();
  const waiting = suspendForApproval(baseTask, approval);
  const resolved = resolveApproval(approval, {
    decision: "approved",
    decidedBy: "gabriel",
    decidedAt: "2026-10-08T02:05:00.000Z"
  });
  assert.throws(() => resumeAfterApproval(waiting, resolved, {
    resumedAt: "2026-10-08T02:16:00.000Z"
  }), /expired/);
});

test("denied approval cancels the waiting task", () => {
  const approval = baseApproval();
  const waiting = suspendForApproval(baseTask, approval);
  const denied = resolveApproval(approval, {
    decision: "denied",
    decidedBy: "gabriel",
    decidedAt: "2026-10-08T02:04:00.000Z"
  });
  const result = resumeAfterApproval(waiting, denied, { resumedAt: "2026-10-08T02:20:00.000Z" });
  assert.equal(result.state, "cancelled");
  assert.equal(result.resolution, "approval_denied");
});
