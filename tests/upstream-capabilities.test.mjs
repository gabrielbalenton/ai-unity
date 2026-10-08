import test from "node:test";
import assert from "node:assert/strict";
import {createTrace, createTraceEvent, summarizeTrace} from "../lib/observability/trace.mjs";
import {createSecretRef, assertNoPlaintextSecrets, canResolveSecretRef} from "../lib/security/secret-ref.mjs";
import {createApprovalRequest, suspendForApproval, resolveApproval, resumeAfterApproval} from "../lib/runtime/approval-gate.mjs";

test("trace summary stays scoped and counts cost/errors", () => {
  const trace = createTrace({traceId:"tr-1", projectId:"p-1", taskId:"t-1"});
  const events = [
    createTraceEvent(trace, {name:"tool.started", status:"pending"}),
    createTraceEvent(trace, {name:"tool.finished", costUsd:0}),
    createTraceEvent(trace, {name:"task.completed"})
  ];
  assert.deepEqual(summarizeTrace(trace, events), {
    traceId:"tr-1", projectId:"p-1", taskId:"t-1", eventCount:3,
    blockedCount:0, errorCount:0, totalCostUsd:0, finished:true
  });
});

test("plaintext secrets are rejected while scoped refs are allowed", () => {
  assert.throws(() => assertNoPlaintextSecrets({githubToken:"ghp_example"}), /Plaintext secret rejected/);
  const ref = createSecretRef({id:"sec-1", provider:"github", projectId:"p-1", environment:"development"});
  assert.equal(canResolveSecretRef(ref, {projectId:"p-1", environment:"development", allowedProviders:["github"]}), true);
  assert.equal(canResolveSecretRef(ref, {projectId:"p-2", environment:"development", allowedProviders:["github"]}), false);
});

test("protected actions suspend until the exact approval is resolved", () => {
  const task = {id:"t-1", projectId:"p-1", state:"running"};
  const approval = createApprovalRequest({
    id:"ap-1", projectId:"p-1", taskId:"t-1", connectorId:"github-1",
    resourceId:"repo-1", action:"write", summary:"Update one repository file"
  });
  const suspended = suspendForApproval(task, approval);
  assert.equal(suspended.state, "waiting_approval");
  const approved = resolveApproval(approval, {decision:"approved", decidedBy:"owner"});
  const resumed = resumeAfterApproval(suspended, approved);
  assert.equal(resumed.state, "queued");
});

test("denied approval cancels instead of resuming", () => {
  const task = {id:"t-2", projectId:"p-1", state:"running"};
  const approval = createApprovalRequest({
    id:"ap-2", projectId:"p-1", taskId:"t-2", connectorId:"vercel-1",
    resourceId:"project-1", action:"deploy", summary:"Deploy preview"
  });
  const suspended = suspendForApproval(task, approval);
  const denied = resolveApproval(approval, {decision:"denied", decidedBy:"owner"});
  assert.equal(resumeAfterApproval(suspended, denied).state, "cancelled");
});
