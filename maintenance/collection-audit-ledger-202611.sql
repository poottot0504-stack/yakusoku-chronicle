-- November 2026 collection event: server-issued encounter tickets and a private,
-- append-only, audit-backed scoring ledger. Apply only once coordinated with the
-- current game code. This does not change the October hunt festival.
-- Important: the game battle is client-simulated; ticket+audited progression
-- makes replay/spoofing harder, but is not cryptographic proof of a genuine win.

create schema if not exists yakusoku_private;
revoke all on schema yakusoku_private from public,anon;
grant usage on schema yakusoku_private to authenticated;

create table if not exists yakusoku_private.collection_battle_tickets_202611 (
 battle_id uuid primary key,
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 region_id text not null,
 enemy_ids text[] not null,
 player_name text not null check(char_length(player_name) between 1 and 40),
 issued_at timestamptz not null default now(),
 check(cardinality(enemy_ids) between 1 and 5)
);
create index if not exists collection_ticket_user_time_idx
 on yakusoku_private.collection_battle_tickets_202611(auth_user_id,issued_at desc);
alter table yakusoku_private.collection_battle_tickets_202611 enable row level security;
revoke all on yakusoku_private.collection_battle_tickets_202611 from public,anon,authenticated;

create table if not exists yakusoku_private.collection_accepted_battles_202611 (
 battle_id uuid primary key references yakusoku_private.collection_battle_tickets_202611(battle_id),
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 region_id text not null,
 kills integer not null check(kills between 1 and 5),
 accepted_at timestamptz not null,
 duration_ms bigint not null check(duration_ms>=0)
);
create index if not exists collection_accepted_uid_time_idx
 on yakusoku_private.collection_accepted_battles_202611(auth_user_id,accepted_at);
alter table yakusoku_private.collection_accepted_battles_202611 enable row level security;
revoke all on yakusoku_private.collection_accepted_battles_202611 from public,anon,authenticated;

-- Same table is created by collection-public-ranking-202611.sql.
create table if not exists yakusoku_private.collection_tallies_202611 (
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 player_name text not null check(char_length(player_name) between 1 and 40),
 proof_count bigint not null check(proof_count>=1),
 last_earned_at timestamptz not null
);
alter table yakusoku_private.collection_tallies_202611 enable row level security;
revoke all on yakusoku_private.collection_tallies_202611 from public,anon,authenticated;

create or replace function public.yakusoku_collection_begin(
 p_battle_id uuid,p_region_id text,p_enemy_ids text[],p_display_name text
) returns jsonb language plpgsql security definer set search_path='' as $begin$
declare
 uid uuid:=auth.uid();
 existing yakusoku_private.collection_battle_tickets_202611%rowtype;
 v_name text;
 v_recent integer;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if now()<'2026-11-06T00:00:00+09:00'::timestamptz or
    now()>='2026-11-17T00:00:00+09:00'::timestamptz then
  raise exception 'collection_outside_window';
 end if;
 if p_battle_id is null or
    p_region_id not in ('field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss')
 then raise exception 'collection_invalid_region'; end if;
 if coalesce(cardinality(p_enemy_ids),0) not between 1 and 5 or
  exists(select 1 from unnest(p_enemy_ids) as e(id)
   where e.id is null or char_length(e.id) not between 1 and 80 or
    e.id !~ '^[A-Za-z][A-Za-z0-9_-]*$' or
    e.id ~* '^(event-|rare-|storyBoss-|rematch-|masho-|raid-)')
 then raise exception 'collection_invalid_enemies'; end if;
 v_name:=left(trim(coalesce(p_display_name,'')),40);
 if char_length(v_name)<1 then v_name:='旅人'; end if;
 perform pg_advisory_xact_lock(hashtextextended('collection-begin:'||uid::text,0));
 select * into existing from yakusoku_private.collection_battle_tickets_202611 where battle_id=p_battle_id;
 if found then
  if existing.auth_user_id<>uid or existing.region_id<>p_region_id or
     existing.enemy_ids<>p_enemy_ids then raise exception 'collection_ticket_conflict'; end if;
  return jsonb_build_object('ok',true,'battleId',p_battle_id,'duplicate',true);
 end if;
 select count(*) into v_recent from yakusoku_private.collection_battle_tickets_202611
  where auth_user_id=uid and issued_at>now()-interval '1 minute';
 if v_recent>=30 then raise exception 'collection_rate_limited'; end if;
 insert into yakusoku_private.collection_battle_tickets_202611(
  battle_id,auth_user_id,region_id,enemy_ids,player_name)
 values(p_battle_id,uid,p_region_id,p_enemy_ids,v_name);
 return jsonb_build_object('ok',true,'battleId',p_battle_id,'protocol',1);
end;
$begin$;
revoke all on function public.yakusoku_collection_begin(uuid,text,text[],text) from public,anon,authenticated;
grant execute on function public.yakusoku_collection_begin(uuid,text,text[],text) to authenticated,service_role;

-- An audited, accepted progression battle is the only source for ranked score.
-- Never expose a client-controlled "increment score" RPC.
create or replace function yakusoku_private.collection_accept_audit_202611()
returns trigger language plpgsql security definer set search_path='' as $trigger$
declare
 ticket yakusoku_private.collection_battle_tickets_202611%rowtype;
 v_kills integer;
 v_inserted uuid;
 v_duration bigint;
begin
 if new.battle_type<>'normal' or new.accepted_at<'2026-11-06T00:00:00+09:00'::timestamptz
  or new.accepted_at>='2026-11-19T00:00:00+09:00'::timestamptz
  or new.client_at<'2026-11-06T00:00:00+09:00'::timestamptz
  or new.client_at>='2026-11-17T00:00:00+09:00'::timestamptz
  or new.region_id not in ('field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss')
  or jsonb_typeof(new.enemy_ids) is distinct from 'array'
  or new.exp_awarded is null or new.exp_awarded<0
 then return new; end if;
 select * into ticket from yakusoku_private.collection_battle_tickets_202611
 where battle_id=new.battle_id and auth_user_id=new.auth_user_id;
 if not found then return new; end if;
 v_kills:=jsonb_array_length(new.enemy_ids);
 if v_kills not between 1 and 5 or
    ticket.region_id is distinct from new.region_id or
    new.client_at < ticket.issued_at or
    new.client_at > ticket.issued_at+interval '2 hours' or
    new.accepted_at < ticket.issued_at
 then return new; end if;
 if exists(
  select 1 from jsonb_array_elements_text(new.enemy_ids) as killed(id)
  group by killed.id
  having killed.id is null or
   count(*)>(select count(*) from unnest(ticket.enemy_ids) as started(id) where started.id=killed.id)
 ) then return new; end if;
 v_duration:=greatest(0,floor(extract(epoch from(new.client_at-ticket.issued_at))*1000)::bigint);
 insert into yakusoku_private.collection_accepted_battles_202611(
  battle_id,auth_user_id,region_id,kills,accepted_at,duration_ms
 ) values(new.battle_id,new.auth_user_id,new.region_id,v_kills,new.accepted_at,v_duration)
 on conflict (battle_id) do nothing returning battle_id into v_inserted;
 if v_inserted is not null then
  insert into yakusoku_private.collection_tallies_202611(
   auth_user_id,player_name,proof_count,last_earned_at)
  values(new.auth_user_id,ticket.player_name,v_kills,new.accepted_at)
  on conflict (auth_user_id) do update
   set proof_count=yakusoku_private.collection_tallies_202611.proof_count+excluded.proof_count,
       player_name=excluded.player_name,last_earned_at=greatest(
        yakusoku_private.collection_tallies_202611.last_earned_at,excluded.last_earned_at);
 end if;
 return new;
end;
$trigger$;
revoke all on function yakusoku_private.collection_accept_audit_202611() from public,anon,authenticated;
drop trigger if exists yakusoku_collection_audit_202611 on public.yakusoku_audit_battles;
create trigger yakusoku_collection_audit_202611
 after insert on public.yakusoku_audit_battles
 for each row execute function yakusoku_private.collection_accept_audit_202611();

-- Private review view: anomalously high sustained submission rates are ONLY
-- investigation hints, never proof of cheating or automatic public accusation.
create or replace view yakusoku_private.collection_security_review_202611 as
select a.auth_user_id,count(*) as accepted_battles,sum(a.kills) as accepted_proofs,
 min(a.accepted_at) as first_at,max(a.accepted_at) as last_at,
 min(a.duration_ms) as fastest_ms
from yakusoku_private.collection_accepted_battles_202611 a
group by a.auth_user_id;
revoke all on yakusoku_private.collection_security_review_202611 from public,anon,authenticated;
