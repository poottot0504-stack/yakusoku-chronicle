-- November 2026 ranking event: PRIVATE final standings and one-time reward receipts.
-- DRAFT migration. DO NOT apply until audited server scoring, rank-finalization,
-- public ranking RPC and frontend are ready for a coordinated release.
-- All entries in collection_final_standings must be created by the trusted
-- server/operator after anti-cheat review. Never import client-provided ranks.
--
-- Finalize only AFTER event ends, and never reset finalized_at afterwards.

create schema if not exists yakusoku_private;
revoke all on schema yakusoku_private from public,anon;
revoke all on schema yakusoku_private from authenticated;
grant usage on schema yakusoku_private to authenticated;

create table if not exists yakusoku_private.collection_event_control_202611 (
 id smallint primary key check(id=1),
 finalized_at timestamptz,
 created_at timestamptz not null default now()
);
insert into yakusoku_private.collection_event_control_202611(id) values(1) on conflict do nothing;
alter table yakusoku_private.collection_event_control_202611 enable row level security;
revoke all on yakusoku_private.collection_event_control_202611 from public,anon,authenticated;

create table if not exists yakusoku_private.collection_final_standings_202611 (
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 player_name text not null check(char_length(player_name) between 1 and 40),
 rank integer not null unique check(rank>=1),
 proof_count bigint not null check(proof_count>0),
 under_review boolean not null default true,
 confirmed_at timestamptz not null default now()
);
alter table yakusoku_private.collection_final_standings_202611 enable row level security;
revoke all on yakusoku_private.collection_final_standings_202611 from public,anon,authenticated;

create table if not exists yakusoku_private.collection_reward_claims_202611 (
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 id uuid not null unique default gen_random_uuid(),
 rank integer not null check(rank>=1),
 save_slot smallint not null check(save_slot between 1 and 5),
 claimed_at timestamptz not null default now()
);
alter table yakusoku_private.collection_reward_claims_202611 enable row level security;
revoke all on yakusoku_private.collection_reward_claims_202611 from public,anon,authenticated;

create or replace function yakusoku_private.collection_reward_items_202611(p_rank integer)
returns jsonb language sql immutable set search_path='' as $body$
 select case
  when p_rank between 1 and 3 then
   jsonb_build_array(
    jsonb_build_object('id','orichalcum','qty',case p_rank when 1 then 5 when 2 then 3 else 2 end),
    jsonb_build_object('id','orihal','qty',case p_rank when 1 then 5 when 2 then 3 else 2 end),
    jsonb_build_object('id','characterExpScroll','qty',case p_rank when 1 then 5 when 2 then 3 else 2 end),
    jsonb_build_object('id','jobExpScroll','qty',case p_rank when 1 then 5 when 2 then 3 else 2 end))
  when p_rank between 4 and 10 then
   jsonb_build_array(jsonb_build_object('id','orichalcum','qty',1),jsonb_build_object('id','orihal','qty',1),
    jsonb_build_object('id','characterExpScroll','qty',1),jsonb_build_object('id','jobExpScroll','qty',1))
  when p_rank between 11 and 100 then
   jsonb_build_array(jsonb_build_object('id','characterExpScroll','qty',1),jsonb_build_object('id','jobExpScroll','qty',1))
  else '[]'::jsonb end;
$body$;
revoke all on function yakusoku_private.collection_reward_items_202611(integer) from public,anon,authenticated;

create or replace function yakusoku_private.collection_reward_gold_202611(p_rank integer)
returns bigint language sql immutable set search_path='' as $body$
 select case
  when p_rank=1 then 50000000::bigint
  when p_rank=2 then 30000000::bigint
  when p_rank=3 then 20000000::bigint
  when p_rank between 4 and 10 then 5000000::bigint
  when p_rank between 11 and 30 then 2000000::bigint
  when p_rank between 31 and 100 then 500000::bigint
  when p_rank>=101 then 100000::bigint
  else 0::bigint end;
$body$;
revoke all on function yakusoku_private.collection_reward_gold_202611(integer) from public,anon,authenticated;

create or replace function yakusoku_private.collection_reward_receipt_202611(
 p_id uuid,p_rank integer,p_slot smallint,p_claimed_at timestamptz)
returns jsonb language sql stable set search_path='' as $body$
 select jsonb_build_object('id',p_id,'rank',p_rank,'saveSlot',p_slot,
  'gold',yakusoku_private.collection_reward_gold_202611(p_rank),
  'items',yakusoku_private.collection_reward_items_202611(p_rank),'claimedAt',p_claimed_at);
$body$;
revoke all on function yakusoku_private.collection_reward_receipt_202611(uuid,integer,smallint,timestamptz)
 from public,anon,authenticated;

create or replace function public.yakusoku_collection_claim_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $body$
declare
 uid uuid:=auth.uid();
 finalized timestamptz;
 standing record;
 claim yakusoku_private.collection_reward_claims_202611%rowtype;
 receipt jsonb:=null;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 perform yakusoku_private.collection_maybe_finalize_202611();
 select finalized_at into finalized from yakusoku_private.collection_event_control_202611 where id=1;
 select rank,proof_count,under_review into standing from yakusoku_private.collection_final_standings_202611
  where auth_user_id=uid;
 select * into claim from yakusoku_private.collection_reward_claims_202611 where auth_user_id=uid;
 if found then
  receipt:=yakusoku_private.collection_reward_receipt_202611(claim.id,claim.rank,claim.save_slot,claim.claimed_at);
 end if;
 return jsonb_build_object('finalized',finalized is not null,
  'claimable',finalized is not null and standing.rank is not null
    and standing.under_review is false and receipt is null,
  'myRank',case when finalized is not null then standing.rank else null end,
  'myCount',case when finalized is not null then standing.proof_count else null end,
  'receipt',receipt);
end;
$body$;
revoke all on function public.yakusoku_collection_claim_snapshot() from public,anon,authenticated;
grant execute on function public.yakusoku_collection_claim_snapshot() to authenticated,service_role;

create or replace function public.yakusoku_collection_claim(p_save_slot integer)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare
 uid uuid:=auth.uid();
 finalized timestamptz;
 standing record;
 claim yakusoku_private.collection_reward_claims_202611%rowtype;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if p_save_slot is null or p_save_slot<1 or p_save_slot>5 then raise exception 'invalid_save_slot'; end if;
 perform pg_advisory_xact_lock(hashtextextended('collection-202611-claim:'||uid::text,0));
 select * into claim from yakusoku_private.collection_reward_claims_202611 where auth_user_id=uid;
 if found then
  if claim.save_slot<>p_save_slot then raise exception 'collection_wrong_slot'; end if;
  return yakusoku_private.collection_reward_receipt_202611(claim.id,claim.rank,claim.save_slot,claim.claimed_at);
 end if;
 if now()<'2026-11-17T00:00:00+09:00'::timestamptz then raise exception 'collection_rank_not_final'; end if;
 perform yakusoku_private.collection_maybe_finalize_202611();
 select finalized_at into finalized from yakusoku_private.collection_event_control_202611 where id=1;
 if finalized is null then raise exception 'collection_rank_not_final'; end if;
 select rank,under_review into standing from yakusoku_private.collection_final_standings_202611 where auth_user_id=uid;
 if standing.rank is null then raise exception 'collection_not_participated'; end if;
 if standing.under_review is true then raise exception 'collection_rank_under_review'; end if;
 insert into yakusoku_private.collection_reward_claims_202611(auth_user_id,rank,save_slot)
 values(uid,standing.rank,p_save_slot) returning * into claim;
 return yakusoku_private.collection_reward_receipt_202611(claim.id,claim.rank,claim.save_slot,claim.claimed_at);
end;
$body$;
revoke all on function public.yakusoku_collection_claim(integer) from public,anon,authenticated;
grant execute on function public.yakusoku_collection_claim(integer) to authenticated,service_role;

-- No direct table reads or writes for any browser role. Event ledger finalization
-- remains operator-only and should be reviewed and audited.
