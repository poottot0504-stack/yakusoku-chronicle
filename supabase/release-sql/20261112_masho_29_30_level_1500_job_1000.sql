-- Planned production SQL for the 2026-11-12 Masho 29F/30F + Lv1500/Job1000 release.
-- Apply this transaction FIRST, before deploying yakusoku-player-stats v14
-- and before publishing the Cloudflare Worker client. No player rows are
-- modified and all previous FK, uniqueness, slot and auth protections remain.
BEGIN;

ALTER TABLE public.yakusoku_verified_characters
 DROP CONSTRAINT yakusoku_verified_characters_level_check,
 DROP CONSTRAINT yakusoku_verified_characters_job_level_check,
 ADD CONSTRAINT yakusoku_verified_characters_level_check CHECK (level BETWEEN 1 AND 1500),
 ADD CONSTRAINT yakusoku_verified_characters_job_level_check CHECK (job_level BETWEEN 1 AND 1000);

ALTER TABLE public.yakusoku_progression_audit
 DROP CONSTRAINT yakusoku_progression_audit_level_before_check,
 DROP CONSTRAINT yakusoku_progression_audit_level_after_check,
 DROP CONSTRAINT yakusoku_progression_audit_job_level_before_check,
 DROP CONSTRAINT yakusoku_progression_audit_job_level_after_check,
 ADD CONSTRAINT yakusoku_progression_audit_level_before_check CHECK (level_before BETWEEN 1 AND 1500),
 ADD CONSTRAINT yakusoku_progression_audit_level_after_check CHECK (level_after BETWEEN 1 AND 1500),
 ADD CONSTRAINT yakusoku_progression_audit_job_level_before_check CHECK (job_level_before BETWEEN 1 AND 1000),
 ADD CONSTRAINT yakusoku_progression_audit_job_level_after_check CHECK (job_level_after BETWEEN 1 AND 1000);

ALTER TABLE public.yakusoku_audit_battles
 DROP CONSTRAINT yakusoku_audit_battles_max_level_before_check,
 DROP CONSTRAINT yakusoku_audit_battles_max_level_after_check,
 DROP CONSTRAINT yakusoku_audit_battles_exp_awarded_check,
 ADD CONSTRAINT yakusoku_audit_battles_max_level_before_check CHECK (max_level_before BETWEEN 1 AND 1500),
 ADD CONSTRAINT yakusoku_audit_battles_max_level_after_check CHECK (max_level_after BETWEEN 1 AND 1500),
 -- Only deep Masho boss audit battles can store >2M raw XP.
 -- Edge additionally checks canonical 29F/30F boss IDs and per-floor budgets.
 ADD CONSTRAINT yakusoku_audit_battles_exp_awarded_check CHECK (
   exp_awarded BETWEEN 0 AND 2000000
   OR (battle_type='boss' AND region_id='masho' AND exp_awarded BETWEEN 0 AND 8000000)
 );

COMMIT;

-- Read-only verification after execution:
-- SELECT con.conname, pg_get_constraintdef(con.oid)
-- FROM pg_constraint con
-- JOIN pg_class c ON c.oid=con.conrelid
-- JOIN pg_namespace n ON n.oid=c.relnamespace
-- WHERE n.nspname='public' AND c.relname IN
--   ('yakusoku_verified_characters','yakusoku_progression_audit','yakusoku_audit_battles')
--   AND con.conname ~ '(level|exp_awarded)';
