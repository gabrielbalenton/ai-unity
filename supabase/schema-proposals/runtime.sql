-- SCHEMA PROPOSAL ONLY: NOT APPLIED TO ANY DATABASE.
-- After choosing a dedicated UNITY database, use Supabase CLI to create a proper
-- migration, validate it in a local/test project, then review its security advisors.
-- This expands 0001_core.sql; it is intentionally NOT a deployment migration.

-- Composite FK enforces that an approval can never point to another project's connector.
create unique index if not exists project_connections_scoped_key
 on public.project_connections(id,project_id);

create table if not exists public.conversation_threads (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 title text not null check(length(title) between 1 and 160),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(id,project_id)
);

create table if not exists public.conversation_messages (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 thread_id uuid not null,
 actor_id uuid references auth.users(id),
 role text not null check(role in ('user','assistant','tool')),
 content text not null check(length(content) <= 200000),
 source_refs jsonb not null default '[]'::jsonb
   check (jsonb_typeof(source_refs)='array'),
 created_at timestamptz not null default now(),
 foreign key(thread_id,project_id)
   references public.conversation_threads(id,project_id) on delete cascade
);

create table if not exists public.project_tasks (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 title text not null check(length(title) between 3 and 160),
 required_capability text not null,
 state text not null default 'draft'
   check(state in ('draft','queued','running','awaiting_approval','failed','completed','cancelled')),
 revision integer not null default 0 check(revision>=0),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,project_id)
);

create table if not exists public.task_events (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 task_id uuid not null,
 revision integer not null check(revision>=1),
 from_state text not null,
 to_state text not null,
 actor_id uuid references auth.users(id),
 evidence_refs jsonb not null default '[]'::jsonb check(jsonb_typeof(evidence_refs)='array'),
 approval_id uuid,
 occurred_at timestamptz not null default now(),
 unique(task_id,revision),
 foreign key(task_id,project_id)
  references public.project_tasks(id,project_id) on delete cascade
);

create table if not exists public.operation_approvals (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 connector_id uuid not null,
 resource_id text not null check(length(resource_id) between 1 and 400),
 action text not null check(action in ('write','deploy','send')),
 status text not null default 'pending'
  check(status in ('pending','approved','rejected','consumed','expired')),
 requested_by uuid not null references auth.users(id),
 approved_by uuid references auth.users(id),
 requested_at timestamptz not null default now(),
 approved_at timestamptz,
 expires_at timestamptz not null,
 consumed_at timestamptz,
 foreign key(connector_id,project_id)
  references public.project_connections(id,project_id) on delete cascade,
 constraint approval_record_consistency check(
  (status='approved' and approved_by is not null and approved_at is not null)
  or status<>'approved'
 )
);

create table if not exists public.memory_revisions (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 memory_id uuid not null references public.memory_entries(id) on delete cascade,
 revision integer not null check(revision>0),
 author_id uuid references auth.users(id),
 status text not null check(status in ('draft','approved','rejected','superseded')),
 title text not null check(length(title) between 2 and 140),
 body text not null check(length(body)<=200000),
 source_refs jsonb not null default '[]'::jsonb check(jsonb_typeof(source_refs)='array'),
 recorded_at timestamptz not null default now(),
 unique(memory_id,revision)
);
-- A compound memory FK prevents revisions being attached to another project.
create unique index if not exists memory_entries_scoped_key
 on public.memory_entries(id,project_id);
alter table public.memory_revisions
 add constraint memory_revisions_scoped_reference
 foreign key(memory_id,project_id) references public.memory_entries(id,project_id)
 on delete cascade;

create table if not exists public.model_usage_events (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 model_id text not null,
 provider_id text not null,
 actor_id uuid references auth.users(id),
 estimated_usd numeric(14,8) not null check(estimated_usd>=0),
 billed_usd numeric(14,8) check(billed_usd>=0),
 provider_receipt_ref text,
 status text not null check(status in ('estimated','verified','disputed')),
 recorded_at timestamptz not null default now()
);

create table if not exists public.agent_profiles (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 display_name text not null check(length(display_name) between 2 and 100),
 capability_tags text[] not null default array[]::text[],
 enabled boolean not null default false,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);

create index if not exists threads_by_project on public.conversation_threads(project_id);
create index if not exists messages_by_thread on public.conversation_messages(project_id,thread_id,created_at);
create index if not exists tasks_by_project on public.project_tasks(project_id,state,updated_at);
create index if not exists tasks_events_by_project on public.task_events(project_id,occurred_at);
create index if not exists approvals_by_project on public.operation_approvals(project_id,status,expires_at);
create index if not exists revisions_by_memory on public.memory_revisions(project_id,memory_id,revision desc);
create index if not exists usage_by_project on public.model_usage_events(project_id,recorded_at desc);

-- Enable RLS on every exposed table, even when all writes are backend-only.
alter table public.conversation_threads enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.project_tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.operation_approvals enable row level security;
alter table public.memory_revisions enable row level security;
alter table public.model_usage_events enable row level security;
alter table public.agent_profiles enable row level security;

-- This personal-alpha model grants owner-only SELECT.
-- Privileged backend writes MUST validate actor and project in the application and
-- preserve audit history; never expose a service_role/secret key to a client.
create policy unity_owner_select_threads on public.conversation_threads
 for select to authenticated
 using(exists(select 1 from public.projects p
   where p.id=project_id and p.owner_id=(select auth.uid())));
create policy unity_owner_select_messages on public.conversation_messages
 for select to authenticated
 using(exists(select 1 from public.projects p
   where p.id=project_id and p.owner_id=(select auth.uid())));
create policy unity_owner_select_tasks on public.project_tasks
 for select to authenticated
 using(exists(select 1 from public.projects p
   where p.id=project_id and p.owner_id=(select auth.uid())));
create policy unity_owner_select_task_events on public.task_events
 for select to authenticated
 using(exists(select 1 from public.projects p
   where p.id=project_id and p.owner_id=(select auth.uid())));
create policy unity_owner_select_approvals on public.operation_approvals
 for select to authenticated
 using(exists(select 1 from public.projects p
   where p.id=project_id and p.owner_id=(select auth.uid())));
create policy unity_owner_select_revisions on public.memory_revisions
 for select to authenticated
 using(exists(select 1 from public.projects p
   where p.id=project_id and p.owner_id=(select auth.uid())));
create policy unity_owner_select_usage on public.model_usage_events
 for select to authenticated
 using(exists(select 1 from public.projects p
   where p.id=project_id and p.owner_id=(select auth.uid())));
create policy unity_owner_select_agents on public.agent_profiles
 for select to authenticated
 using(exists(select 1 from public.projects p
   where p.id=project_id and p.owner_id=(select auth.uid())));

-- No INSERT, UPDATE or DELETE policy for clients on these tables.
-- Do not grant anonymous access. A dedicated service client should perform
-- transactional writes with an independently authenticated and authorized actor.
revoke all on public.conversation_threads,public.conversation_messages,
 public.project_tasks,public.task_events,public.operation_approvals,
 public.memory_revisions,public.model_usage_events,public.agent_profiles
 from anon,authenticated;
grant select on public.conversation_threads,public.conversation_messages,
 public.project_tasks,public.task_events,public.operation_approvals,
 public.memory_revisions,public.model_usage_events,public.agent_profiles
 to authenticated;
