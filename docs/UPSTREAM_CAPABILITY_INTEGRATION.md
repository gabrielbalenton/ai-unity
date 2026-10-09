# Upstream capability integration

This branch adds capabilities to UNITY without turning UNITY into a wrapper around multiple external platforms.

## Goal

Use mature open-source projects as implementation references and interoperability targets while keeping UNITY's project scoping, approval rules, zero-cost default and self-hosting goals authoritative.

## Current additions

### Observability
`lib/observability/trace.mjs` provides project/task scoped traces, structured events, cost aggregation and completion/error/blocked summaries. The data shape is intentionally provider-neutral so an OpenTelemetry exporter or Langfuse adapter can be added later without changing core task logic.

### Secret references
`lib/security/secret-ref.mjs` prevents plain credential values from being accepted in ordinary UNITY configuration objects and provides project/environment/provider-scoped secret references. It does not itself store or decrypt credentials. A future self-hosted vault adapter must implement that boundary server-side.

### Human approval pause/resume
`lib/runtime/approval-gate.mjs` provides explicit pending/approved/denied approvals and deterministic suspend/resume behavior for write, deploy and send operations. This complements `lib/runtime/policy.mjs`; it does not bypass policy preflight.

## Upstream map

`config/upstream-capabilities.json` records which projects inform each UNITY subsystem. Restricted or incompatible source code is not copied merely because it is available for review.

## Integration principles

1. Existing UNITY contracts remain the source of truth.
2. Project boundaries are never weakened to simplify connectors.
3. Discovery never implies execution permission.
4. Paid API use remains denied by default.
5. Production writes require exact human approval.
6. Secrets remain server-side and referenced indirectly.
7. Prefer standards over vendor lock-in when both solve the same problem.
8. Add tests with every coherent capability increment.
9. Do not deploy from this integration branch.

## Next capability batches

- MCP v2 client transport behind UNITY's connector lifecycle.
- GitHub MCP-compatible tool surface mapped to existing GitHub authorization.
- Supabase read-only tool adapter with project scoping.
- Provider streaming adapter for live model inference while retaining cost preflight.
- Durable worker persistence using the existing queue contracts and schema proposals.
- OpenTelemetry export adapter for traces.
- Self-hosted vault adapter behind the secret-reference interface.
- Evaluation and prompt-version records after trace persistence exists.

## Verification

The additions have unit tests in `tests/upstream-capabilities.test.mjs`. The full repository verification command remains:

`npm run verify:release`

No claim of passing CI is made until GitHub Actions or a local verified run confirms it.
