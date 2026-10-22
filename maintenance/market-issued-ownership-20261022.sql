-- Phase 6 (2026-10-22): Server-issued ownership of NEW marketplace equipment.
--
-- Existing equipment and saves remain untouched. This is a limited, real
-- server-authoritative ownership mechanism ONLY for equipment bought after
-- this migration. Pre-existing items and gold earned by browser gameplay
-- are still unverified; do not switch the main wallet to "server authoritative".
--
-- The token is minted by a BEFORE INSERT trigger on the trusted market_sales
-- table and is stored in the returned purchase receipt. A token may be listed
-- only by its recorded owner and only once at a time. Ownership transfers
-- transactionally when market_sales is inserted, and becomes available to
-- relist once the buyer acknowledges delivery.

CREATE TABLE IF NOT EXISTS yakusoku_private.market_issued_equipment_20261022 (
 instance_id text PRIMARY KEY
   CHECK (instance_id ~ '^verified-market-v1-[0-9a-f-]{36}$'),
 equipment_id text NOT NULL,
 owner_auth_user_id uuid NOT NULL,
 owner_save_slot smallint NOT NULL CHECK (owner_save_slot BETWEEN 1 AND 5),
 ownership_state text NOT NULL
   CHECK (ownership_state IN ('pending_delivery','owned','listed')),
 active_listing_id uuid,
 originating_sale_id uuid NOT NULL UNIQUE,
 latest_sale_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((ownership_state='listed') = (active_listing_id IS NOT NULL))
);

ALTER TABLE yakusoku_private.market_issued_equipment_20261022 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE yakusoku_private.market_issued_equipment_20261022
 FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS market_issued_owner_20261022
 ON yakusoku_private.market_issued_equipment_20261022
 (owner_auth_user_id,owner_save_slot,ownership_state);

-- Sale tokens are checked inside the same INSERT transaction, with a row lock.
CREATE OR REPLACE FUNCTION yakusoku_private.reserve_issued_listing_20261022()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_id text;
 v_asset yakusoku_private.market_issued_equipment_20261022%rowtype;
BEGIN
 IF NEW.item_kind IS DISTINCT FROM 'equipment' THEN RETURN NEW; END IF;
 v_id := NEW.item_payload#>>'{instance,instanceId}';
 IF v_id IS NULL OR v_id NOT LIKE 'verified-market-v1-%' THEN RETURN NEW; END IF;

 -- This is only reachable through the authenticated market RPC; never rely
 -- solely on the NEW.seller_id string for authorization.
 IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM NEW.seller_id THEN
   RAISE EXCEPTION 'MARKET_ISSUED_OWNER_REQUIRED';
 END IF;
 SELECT * INTO v_asset FROM yakusoku_private.market_issued_equipment_20261022
 WHERE instance_id=v_id FOR UPDATE;
 IF NOT FOUND
  OR v_asset.ownership_state <> 'owned'
  OR v_asset.owner_auth_user_id <> NEW.seller_id
  OR v_asset.owner_save_slot <> NEW.save_slot
  OR v_asset.equipment_id <> NEW.item_id
  OR v_asset.active_listing_id IS NOT NULL
 THEN RAISE EXCEPTION 'MARKET_ISSUED_EQUIPMENT_NOT_OWNED'; END IF;

 UPDATE yakusoku_private.market_issued_equipment_20261022
 SET ownership_state='listed',active_listing_id=NEW.id,updated_at=now()
 WHERE instance_id=v_id;
 RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION yakusoku_private.reserve_issued_listing_20261022()
 FROM PUBLIC,anon,authenticated;

-- New purchases receive a server-minted instance token, not the legacy
-- seller-generated identifier. Reselling an issued instance transfers the
-- SAME token, making double-selling and impersonation fail.
CREATE OR REPLACE FUNCTION yakusoku_private.transfer_issued_equipment_20261022()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_id text;
 v_asset yakusoku_private.market_issued_equipment_20261022%rowtype;
 v_equip text;
BEGIN
 IF NEW.item_payload->>'kind' IS DISTINCT FROM 'equipment' THEN RETURN NEW; END IF;
 IF NEW.id IS NULL OR NEW.quantity <> 1 THEN
   RAISE EXCEPTION 'MARKET_ISSUED_INVALID_SALE';
 END IF;
 IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM NEW.buyer_id THEN
   RAISE EXCEPTION 'MARKET_ISSUED_BUYER_REQUIRED';
 END IF;
 IF jsonb_typeof(NEW.item_payload->'instance') IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'MARKET_ISSUED_INVALID_INSTANCE';
 END IF;
 v_equip:=NEW.item_payload->>'equipmentId';
 IF nullif(v_equip,'') IS NULL OR NEW.item_payload->'instance'->>'equipmentId' IS DISTINCT FROM v_equip THEN
   RAISE EXCEPTION 'MARKET_ISSUED_INVALID_EQUIPMENT_ID';
 END IF;

 v_id:=NEW.item_payload#>>'{instance,instanceId}';
 IF v_id LIKE 'verified-market-v1-%' THEN
   SELECT * INTO v_asset FROM yakusoku_private.market_issued_equipment_20261022
   WHERE instance_id=v_id FOR UPDATE;
   IF NOT FOUND OR v_asset.ownership_state<>'listed'
      OR v_asset.active_listing_id IS DISTINCT FROM NEW.listing_id
      OR v_asset.owner_auth_user_id IS DISTINCT FROM NEW.seller_id
      OR v_asset.owner_save_slot IS DISTINCT FROM NEW.seller_slot
      OR v_asset.equipment_id IS DISTINCT FROM v_equip
   THEN RAISE EXCEPTION 'MARKET_ISSUED_NOT_IN_ESCROW'; END IF;

   UPDATE yakusoku_private.market_issued_equipment_20261022
   SET owner_auth_user_id=NEW.buyer_id,
       owner_save_slot=NEW.buyer_slot,
       ownership_state='pending_delivery',
       active_listing_id=NULL,
       latest_sale_id=NEW.id,
       updated_at=now()
   WHERE instance_id=v_id;
 ELSE
   v_id:='verified-market-v1-'||NEW.id::text;
   -- The old item may have a nonunique client-generated ID. Minting a new
   -- token here does not claim the seller's original item was legitimate.
   NEW.item_payload:=jsonb_set(NEW.item_payload,
       '{instance,instanceId}',to_jsonb(v_id),false);

   INSERT INTO yakusoku_private.market_issued_equipment_20261022
    (instance_id,equipment_id,owner_auth_user_id,owner_save_slot,
     ownership_state,originating_sale_id,latest_sale_id)
   VALUES
    (v_id,v_equip,NEW.buyer_id,NEW.buyer_slot,
     'pending_delivery',NEW.id,NEW.id);
 END IF;
 RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION yakusoku_private.transfer_issued_equipment_20261022()
 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION yakusoku_private.ack_issued_equipment_20261022()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_id text;
BEGIN
 IF NEW.item_payload->>'kind' <> 'equipment' THEN RETURN NEW; END IF;
 v_id:=NEW.item_payload#>>'{instance,instanceId}';
 IF v_id LIKE 'verified-market-v1-%'
    AND OLD.buyer_ack_at IS NULL AND NEW.buyer_ack_at IS NOT NULL THEN
   UPDATE yakusoku_private.market_issued_equipment_20261022
   SET ownership_state='owned',updated_at=now()
   WHERE instance_id=v_id AND latest_sale_id=NEW.id
     AND owner_auth_user_id=NEW.buyer_id
     AND owner_save_slot=NEW.buyer_slot
     AND ownership_state='pending_delivery';
   IF NOT FOUND THEN RAISE EXCEPTION 'MARKET_ISSUED_ACK_INCONSISTENT'; END IF;
 END IF;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION yakusoku_private.ack_issued_equipment_20261022()
 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION yakusoku_private.release_issued_listing_20261022()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_id text;
BEGIN
 IF OLD.item_kind='equipment' AND OLD.status='active'
    AND NEW.status IN ('cancelled','expired','returned') THEN
   v_id:=NEW.item_payload#>>'{instance,instanceId}';
   IF v_id LIKE 'verified-market-v1-%' THEN
     UPDATE yakusoku_private.market_issued_equipment_20261022
     SET ownership_state='owned',active_listing_id=NULL,updated_at=now()
     WHERE instance_id=v_id AND ownership_state='listed'
       AND active_listing_id=NEW.id AND owner_auth_user_id=NEW.seller_id
       AND owner_save_slot=NEW.save_slot;
     IF NOT FOUND THEN RAISE EXCEPTION 'MARKET_ISSUED_RELEASE_INCONSISTENT'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION yakusoku_private.release_issued_listing_20261022()
 FROM PUBLIC,anon,authenticated;

-- Trigger priority: ownership reservation happens before actual INSERT;
-- all caller-facing market RPCs retain their existing signatures.
CREATE TRIGGER reserve_issued_listing_20261022
 BEFORE INSERT ON public.market_listings
 FOR EACH ROW EXECUTE FUNCTION yakusoku_private.reserve_issued_listing_20261022();

CREATE TRIGGER transfer_issued_equipment_20261022
 BEFORE INSERT ON public.market_sales
 FOR EACH ROW EXECUTE FUNCTION yakusoku_private.transfer_issued_equipment_20261022();

CREATE TRIGGER ack_issued_equipment_20261022
 AFTER UPDATE OF buyer_ack_at ON public.market_sales
 FOR EACH ROW EXECUTE FUNCTION yakusoku_private.ack_issued_equipment_20261022();

CREATE TRIGGER release_issued_listing_20261022
 AFTER UPDATE OF status ON public.market_listings
 FOR EACH ROW EXECUTE FUNCTION yakusoku_private.release_issued_listing_20261022();
