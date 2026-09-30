# UNITY task execution: durable workers outside Vercel requests

Current implementation: a tested, injectable single-cycle worker contract and a **SQL schema proposal** for a dedicated database. No jobs, agents, credentials, live worker process, queue or cloud service have been provisioned.

## Why a separate worker

A real agent may read many sources, run tools and wait for approvals or provider availability. Long-running work should not be tied to the lifetime of an HTTP request. The Next.js interface initiates authorized tasks and renders state; a separately deployed durable worker service handles actual execution when available.

## Required backend behavior

1. An authenticated server verifies the owner/project and creates a unique project-scoped job with an idempotency key. Do not store raw secrets or unrestricted model context inside job records.
2. A dedicated worker requests a job with explicitly configured capabilities, bounded lease length and an independent trusted server identity.
3. Database claiming uses `FOR UPDATE SKIP LOCKED`; atomically advance the revision, claim the lease and record a claim event.
4. Before each tool/model operation, fetch **current** grants, source context, verified cost entitlement and exact action approval. Worker ownership alone grants nothing.
5. Record independently verified evidence before moving a task to complete. Preserve the exact lease owner and expected revision.
6. On a read-only failure, retry at bounded increasing intervals with a durable audit trail. Do not retry after reaching max attempts.
7. On an ambiguous mutating operation, enter `manual_review` and reconcile the external service receipt BEFORE considering another attempt.
8. A global emergency stop must prevent new dispatches and interrupt running workers; restarting workers must not bypass it.
9. Use a dead-letter queue for exhausted jobs and expose its records in the Command Center without claiming they were successfully completed.

## Source implementation

- `lib/runtime/worker-contract.mjs`: permission and independent verifier callbacks, deterministic retry decisions, revisioned completion contract.
- `supabase/schema-proposals/durable-jobs.sql`: candidate persistent lease/claim/ack schema and metadata-level RLS. **Do not execute without review.**
- `tests/worker-contract.test.mjs` and `tests/durable-jobs-schema.test.mjs`: offline tests of dependencies, authorization, evidence, retry safety and SQL contract boundaries.

## Safety and operational constraints

- The worker must run with separate infrastructure and secrets, not in browser local storage or a publicly exposed Vercel function.
- Grant only the required database functions and dedicated provider credentials; rotate secrets and enforce revocation.
- The SQL functions require JWT service-role claims. Database and role behavior must be verified in a dedicated Supabase local/test environment; source inspection alone is not sufficient.
- All client-visible audit/status events are redacted and scoped by project. Untrusted tool output cannot grant extra permissions.
- The dispatcher contract must not be connected until actual provider billing/entitlement verification and unique durable reservation exist.

## Verification before enabling

A live database test must simulate concurrent workers, expired leases, delayed confirmations, service restart, duplicate webhooks, project grant revocation, provider exhaustion and ambiguous external operations. Confirm only one worker owns each live job, and every completed task has independently verified evidence and an audit event.
