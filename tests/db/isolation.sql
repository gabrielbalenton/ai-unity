-- Disposable PostgreSQL regression only. Assumes tests/db/bootstrap.sql followed
-- by core/runtime/memory approval schema source has been loaded.
\set ON_ERROR_STOP on

-- Test owner can create their project and an initial draft using public RLS.
set role authenticated;
select set_config('request.jwt.claim.sub',
 '11111111-1111-4111-8111-111111111111',false);
insert into public.projects (id,owner_id,name) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111','Alpha');
insert into public.memory_entries (id,project_id,author_id,title,body) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'Verified owner decision','Only Alice controls this project.');

do $$
begin
 if (select count(*) from public.projects)<>1 then
   raise exception 'Owner project read should include exactly one row';
 end if;
 if (select count(*) from public.memory_entries)<>1 then
   raise exception 'Owner memory read should include their draft';
 end if;
end $$;

-- Bob can create his own project, but cannot read Alice's rows.
select set_config('request.jwt.claim.sub',
 '22222222-2222-4222-8222-222222222222',false);
insert into public.projects (id,owner_id,name) values
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222','Beta');
do $$
declare blocked boolean := false;
begin
 if (select count(*) from public.projects)<>1 then
  raise exception 'Cross-user project access leaked';
 end if;
 if (select count(*) from public.memory_entries)<>0 then
  raise exception 'Cross-user memory access leaked';
 end if;
 begin
  insert into public.memory_entries(project_id,author_id,title,body) values
   ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',
    'Injected note','This insertion must fail');
 exception when others then blocked := true;
 end;
 if not blocked then raise exception 'Bob inserted into Alice project'; end if;
end $$;

-- Permission and ownership must be checked inside the approval RPC.
do $$
declare blocked boolean := false;
begin
 begin
  perform public.approve_memory_entry(
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc',now());
 exception when others then blocked := true;
 end;
 if not blocked then raise exception 'Bob approved Alice memory'; end if;
end $$;

select set_config('request.jwt.claim.sub',
 '11111111-1111-4111-8111-111111111111',false);
-- A valid owner approval must insert both revision and audit event atomically.
select public.approve_memory_entry(
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 (select updated_at from public.memory_entries
  where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')
);
do $$
declare denied boolean := false;
begin
 if (select count(*) from public.memory_revisions
    where memory_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
     and status='approved')<>1 then
  raise exception 'Approved revision was not recorded';
 end if;
 if (select count(*) from public.audit_events
    where action='memory_approved'
     and project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>1 then
  raise exception 'Approval did not create an audit event';
 end if;
 begin
  perform public.approve_memory_entry(
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc',now());
 exception when others then denied := true;
 end;
 if not denied then raise exception 'Repeated approval bypassed revision guard'; end if;
end $$;

-- Bob must not gain access to revisions, audit events or task metadata.
select set_config('request.jwt.claim.sub',
 '22222222-2222-4222-8222-222222222222',false);
do $$
begin
 if (select count(*) from public.memory_revisions)<>0 then
  raise exception 'Memory revision RLS leaked across owners';
 end if;
 if (select count(*) from public.audit_events)<>0 then
  raise exception 'Audit RLS leaked across owners';
 end if;
 if (select count(*) from public.conversation_threads)<>0 then
  raise exception 'Thread RLS leaked across owners';
 end if;
end $$;
reset role;

-- Direct anonymous access to protected operational tables is refused.
set role anon;
do $$
declare denied boolean := false;
begin
 begin
  perform count(*) from public.unity_jobs;
 exception when insufficient_privilege then denied := true;
 end;
 if not denied then raise exception 'Anonymous job access was permitted'; end if;
end $$;
reset role;
\echo 'PASS: synthetic two-user PostgreSQL ownership, approval and RLS checks'
