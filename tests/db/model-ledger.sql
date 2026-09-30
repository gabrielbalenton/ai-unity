-- Synthetic disposable PostgreSQL regression only: NOT provider entitlement proof.
\set ON_ERROR_STOP on
insert into public.project_connections(id,project_id,provider,resource_id,permission_mode)
values('ffffffff-ffff-4fff-8fff-ffffffffffff',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'openrouter','provider/model','read');

set role service_role;
select set_config('request.jwt.claim.role','service_role',false);
do $$
declare allowed boolean;
begin
 select public.unity_reserve_model_request(
  'request-00000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'ffffffff-ffff-4fff-8fff-ffffffffffff','openrouter','provider/model'
 ) into allowed;
 if allowed is distinct from true then
  raise exception 'Scoped reservation was rejected'; end if;
 if (select count(*) from public.unity_model_request_events
  where request_id='request-00000001' and event_name='reserved')<>1 then
  raise exception 'Reservation event was not durably recorded';end if;
end $$;

-- A repeated request must never reserve again, even if an upstream failed.
do $$
declare allowed boolean;
begin
 select public.unity_reserve_model_request(
  'request-00000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'ffffffff-ffff-4fff-8fff-ffffffffffff','openrouter','provider/model'
 ) into allowed;
 if allowed is distinct from false then raise exception 'Duplicate inference reserved';end if;
end $$;

-- A different acting user, different model or different project cannot
-- use the original project's connector even with service_role.
do $$
declare rejected boolean:=false;
begin
 begin
  perform public.unity_reserve_model_request(
   'request-00000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '22222222-2222-4222-8222-222222222222',
   'ffffffff-ffff-4fff-8fff-ffffffffffff','openrouter','provider/model');
 exception when others then rejected:=true;end;
 if not rejected then raise exception 'Wrong owner accepted';end if;
 rejected:=false;
 begin
  perform public.unity_reserve_model_request(
   'request-00000003','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'ffffffff-ffff-4fff-8fff-ffffffffffff','openrouter','provider/other');
 exception when others then rejected:=true;end;
 if not rejected then raise exception 'Unapproved model accepted';end if;
end $$;

do $$
declare logged boolean;
begin
 select public.unity_record_model_outcome(
  'request-00000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'received_unverified',repeat('a',64),27,9
 ) into logged;
 if logged is distinct from true then
  raise exception 'Outcome could not be stored';end if;
 if (select count(*) from public.unity_model_request_events
  where request_id='request-00000001')<>2 then
  raise exception 'Model reservation or result event missing';end if;
 if (select actual_billed_usd from public.unity_model_requests
  where request_id='request-00000001') is not null then
  raise exception 'Unknown actual billed cost must remain NULL';end if;
end $$;

do $$
declare logged boolean;
begin
 select public.unity_record_model_outcome(
  'request-00000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'failed_or_unconfirmed',null,null,null
 ) into logged;
 if logged is distinct from false then
  raise exception 'Previously recorded result was overwritten';end if;
end $$;

select public.unity_reserve_model_request(
 'request-00000004','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 'ffffffff-ffff-4fff-8fff-ffffffffffff','openrouter','provider/model'
);
select public.unity_record_model_outcome(
 'request-00000004','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'failed_or_unconfirmed',null,null,null
);
do $$
declare allowed boolean;
begin
 select public.unity_reserve_model_request(
  'request-00000004','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'ffffffff-ffff-4fff-8fff-ffffffffffff','openrouter','provider/model'
 ) into allowed;
 if allowed is distinct from false then
  raise exception 'Ambiguous failure was automatically retryable';end if;
end $$;
reset role;

set role anon;
do $$
declare rejected boolean:=false;
begin
 begin
  perform count(*) from public.unity_model_requests;
 exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Anonymous inference ledger leaked';end if;
 rejected:=false;
 begin
  perform public.unity_reserve_model_request(
   'request-00000005','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'ffffffff-ffff-4fff-8fff-ffffffffffff','openrouter','provider/model');
 exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Anonymous could reserve inference';end if;
end $$;
reset role;
\echo 'PASS: synthetic model reservation, idempotency, project binding, unknown billing and anonymous denial'
