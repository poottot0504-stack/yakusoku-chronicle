-- Private lazy finalization, after 24h grace for audited event submissions.
-- Requires: collection-reward-claim-202611.sql, collection-public-ranking-202611.sql,
-- collection-audit-ledger-202611.sql.
-- Unique account rankings, deterministic tie-break: count DESC, timestamp ASC,
-- account UUID ASC. Large totals alone are NOT considered cheating.
-- The first snapshot/public ranking/claim request after Nov 18 00:00 JST
-- finalizes scores atomically; before then returns false without modifying data.
create or replace function yakusoku_private.collection_maybe_finalize_202611()
returns boolean language plpgsql security definer set search_path='' as $final$
declare done_at timestamptz;
begin
 if now()<'2026-11-18T00:00:00+09:00'::timestamptz then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended('collection-finalize-202611',0));
 select finalized_at into done_at
 from yakusoku_private.collection_event_control_202611 where id=1 for update;
 if done_at is not null then return true; end if;
 -- All submitted audit events have been received by this point. The finalization
 -- time equals the accepted-event grace deadline and cannot be advanced by users.
 with ranked as (
  select t.auth_user_id,t.player_name,t.proof_count,
   row_number() over(order by t.proof_count desc,t.last_earned_at asc,t.auth_user_id) as rank
  from yakusoku_private.collection_tallies_202611 t
 ), flagged as (
  select auth_user_id
  from yakusoku_private.collection_accepted_battles_202611
  group by auth_user_id,date_trunc('minute',accepted_at)
  having count(*)>=28
 ), reviewed as (
  select distinct auth_user_id from flagged
 )
 insert into yakusoku_private.collection_final_standings_202611(
  auth_user_id,player_name,rank,proof_count,under_review
 ) select r.auth_user_id,r.player_name,r.rank::integer,r.proof_count,
   (v.auth_user_id is not null) from ranked r left join reviewed v on v.auth_user_id=r.auth_user_id
 on conflict (auth_user_id) do nothing;
 update yakusoku_private.collection_event_control_202611
 set finalized_at=now() where id=1 and finalized_at is null;
 return true;
end;
$final$;
revoke all on function yakusoku_private.collection_maybe_finalize_202611()
 from public,anon,authenticated;

-- Operational note: an flagged player receives "報酬を確認中です", not a
-- public cheating label. After manual review an operator may update the
-- under_review flag; this is intentionally not exposed to client RPCs.
