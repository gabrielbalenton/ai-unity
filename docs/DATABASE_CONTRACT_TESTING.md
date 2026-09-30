# Disposable PostgreSQL security and schema contract tests

This repository has proposals for the UNITY database, but a successful Next.js compilation cannot prove they execute correctly. This harness exercises their actual SQL in a **throwaway PostgreSQL container within GitHub Actions**. It never connects to the owner's Supabase projects, production services or Vercel.

## Database source order

1. Synthetic `auth.users`, `anon`, `authenticated` and `service_role` role/function stubs in `tests/db/bootstrap.sql`.
2. `supabase/migrations/0001_core.sql` — initial owner-scoped projects, draft memories and audit table.
3. `supabase/schema-proposals/runtime.sql` — thread, task, approval, version, usage and agent tables and RLS.
4. `supabase/schema-proposals/memory-approval.sql` — transactional row-locked revision and audit approval.
5. `supabase/schema-proposals/github-webhook-deliveries.sql` — backend-only delivery ledger.
6. `supabase/schema-proposals/durable-jobs.sql` — queue leases and signed-role worker functions.
7. `tests/db/isolation.sql` and `tests/db/worker.sql` — executable synthetic two-user access and queue checks.

The runner script refuses any database whose host is not loopback, whose database name is not exactly `unity_contract`, or where `UNITY_EPHEMERAL_DATABASE=1` is missing. These are defense in depth, **not** a secure safeguard for deliberately hostile environments; never run the script with a production database password.

## Reproducible testing

The opt-in workflow `.github/workflows/db-contract.yml` has manual dispatch only. The existing milestone CI runs a separate ephemeral database job when a pull request title includes `[DB]`. Both use the same simple PostgreSQL service. To reproduce locally on a disposable database:

```bash
export UNITY_EPHEMERAL_DATABASE=1 PGHOST=127.0.0.1 PGDATABASE=unity_contract
export PGUSER=postgres PGPASSWORD=your-disposable-test-only-password
bash scripts/test-db-contract.sh
```

Never copy the sample credentials into a persistent service.

## Acceptance and limitations

The harness is intended to prove that proposals **parse and execute**, owner A and B do not read or mutate each other's project notes or audit records, memory approval atomically records one version/audit event and rejects unowned/stale approvals, anonymous users cannot read worker jobs, and worker leases reject stale completion or ambiguous external action replay.

It is **NOT equivalent to a real Supabase project**. Synthetic `auth.uid()` and database roles are simplified. A dedicated Supabase test project must separately run migrations using actual Supabase Auth/PostgREST, security advisors, real Row Level Security policies, API route integration, source retention and backup/restore, role/key rotation and two-user browser tests before the private hosted alpha. The staged SQL remains a proposal until those checks are reviewed.

The database exercise must not create any user-owned infrastructure or trigger model/API billing. Results are available only through the corresponding GitHub Actions build log.
