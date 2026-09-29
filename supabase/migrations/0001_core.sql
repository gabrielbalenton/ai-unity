-- FUTURE BACKEND SCHEMA. Do not apply until Auth, server authorization and test plans exist.
-- Never expose service_role or provider credentials to the browser.
create extension if not exists pgcrypto;

create table if not exists public.projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 100),
 description text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.memory_entries (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 title text not null check(length(title) between 2 and 140),
 body text not null,
 status text not null default 'draft' check(status in ('draft','approved','rejected','superseded')),
 evidence_ref text,
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 supersedes_id uuid references public.memory_entries(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint approved_metadata check ((status = 'approved' and approved_by is not null and approved_at is not null) or status <> 'approved')
);
create table if not exists public.project_connections (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 provider text not null,
 resource_id text not null,
 permission_mode text not null default 'read' check(permission_mode in ('read','propose','write')),
 credential_reference text, -- reference only, not a credential
 unique(project_id,provider,resource_id)
);
create table if not exists public.audit_events (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 actor_id uuid references auth.users(id),
 action text not null,
 target_type text not null,
 target_id text,
 details jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
create index if not exists memory_by_project on public.memory_entries(project_id,status,updated_at desc);
create index if not exists audit_by_project on public.audit_events(project_id,occurred_at desc);
alter table public.projects enable row level security;
alter table public.memory_entries enable row level security;
alter table public.project_connections enable row level security;
alter table public.audit_events enable row level security;
create policy projects_owner on public.projects for all to authenticated
 using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy memory_owner_read on public.memory_entries for select to authenticated
 using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy memory_owner_insert on public.memory_entries for insert to authenticated
 with check (author_id=(select auth.uid()) and status='draft' and approved_by is null and approved_at is null
 and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
-- Memory approval/update through trusted backend only, with audit logging.
create policy connections_owner_read on public.project_connections for select to authenticated
 using(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy audit_owner_read on public.audit_events for select to authenticated
 using(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
-- Trusted backend writes connections and audit events after authorization.
