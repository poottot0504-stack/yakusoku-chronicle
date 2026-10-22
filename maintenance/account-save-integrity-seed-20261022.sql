-- Initialize read-only integrity observations from existing good saves.
-- No cloud save or player asset is modified.
INSERT INTO yakusoku_private.account_save_integrity_watch
 (auth_user_id,save_slot,observed_gold,observed_bank_gold,
  observed_equipment_count,unusual_change_count,last_unusual_reason,
  last_unusual_at,updated_at)
SELECT s.auth_user_id,s.save_slot,
       (s.save_data->>'gold')::bigint,
       coalesce((s.save_data->>'bankGold')::bigint,0),
       jsonb_array_length(s.save_data->'equipmentInventory'),
       0,ARRAY[]::text[],NULL,now()
FROM public.yakusoku_account_saves s
WHERE yakusoku_private.account_save_payload_sane(s.save_data)
ON CONFLICT (auth_user_id,save_slot) DO NOTHING;
