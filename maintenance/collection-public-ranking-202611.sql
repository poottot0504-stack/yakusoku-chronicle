-- DRAFT ONLY: public read-only collection event ranking.
-- Requires maintenance/collection-reward-claim-202611.sql first.
-- Source table must be populated ONLY from an independently reviewed/validated
-- server-side battle ledger. Do not accept scores sent by the browser.
-- No score-ingestion RPC is provided in this file.
create table if not exists yakusoku_private.collection_tallies_202611 (
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 player_name text not null check(char_length(player_name) between 1 and 40),
 proof_count bigint not null check(proof_count>=1),
 last_earned_at timestamptz not null
);
alter table yakusoku_private.collection_tallies_202611 enable row level security;
revoke all on yakusoku_private.collection_tallies_202611 from public,anon,authenticated;

create or replace function public.yakusoku_collection_public_ranking(
 p_event_id text,p_page integer,p_page_size integer)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare
 uid uuid:=auth.uid();
 finalized timestamptz;
 v_total integer:=0;
 v_rows jsonb:='[]'::jsonb;
 v_my_rank integer:=null;
 v_my_count bigint:=null;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if p_event_id is distinct from 'chronicle-collection-202611'
  or p_page is null or p_page not between 1 and 100000
  or p_page_size is null or p_page_size not between 1 and 50
 then raise exception 'invalid_ranking_request'; end if;

 select finalized_at into finalized
 from yakusoku_private.collection_event_control_202611 where id=1;

 if finalized is not null then
  with ranked as (
   select s.auth_user_id,s.player_name,s.proof_count,
    s.rank from yakusoku_private.collection_final_standings_202611 s
  )
  select count(*)::integer,
   coalesce(jsonb_agg(jsonb_build_object(
    'rank',r.rank,'displayName',r.player_name,'count',r.proof_count
   ) order by r.rank) filter (where r.rank between
     (p_page-1)*p_page_size+1 and p_page*p_page_size),'[]'::jsonb),
   max(r.rank) filter(where r.auth_user_id=uid),
   max(r.proof_count) filter(where r.auth_user_id=uid)
  into v_total,v_rows,v_my_rank,v_my_count
  from ranked r;
 elsif now()>='2026-11-06T00:00:00+09:00'::timestamptz then
  with ranked as (
   select t.auth_user_id,t.player_name,t.proof_count,
    row_number() over(order by t.proof_count desc,t.last_earned_at asc,t.auth_user_id) as rank
   from yakusoku_private.collection_tallies_202611 t
  )
  select count(*)::integer,
   coalesce(jsonb_agg(jsonb_build_object(
    'rank',r.rank,'displayName',r.player_name,'count',r.proof_count
   ) order by r.rank) filter (where r.rank between
     (p_page-1)*p_page_size+1 and p_page*p_page_size),'[]'::jsonb),
   cast(max(r.rank) filter(where r.auth_user_id=uid) as integer),
   max(r.proof_count) filter(where r.auth_user_id=uid)
  into v_total,v_rows,v_my_rank,v_my_count
  from ranked r;
 end if;

 return jsonb_build_object('rows',v_rows,'totalParticipants',v_total,
  'myRank',v_my_rank,'myCount',v_my_count);
end;
$body$;
revoke all on function public.yakusoku_collection_public_ranking(text,integer,integer)
 from public,anon,authenticated;
grant execute on function public.yakusoku_collection_public_ranking(text,integer,integer)
 to authenticated,service_role;
-- WARNING: ranks appear only after service-role verification writes to the
-- private score table. Review work can invalidate any live (pre-final) position.
