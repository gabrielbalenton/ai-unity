-- UNITY durable execution PROPOSAL. Do not apply until a dedicated test
-- database exists and cross-project RLS, audit and disaster recovery are tested.
-- No job is executable simply because it appears in this queue.
--
-- Intended server protocol:
-- 1. Signed user creates an authorized task in a transaction.
-- 2. Backend resolves the exact project and inserts one idempotent job.
-- 3. Trusted service-role worker claims a due job atomically using
--    FOR UPDATE SKIP LOCKED + revision increment and obtains a time-limited lease.
-- 4. Before EACH external dispatch, worker re-verifies identity, project,
--    target resource, exact approval and actual provider budget.
-- 5. Worker only submits evidence; a distinct verifier records the outcome.
-- 6. Every state change writes an independent, scrubbed audit event.
-- 7. Cancellation/emergency stop must also interrupt actual running workers.
--
-- The functions below are intentionally NOT included. Designing one without
-- a dedicated database/permission model would create false safety guarantees.
create table if not exists public.execution_jobs (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 task_id uuid not null,
 capability text not null check(length(capability) between 2 and 100),
 idempotency_key text not null check(length(idempotency_key) between 2 and 140),
 state text not null default 'queued' check(state in
  ('queued','leased','awaiting_verification','verified','retry_wait','dead','cancelled')),
 revision integer not null default 0 check(revision>=0),
 attempts integer not null default 0 check(attempts>=0),
 max_attempts integer not null default 3 check(max_attempts between 1 and 10),
 worker_id text,
 lease_until timestamptz,
 run_after timestamptz not null default now(),
 claimed_evidence_refs jsonb not null default '[]'::jsonb
  check(jsonb_typeof(claimed_evidence_refs)='array'),
 independently_verified_by uuid references auth.users(id),
 verified_evidence_refs jsonb not null default '[]'::jsonb
  check(jsonb_typeof(verified_evidence_refs)='array'),
 created_at timestamptz not null default now(),
 changed_at timestamptz not null default now(),
 unique(project_id,idempotency_key),
 unique(id,project_id),
 foreign key(task_id,project_id)
  references public.project_tasks(id,project_id) on delete cascade,
 constraint lease_state_consistency check(
  (state='leased' and worker_id is not null and lease_until is not null)
  or (state<>'leased' and worker_id is null and lease_until is null)
 ),
 constraint verifier_only_for_terminal check(
  independently_verified_by is null or state in ('verified','dead')
 )
);

create table if not exists public.execution_job_events (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 job_id uuid not null,
 revision integer not null check(revision>0),
 event_type text not null check(event_type in
  ('queued','claimed','heartbeat','evidence_submitted','independently_verified',
   'verification_rejected','retry_scheduled','failed_permanently',
   'expired_lease_recovery','expired_lease_dead','cancelled')),
 actor_id text not null check(length(actor_id) between 1 and 120),
 recorded_at timestamptz not null default now(),
 evidence_refs jsonb not null default '[]'::jsonb
  check(jsonb_typeof(evidence_refs)='array'),
 unique(job_id,revision),
 foreign key(job_id,project_id)
  references public.execution_jobs(id,project_id) on delete cascade
);

create index if not exists execution_jobs_claim_ready
 on public.execution_jobs(run_after,created_at)
 where state in ('queued','retry_wait');
create index if not exists execution_jobs_expired_lease
 on public.execution_jobs(lease_until)
 where state='leased';
create index if not exists execution_jobs_project_status
 on public.execution_jobs(project_id,state,changed_at desc);

alter table public.execution_jobs enable row level security;
alter table public.execution_job_events enable row level security;
revoke all on public.execution_jobs,public.execution_job_events
 from public,anon,authenticated;
-- Do not expose raw worker leases, model prompts or secrets to clients.
-- Backend can expose a separate owner-scoped REDACTED task projection
-- after it independently validates project ownership and session.
grant select,insert,update on public.execution_jobs to service_role;
grant select,insert on public.execution_job_events to service_role;

-- Production validation still required:
-- * lease claim transaction with SKIP LOCKED and optimistic revision check
-- * privileged worker identity and transactionally enforced project scope
-- * unique provider-side idempotency key for every billable/mutating action
-- * separate verified completion signer, no self-verification
-- * dead-letter review and replay/compensation policy
-- * stop propagation before/during dispatch, network and timeout controls
-- * independent backup and recovery demonstration
