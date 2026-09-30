# Durable execution contract (offline, unconnected)

This module turns the static task states into a testable foundation for actual long-running missions, without pretending to run them. It is also the contract for the proposed database schema under `supabase/schema-proposals/execution-queue.sql`. Neither a queue nor real workers have been deployed.

## Exact behavior

- A mission step produces at most one job per project-specific idempotency key; a different operation with the same key is rejected.
- A worker claims a due job with a time-limited lease and expected revision. The offline contract rejects stale revisions, wrong projects, invalid workers and emergency stops.
- Heartbeats extend a live lease only. Expired leases can be recovered after the original worker loses ownership.
- Retryable errors have bounded deterministic backoff and a finite maximum attempt count. Exhausted or non-retryable jobs become dead letters for review.
- A worker can submit evidence but cannot declare a mission verified. A separate verifier identity must inspect independent evidence to mark it verified; failed verification is reported as failed.
- A cancellation ends future work. The operational executor must ALSO interrupt already-running network requests and recheck grants before every external action; a state flag alone is insufficient.
- These functions hold no credentials and cannot execute models, tools, external writes or deployments.

## Required live implementation

1. Create a dedicated test database and run reviewed schema migrations and cross-project SQL tests. Keep executable SQL proposals outside active migrations until proven.
2. Implement a worker-side atomic `claim_due_job` transaction using `FOR UPDATE SKIP LOCKED`, revision checks and recorded actor identity.
3. Implement transactional `submit_evidence`, `retry_or_fail`, `verify_or_reject`, lease expiry/recovery and an append-only event ledger.
4. Bind the verified task actor, workspace, connector, resource grant, time-limited exact operation approval, provider quota and estimated cost on each external dispatch.
5. Use a dedicated durable worker platform rather than relying on short Vercel request lifetimes. Limit concurrency, time, model context, network destinations and spending.
6. Implement provider-specific idempotency for billable or mutating requests; a local queue idempotency key cannot guarantee third-party operations are exactly once.
7. Run two-project isolation, concurrent worker claims, network interruptions, lease stealing, failed provider billing and emergency-stop drills.
8. Only then expose owner-scoped task statuses, evidence links and manual approval controls through the UI. No sensitive worker metadata should be sent to the browser.

A fully passing offline lifecycle suite proves the transition rules only; it does **not** establish production exactly-once execution, provider cost safety or worker durability.
