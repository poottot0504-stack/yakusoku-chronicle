-- PROTOTYPE ONLY. Apply with arena-ledger-staging-only.sql to STAGING,
-- never to the production market without the owner's publish approval.
-- The current live market server uses public.market_listings.item_id and
-- item_payload, market_sales.item_payload, market_trade_audit.item_id.
-- This DB-level ban is defense-in-depth, not a replacement for API validation.
begin;
alter table public.market_listings
 add constraint market_no_arena_coin_listings check(
  coalesce(lower(item_id),'') not in ('arena-coin','arenacoin','arena_coins','arenacoins') and
  coalesce(lower(item_kind),'') not in ('arena-coin','arenacoin','arena_coins','arenacoins') and
  position('arena-coin' in lower(coalesce(item_payload::text,'')))=0 and
  position('arenacoin' in lower(coalesce(item_payload::text,'')))=0 and
  position('arena_coins' in lower(coalesce(item_payload::text,'')))=0
 );
alter table public.market_sales
 add constraint market_no_arena_coin_sales check(
  position('arena-coin' in lower(coalesce(item_payload::text,'')))=0 and
  position('arenacoin' in lower(coalesce(item_payload::text,'')))=0 and
  position('arena_coins' in lower(coalesce(item_payload::text,'')))=0
 );
alter table public.market_trade_audit
 add constraint market_no_arena_coin_audit check(
  coalesce(lower(item_id),'') not in ('arena-coin','arenacoin','arena_coins','arenacoins')
 );
commit;
