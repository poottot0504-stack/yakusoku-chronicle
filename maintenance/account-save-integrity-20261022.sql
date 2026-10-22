-- Chronicle security phase 4 (2026-10-22).
-- Backward-compatible cloud-save limits and audit observations.
-- Do not construe a cloud save or its audit snapshot as proof of legitimately
-- earned gold/items: the current game still calculates rewards in the browser.
-- No player row is rewritten by this migration.

-- One-time independent copy of CURRENT account saves prior to enforcing limits.
-- This is in an unexposed schema and can be used for a manual rollback.
CREATE TABLE IF NOT EXISTS yakusoku_private.account_saves_backup_20261022 AS
SELECT auth_user_id, save_slot, save_version, save_data, client_updated_at,
       updated_at, clock_timestamp() AS backed_up_at
FROM public.yakusoku_account_saves;
ALTER TABLE yakusoku_private.account_saves_backup_20261022 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE yakusoku_private.account_saves_backup_20261022
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION yakusoku_private.account_save_payload_sane(p jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE STRICT SECURITY INVOKER
SET search_path = 'pg_catalog'
AS $valid$
DECLARE
  k text;
  v jsonb;
  item jsonb;
  gold_text text;
  kind text;
  instance_id text;
  equipment_id text;
  total bigint;
  unique_ids bigint;
BEGIN
  IF jsonb_typeof(p) <> 'object' THEN RETURN false; END IF;
  -- Snapshot format used by the migration-compatible client.
  IF jsonb_typeof(p->'inventory') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p->'materials') IS DISTINCT FROM 'object'
     OR jsonb_typeof(p->'equipmentInventory') IS DISTINCT FROM 'array'
  THEN RETURN false; END IF;

  IF jsonb_array_length(p->'inventory') > 2000
     OR jsonb_array_length(p->'equipmentInventory') > 15000
  THEN RETURN false; END IF;

  -- Preserve the current game's nonnegative integer economy. Very large
  -- balances, fractional gold and non-numeric JSON must never become saves.
  -- Older save versions may omit bankGold, which means zero.
  -- Reject malformed bankGold when it is explicitly present.
  FOREACH k IN ARRAY ARRAY['gold','bankGold'] LOOP
    IF k='bankGold' AND NOT (p ? 'bankGold') THEN CONTINUE; END IF;
    IF jsonb_typeof(p->k) IS DISTINCT FROM 'number' THEN RETURN false; END IF;
    gold_text := p->>k;
    IF gold_text IS NULL THEN RETURN false; END IF;
    IF (gold_text::numeric < 0) OR (gold_text::numeric > 1000000000000)
       OR (trunc(gold_text::numeric) <> gold_text::numeric)
    THEN RETURN false; END IF;
  END LOOP;

  FOR item IN SELECT value FROM jsonb_array_elements(p->'inventory') LOOP
    IF jsonb_typeof(item) <> 'object' OR coalesce(item->>'id','') = ''
       OR jsonb_typeof(item->'qty') IS DISTINCT FROM 'number'
    THEN RETURN false; END IF;
    IF (item->>'qty')::numeric < 0
      OR (item->>'qty')::numeric > 1000000
      OR trunc((item->>'qty')::numeric) <> (item->>'qty')::numeric
    THEN RETURN false; END IF;
  END LOOP;

  total:=0;
  FOR k,v IN SELECT key,value FROM jsonb_each(p->'materials') LOOP
    total:=total+1;
    IF total > 6000 THEN RETURN false; END IF;
    IF k = '' OR jsonb_typeof(v) <> 'number' THEN RETURN false; END IF;
    IF v::text::numeric < 0 OR v::text::numeric > 1000000
       OR trunc(v::text::numeric) <> v::text::numeric
    THEN RETURN false; END IF;
  END LOOP;

  FOR item IN SELECT value FROM jsonb_array_elements(p->'equipmentInventory') LOOP
    IF jsonb_typeof(item) <> 'object' THEN RETURN false; END IF;
    instance_id:=item->>'instanceId';
    equipment_id:=item->>'equipmentId';
    IF coalesce(length(instance_id),0) NOT BETWEEN 1 AND 180
       OR coalesce(length(equipment_id),0) NOT BETWEEN 1 AND 180
       OR jsonb_typeof(item->'enhanceLevel') IS DISTINCT FROM 'number'
    THEN RETURN false; END IF;
    IF (item->>'enhanceLevel')::numeric < 0
       OR (item->>'enhanceLevel')::numeric > 50
       OR trunc((item->>'enhanceLevel')::numeric) <> (item->>'enhanceLevel')::numeric
    THEN RETURN false; END IF;
  END LOOP;

  -- A copied equipment object cannot appear twice in one cloud save.
  SELECT count(*),count(DISTINCT obj->>'instanceId')
    INTO total,unique_ids
  FROM jsonb_array_elements(p->'equipmentInventory') AS e(obj);
  IF total <> unique_ids THEN RETURN false; END IF;
  RETURN true;
EXCEPTION WHEN numeric_value_out_of_range OR invalid_text_representation THEN
  RETURN false;
END;
$valid$;

REVOKE ALL ON FUNCTION yakusoku_private.account_save_payload_sane(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION yakusoku_private.account_save_payload_sane(jsonb)
  TO service_role;

-- Admin-only audit summaries. Do not expose names, inventories or item IDs.
CREATE TABLE IF NOT EXISTS yakusoku_private.account_save_integrity_watch (
 auth_user_id uuid NOT NULL,
 save_slot smallint NOT NULL CHECK (save_slot BETWEEN 1 AND 5),
 observed_gold bigint NOT NULL,
 observed_bank_gold bigint NOT NULL,
 observed_equipment_count integer NOT NULL,
 unusual_change_count integer NOT NULL DEFAULT 0,
 last_unusual_reason text[] NOT NULL DEFAULT ARRAY[]::text[],
 last_unusual_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (auth_user_id,save_slot)
);
ALTER TABLE yakusoku_private.account_save_integrity_watch ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE yakusoku_private.account_save_integrity_watch
 FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION yakusoku_private.capture_account_save_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog'
AS $capture$
DECLARE
  reasons text[]:=ARRAY[]::text[];
  gold_now bigint;
  bank_now bigint;
  equips_now integer;
  gold_before bigint;
  equips_before integer;
BEGIN
  gold_now:=(new.save_data->>'gold')::bigint;
  bank_now:=(new.save_data->>'bankGold')::bigint;
  equips_now:=jsonb_array_length(new.save_data->'equipmentInventory');
  IF TG_OP='UPDATE' THEN
    gold_before:=coalesce((old.save_data->>'gold')::bigint,0);
    equips_before:=jsonb_array_length(old.save_data->'equipmentInventory');
    -- Heuristics only: never automatically punish or block real players.
    IF gold_now-gold_before > 100000000 THEN
      reasons:=array_append(reasons,'large_gold_jump');
    END IF;
    IF equips_now-equips_before > 200 THEN
      reasons:=array_append(reasons,'large_equipment_jump');
    END IF;
  END IF;

  INSERT INTO yakusoku_private.account_save_integrity_watch
    (auth_user_id,save_slot,observed_gold,observed_bank_gold,
     observed_equipment_count,unusual_change_count,last_unusual_reason,
     last_unusual_at,updated_at)
  VALUES
    (new.auth_user_id,new.save_slot,gold_now,bank_now,equips_now,
     case when cardinality(reasons)>0 then 1 else 0 end,
     reasons,case when cardinality(reasons)>0 then now() else null end,now())
  ON CONFLICT (auth_user_id,save_slot) DO UPDATE
  SET observed_gold=EXCLUDED.observed_gold,
      observed_bank_gold=EXCLUDED.observed_bank_gold,
      observed_equipment_count=EXCLUDED.observed_equipment_count,
      unusual_change_count=yakusoku_private.account_save_integrity_watch.unusual_change_count
        +EXCLUDED.unusual_change_count,
      last_unusual_reason=case when cardinality(EXCLUDED.last_unusual_reason)>0
        then EXCLUDED.last_unusual_reason
        else yakusoku_private.account_save_integrity_watch.last_unusual_reason end,
      last_unusual_at=coalesce(EXCLUDED.last_unusual_at,
        yakusoku_private.account_save_integrity_watch.last_unusual_at),
      updated_at=now();
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Monitoring must never destroy or prevent a player's otherwise valid save.
  RETURN new;
END;
$capture$;

REVOKE ALL ON FUNCTION yakusoku_private.capture_account_save_integrity()
  FROM PUBLIC, anon, authenticated;

-- The compatibility check is validated against all existing saves by PG.
ALTER TABLE public.yakusoku_account_saves
 ADD CONSTRAINT account_save_integrity_guard_20261022
 CHECK (yakusoku_private.account_save_payload_sane(save_data) IS TRUE);

CREATE TRIGGER account_save_integrity_watch_20261022
AFTER INSERT OR UPDATE OF save_data ON public.yakusoku_account_saves
FOR EACH ROW EXECUTE FUNCTION yakusoku_private.capture_account_save_integrity();
