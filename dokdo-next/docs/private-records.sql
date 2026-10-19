-- New private store only. Run as the project owner after approval.
-- No changes to existing school records, Apps Script or public ranking.
begin;
create table public.dokdo_private_records (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null check (revision > 0),
 snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and snapshot ->> 'version' = '1' and snapshot ? 'school' and snapshot ? 'game' and octet_length(snapshot::text) <= 2000000),
 updated_at timestamptz not null default now()
);
alter table public.dokdo_private_records enable row level security;
alter table public.dokdo_private_records force row level security;
revoke all on public.dokdo_private_records from public, anon, authenticated;
grant select on public.dokdo_private_records to authenticated;
create policy private_record_self_read on public.dokdo_private_records for select to authenticated using ((select auth.uid()) = user_id);
create policy private_record_self_insert on public.dokdo_private_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy private_record_self_update on public.dokdo_private_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- A definer function is the only client write path. Its subject is always auth.uid().
-- No caller-supplied user_id and no unconditional upsert / revision overwrite.
create function public.dokdo_save_private_record(p_expected bigint, p_snapshot jsonb)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare subject uuid := auth.uid();
begin
 if subject is null then raise exception 'Authentication required' using errcode = '28000'; end if;
 if p_expected is null or p_expected < 0 or p_expected >= 9007199254740990 then raise exception 'Invalid revision' using errcode = '22023'; end if;
 if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or p_snapshot ->> 'version' is distinct from '1' or not (p_snapshot ? 'school' and p_snapshot ? 'game') or octet_length(p_snapshot::text) > 2000000 then raise exception 'Invalid record' using errcode = '22023'; end if;
 if p_expected = 0 then
  return query insert into public.dokdo_private_records as r(user_id, revision, snapshot, updated_at)
   values (subject, 1, p_snapshot, pg_catalog.clock_timestamp()) returning r.revision, r.updated_at;
 else
  return query update public.dokdo_private_records as r
   set snapshot = p_snapshot, revision = r.revision + 1, updated_at = pg_catalog.clock_timestamp()
   where r.user_id = subject and r.revision = p_expected returning r.revision, r.updated_at;
  if not found then raise exception 'Record conflict' using errcode = '40001'; end if;
 end if;
end $$;
revoke all on function public.dokdo_save_private_record(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.dokdo_save_private_record(bigint,jsonb) to authenticated;
commit;
