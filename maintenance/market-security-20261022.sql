-- 2026-10-22: reject malformed marketplace receipts at the DB boundary.
-- This does NOT establish server-authoritative item ownership or player gold.
-- Its purpose is payload consistency, bounded sizes and single active
-- listing for the same equipment instance from the same seller.
create or replace function yakusoku_private.market_listing_payload_valid(
  p_item_kind text,
  p_item_id text,
  p_category text,
  p_item_name text,
  p_payload jsonb,
  p_quantity integer
)
returns boolean
language plpgsql
immutable
strict
security invoker
set search_path = 'pg_catalog'
as $check$
declare
  inst jsonb;
  qty_text text;
  enhance_text text;
begin
  if jsonb_typeof(p_payload) <> 'object'
     or octet_length(p_payload::text) > 8192
     or length(p_item_id) not between 1 and 128
     or length(p_item_name) not between 1 and 120
     or p_quantity not between 1 and 1000000
  then return false; end if;

  if p_payload->>'kind' is distinct from p_item_kind
     or p_payload->>'category' is distinct from p_category
     or p_payload->>'name' is distinct from p_item_name
  then return false; end if;

  qty_text := p_payload->>'quantity';
  if coalesce(qty_text ~ '^[1-9][0-9]{0,6}$', false) = false
  then return false; end if;
  if qty_text::integer <> p_quantity then return false; end if;

  if p_item_kind = 'equipment' then
    if p_category not in ('weapon','armor','ring','charm')
       or p_quantity <> 1
       or p_payload->>'equipmentId' is distinct from p_item_id
    then return false; end if;
    inst := p_payload->'instance';
    if jsonb_typeof(inst) is distinct from 'object'
       or inst->>'equipmentId' is distinct from p_item_id
       or coalesce(length(inst->>'instanceId'),0) not between 1 and 160
    then return false; end if;
    enhance_text := inst->>'enhanceLevel';
    if enhance_text is not null
       and coalesce(enhance_text ~ '^([0-9]|1[0-5])$',false)=false
    then return false; end if;
    if inst ? 'trueEvolved'
       and jsonb_typeof(inst->'trueEvolved') <> 'boolean'
    then return false; end if;
    return true;
  elsif p_item_kind = 'material' then
    return p_category='material' and p_payload->>'id'=p_item_id
      and not (p_payload ? 'instance');
  elsif p_item_kind = 'item' then
    return p_category='item' and p_payload->>'id'=p_item_id
      and not (p_payload ? 'instance');
  end if;
  return false;
end;
$check$;

-- Not externally callable: the CHECK constraint runs inside the original
-- SQL transaction with the privileges of the calling trusted RPC.
revoke all on function yakusoku_private.market_listing_payload_valid(
  text,text,text,text,jsonb,integer
) from public, anon, authenticated;
grant execute on function yakusoku_private.market_listing_payload_valid(
  text,text,text,text,jsonb,integer
) to service_role;

alter table public.market_listings
  add constraint market_listing_payload_integrity_20261022
  check (yakusoku_private.market_listing_payload_valid(
    item_kind,item_id,category,item_name,item_payload,quantity_initial
  ) is true);

-- Concurrent duplicate "sell this same equipped instance twice" requests
-- now collide atomically. Sold, cancelled, returned and expired listings are
-- excluded so the item can be resold after a legitimate settlement.
create unique index market_one_active_equipment_instance_20261022
  on public.market_listings (seller_id, (item_payload #>> '{instance,instanceId}'))
  where item_kind='equipment' and status='active' and quantity_remaining > 0;
