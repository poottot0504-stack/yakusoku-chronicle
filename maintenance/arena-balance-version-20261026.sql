-- Safe live upgrade: preserve already-issued arena matches at ruleset version 1.
-- New clients explicitly ask the server for ruleset 2 when starting a match.
begin;
alter table arena_private.matches
 add column if not exists balance_version smallint not null default 1
 check(balance_version in (1,2));

create or replace function arena_private.arena_lookup(p_user uuid,p_slot smallint,p_id uuid)
returns jsonb language sql security invoker set search_path=''
as $$
 select jsonb_build_object('questId',m.quest_id,'seed',m.seed,'status',m.status,
  'expiresAt',m.expires_at,'createdAt',m.created_at,'balanceVersion',m.balance_version)
 from arena_private.matches m where m.id=p_id and m.user_id=p_user and m.save_slot=p_slot
$$;

-- Keep the old arena_server_issue RPC unchanged. Older browser builds continue
-- creating version-1 matches, while this separate v2 RPC is used by new builds.
create or replace function public.arena_server_issue_v2(
 p_user uuid,p_slot smallint,p_quest text,p_id uuid,p_seed bigint)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_receipt jsonb;
begin
 v_receipt:=arena_private.arena_issue(p_user,p_slot,p_quest,p_id,p_seed);
 update arena_private.matches set balance_version=2
 where id=p_id and user_id=p_user and save_slot=p_slot;
 if not found then raise exception 'ARENA_MATCH_NOT_FOUND';end if;
 return v_receipt||jsonb_build_object('balanceVersion',2);
end $$;

revoke all on function public.arena_server_issue_v2(uuid,smallint,text,uuid,bigint)
 from public,anon,authenticated;
grant execute on function public.arena_server_issue_v2(uuid,smallint,text,uuid,bigint)
 to service_role;
commit;
