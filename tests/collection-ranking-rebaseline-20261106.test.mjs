import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const edge=readFileSync(new URL('../supabase/functions/yakusoku-player-stats/index.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../maintenance/collection-rebaseline-20261106.sql',import.meta.url),'utf8');

test('event recovery requires a server-issued ticket, owner, matching battle and verified progress',()=>{
 for(const s of [
  'yakusoku_collection_rebaseline_eligible',
  'p_auth_user_id:authUserId',
  'p_battle_id:battleId',
  'p_enemy_ids:enemyIds',
  'p_client_at:first?.clientAt??null',
  'existingSlotRows.every',
  'collectionRebaselineAllowed=!eligibilityError && eligible===true',
 ])assert.ok(edge.includes(s),s);
 for(const s of [
  't.auth_user_id=p_auth_user_id',
  't.battle_id=p_battle_id',
  't.region_id=p_region_id',
  'count(*) > (',
  "t.issued_at+interval '2 hours'",
  "v.last_battle_at < timestamptz '2026-11-06 00:00:00+09'",
  "v.last_battle_at >= timestamptz '2026-11-06 00:00:00+09'",
 ])assert.ok(migration.includes(s),s);
});

test('untrusted public clients cannot trigger rebaseline eligibility directly',()=>{
 assert.match(migration,/revoke all on function public\.yakusoku_collection_rebaseline_eligible[\s\S]*from public,anon,authenticated;/i);
 assert.match(migration,/grant execute on function public\.yakusoku_collection_rebaseline_eligible[\s\S]*to service_role;/i);
});

test('rebaseline cannot skip per-battle XP and level checks or disable other anti-cheat',()=>{
 assert.match(edge,/levelAfter-levelBefore>10/);
 assert.match(edge,/expAwarded>rawLimit/);
 assert.match(edge,/impossible_character_exp_gain/);
 assert.match(edge,/invalid_job_delta/);
 assert.match(edge,/if\(!collectionRebaselineAllowed\)\{invalidReason="progression_chain_mismatch";break;\}/);
 assert.match(edge,/if\(!collectionRebaselineAllowed\)\{invalidReason="job_chain_mismatch";break;\}/);
 assert.match(edge,/collectionRebaselineUsed\?"legacy_baseline"/);
 assert.match(edge,/collection_one_time_rebaseline/);
 assert.match(edge,/rebaseline_battles:rebaselineBattles/);
});

test('unverified event tickets alone do not award leaderboard points',()=>{
 assert.doesNotMatch(edge,/collection_tallies_202611/);
 assert.match(edge,/db\.from\("yakusoku_audit_battles"\)\.insert/);
});
