-- SQL proposal only. Never apply to client or production infrastructure.
-- Requires the dedicated UNITY core schema and scoped connections table.
-- This ledger only records requests and evidence; it cannot verify provider-side
-- billing or entitlement by itself. Live dispatch remains OFF until independent
-- provider checks and receipt reconciliation are implemented.
create unique index if not exists unity_scoped_connector_key
 on public.project_connections(id,project_id);

create table if not exists public.unity_model_requests (
 request_id text primary key check(request_id ~ '^[A-Za-z0-9_.:-]{8,120}$'),
 project_id uuid not null references public.projects(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 connector_id uuid not null,
 provider text not null check(provider in ('openrouter','huggingface')),
 model_id text not null check(length(model_id) between 3 and 180),
 status text not null default 'reserved'
  check(status in ('reserved','received_unverified','failed_or_unconfirmed')),
 response_hash text check(response_hash ~ '^[a-f0-9]{64}$'),
 prompt_tokens integer check(prompt_tokens between 0 and 10000000),
 completion_tokens integer check(completion_tokens between 0 and 10000000),
 actual_billed_usd numeric(16,8) check(actual_billed_usd>=0),
 provider_receipt_ref text,
 reserved_at timestamptz not null default now(),
 last_changed_at timestamptz not null default now(),
 foreign key(connector_id,project_id)
  references public.project_connections(id,project_id) on delete cascade,
 unique(request_id,project_id)
);
create index if not exists unity_model_requests_project_time
 on public.unity_model_requests(project_id,reserved_at desc);

create table if not exists public.unity_model_request_events (
 id bigint generated always as identity primary key,
 request_id text not null,
 project_id uuid not null,
 event_name text not null check(event_name in
   ('reserved','received_unverified','failed_or_unconfirmed')),
 event_at timestamptz not null default now(),
 response_hash text,
 foreign key(request_id,project_id)
  references public.unity_model_requests(request_id,project_id) on delete cascade,
 unique(request_id,event_name)
);
alter table public.unity_model_requests enable row level security;
alter table public.unity_model_request_events enable row level security;
revoke all on public.unity_model_requests,public.unity_model_request_events
 from public,anon,authenticated;
grant select,insert,update on public.unity_model_requests to service_role;
grant select,insert on public.unity_model_request_events to service_role;
grant usage,select on sequence public.unity_model_request_events_id_seq to service_role;

-- Unique request IDs are never reused, including for failed/ambiguous actions.
-- A trusted backend, not an LLM or browser, must additionally validate current
-- account entitlement, $0 paid billing, selected model and fresh budget.
create or replace function public.unity_reserve_model_request(
 p_request_id text,p_project_id uuid,p_actor_id uuid,p_connector_id uuid,
 p_provider text,p_model_id text
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_found boolean;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
   or p_request_id !~ '^[A-Za-z0-9_.:-]{8,120}$'
   or p_provider not in ('openrouter','huggingface')
   or length(p_model_id) not between 3 and 180
   or p_actor_id is null or p_connector_id is null
 then raise exception 'Model reservation rejected' using errcode='P0001'; end if;
 select true into v_found
 from public.projects p
 join public.project_connections c on c.project_id=p.id
 where p.id=p_project_id and p.owner_id=p_actor_id
   and c.id=p_connector_id and c.provider=p_provider
   and c.resource_id=p_model_id and c.permission_mode='read'
 for share of p,c;
 if v_found is distinct from true then
  raise exception 'Model reservation rejected' using errcode='P0001';
 end if;
 insert into public.unity_model_requests
  (request_id,project_id,actor_id,connector_id,provider,model_id)
 values
  (p_request_id,p_project_id,p_actor_id,p_connector_id,p_provider,p_model_id)
 on conflict(request_id) do nothing;
 if not found then return false; end if;
 insert into public.unity_model_request_events(request_id,project_id,event_name)
 values(p_request_id,p_project_id,'reserved');
 return true;
end;
$$;
revoke all on function public.unity_reserve_model_request
 (text,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.unity_reserve_model_request
 (text,uuid,uuid,uuid,text,text) to service_role;

-- The handler records only a hash and bounded token counts. Never store the
-- raw prompt, provider credential or model output inside the ledger.
create or replace function public.unity_record_model_outcome(
 p_request_id text,p_project_id uuid,p_status text,p_response_hash text,
 p_prompt_tokens integer,p_completion_tokens integer
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_updated public.unity_model_requests%rowtype;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
  or p_status not in ('received_unverified','failed_or_unconfirmed')
  or (p_status='received_unverified' and
    (p_response_hash is null or p_response_hash !~ '^[a-f0-9]{64}$'))
  or (p_prompt_tokens is not null and p_prompt_tokens not between 0 and 10000000)
  or (p_completion_tokens is not null and p_completion_tokens not between 0 and 10000000)
 then raise exception 'Model outcome rejected' using errcode='P0001'; end if;
 update public.unity_model_requests set
  status=p_status,
  response_hash=case when p_status='received_unverified' then p_response_hash else null end,
  prompt_tokens=case when p_status='received_unverified' then p_prompt_tokens else null end,
  completion_tokens=case when p_status='received_unverified' then p_completion_tokens else null end,
  last_changed_at=transaction_timestamp()
 where request_id=p_request_id and project_id=p_project_id and status='reserved'
 returning * into v_updated;
 if not found then return false; end if;
 insert into public.unity_model_request_events(request_id,project_id,event_name,response_hash)
 values(v_updated.request_id,v_updated.project_id,p_status,v_updated.response_hash);
 return true;
end;
$$;
revoke all on function public.unity_record_model_outcome
 (text,uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.unity_record_model_outcome
 (text,uuid,text,text,integer,integer) to service_role;
