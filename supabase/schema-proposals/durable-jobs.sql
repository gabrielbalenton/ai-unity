-- SOURCE DESIGN ONLY. NO MIGRATION HAS BEEN APPLIED.
-- Run against a separately provisioned UNITY test database and review every
-- privilege and task authorization before production use.

create table if not exists public.unity_jobs (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 task_id uuid references public.project_tasks(id) on delete set null,
 idempotency_key text not null check(length(idempotency_key) between 8 and 160),
 capability text not null check(length(capability) between 3 and 120),
 job_type text not null check(job_type in ('read_only','external_operation')),
 payload_reference text not null check(length(payload_reference) between 3 and 400),
 status text not null default 'queued'
  check(status in ('queued','leased','completed','manual_review','dead_letter','cancelled')),
 priority smallint not null default 0,
 attempts integer not null default 0 check(attempts between 0 and 10),
 max_attempts integer not null default 3 check(max_attempts between 1 and 10),
 revision bigint not null default 0 check(revision>=0),
 available_at timestamptz not null default now(),
 lease_owner text,
 lease_until timestamptz,
 evidence_refs jsonb not null default '[]'::jsonb check(jsonb_typeof(evidence_refs)='array'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(project_id,idempotency_key),
 unique(id,project_id)
);

create table if not exists public.unity_job_events (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 job_id uuid not null,
 revision bigint not null,
 event_type text not null check(event_type in ('claimed','completed','retry','manual_review','dead_letter','cancelled')),
 evidence_refs jsonb not null default '[]'::jsonb check(jsonb_typeof(evidence_refs)='array'),
 happened_at timestamptz not null default now(),
 foreign key(job_id,project_id) references public.unity_jobs(id,project_id) on delete cascade,
 unique(job_id,revision)
);
create index if not exists unity_jobs_claimable
 on public.unity_jobs(status,available_at,priority desc,created_at);
create index if not exists unity_jobs_per_project
 on public.unity_jobs(project_id,created_at desc);
alter table public.unity_jobs enable row level security;
alter table public.unity_job_events enable row level security;
-- Durable worker metadata and payload references are never public client data.
revoke all on public.unity_jobs,public.unity_job_events from public,anon,authenticated;
grant select,insert,update on public.unity_jobs to service_role;
grant select,insert on public.unity_job_events to service_role;

-- Only a dedicated backend worker with service_role may claim jobs. The
-- worker must recheck account and project authorization before actual dispatch.
create or replace function public.unity_claim_job(
 p_worker text,p_capabilities text[],p_lease_seconds integer
) returns setof public.unity_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_job public.unity_jobs%rowtype;
 v_claim public.unity_jobs%rowtype;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' or
   length(p_worker) < 3 or p_capabilities is null or cardinality(p_capabilities)=0 or
   p_lease_seconds not between 15 and 300 then
  raise exception 'Worker claim unavailable' using errcode='P0001';
 end if;
 select j.* into v_job
 from public.unity_jobs j
 where j.capability=any(p_capabilities)
  and j.attempts<j.max_attempts
  and j.available_at<=transaction_timestamp()
  and (
   j.status='queued'
   or (j.status='leased' and j.job_type='read_only'
       and j.lease_until<transaction_timestamp())
  )
 order by j.priority desc,j.created_at asc
 for update skip locked
 limit 1;
 if not found then return; end if;
 update public.unity_jobs
 set status='leased',lease_owner=p_worker,
     lease_until=transaction_timestamp()+make_interval(secs=>p_lease_seconds),
     revision=revision+1,attempts=attempts+1,updated_at=transaction_timestamp()
 where id=v_job.id
 returning * into v_claim;
 insert into public.unity_job_events(project_id,job_id,revision,event_type)
 values(v_claim.project_id,v_claim.id,v_claim.revision,'claimed');
 return next v_claim;
end;
$$;
revoke all on function public.unity_claim_job(text,text[],integer) from public,anon,authenticated;
grant execute on function public.unity_claim_job(text,text[],integer) to service_role;

-- Completed records must carry evidence identifiers already verified by a
-- separate independent verifier. This DB function cannot validate truth.
create or replace function public.unity_complete_job(
 p_job_id uuid,p_project_id uuid,p_worker text,p_revision bigint,p_evidence_refs jsonb
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_completed public.unity_jobs%rowtype;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' or
    p_evidence_refs is null or jsonb_typeof(p_evidence_refs)<>'array' or
    jsonb_array_length(p_evidence_refs)<1 then
  raise exception 'Completion rejected' using errcode='P0001';
 end if;
 update public.unity_jobs
 set status='completed',evidence_refs=p_evidence_refs,
     lease_owner=null,lease_until=null,revision=revision+1,
     updated_at=transaction_timestamp()
 where id=p_job_id and project_id=p_project_id and
       status='leased' and lease_owner=p_worker and revision=p_revision and
       lease_until>transaction_timestamp()
 returning * into v_completed;
 if not found then return false; end if;
 insert into public.unity_job_events(project_id,job_id,revision,event_type,evidence_refs)
 values(v_completed.project_id,v_completed.id,v_completed.revision,'completed',p_evidence_refs);
 return true;
end;
$$;
revoke all on function public.unity_complete_job(uuid,uuid,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.unity_complete_job(uuid,uuid,text,bigint,jsonb) to service_role;

-- Failed mutating operations must enter manual review, never automatic replay.
-- A separate, reviewed worker implementation should implement read-only retry
-- transitions with a bounded backoff and a durable audit event.
