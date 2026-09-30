-- This bootstrap is for a disposable GitHub Actions PostgreSQL container only.
-- Never run it against an existing Supabase project or user database.
create schema if not exists auth;
create role anon nologin;
create role authenticated nologin;
-- Supabase's actual service_role bypasses RLS. The disposable stub must
-- mirror that behavior or service-only tables falsely appear empty.
create role service_role nologin bypassrls;
create table auth.users (
 id uuid primary key,
 email text not null unique
);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to authenticated,anon,service_role;
grant execute on function auth.uid() to authenticated,service_role,anon;
grant usage on schema public to authenticated,anon,service_role;
-- These synthetic rows cannot authenticate against a real Supabase instance.
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','local-alice@unity.invalid'),
 ('22222222-2222-4222-8222-222222222222','local-bob@unity.invalid');
