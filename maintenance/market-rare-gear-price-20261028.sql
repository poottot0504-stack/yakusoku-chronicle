-- STAGED ONLY. Apply as part of an approved frontend + Edge deployment.
-- 3 billion only for 26–28F rare equipment, all others keep 30 million.
-- Preserve auth, shop restrictions, stock locking, sale history, and receipts.
begin;
alter table public.market_listings drop constraint market_listings_unit_price_check;
alter table public.market_listings add constraint market_listings_unit_price_check
 check (unit_price between 1 and 30000000 or (
  item_kind='equipment' and item_id in ('masho-26-eternal-tree-blessing','masho-27-infernal-eclipse-ring','masho-28-final-claussolas')
  and quantity_initial=1 and unit_price between 1 and 3000000000
 ));
-- Existing authenticated user ownership and receipt checks retained: market_create_listing(integer,text,text,text,text,jsonb,bigint,integer)
CREATE OR REPLACE FUNCTION public.market_create_listing(p_save_slot integer, p_category text, p_item_kind text, p_item_id text, p_item_name text, p_item_payload jsonb, p_unit_price bigint, p_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid:=auth.uid();
  store_rec public.market_stores%rowtype;
  rec public.market_listings%rowtype;
  active_count integer;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_save_slot not between 1 and 5 then raise exception 'INVALID_SLOT'; end if;
 if p_category not in ('weapon','armor','ring','charm','material','item') then raise exception 'INVALID_CATEGORY'; end if;
 if p_item_kind not in ('equipment','item','material') then raise exception 'INVALID_KIND'; end if;
 if p_unit_price not between 1 and (case when p_item_kind='equipment' and p_item_id in ('masho-26-eternal-tree-blessing','masho-27-infernal-eclipse-ring','masho-28-final-claussolas') then 3000000000 else 30000000 end) then raise exception 'INVALID_PRICE'; end if;
 if p_quantity<1 or (p_item_kind='equipment' and p_quantity<>1) then raise exception 'INVALID_QUANTITY'; end if;


 if public.market_is_shop_product(p_item_id)
   or public.market_is_shop_product(p_item_payload->>'id')
   or public.market_is_shop_product(p_item_payload->>'equipmentId')
   or public.market_is_shop_product(p_item_payload->'instance'->>'equipmentId')
 then
   raise exception 'SHOP_ITEM_FORBIDDEN';
 end if;

 if p_item_id = any(array[
   'potion','antidote','eyeDrops','wakeUp','highPotion','megaPotion',
   'ether','highEther','turboEther','elixir','phoenixTail','forgeCharm',
   'moonHerb','shadowCard'
 ]) or p_item_id ~ '^end-(200|220|240|260|280|300)-shop-' then
   raise exception 'SHOP_ITEM_FORBIDDEN';
 end if;

 perform public.market_expire_stores();
 select * into store_rec
 from public.market_stores
 where seller_id=uid and save_slot=p_save_slot and status='open' and expires_at>now()
 for update;
 if not found then raise exception 'STORE_REQUIRED'; end if;

 select count(*) into active_count
 from public.market_listings
 where store_id=store_rec.id and status='active' and quantity_remaining>0;
 if active_count>=10 then raise exception 'LISTING_LIMIT'; end if;

 insert into public.market_listings(
   store_id,seller_id,save_slot,category,item_kind,item_id,item_name,item_payload,
   unit_price,quantity_initial,quantity_remaining,status
 )
 values(
   store_rec.id,uid,p_save_slot,p_category,p_item_kind,p_item_id,left(p_item_name,120),
   coalesce(p_item_payload,'{}'::jsonb),p_unit_price,p_quantity,p_quantity,'active'
 )
 returning * into rec;

 return jsonb_build_object(
   'id',rec.id,'status',rec.status,'quantityRemaining',rec.quantity_remaining,
   'unitPrice',rec.unit_price,'itemPayload',rec.item_payload
 );
end;
$function$;

-- Existing authenticated user ownership and receipt checks retained: market_purchase(integer,uuid,integer,uuid,bigint)
CREATE OR REPLACE FUNCTION public.market_purchase(p_save_slot integer, p_listing_id uuid, p_quantity integer, p_request_id uuid, p_expected_unit_price bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); listing_rec public.market_listings%rowtype; store_rec public.market_stores%rowtype; sale_rec public.market_sales%rowtype; buyer_name text; new_qty integer;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_save_slot not between 1 and 5 then raise exception 'INVALID_SLOT'; end if;
 if p_quantity<1 then raise exception 'INVALID_QUANTITY'; end if;
 if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
 if p_expected_unit_price not between 1 and 3000000000 then raise exception 'INVALID_PRICE'; end if;
 select * into sale_rec from public.market_sales where buyer_id=uid and buyer_slot=p_save_slot and purchase_request_id=p_request_id;
 if found then return jsonb_build_object('id',sale_rec.id,'listingId',sale_rec.listing_id,'itemPayload',sale_rec.item_payload,'quantity',sale_rec.quantity,'unitPrice',sale_rec.unit_price,'totalPrice',sale_rec.total_price); end if;
 perform public.market_expire_stores();
 select * into listing_rec from public.market_listings where id=p_listing_id for update;
 if not found or listing_rec.status<>'active' or listing_rec.quantity_remaining<=0 then raise exception 'LISTING_UNAVAILABLE'; end if;
 if listing_rec.seller_id=uid then raise exception 'SELF_PURCHASE'; end if;
 if listing_rec.unit_price<>p_expected_unit_price then raise exception 'PRICE_CHANGED'; end if;
 if listing_rec.item_kind='equipment' and p_quantity<>1 then raise exception 'INVALID_QUANTITY'; end if;
 if p_quantity>listing_rec.quantity_remaining then raise exception 'INSUFFICIENT_STOCK'; end if;
 select * into store_rec from public.market_stores where id=listing_rec.store_id;
 if not found or store_rec.status<>'open' or store_rec.expires_at<=now() then raise exception 'STORE_EXPIRED'; end if;
 select display_name into buyer_name from public.market_profiles where user_id=uid and save_slot=p_save_slot;
 if buyer_name is null then raise exception 'PROFILE_REQUIRED'; end if;
 new_qty:=listing_rec.quantity_remaining-p_quantity;
 update public.market_listings set quantity_remaining=new_qty,status=case when new_qty=0 then 'sold' else 'active' end,updated_at=now() where id=listing_rec.id;
 insert into public.market_sales(purchase_request_id,listing_id,seller_id,seller_slot,buyer_id,buyer_slot,buyer_name_snapshot,item_name_snapshot,item_payload,quantity,unit_price,total_price)
 values(p_request_id,listing_rec.id,listing_rec.seller_id,listing_rec.save_slot,uid,p_save_slot,buyer_name,listing_rec.item_name,listing_rec.item_payload,p_quantity,listing_rec.unit_price,listing_rec.unit_price*p_quantity)
 returning * into sale_rec;
 return jsonb_build_object('id',sale_rec.id,'listingId',sale_rec.listing_id,'itemPayload',sale_rec.item_payload,'quantity',sale_rec.quantity,'unitPrice',sale_rec.unit_price,'totalPrice',sale_rec.total_price);
end;$function$;

-- Existing authenticated user ownership and receipt checks retained: market_update_price(integer,uuid,bigint)
CREATE OR REPLACE FUNCTION public.market_update_price(p_save_slot integer, p_listing_id uuid, p_unit_price bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); rec public.market_listings%rowtype; v_kind text; v_item_id text;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_save_slot not between 1 and 5 then raise exception 'INVALID_SLOT'; end if;
 select item_kind,item_id into v_kind,v_item_id from public.market_listings
 where id=p_listing_id and seller_id=uid and save_slot=p_save_slot and status='active' and quantity_remaining>0 for update;
 if not found then raise exception 'LISTING_NOT_EDITABLE'; end if;
 if p_unit_price not between 1 and (case when v_kind='equipment' and v_item_id in ('masho-26-eternal-tree-blessing','masho-27-infernal-eclipse-ring','masho-28-final-claussolas') then 3000000000 else 30000000 end) then raise exception 'INVALID_PRICE'; end if;
 update public.market_listings set unit_price=p_unit_price,updated_at=now()
 where id=p_listing_id and seller_id=uid and save_slot=p_save_slot and status='active' and quantity_remaining>0
 returning * into rec;
 if not found then raise exception 'LISTING_NOT_EDITABLE'; end if;
 return jsonb_build_object('id',rec.id,'unitPrice',rec.unit_price);
end;$function$;

revoke execute on function public.market_create_listing(integer,text,text,text,text,jsonb,bigint,integer) from public,anon;
revoke execute on function public.market_update_price(integer,uuid,bigint) from public,anon;
revoke execute on function public.market_purchase(integer,uuid,integer,uuid,bigint) from public,anon;
grant execute on function public.market_create_listing(integer,text,text,text,text,jsonb,bigint,integer) to authenticated,service_role;
grant execute on function public.market_update_price(integer,uuid,bigint) to authenticated,service_role;
grant execute on function public.market_purchase(integer,uuid,integer,uuid,bigint) to authenticated,service_role;
commit;
