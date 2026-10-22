-- 2026-10-22 Chronicle: defend marketplace listings from automated floods.
-- Legitimate observed activity prior to this rollout peaked at 5 listings per
-- seller/slot/minute. 30 per rolling minute is a generous safety threshold.
-- This does not replace real server-side gold and inventory ownership checks.
create or replace function yakusoku_private.market_listing_insert_rate_guard()
returns trigger
language plpgsql
security invoker
set search_path = 'pg_catalog'
as $guard$
declare
  recent_count integer;
begin
  -- Changes to the seller ID are not accepted by the marketplace RPC.
  if new.seller_id is null or new.save_slot not between 1 and 5 then
    raise exception 'MARKET_LISTING_IDENTITY_REQUIRED';
  end if;

  -- Concurrent attempts for the same seller + slot are serialized, so
  -- parallel requests cannot all pass an initial empty rate-limit window.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'yakusoku-market-listing:' || new.seller_id::text || ':' || new.save_slot::text,
      0
    )
  );

  select count(*) into recent_count
  from public.market_listings
  where seller_id = new.seller_id
    and save_slot = new.save_slot
    and created_at >= pg_catalog.clock_timestamp() - interval '60 seconds';

  if recent_count >= 30 then
    raise exception 'MARKET_LISTING_RATE_LIMIT';
  end if;
  return new;
end;
$guard$;

revoke all on function yakusoku_private.market_listing_insert_rate_guard()
  from public, anon, authenticated;

drop trigger if exists market_listing_insert_rate_guard_20261022
  on public.market_listings;
create trigger market_listing_insert_rate_guard_20261022
before insert on public.market_listings
for each row
execute function yakusoku_private.market_listing_insert_rate_guard();

-- Efficient lookup for the rolling per-seller rate calculation.
create index if not exists market_listing_seller_recent_20261022
  on public.market_listings (seller_id, save_slot, created_at desc);
