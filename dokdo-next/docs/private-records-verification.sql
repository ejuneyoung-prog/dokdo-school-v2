-- Owner-run database verification. Fictional users only. EVERYTHING rolls back.
-- Run after private-records.sql; any assertion failure aborts the transaction.
begin;
insert into auth.users(id, aud, role, created_at, updated_at) values
 ('e29e8981-1af7-4a49-a4fd-918691b78c11','authenticated','authenticated',now(),now()),
 ('a0e63436-3c93-44d4-90cd-5209143dd522','authenticated','authenticated',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','e29e8981-1af7-4a49-a4fd-918691b78c11',true);
select * from public.dokdo_save_private_record(0,'{"version":1,"school":null,"game":null}'::jsonb);
do $$ begin
 if (select count(*) from public.dokdo_private_records) <> 1 then raise exception 'A self read failed'; end if;
 begin
  perform public.dokdo_save_private_record(0,'{"version":1,"school":null,"game":null}'::jsonb);
  raise exception 'Duplicate insert unexpectedly allowed';
 exception when unique_violation then null; end;
 begin
  perform public.dokdo_save_private_record(99,'{"version":1,"school":null,"game":null}'::jsonb);
  raise exception 'Stale revision unexpectedly allowed';
 exception when serialization_failure then null; end;
 begin
  update public.dokdo_private_records set revision=999;
  raise exception 'Direct write unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
select * from public.dokdo_save_private_record(1,'{"version":1,"school":null,"game":null}'::jsonb);
select set_config('request.jwt.claim.sub','a0e63436-3c93-44d4-90cd-5209143dd522',true);
do $$ begin
 if (select count(*) from public.dokdo_private_records) <> 0 then raise exception 'B read A'; end if;
 begin
  perform public.dokdo_save_private_record(2,'{"version":1,"school":null,"game":null}'::jsonb);
  raise exception 'B overwrote A';
 exception when serialization_failure then null; end;
end $$;
select * from public.dokdo_save_private_record(0,'{"version":1,"school":null,"game":null}'::jsonb);
do $$ begin
 if (select count(*) from public.dokdo_private_records) <> 1 then raise exception 'B isolation failed'; end if;
 begin
  delete from public.dokdo_private_records;
  raise exception 'Direct delete unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin
  perform 1 from public.dokdo_private_records;
  raise exception 'Anonymous read unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.dokdo_save_private_record(0,'{"version":1,"school":null,"game":null}'::jsonb);
  raise exception 'Anonymous RPC unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if (select revision from public.dokdo_private_records where user_id='e29e8981-1af7-4a49-a4fd-918691b78c11') <> 2 then raise exception 'A revision corrupted'; end if;
 if (select revision from public.dokdo_private_records where user_id='a0e63436-3c93-44d4-90cd-5209143dd522') <> 1 then raise exception 'B revision corrupted'; end if;
end $$;
rollback;
select 'Private-record A/B/anonymous checks completed; fictional fixtures rolled back.' as result;
