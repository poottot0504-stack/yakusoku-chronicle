-- STAGED ONLY. Do not run before explicit release approval.
-- 29 Oct: 20F focus/drop shields and 21-25F rare equipment: 1B G.
-- Preserve 26-28F 3B G, all other merchandise 30M G, and unchanged security guards.
begin;
alter table public.market_listings drop constraint market_listings_unit_price_check;
alter table public.market_listings add constraint market_listings_unit_price_check check (
 unit_price between 1 and 30000000
 or (item_kind='equipment' and quantity_initial=1 and item_id in
 ('masho-26-eternal-tree-blessing','masho-27-infernal-eclipse-ring','masho-28-final-claussolas')
 and unit_price between 1 and 3000000000)
 or (item_kind='equipment' and quantity_initial=1 and item_id in ('masho-3-mage-arms','masho-3-mage-waist','masho-3-mage-legs','masho-3-healer-arms','masho-3-healer-waist','masho-3-healer-legs','masho-3-redMage-arms','masho-3-redMage-waist','masho-3-redMage-legs','masho-3-whiteMage-arms','masho-3-whiteMage-waist','masho-3-whiteMage-legs','masho-3-blackMage-arms','masho-3-blackMage-waist','masho-3-blackMage-legs','masho-3-bard-arms','masho-3-bard-waist','masho-3-bard-legs','masho-3-trickster-arms','masho-3-trickster-waist','masho-3-trickster-legs','masho-3-bishop-arms','masho-3-bishop-waist','masho-3-bishop-legs','masho-3-highWizard-arms','masho-3-highWizard-waist','masho-3-highWizard-legs','masho-3-astrologian-arms','masho-3-astrologian-waist','masho-3-astrologian-legs','masho-3-summoner-arms','masho-3-summoner-waist','masho-3-summoner-legs','shielder-abyss-bulwark','shielder-final-aegis','masho-abyss-sword','masho-abyss-instrument','masho-abyss-bow','masho-abyss-staff','masho-abyss-dagger','masho-abyss-summoner-grimoire')
 and unit_price between 1 and 1000000000)
);
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
 if p_unit_price not between 1 and (case when p_item_kind='equipment' and p_item_id in ('masho-26-eternal-tree-blessing','masho-27-infernal-eclipse-ring','masho-28-final-claussolas') then 3000000000 when p_item_kind='equipment' and p_item_id in ('masho-3-mage-arms','masho-3-mage-waist','masho-3-mage-legs','masho-3-healer-arms','masho-3-healer-waist','masho-3-healer-legs','masho-3-redMage-arms','masho-3-redMage-waist','masho-3-redMage-legs','masho-3-whiteMage-arms','masho-3-whiteMage-waist','masho-3-whiteMage-legs','masho-3-blackMage-arms','masho-3-blackMage-waist','masho-3-blackMage-legs','masho-3-bard-arms','masho-3-bard-waist','masho-3-bard-legs','masho-3-trickster-arms','masho-3-trickster-waist','masho-3-trickster-legs','masho-3-bishop-arms','masho-3-bishop-waist','masho-3-bishop-legs','masho-3-highWizard-arms','masho-3-highWizard-waist','masho-3-highWizard-legs','masho-3-astrologian-arms','masho-3-astrologian-waist','masho-3-astrologian-legs','masho-3-summoner-arms','masho-3-summoner-waist','masho-3-summoner-legs','shielder-abyss-bulwark','shielder-final-aegis','masho-abyss-sword','masho-abyss-instrument','masho-abyss-bow','masho-abyss-staff','masho-abyss-dagger','masho-abyss-summoner-grimoire') then 1000000000 else 30000000 end) then raise exception 'INVALID_PRICE'; end if;
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
 if p_unit_price not between 1 and (case when v_kind='equipment' and v_item_id in ('masho-26-eternal-tree-blessing','masho-27-infernal-eclipse-ring','masho-28-final-claussolas') then 3000000000 when v_kind='equipment' and v_item_id in ('masho-3-mage-arms','masho-3-mage-waist','masho-3-mage-legs','masho-3-healer-arms','masho-3-healer-waist','masho-3-healer-legs','masho-3-redMage-arms','masho-3-redMage-waist','masho-3-redMage-legs','masho-3-whiteMage-arms','masho-3-whiteMage-waist','masho-3-whiteMage-legs','masho-3-blackMage-arms','masho-3-blackMage-waist','masho-3-blackMage-legs','masho-3-bard-arms','masho-3-bard-waist','masho-3-bard-legs','masho-3-trickster-arms','masho-3-trickster-waist','masho-3-trickster-legs','masho-3-bishop-arms','masho-3-bishop-waist','masho-3-bishop-legs','masho-3-highWizard-arms','masho-3-highWizard-waist','masho-3-highWizard-legs','masho-3-astrologian-arms','masho-3-astrologian-waist','masho-3-astrologian-legs','masho-3-summoner-arms','masho-3-summoner-waist','masho-3-summoner-legs','shielder-abyss-bulwark','shielder-final-aegis','masho-abyss-sword','masho-abyss-instrument','masho-abyss-bow','masho-abyss-staff','masho-abyss-dagger','masho-abyss-summoner-grimoire') then 1000000000 else 30000000 end) then raise exception 'INVALID_PRICE'; end if;
 update public.market_listings set unit_price=p_unit_price,updated_at=now()
 where id=p_listing_id and seller_id=uid and save_slot=p_save_slot and status='active' and quantity_remaining>0
 returning * into rec;
 if not found then raise exception 'LISTING_NOT_EDITABLE'; end if;
 return jsonb_build_object('id',rec.id,'unitPrice',rec.unit_price);
end;$function$;

-- SECURITY DEFINER functions retain original owner authentication and row locks.
revoke execute on function public.market_create_listing(integer,text,text,text,text,jsonb,bigint,integer) from public,anon;
revoke execute on function public.market_update_price(integer,uuid,bigint) from public,anon;
grant execute on function public.market_create_listing(integer,text,text,text,text,jsonb,bigint,integer) to authenticated,service_role;
grant execute on function public.market_update_price(integer,uuid,bigint) to authenticated,service_role;
commit;
