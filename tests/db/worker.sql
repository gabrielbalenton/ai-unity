-- Disposable queue lease regression; never a real worker or live dispatch.
\set ON_ERROR_STOP on
insert into public.unity_jobs
 (id,project_id,idempotency_key,capability,job_type,payload_reference)
values(
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'job-synthetic-001','repo:read','read_only','source:offline-fixture'
);
insert into public.unity_jobs
 (id,project_id,idempotency_key,capability,job_type,payload_reference)
values(
 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'job-synthetic-002','repo:write','external_operation','source:offline-fixture'
);
set role service_role;
select set_config('request.jwt.claim.role','service_role',false);
select id,project_id,revision,lease_owner,status
from public.unity_claim_job('local-worker-001',array['repo:read'],60);
do $$
begin
 if (select status from public.unity_jobs
     where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd') <> 'leased' then
  raise exception 'Worker did not claim available read-only job';
 end if;
 if (select count(*) from public.unity_job_events
     where job_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and event_type='claimed') <> 1 then
  raise exception 'Lease did not produce audit event';
 end if;
end $$;
do $$
declare result boolean;
begin
 select public.unity_complete_job(
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'local-worker-001',1,'["synthetic:test-evidence"]'::jsonb
 ) into result;
 if not result then raise exception 'Valid claim failed to complete'; end if;
end $$;
do $$
begin
 if (select count(*) from public.unity_job_events
    where job_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd')<>2 then
  raise exception 'Completion did not append second evidence event';
 end if;
end $$;
-- A stale revision or wrong worker must not complete a job twice.
do $$
declare result boolean;
begin
 select public.unity_complete_job(
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'local-worker-999',1,'["synthetic:stale"]'::jsonb
 ) into result;
 if result then raise exception 'Stale/wrong worker re-completed job'; end if;
end $$;
-- An external write can be leased once; it cannot be blindly reclaimed.
select id from public.unity_claim_job('local-worker-002',array['repo:write'],15);
update public.unity_jobs set lease_until=now()-interval '1 second'
where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
do $$
declare claimed integer;
begin
 select count(*) into claimed from public.unity_claim_job(
  'local-worker-003',array['repo:write'],15
 );
 if claimed<>0 then
  raise exception 'Expired external operation was automatically replayed';
 end if;
end $$;
reset role;
\echo 'PASS: synthetic durable queue lease, revisions, evidence and no external replay'
