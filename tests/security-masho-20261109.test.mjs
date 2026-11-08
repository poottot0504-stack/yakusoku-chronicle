import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MASHO_FLOORS} from '../src/core/masho-cave.js';
import {requiredExpForLevel} from '../src/core/progression.js';

// Exercise the actual Edge Function's pure validation formulas against the
// shipped game definitions. No credentials, DB writes, or network calls.
const source=readFileSync(new URL('../supabase/functions/yakusoku-player-stats/index.ts',import.meta.url),'utf8');
const start=source.indexOf('const MASHO_DEEP_BOSS_IDS:Record<number,string>=');
const end=source.indexOf('function maxCharacterExpMultiplier(',start);
assert.ok(start>=0 && end>start);
const policySource=source.slice(start,end)
 .replace('const MASHO_DEEP_BOSS_IDS:Record<number,string>=','const MASHO_DEEP_BOSS_IDS=')
 .replace('function mashoFloor(enemyIds:string[])','function mashoFloor(enemyIds)')
 .replace('function mashoFloorRewards(floor:number)','function mashoFloorRewards(floor)')
 .replace('function allowedMashoJobGain(jobBefore:number,jobId:string,enemyIds:string[],cycle:number)','function allowedMashoJobGain(jobBefore,jobId,enemyIds,cycle)')
 .replace('function maxRawBattleExp(battleType:string,regionId:string,avgLevel:number,enemyCount:number,enemyIds:string[]=[],cycle=1)','function maxRawBattleExp(battleType,regionId,avgLevel,enemyCount,enemyIds=[],cycle=1)');
const policy=Function('requiredBaseExp','asInt',policySource+
 ';return {mashoFloor,mashoFloorRewards,allowedMashoJobGain,maxRawBattleExp};')(
 requiredExpForLevel,(value,fallback=0)=>Number.isFinite(Number(value))?Math.trunc(Number(value)):fallback
);

test('the Edge Function recognizes every real 21–28F Masho boss and exact XP amounts',()=>{
 assert.equal(MASHO_FLOORS.length,28);
 for(let floor=21;floor<=28;floor++){
  const game=MASHO_FLOORS[floor-1];
  assert.deepEqual(policy.mashoFloorRewards(floor),{exp:game.exp,jobExp:game.jobExp});
  for(const boss of game.bosses){
   const enemyId=`masho-${floor}-${boss.id}`;
   assert.equal(policy.mashoFloor([enemyId]),floor,enemyId);
   assert.ok(policy.maxRawBattleExp('boss','masho',game.level,1,[enemyId],1)>=game.exp,enemyId);
   assert.ok(policy.allowedMashoJobGain(1,'swordsman',[enemyId],2)>15,enemyId);
  }
 }
});

test('unknown deep-floor bosses and out-of-range floors cannot obtain high-XP validation',()=>{
 for(const enemyId of ['masho-28-fake','masho-26-anima','masho-29-masho28-graciel','masho-00-anima']){
  assert.equal(policy.mashoFloor([enemyId]),null,enemyId);
  assert.equal(policy.maxRawBattleExp('boss','masho',400,1,[enemyId],2),330000,enemyId);
  assert.equal(policy.allowedMashoJobGain(1,'swordsman',[enemyId],2),15,enemyId);
 }
});

test('existing older Masho and non-Masho validation limits remain supported',()=>{
 for(let floor=1;floor<=20;floor++){
  const game=MASHO_FLOORS[floor-1];
  const id=`masho-${floor}-${game.bosses[0].id}`;
  assert.equal(policy.mashoFloor([id]),floor);
  assert.deepEqual(policy.mashoFloorRewards(floor),{exp:game.exp,jobExp:game.jobExp});
 }
 assert.equal(policy.maxRawBattleExp('raid','raid',100,1,['anima'],1),50000);
 assert.equal(policy.maxRawBattleExp('event','event:other',100,1,['boss'],1),100000);
 assert.equal(policy.maxRawBattleExp('training','training',100,1,['slime'],1),50000);
});

test('anti-cheat continues checking independently of floor reward caps',()=>{
 assert.match(source,/if\(expAwarded>2_000_000\)invalidReason="exp_awarded_too_high"/);
 assert.match(source,/if\(levelBefore<1\|\|levelAfter<1\|\|levelAfter>500/);
 assert.match(source,/if\(gain<0\|\|gain>maxGain\)/);
 assert.match(source,/if\(invalidReason\)\{/);
});
