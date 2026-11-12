-- Repair November 2026 collection proof counts lost to sub-second RPC issuance races.
-- The trigger continues to require a server-issued ticket, authenticated audit,
-- canonical region and enemy IDs, no more than five defeated enemies, verified
-- victory audit, chronological server accepted_at >= ticket.issued_at, and unique
-- battle IDs. The ONLY relaxed rule is client_at lower bound: ticket -20s.
-- Existing verified battle rows are immutable. No battle-start-only credit.
-- Idempotent: accepted_battles PK and INSERT ... RETURNING gate exact tally credits.
BEGIN;

CREATE OR REPLACE FUNCTION yakusoku_private.collection_accept_audit_202611()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 ticket yakusoku_private.collection_battle_tickets_202611%rowtype;
 v_kills integer;
 v_inserted uuid;
 v_duration bigint;
begin
 if new.battle_type<>'normal' or new.accepted_at<'2026-11-06T00:00:00+09:00'::timestamptz
  or new.accepted_at>='2026-11-18T00:00:00+09:00'::timestamptz
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
    new.client_at < ticket.issued_at-interval '20 seconds' or
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
$function$


-- Reconcile ONLY existing, authenticated, server-ACCEPTED victory audit rows.
-- The original AFTER INSERT trigger ignored these due to a client/server timestamp
-- difference of at most 17.61 seconds. Ticket-only battles cannot be credited.
WITH verified AS MATERIALIZED (
  SELECT a.battle_id,a.auth_user_id,a.region_id,a.accepted_at,
    jsonb_array_length(a.enemy_ids)::integer AS kills,
    greatest(0,floor(extract(epoch from (a.client_at-t.issued_at))*1000)::bigint) AS duration_ms
  FROM public.yakusoku_audit_battles a
  JOIN yakusoku_private.collection_battle_tickets_202611 t
    ON t.battle_id=a.battle_id AND t.auth_user_id=a.auth_user_id
  LEFT JOIN yakusoku_private.collection_accepted_battles_202611 old
    ON old.battle_id=a.battle_id
  WHERE old.battle_id IS NULL
    AND a.battle_type='normal'
    AND a.accepted_at >= '2026-11-06T00:00:00+09:00'::timestamptz
    AND a.accepted_at < '2026-11-18T00:00:00+09:00'::timestamptz
    AND a.client_at >= '2026-11-06T00:00:00+09:00'::timestamptz
    AND a.client_at < '2026-11-17T00:00:00+09:00'::timestamptz
    AND a.region_id IN ('field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss')
    AND jsonb_typeof(a.enemy_ids)='array'
    AND a.exp_awarded IS NOT NULL AND a.exp_awarded>=0
    AND jsonb_array_length(a.enemy_ids) BETWEEN 1 AND 5
    AND t.region_id IS NOT DISTINCT FROM a.region_id
    AND a.client_at >= t.issued_at - interval '20 seconds'
    AND a.client_at <= t.issued_at + interval '2 hours'
    AND a.accepted_at >= t.issued_at
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(a.enemy_ids) AS killed(id)
      GROUP BY killed.id
      HAVING killed.id IS NULL
        OR COUNT(*) > (
          SELECT COUNT(*) FROM unnest(t.enemy_ids) AS started(id)
          WHERE started.id=killed.id
        )
    )
),
newly_accepted AS (
  INSERT INTO yakusoku_private.collection_accepted_battles_202611
     (battle_id,auth_user_id,region_id,kills,accepted_at,duration_ms)
  SELECT battle_id,auth_user_id,region_id,kills,accepted_at,duration_ms
  FROM verified
  ON CONFLICT (battle_id) DO NOTHING
  RETURNING battle_id,auth_user_id,kills,accepted_at
),
per_user AS (
  SELECT auth_user_id,SUM(kills)::bigint AS added_proofs,MAX(accepted_at) last_accepted
  FROM newly_accepted GROUP BY auth_user_id
),
latest_name AS (
  SELECT DISTINCT ON (v.auth_user_id) v.auth_user_id,t.player_name
  FROM newly_accepted v
  JOIN yakusoku_private.collection_battle_tickets_202611 t USING (battle_id)
  ORDER BY v.auth_user_id,v.accepted_at DESC,v.battle_id
)
INSERT INTO yakusoku_private.collection_tallies_202611
  (auth_user_id,player_name,proof_count,last_earned_at)
SELECT s.auth_user_id,n.player_name,s.added_proofs,s.last_accepted
FROM per_user s JOIN latest_name n USING(auth_user_id)
ON CONFLICT (auth_user_id) DO UPDATE
SET proof_count=yakusoku_private.collection_tallies_202611.proof_count+excluded.proof_count,
    player_name=CASE
      WHEN excluded.last_earned_at>=yakusoku_private.collection_tallies_202611.last_earned_at
      THEN excluded.player_name
      ELSE yakusoku_private.collection_tallies_202611.player_name END,
    last_earned_at=greatest(yakusoku_private.collection_tallies_202611.last_earned_at,excluded.last_earned_at);

COMMIT;

-- Verification: SUM(kills) in accepted_battles MUST equal SUM(proof_count)
-- in collection_tallies_202611. Re-running this migration must not change counts.
