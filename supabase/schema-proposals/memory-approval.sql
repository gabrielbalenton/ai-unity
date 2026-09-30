-- DRAFT ONLY: REVIEW, RUN AND TEST ON AN ISOLATED UNITY DATABASE.
-- Apply after migrations/0001_core.sql and schema-proposals/runtime.sql have
-- both been verified in a dedicated local/test Supabase instance.
-- This function is callable by authenticated users, so authorization is
-- enforced INSIDE the transaction as well as by the API handler.
-- SQL owner / search_path / grants must be reviewed before migration release.

create or replace function public.approve_memory_entry(
 p_memory_id uuid,
 p_expected_updated_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_actor uuid := auth.uid();
 v_record public.memory_entries%rowtype;
 v_revision integer;
 v_time timestamptz := transaction_timestamp();
begin
 if v_actor is null or p_memory_id is null or p_expected_updated_at is null then
  raise exception 'Not authorized or invalid approval input' using errcode = 'P0001';
 end if;

 -- FOR UPDATE prevents two approvals for the same note racing each other.
 -- Owner check is repeated here; the client/API is NOT the trust boundary.
 select m.* into v_record
 from public.memory_entries m
 join public.projects p on p.id = m.project_id
 where m.id = p_memory_id and p.owner_id = v_actor
 for update of m;

 if not found then
  raise exception 'Memory unavailable for this actor' using errcode = 'P0001';
 end if;
 if v_record.status <> 'draft' or v_record.updated_at <> p_expected_updated_at then
  raise exception 'Memory is no longer the expected draft' using errcode = 'P0001';
 end if;

 select coalesce(max(revision),0)+1 into v_revision
 from public.memory_revisions
 where memory_id = v_record.id and project_id = v_record.project_id;

 update public.memory_entries
 set status = 'approved', approved_by = v_actor,
     approved_at = v_time, updated_at = v_time
 where id = v_record.id and project_id = v_record.project_id;

 -- Preserve exact title/body at approval time. Source links remain claims
 -- until independently verified; never silently mark an uploaded note sourced.
 insert into public.memory_revisions
  (project_id,memory_id,revision,author_id,status,title,body,source_refs)
 values
  (v_record.project_id,v_record.id,v_revision,v_actor,'approved',
   v_record.title,v_record.body,
   case when v_record.evidence_ref is null then '[]'::jsonb
     else jsonb_build_array(jsonb_build_object(
       'reference',v_record.evidence_ref,'verified',false))
   end);

 insert into public.audit_events
  (project_id,actor_id,action,target_type,target_id,details)
 values
  (v_record.project_id,v_actor,'memory_approved','memory',
   v_record.id::text,
   jsonb_build_object('revision',v_revision,'source_verification','not_performed'));

 return jsonb_build_object('memoryId',v_record.id,'projectId',v_record.project_id,
  'revision',v_revision,'status','approved','approvedAt',v_time);
end;
$$;

-- PostgreSQL functions often grant EXECUTE to PUBLIC by default. Explicitly
-- revoke it, including anonymous access; only signed-in actors may call.
revoke all on function public.approve_memory_entry(uuid,timestamptz) from public;
revoke all on function public.approve_memory_entry(uuid,timestamptz) from anon;
grant execute on function public.approve_memory_entry(uuid,timestamptz) to authenticated;

-- The SECURITY DEFINER owner must have carefully scoped table privileges and
-- RLS behavior audited in an isolated project before promoting this SQL.
