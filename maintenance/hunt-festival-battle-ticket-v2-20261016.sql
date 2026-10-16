-- Battle-ticket v2: additive deployment, safe for clients on the previous version.
-- IMPORTANT: strict_mode remains FALSE until the game ZIP has been deployed and
-- existing clients have refreshed. Only the site operator may enable it.
-- This is a tamper-resistance and review layer, NOT cryptographic proof that a
-- client-side simulation actually won the battle.

CREATE TABLE IF NOT EXISTS yakusoku_private.hunt_festival_security_config (
 id smallint PRIMARY KEY CHECK (id=1),
 strict_mode boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO yakusoku_private.hunt_festival_security_config(id,strict_mode)
VALUES(1,false) ON CONFLICT(id) DO NOTHING;
ALTER TABLE yakusoku_private.hunt_festival_security_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON yakusoku_private.hunt_festival_security_config FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS yakusoku_private.hunt_festival_battle_tickets (
 battle_id uuid PRIMARY KEY,
 auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 enemy_ids text[] NOT NULL,
 battle_type text NOT NULL CHECK (battle_type IN ('normal','boss','rare','training','event','other')),
 issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hunt_festival_ticket_uid_time_idx
 ON yakusoku_private.hunt_festival_battle_tickets(auth_user_id,issued_at DESC);
ALTER TABLE yakusoku_private.hunt_festival_battle_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON yakusoku_private.hunt_festival_battle_tickets FROM PUBLIC,anon,authenticated;

-- Internal insertion path shared by legacy and ticket-based client endpoints.
-- Keep the original per-account throttle and the original duplicate semantics.
CREATE OR REPLACE FUNCTION yakusoku_private.hunt_record_core(
 p_battle_id uuid,p_enemy_ids text[],p_battle_type text,p_client_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $core$
DECLARE
 uid uuid:=auth.uid();
 v_starts timestamptz:='2026-10-15T15:00:00Z';
 v_ends timestamptz:='2026-10-19T15:00:00Z';
 v_count integer:=coalesce(array_length(p_enemy_ids,1),0);
 v_last timestamptz;
 v_recent integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF p_battle_id IS NULL OR p_client_at IS NULL THEN RAISE EXCEPTION 'invalid_battle'; END IF;
 IF EXISTS(SELECT 1 FROM yakusoku_private.hunt_festival_kills WHERE battle_id=p_battle_id AND auth_user_id=uid)
 THEN RETURN jsonb_build_object('ok',true,'recorded',false,'duplicate',true); END IF;
 IF EXISTS(SELECT 1 FROM yakusoku_private.hunt_festival_kills WHERE battle_id=p_battle_id)
 THEN RAISE EXCEPTION 'battle_id_already_used'; END IF;
 IF p_client_at<v_starts OR p_client_at>=v_ends OR p_client_at>now()+interval '90 seconds'
   OR p_client_at<now()-interval '48 hours' OR now()>v_ends+interval '48 hours'
 THEN RAISE EXCEPTION 'outside_event_window'; END IF;
 IF p_battle_type IS NULL OR p_battle_type NOT IN ('normal','boss','rare','training','event','other')
 THEN RAISE EXCEPTION 'invalid_battle_type'; END IF;
 IF v_count NOT BETWEEN 1 AND 5
 OR EXISTS(SELECT 1 FROM unnest(p_enemy_ids) AS eid WHERE eid IS NULL OR length(eid)>120 OR length(eid)<1)
 THEN RAISE EXCEPTION 'invalid_enemy_ids'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('hunt-festival-kills:'||uid::text,0));
 SELECT max(recorded_at), count(*) FILTER (WHERE recorded_at>now()-interval '1 minute')
 INTO v_last,v_recent FROM yakusoku_private.hunt_festival_kills WHERE auth_user_id=uid;
 IF v_last>now()-interval '1500 milliseconds' OR v_recent>=25
 THEN RAISE EXCEPTION 'festival_rate_limited'; END IF;
 INSERT INTO yakusoku_private.hunt_festival_kills(battle_id,auth_user_id,kill_count,battle_type,client_at)
 VALUES(p_battle_id,uid,v_count,p_battle_type,p_client_at)
 ON CONFLICT (battle_id) DO NOTHING;
 RETURN jsonb_build_object('ok',true,'recorded',true,'kills',v_count);
END;
$core$;
REVOKE ALL ON FUNCTION yakusoku_private.hunt_record_core(uuid,text[],text,timestamptz) FROM PUBLIC,anon,authenticated;

-- v1 remains functional by default, preserving battle counts from old clients.
-- Once strict mode is explicitly enabled, only ticket-based v2 can add kills.
CREATE OR REPLACE FUNCTION public.yakusoku_hunt_festival_record(
 p_battle_id uuid,p_enemy_ids text[],p_battle_type text,p_client_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $legacy$
DECLARE enforce boolean:=false;
BEGIN
 SELECT strict_mode INTO enforce FROM yakusoku_private.hunt_festival_security_config WHERE id=1;
 IF coalesce(enforce,false) THEN RAISE EXCEPTION 'festival_ticket_required'; END IF;
 RETURN yakusoku_private.hunt_record_core(p_battle_id,p_enemy_ids,p_battle_type,p_client_at);
END;
$legacy$;
REVOKE ALL ON FUNCTION public.yakusoku_hunt_festival_record(uuid,text[],text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.yakusoku_hunt_festival_record(uuid,text[],text,timestamptz) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.yakusoku_hunt_festival_begin(
 p_battle_id uuid,p_enemy_ids text[],p_battle_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $begin$
DECLARE
 uid uuid:=auth.uid(); existing yakusoku_private.hunt_festival_battle_tickets%rowtype;
 v_recent bigint; v_count int:=coalesce(array_length(p_enemy_ids,1),0);
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF p_battle_id IS NULL THEN RAISE EXCEPTION 'invalid_battle'; END IF;
 IF now()<'2026-10-15T15:00:00Z'::timestamptz OR now()>='2026-10-19T15:00:00Z'::timestamptz
 THEN RAISE EXCEPTION 'outside_event_window'; END IF;
 IF p_battle_type IS NULL OR p_battle_type NOT IN ('normal','boss','rare','training','event','other')
 THEN RAISE EXCEPTION 'invalid_battle_type'; END IF;
 IF v_count NOT BETWEEN 1 AND 5 OR EXISTS(
  SELECT 1 FROM unnest(p_enemy_ids) AS eid WHERE eid IS NULL OR length(eid) NOT BETWEEN 1 AND 120
 ) THEN RAISE EXCEPTION 'invalid_enemy_ids'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('hunt-festival-ticket:'||uid::text,0));
 SELECT * INTO existing FROM yakusoku_private.hunt_festival_battle_tickets WHERE battle_id=p_battle_id;
 IF FOUND THEN
  IF existing.auth_user_id<>uid OR existing.enemy_ids<>p_enemy_ids OR existing.battle_type<>p_battle_type
   THEN RAISE EXCEPTION 'festival_ticket_conflict'; END IF;
  RETURN jsonb_build_object('ok',true,'protocol',2,'battleId',p_battle_id,'duplicate',true);
 END IF;
 SELECT count(*) INTO v_recent FROM yakusoku_private.hunt_festival_battle_tickets
  WHERE auth_user_id=uid AND issued_at>now()-interval '1 minute';
 IF v_recent>=45 THEN RAISE EXCEPTION 'festival_ticket_rate_limited'; END IF;
 INSERT INTO yakusoku_private.hunt_festival_battle_tickets(battle_id,auth_user_id,enemy_ids,battle_type)
 VALUES(p_battle_id,uid,p_enemy_ids,p_battle_type);
 RETURN jsonb_build_object('ok',true,'protocol',2,'battleId',p_battle_id);
END;
$begin$;
REVOKE ALL ON FUNCTION public.yakusoku_hunt_festival_begin(uuid,text[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.yakusoku_hunt_festival_begin(uuid,text[],text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.yakusoku_hunt_festival_record_v2(
 p_battle_id uuid,p_enemy_ids text[],p_battle_type text,p_client_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $finish$
DECLARE
 uid uuid:=auth.uid(); ticket yakusoku_private.hunt_festival_battle_tickets%rowtype;
 success_count integer:=coalesce(array_length(p_enemy_ids,1),0);
 result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF p_battle_id IS NULL THEN RAISE EXCEPTION 'invalid_battle'; END IF;
 SELECT * INTO ticket FROM yakusoku_private.hunt_festival_battle_tickets
  WHERE battle_id=p_battle_id AND auth_user_id=uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'festival_ticket_missing'; END IF;
 IF p_battle_type IS DISTINCT FROM ticket.battle_type THEN RAISE EXCEPTION 'festival_ticket_battle_type_mismatch'; END IF;
 IF success_count<1 OR success_count>coalesce(array_length(ticket.enemy_ids,1),0)
 THEN RAISE EXCEPTION 'festival_ticket_enemy_mismatch'; END IF;
 -- Enemies that fled are omitted from the winning tally. The submitted multiset
 -- must never claim more of an enemy ID than the start-time multiset contained.
 IF EXISTS (
  SELECT 1 FROM unnest(p_enemy_ids) AS victory(enemy_id)
   GROUP BY victory.enemy_id
   HAVING victory.enemy_id IS NULL OR count(*)>(
    SELECT count(*) FROM unnest(ticket.enemy_ids) AS started(enemy_id)
    WHERE started.enemy_id=victory.enemy_id
   )
 ) THEN RAISE EXCEPTION 'festival_ticket_enemy_mismatch'; END IF;
 IF now()<ticket.issued_at+interval '900 milliseconds'
 THEN RAISE EXCEPTION 'festival_ticket_too_soon'; END IF;
 IF now()>ticket.issued_at+interval '48 hours'
 THEN RAISE EXCEPTION 'festival_ticket_expired'; END IF;
 result:=yakusoku_private.hunt_record_core(p_battle_id,p_enemy_ids,p_battle_type,p_client_at);
 RETURN result || jsonb_build_object('protocol',2);
END;
$finish$;
REVOKE ALL ON FUNCTION public.yakusoku_hunt_festival_record_v2(uuid,text[],text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.yakusoku_hunt_festival_record_v2(uuid,text[],text,timestamptz) TO authenticated,service_role;

-- Manual-only risk overview. No user-specific penalties or push notifications.
CREATE OR REPLACE VIEW yakusoku_private.hunt_festival_security_review AS
WITH per_minute AS (
 SELECT auth_user_id,date_trunc('minute',recorded_at) AS minute_bucket,count(*) submissions,sum(kill_count) kills
 FROM yakusoku_private.hunt_festival_kills
 GROUP BY auth_user_id,date_trunc('minute',recorded_at)
), peaks AS (
 SELECT auth_user_id,max(submissions) peak_submits_per_min,max(kills) peak_kills_per_min
 FROM per_minute GROUP BY auth_user_id
)
SELECT k.auth_user_id,count(*) recorded_battles,sum(k.kill_count) total_kills,
 count(*) FILTER(WHERE t.battle_id IS NOT NULL) ticketed_battles,
 count(*) FILTER(WHERE t.battle_id IS NULL) legacy_battles,
 p.peak_submits_per_min,p.peak_kills_per_min,
 min(k.recorded_at) first_at,max(k.recorded_at) last_at
FROM yakusoku_private.hunt_festival_kills k
JOIN peaks p USING(auth_user_id)
LEFT JOIN yakusoku_private.hunt_festival_battle_tickets t ON t.battle_id=k.battle_id AND t.auth_user_id=k.auth_user_id
GROUP BY k.auth_user_id,p.peak_submits_per_min,p.peak_kills_per_min;
REVOKE ALL ON yakusoku_private.hunt_festival_security_review FROM PUBLIC,anon,authenticated;
