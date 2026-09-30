-- DRAFT ONLY. Validate in an isolated UNITY test project before activation.
-- Raw GitHub payloads, credentials and personally identifying webhook content
-- should NEVER be stored in this ingestion table.
create table if not exists public.github_webhook_deliveries (
 delivery_id text primary key
  check(delivery_id ~ '^[a-zA-Z0-9-]{8,100}$'),
 event_name text not null
  check(event_name in ('installation','installation_repositories')),
 event_action text not null
  check(event_action in ('created','deleted','suspend','unsuspend','added','removed')),
 installation_id bigint not null check(installation_id>0),
 repository_ids bigint[] not null default array[]::bigint[],
 payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
 processing_status text not null default 'unapplied'
  check(processing_status in ('unapplied','under_review','applied','ignored','rejected')),
 received_at timestamptz not null default now(),
 processed_at timestamptz
);
create index if not exists webhook_received_at
 on public.github_webhook_deliveries(received_at desc);
alter table public.github_webhook_deliveries enable row level security;
-- Webhook deliveries must not be exposed to browser sessions.
revoke all on public.github_webhook_deliveries from public,anon,authenticated;
-- A separately protected service-role client writes verified metadata.
grant select,insert on public.github_webhook_deliveries to service_role;
-- Do not auto-apply installation grants when a webhook is stored.
-- A separate audited worker must bind the installation to a user-owned
-- project and check actual GitHub installation/repository permission.
