-- Chronicle Hunt Festival: 2026-10-16 00:00 through 10-19 23:59 JST.
-- 2026-10-16: Additional verified-authenticated event ledger for battles whose progression chain is desynchronized.
-- Production update deployed separately. See FEEDBACK-FIXES-20261016.txt.
-- Do not re-run this original setup on an already updated database; it would overwrite the new snapshot function.
create schema if not exists yakusoku_private;
revoke all on schema yakusoku_private from public,anon;
grant usage on schema yakusoku_private to authenticated;

create table if not exists yakusoku_private.hunt_festival_claims (
 event_id text not null check(event_id='chronicle-hunt-202610'),
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null default gen_random_uuid(),
 weapon text not null,
 save_slot smallint not null check(save_slot between 1 and 5),
 claimed_at timestamptz not null default now(),
 primary key(event_id,auth_user_id)
);
alter table yakusoku_private.hunt_festival_claims enable row level security;
revoke all on yakusoku_private.hunt_festival_claims from public,anon,authenticated;
create index if not exists yakusoku_hunt_audit_time_idx on public.yakusoku_audit_battles(accepted_at) where battle_type<>'raid';
create index if not exists yakusoku_hunt_raid_time_idx on public.raid_rooms(defeated_at) where defeated_at is not null;

create or replace function yakusoku_private.hunt_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $function$
declare
 uid uuid:=auth.uid();
 starts timestamptz:='2026-10-15T15:00:00Z';
 ends timestamptz:='2026-10-19T15:00:00Z';
 total bigint:=0; mine bigint:=0; raids bigint:=0; participated boolean:=false;
 receipt jsonb;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if now()>=starts then
  select coalesce(sum(jsonb_array_length(b.enemy_ids)),0),coalesce(sum(case when b.auth_user_id=uid then jsonb_array_length(b.enemy_ids) else 0 end),0)
   into total,mine from public.yakusoku_audit_battles b
   where b.accepted_at>=starts and b.accepted_at<ends and b.accepted_at<=now()
    and b.client_at>=starts and b.client_at<ends and b.battle_type<>'raid'
    and jsonb_typeof(b.enemy_ids)='array';
  select count(*) into raids from public.raid_rooms r
   where r.defeated_at>=starts and r.defeated_at<ends and r.defeated_at<=now() and r.current_hp<=0;
  select exists(select 1 from public.raid_participants p
   join public.raid_rooms r on r.id=p.room_id
   join public.yakusoku_player_identity i on i.player_id=p.player_id
   where i.auth_user_id=uid and p.contribution>0 and r.current_hp<=0
    and r.defeated_at>=starts and r.defeated_at<ends and r.defeated_at<=now()) into participated;
 end if;
 select jsonb_build_object('id',c.id,'weapon',c.weapon,'saveSlot',c.save_slot,'claimedAt',c.claimed_at)
  into receipt from yakusoku_private.hunt_festival_claims c where c.event_id='chronicle-hunt-202610' and c.auth_user_id=uid;
 return jsonb_build_object('eventId','chronicle-hunt-202610','goal',2500,'total',total+raids,'personalKills',mine,
  'eligible',mine>0 or participated,'receipt',receipt,'serverNow',now(),
  'phase',case when now()<starts then 'upcoming' when now()<ends then 'active' else 'ended' end);
end;
$function$;
revoke all on function yakusoku_private.hunt_snapshot() from public,anon,authenticated;
grant execute on function yakusoku_private.hunt_snapshot() to authenticated;

create or replace function public.yakusoku_hunt_festival_snapshot()
returns jsonb language sql security invoker set search_path='' as $function$
 select yakusoku_private.hunt_snapshot();
$function$;
revoke all on function public.yakusoku_hunt_festival_snapshot() from public,anon,authenticated;
grant execute on function public.yakusoku_hunt_festival_snapshot() to authenticated;

create or replace function yakusoku_private.hunt_claim(p_weapon text,p_save_slot integer)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare uid uuid:=auth.uid(); snap jsonb; c yakusoku_private.hunt_festival_claims%rowtype;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if p_save_slot is null or p_save_slot<1 or p_save_slot>5 then raise exception 'invalid_save_slot'; end if;
 if p_weapon is null or not(p_weapon=any(array['oneHandSword','greatSword','dagger','fist','staff','greatStaff','spear','axe','bow','mace','dualBlades','katana','instrument','cards','gunblade','starGlobe'])) then raise exception 'invalid_weapon'; end if;
 -- Serialize concurrent claims per authenticated account, never trust a client player ID.
 perform pg_advisory_xact_lock(hashtextextended('chronicle-hunt-202610:'||uid::text,0));
 select * into c from yakusoku_private.hunt_festival_claims where event_id='chronicle-hunt-202610' and auth_user_id=uid;
 if not found then
  snap:=yakusoku_private.hunt_snapshot();
  if snap->>'phase'='upcoming' then raise exception 'festival_not_started'; end if;
  if (snap->>'total')::bigint<2500 then raise exception 'festival_not_achieved'; end if;
  if not (snap->>'eligible')::boolean then raise exception 'festival_not_participated'; end if;
  insert into yakusoku_private.hunt_festival_claims(event_id,auth_user_id,weapon,save_slot)
   values('chronicle-hunt-202610',uid,p_weapon,p_save_slot) returning * into c;
 end if;
 if c.save_slot<>p_save_slot then raise exception 'festival_wrong_slot'; end if;
 return jsonb_build_object('id',c.id,'weapon',c.weapon,'saveSlot',c.save_slot,'claimedAt',c.claimed_at);
end;
$function$;
revoke all on function yakusoku_private.hunt_claim(text,integer) from public,anon,authenticated;
grant execute on function yakusoku_private.hunt_claim(text,integer) to authenticated;

create or replace function public.yakusoku_hunt_festival_claim(p_weapon text,p_save_slot integer)
returns jsonb language sql security invoker set search_path='' as $function$
 select yakusoku_private.hunt_claim(p_weapon,p_save_slot);
$function$;
revoke all on function public.yakusoku_hunt_festival_claim(text,integer) from public,anon,authenticated;
grant execute on function public.yakusoku_hunt_festival_claim(text,integer) to authenticated;

-- Claims deliberately deny direct client access; only the checked RPC can grant rewards.
do $$begin if not exists(select 1 from pg_policies where schemaname='yakusoku_private' and tablename='hunt_festival_claims' and policyname='hunt_claims_deny_direct_access') then create policy hunt_claims_deny_direct_access on yakusoku_private.hunt_festival_claims for all to authenticated using(false) with check(false);end if;end;$$;
