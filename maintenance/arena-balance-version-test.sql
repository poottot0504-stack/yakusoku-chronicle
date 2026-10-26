-- Migration smoke checks on disposable PostgreSQL, never on a live user.
\set ON_ERROR_STOP on
do $$
begin
 if has_function_privilege('anon','public.arena_server_issue_v2(uuid,smallint,text,uuid,bigint)','EXECUTE')
 or has_function_privilege('authenticated','public.arena_server_issue_v2(uuid,smallint,text,uuid,bigint)','EXECUTE')
 then raise exception 'NEW ARENA RPC EXPOSED TO USERS';end if;
 if not has_function_privilege('service_role','public.arena_server_issue_v2(uuid,smallint,text,uuid,bigint)','EXECUTE')
 then raise exception 'ARENA SERVER V2 RPC IS NOT ACCESSIBLE';end if;
 if (select count(*) from arena_private.matches where balance_version=1) < 1
 then raise exception 'EXISTING MATCHES DID NOT DEFAULT TO OLD RULESET';end if;
end $$;
set role service_role;
select public.arena_server_issue_v2(
 '10000000-0000-4000-8000-000000000001',2::smallint,'arena70',
 '30000000-0000-4000-8000-000000000010',1001::bigint);
select public.arena_server_issue(
 '10000000-0000-4000-8000-000000000001',2::smallint,'arena30',
 '30000000-0000-4000-8000-000000000011',1002::bigint);
do $$
begin
 if (public.arena_server_lookup('10000000-0000-4000-8000-000000000001',2::smallint,
  '30000000-0000-4000-8000-000000000010')->>'balanceVersion')::int<>2
 then raise exception 'V2 MATCH VERSION MISSING';end if;
 if (public.arena_server_lookup('10000000-0000-4000-8000-000000000001',2::smallint,
  '30000000-0000-4000-8000-000000000011')->>'balanceVersion')::int<>1
 then raise exception 'LEGACY CLIENT MATCH WAS UPGRADED WITHOUT CONSENT';end if;
 if public.arena_server_lookup('10000000-0000-4000-8000-000000000002',2::smallint,
  '30000000-0000-4000-8000-000000000010') is not null
 then raise exception 'CROSS-OWNER V2 MATCH VISIBLE';end if;
end $$;
reset role;
select 'ARENA_RULESET_MIGRATION_PASSED' as result;
