-- APPLIED ON SERVER 2026-10-14. Reference only: do not execute again.
-- Random, fixed shop names. Existing free-text names are replaced once.
CREATE OR REPLACE FUNCTION public.market_random_shop_name()
RETURNS text LANGUAGE sql VOLATILE SET search_path=public AS $fn$
 SELECT (ARRAY['星降る','月夜の','暁の','夕凪の','陽だまりの','蒼天の','銀河の','木漏れ日の','虹色の','風渡る','雪原の','常春の'])[1+floor(random()*12)::int]
     ||(ARRAY['銀狐','白梟','旅猫','青鹿','金獅子','花兎','黒竜','小熊','海鳥','羽馬','宝石','若葉'])[1+floor(random()*12)::int]
     ||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
$fn$;
REVOKE ALL ON FUNCTION public.market_random_shop_name() FROM PUBLIC,anon,authenticated;

UPDATE public.market_profiles SET display_name=public.market_random_shop_name(),updated_at=now();

CREATE OR REPLACE FUNCTION public.market_fixed_shop_name()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $fn$
BEGIN
 IF TG_OP='INSERT' THEN NEW.display_name:=public.market_random_shop_name();
 ELSIF NEW.display_name IS DISTINCT FROM OLD.display_name THEN RAISE EXCEPTION 'SHOP_NAME_IMMUTABLE';
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.market_fixed_shop_name() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER market_fixed_shop_name BEFORE INSERT OR UPDATE ON public.market_profiles
 FOR EACH ROW EXECUTE FUNCTION public.market_fixed_shop_name();

CREATE OR REPLACE FUNCTION public.market_get_profile(p_save_slot integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE uid uuid:=auth.uid(); rec public.market_profiles%rowtype;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF p_save_slot NOT BETWEEN 1 AND 5 OR p_save_slot IS NULL THEN RAISE EXCEPTION 'INVALID_SLOT'; END IF;
 INSERT INTO public.market_profiles(user_id,save_slot,display_name) VALUES(uid,p_save_slot,'auto')
 ON CONFLICT(user_id,save_slot) DO NOTHING;
 SELECT * INTO rec FROM public.market_profiles WHERE user_id=uid AND save_slot=p_save_slot;
 RETURN jsonb_build_object('userId',rec.user_id,'saveSlot',rec.save_slot,'displayName',rec.display_name);
END $fn$;
REVOKE ALL ON FUNCTION public.market_get_profile(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.market_get_profile(integer) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.market_set_profile(integer,text) FROM PUBLIC,anon,authenticated;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER ON public.market_profiles FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.market_open_store(integer),
 public.market_create_listing(integer,text,text,text,text,jsonb,bigint,integer),
 public.market_update_price(integer,uuid,bigint),
 public.market_purchase(integer,uuid,integer,uuid,bigint) TO authenticated;
