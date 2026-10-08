-- PROPOSAL ONLY. Do not apply to any Supabase project yet.
-- Stores account identity metadata and secret REFERENCES only. Never store API keys,
-- passwords, OAuth refresh tokens, private keys, or other credential values here.

create table if not exists public.account_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  connection_key text not null check(connection_key ~ '^[a-z0-9][a-z0-9._:-]{2,119}$'),
  provider text not null check(provider ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  account_label text not null check(length(account_label) between 2 and 120),
  sign_in_method text not null default 'unknown' check(sign_in_method in ('google','github','email','other','unknown')),
  auth_method text not null default 'none' check(auth_method in ('api_key_ref','oauth_ref','github_app_ref','pat_ref','none')),
  credential_reference text,
  external_account_id text check(external_account_id is null or length(external_account_id) <= 160),
  status text not null default 'unconfigured' check(status in ('unconfigured','ready','suspended','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, connection_key),
  constraint account_connection_auth_reference check (
    (auth_method = 'none' and credential_reference is null and status = 'unconfigured')
    or
    (auth_method <> 'none' and credential_reference is not null)
  )
);

create table if not exists public.project_account_bindings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  account_connection_id uuid not null references public.account_connections(id) on delete cascade,
  resource_id text not null check(length(resource_id) between 1 and 300),
  permission_mode text not null default 'read' check(permission_mode in ('read','propose','write','deploy','send')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, account_connection_id, resource_id)
);

create index if not exists account_connections_owner_provider
  on public.account_connections(owner_id, provider, status);
create index if not exists project_account_bindings_project
  on public.project_account_bindings(project_id, account_connection_id);

alter table public.account_connections enable row level security;
alter table public.project_account_bindings enable row level security;

-- Browser sessions may only inspect their own connection metadata. Connection
-- creation, credential linking, revocation and permission changes are server-only.
create policy account_connections_owner_read on public.account_connections
  for select to authenticated
  using(owner_id = (select auth.uid()));

create policy project_account_bindings_owner_read on public.project_account_bindings
  for select to authenticated
  using(
    exists(
      select 1
      from public.projects p
      where p.id = project_id
        and p.owner_id = (select auth.uid())
    )
    and exists(
      select 1
      from public.account_connections a
      where a.id = account_connection_id
        and a.owner_id = (select auth.uid())
    )
  );

revoke all on public.account_connections, public.project_account_bindings
  from anon, authenticated;
grant select on public.account_connections, public.project_account_bindings
  to authenticated;

-- A trusted backend transaction must additionally verify before writes:
-- 1. authenticated owner identity;
-- 2. exact provider/account identity;
-- 3. project ownership;
-- 4. exact resource scope;
-- 5. secret reference exists in the approved vault;
-- 6. requested permission does not exceed the owner's explicit grant;
-- 7. production/deploy/send operations still require a fresh approval gate.
