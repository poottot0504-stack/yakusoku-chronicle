import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../supabase/release-sql/20261112_collection_audit_ticket_clock_skew_reconcile.sql',import.meta.url),'utf8');
const start=sql.indexOf('CREATE OR REPLACE FUNCTION yakusoku_private.collection_accept_audit_202611');
const reconcile=sql.indexOf('WITH verified AS MATERIALIZED');
test('ticket server clock skew tolerance is limited to 20 seconds, never unbounded',()=>{
 assert.ok(start>0 && reconcile>start);
 assert.match(sql,/new\.client_at < ticket\.issued_at-interval '20 seconds'/);
 assert.match(sql,/new\.client_at > ticket\.issued_at\+interval '2 hours'/);
 assert.match(sql,/new\.accepted_at < ticket\.issued_at/);
 assert.match(sql,/a\.client_at >= t\.issued_at - interval '20 seconds'/);
 assert.match(sql,/a\.client_at <= t\.issued_at \+ interval '2 hours'/);
 assert.match(sql,/a\.accepted_at >= t\.issued_at/);
 const startAt=new Date('2026-11-12T12:00:00.000Z').getTime();
 const valid=new Date('2026-11-12T11:59:59.000Z').getTime();
 const tooOld=new Date('2026-11-12T11:59:39.000Z').getTime();
 assert.ok(startAt-valid<=20_000);
 assert.ok(startAt-tooOld>20_000);
});
test('only individually verified victories with canonical ticket and matching enemy/region can reconcile',()=>{
 for(const guard of [
  "FROM public.yakusoku_audit_battles a",
  "t.battle_id=a.battle_id AND t.auth_user_id=a.auth_user_id",
  "old.battle_id IS NULL",
  "a.battle_type='normal'",
  "a.region_id IN ('field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss')",
  "a.region_id=t.region_id",
  "jsonb_array_length(a.enemy_ids) BETWEEN 1 AND 5",
  "a.exp_awarded IS NOT NULL AND a.exp_awarded>=0",
  "NOT EXISTS (",
  "jsonb_array_elements_text(a.enemy_ids)",
  "unnest(t.enemy_ids)"
 ]) assert.ok(sql.includes(guard),guard);
 assert.doesNotMatch(sql,/UPDATE\s+public\.yakusoku_audit_battles/mi);
 assert.doesNotMatch(sql,/INSERT\s+INTO\s+public\.yakusoku_audit_battles/mi);
});
test('backfill cannot double-credit on retries or races',()=>{
 for(const guard of [
  "ON CONFLICT (battle_id) DO NOTHING",
  "RETURNING battle_id,auth_user_id,kills,accepted_at",
  "FROM newly_accepted GROUP BY auth_user_id",
  "FROM newly_accepted v",
  "collection_tallies_202611.proof_count+excluded.proof_count",
  "BEGIN;",
  "COMMIT;"
 ])assert.ok(sql.includes(guard),guard);
 assert.match(sql,/\$function\$;\s*-- Reconcile ONLY existing/);
});
