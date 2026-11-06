-- Event-scoped rehabilitation for stale, pre-event verified chains.
-- Applied to Supabase production on 2026-11-06. Service-role only.
-- A ticket does not confer score. The audit accept/DB trigger remains authoritative.
create or replace function public.yakusoku_collection_rebaseline_eligible(
 p_auth_user_id uuid, p_battle_id uuid, p_save_slot integer, p_region_id text,
 p_enemy_ids text[], p_client_at timestamptz
) returns boolean
language sql stable security definer set search_path=''
as $$
select p_auth_user_id is not null and p_battle_id is not null
 and p_save_slot between 1 and 5
 and p_region_id in ('field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss')
 and cardinality(p_enemy_ids) between 1 and 5
 and now() >= timestamptz '2026-11-06 00:00:00+09'
 and now() < timestamptz '2026-11-18 00:00:00+09'
 and exists (
  select 1 from yakusoku_private.collection_battle_tickets_202611 t
  where t.battle_id=p_battle_id and t.auth_user_id=p_auth_user_id
   and t.region_id=p_region_id
   and p_client_at between t.issued_at and t.issued_at+interval '2 hours'
   and p_client_at <= now()+interval '1 minute'
   and not exists (
    select 1 from unnest(p_enemy_ids) as killed(id)
    group by killed.id
    having killed.id is null or count(*) > (
     select count(*) from unnest(t.enemy_ids) as expected(id)
     where expected.id=killed.id
    )
   )
 )
 and exists (
  select 1 from public.yakusoku_player_identity ident
  join public.yakusoku_verified_characters v on v.player_id=ident.player_id
  where ident.auth_user_id=p_auth_user_id and v.save_slot=p_save_slot
   and v.last_battle_at < timestamptz '2026-11-06 00:00:00+09'
 )
 and not exists (
  select 1 from public.yakusoku_player_identity ident
  join public.yakusoku_verified_characters v on v.player_id=ident.player_id
  where ident.auth_user_id=p_auth_user_id and v.save_slot=p_save_slot
   and (v.last_battle_at >= timestamptz '2026-11-06 00:00:00+09'
        or v.last_battle_at is null)
 );
$$;
revoke all on function public.yakusoku_collection_rebaseline_eligible(
 uuid,uuid,integer,text,text[],timestamptz
) from public,anon,authenticated;
grant execute on function public.yakusoku_collection_rebaseline_eligible(
 uuid,uuid,integer,text,text[],timestamptz
) to service_role;
