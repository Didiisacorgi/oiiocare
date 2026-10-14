-- oiioCare Web 0.1 — guest merge
-- Orange runs this personally in the Supabase SQL Editor. Do not execute from CI.
--
-- The live client already calls public.create_oiio_entry(
--   p_kind, p_content, p_portion, p_source, p_client_request_id, p_reply
-- ). This migration adds merge_guest_entries so a sign-in can upload the
-- on-device queue once, skipping rows that already have the same
-- client_request_id for the signed-in user.
--
-- If the inspect queries show different argument or owner-column names,
-- edit the function before the GRANT. The web client falls back to calling
-- create_oiio_entry once per row when this RPC is missing.

-- ========== 0. INSPECT (read-only) ==========
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'oiio_records'
order by ordinal_position;

select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_oiio_entry', 'merge_guest_entries');

select c.relname, c.relrowsecurity as rls_on
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('oiio_records', 'oiio_chat_messages');

-- ========== 1. BACKUP ==========
create table if not exists public.oiio_records_backup_20261014 as
select * from public.oiio_records;

create table if not exists public.oiio_chat_messages_backup_20261014 as
select * from public.oiio_chat_messages;

-- ========== 2. MIGRATION ==========
alter table public.oiio_records
  add column if not exists client_request_id uuid;

-- Owner column is discovered at runtime (user_id, then owner_id).
-- Unique index is created inside the DO block only when that column exists.
do $$
declare
  owner_col text;
begin
  select column_name into owner_col
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'oiio_records'
    and column_name in ('user_id', 'owner_id', 'profile_id')
  order by case column_name when 'user_id' then 0 when 'owner_id' then 1 else 2 end
  limit 1;

  if owner_col is null then
    raise exception 'oiio_records has no user_id/owner_id/profile_id column; edit this migration';
  end if;

  execute format(
    'create unique index if not exists oiio_records_owner_client_request_uidx
       on public.oiio_records (%I, client_request_id)
     where client_request_id is not null',
    owner_col
  );
end $$;

create or replace function public.merge_guest_entries(p_entries jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  item jsonb;
  cid uuid;
  owner_col text;
  existing int;
  result jsonb;
  out jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select column_name into owner_col
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'oiio_records'
    and column_name in ('user_id', 'owner_id', 'profile_id')
  order by case column_name when 'user_id' then 0 when 'owner_id' then 1 else 2 end
  limit 1;

  if owner_col is null then
    raise exception 'oiio_records owner column missing';
  end if;

  for item in select value from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb))
  loop
    cid := nullif(item->>'client_request_id', '')::uuid;
    if cid is null then
      raise exception 'client_request_id required';
    end if;

    execute format(
      'select count(*) from public.oiio_records where client_request_id = $1 and %I = auth.uid()',
      owner_col
    ) into existing using cid;

    if existing > 0 then
      out := out || jsonb_build_array(jsonb_build_object(
        'client_request_id', cid,
        'status', 'duplicate'
      ));
      continue;
    end if;

    result := public.create_oiio_entry(
      p_kind := coalesce(item->>'kind', 'ate'),
      p_content := coalesce(item->>'content', ''),
      p_portion := nullif(item->>'portion', ''),
      p_source := coalesce(item->>'source', 'web'),
      p_client_request_id := cid,
      p_reply := coalesce(item->>'reply', '')
    );

    out := out || jsonb_build_array(jsonb_build_object(
      'client_request_id', cid,
      'status', 'merged',
      'result', result
    ));
  end loop;

  return jsonb_build_object('results', out);
end;
$$;

revoke all on function public.merge_guest_entries(jsonb) from public, anon;
grant execute on function public.merge_guest_entries(jsonb) to authenticated;

-- ========== 3. VERIFY ==========
-- Expect one row, and anon must not be allowed to execute.
select proname
from pg_proc
where proname = 'merge_guest_entries';

select grantee, privilege_type
from information_schema.routine_privileges
where routine_name = 'merge_guest_entries';

-- After signing in as a test user (not as postgres):
-- select public.merge_guest_entries('[]'::jsonb);
-- select count(*) from public.oiio_records_backup_20261014;
-- select count(*) from public.oiio_records;
