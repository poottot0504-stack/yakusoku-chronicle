-- Chronicle phase 5: server-derived marketplace economy and equipment provenance.
-- SHADOW MODE ONLY. These records are derived from existing server-recorded
-- market sales, not from browser-claimed gold balances.
-- No player save, inventory, wallet or existing marketplace RPC is modified.
--
-- The original source items and initial gold still originate from the
-- browser. The ledger therefore proves that the SERVER RECORDED a trade,
-- not that the original asset or payment was legitimate.

CREATE TABLE IF NOT EXISTS yakusoku_private.market_trade_ledger_20261022 (
  sale_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'buyer_purchase_recorded',
    'seller_proceeds_pending',
    'buyer_delivery_acknowledged',
    'seller_proceeds_claimed'
  )),
  owner_user_id uuid NOT NULL,
  save_slot smallint NOT NULL CHECK (save_slot BETWEEN 1 AND 5),
  gold_delta bigint NOT NULL DEFAULT 0,
  item_kind text NOT NULL CHECK (item_kind IN ('item','material','equipment')),
  item_id text NOT NULL,
  equipment_instance_id text,
  item_quantity integer NOT NULL DEFAULT 0 CHECK (item_quantity>=0),
  source_occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sale_id, event_type)
);

ALTER TABLE yakusoku_private.market_trade_ledger_20261022 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE yakusoku_private.market_trade_ledger_20261022
  FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS market_trade_ledger_owner_20261022
  ON yakusoku_private.market_trade_ledger_20261022(owner_user_id,save_slot,source_occurred_at DESC);

-- A single equipment instance ID is NOT globally unique today. Do not
-- enforce unique(instance_id), do not infer initial ownership from it.
CREATE TABLE IF NOT EXISTS yakusoku_private.market_equipment_lineage_20261022 (
  sale_id uuid PRIMARY KEY,
  instance_id text NOT NULL,
  equipment_id text NOT NULL,
  seller_user_id uuid NOT NULL,
  seller_slot smallint NOT NULL CHECK (seller_slot BETWEEN 1 AND 5),
  buyer_user_id uuid NOT NULL,
  buyer_slot smallint NOT NULL CHECK (buyer_slot BETWEEN 1 AND 5),
  sold_at timestamptz NOT NULL,
  buyer_acknowledged_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE yakusoku_private.market_equipment_lineage_20261022 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE yakusoku_private.market_equipment_lineage_20261022
  FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS market_equipment_lineage_instance_20261022
  ON yakusoku_private.market_equipment_lineage_20261022(instance_id,sold_at DESC,sale_id DESC);

-- Idempotent recorder for server-owned market_sales rows.
CREATE OR REPLACE FUNCTION yakusoku_private.record_market_trade_20261022(
  p_sale public.market_sales
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $record$
DECLARE
  v_kind text;
  v_item_id text;
  v_instance_id text;
BEGIN
  v_kind := p_sale.item_payload->>'kind';
  IF v_kind NOT IN ('item','material','equipment') THEN
    RETURN;
  END IF;

  v_item_id := CASE WHEN v_kind='equipment'
     THEN p_sale.item_payload->>'equipmentId'
     ELSE p_sale.item_payload->>'id' END;
  IF v_item_id IS NULL THEN RETURN; END IF;
  v_instance_id := CASE WHEN v_kind='equipment'
     THEN p_sale.item_payload#>>'{instance,instanceId}'
     ELSE NULL END;

  -- Purchase/payment is client-settled today: this is an OBSERVED
  -- movement, not yet a cryptographically verified wallet debit.
  INSERT INTO yakusoku_private.market_trade_ledger_20261022
    (sale_id,event_type,owner_user_id,save_slot,gold_delta,
     item_kind,item_id,equipment_instance_id,item_quantity,source_occurred_at)
  VALUES
    (p_sale.id,'buyer_purchase_recorded',p_sale.buyer_id,p_sale.buyer_slot,
     -p_sale.total_price,v_kind,v_item_id,v_instance_id,0,p_sale.created_at),
    (p_sale.id,'seller_proceeds_pending',p_sale.seller_id,p_sale.seller_slot,
     0,v_kind,v_item_id,v_instance_id,0,p_sale.created_at)
  ON CONFLICT (sale_id,event_type) DO NOTHING;

  IF p_sale.buyer_ack_at IS NOT NULL THEN
    INSERT INTO yakusoku_private.market_trade_ledger_20261022
      (sale_id,event_type,owner_user_id,save_slot,gold_delta,
       item_kind,item_id,equipment_instance_id,item_quantity,source_occurred_at)
    VALUES
      (p_sale.id,'buyer_delivery_acknowledged',p_sale.buyer_id,p_sale.buyer_slot,
       0,v_kind,v_item_id,v_instance_id,p_sale.quantity,p_sale.buyer_ack_at)
    ON CONFLICT (sale_id,event_type) DO NOTHING;
  END IF;

  IF p_sale.seller_claimed_at IS NOT NULL THEN
    INSERT INTO yakusoku_private.market_trade_ledger_20261022
      (sale_id,event_type,owner_user_id,save_slot,gold_delta,
       item_kind,item_id,equipment_instance_id,item_quantity,source_occurred_at)
    VALUES
      (p_sale.id,'seller_proceeds_claimed',p_sale.seller_id,p_sale.seller_slot,
       p_sale.total_price,v_kind,v_item_id,v_instance_id,0,p_sale.seller_claimed_at)
    ON CONFLICT (sale_id,event_type) DO NOTHING;
  END IF;

  IF v_kind='equipment' AND nullif(v_instance_id,'') IS NOT NULL THEN
    INSERT INTO yakusoku_private.market_equipment_lineage_20261022
      (sale_id,instance_id,equipment_id,seller_user_id,seller_slot,
       buyer_user_id,buyer_slot,sold_at,buyer_acknowledged_at)
    VALUES
      (p_sale.id,v_instance_id,v_item_id,p_sale.seller_id,p_sale.seller_slot,
       p_sale.buyer_id,p_sale.buyer_slot,p_sale.created_at,p_sale.buyer_ack_at)
    ON CONFLICT (sale_id) DO UPDATE SET
      buyer_acknowledged_at=coalesce(
        yakusoku_private.market_equipment_lineage_20261022.buyer_acknowledged_at,
        EXCLUDED.buyer_acknowledged_at);
  END IF;
END;
$record$;

REVOKE ALL ON FUNCTION yakusoku_private.record_market_trade_20261022(public.market_sales)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION yakusoku_private.capture_market_trade_20261022()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $trigger$
BEGIN
  PERFORM yakusoku_private.record_market_trade_20261022(NEW);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block a legitimate purchase if a shadow-audit write fails.
  -- Admins can reconcile all rows using the idempotent recorder.
  RETURN NEW;
END;
$trigger$;

REVOKE ALL ON FUNCTION yakusoku_private.capture_market_trade_20261022()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER capture_market_trade_20261022
AFTER INSERT OR UPDATE OF buyer_ack_at, seller_claimed_at
ON public.market_sales
FOR EACH ROW EXECUTE FUNCTION yakusoku_private.capture_market_trade_20261022();

-- Read-only administrator reconciliation. No public owner lookup endpoint.
CREATE OR REPLACE VIEW yakusoku_private.market_shadow_balances_20261022
WITH (security_invoker = true) AS
SELECT owner_user_id,save_slot,
  coalesce(sum(gold_delta) FILTER (
    WHERE event_type='buyer_purchase_recorded'),0) AS observed_market_spend,
  coalesce(sum(gold_delta) FILTER (
    WHERE event_type='seller_proceeds_claimed'),0) AS observed_claimed_proceeds,
  count(*) FILTER (WHERE event_type='buyer_delivery_acknowledged')
    AS acknowledged_deliveries,
  count(*) FILTER (WHERE event_type='seller_proceeds_pending')
    AS seller_sales_recorded
FROM yakusoku_private.market_trade_ledger_20261022
GROUP BY owner_user_id,save_slot;
REVOKE ALL ON yakusoku_private.market_shadow_balances_20261022
  FROM PUBLIC, anon, authenticated;

-- Historical event backfill. Re-runnable, with one event of each type per
-- trusted database sale. All newly captured trades use the same recorder.
DO $backfill$
DECLARE row_sale public.market_sales;
BEGIN
  FOR row_sale IN SELECT * FROM public.market_sales ORDER BY created_at,id LOOP
    PERFORM yakusoku_private.record_market_trade_20261022(row_sale);
  END LOOP;
END;
$backfill$;
