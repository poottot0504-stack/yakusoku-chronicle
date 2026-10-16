import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNewGame } from '../src/state/game-state.js';
import { migrateSave } from '../src/core/save-migration.js';
import { depositGold, withdrawGold, bankBalance, MAX_BANK_GOLD } from '../src/core/bank.js';
import { handlePartyWipe } from '../src/core/inn.js';
import { isFestivalBattle, createFestivalKillRecorder } from '../src/online/hunt-festival-record.js';
import { HUNT_FESTIVAL } from '../src/data/hunt-festival.js';
import { createMashoEnemy } from '../src/core/masho-cave.js';
import { chooseEnemyAction } from '../src/core/ai.js';
import { townMarkup } from '../src/ui/adventure.js';

const storage=()=>{
 const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))};
};

test('bank is accessible from any town; balances are per-save and start empty',()=>{
 const s=createNewGame([]);
 assert.match(townMarkup({...s,adventure:{regionId:'field'}}),/data-town="bank"/);
 assert.equal(bankBalance(s),0);
 s.gold=200_000;
 assert.deepEqual(depositGold(s,150_000),{amount:150_000,balance:150_000,gold:50_000});
 const {loss}=handlePartyWipe(s);
 assert.equal(loss,5_000);
 assert.equal(s.gold,45_000);
 assert.equal(bankBalance(s),150_000);
 assert.deepEqual(withdrawGold(s,25_000),{amount:25_000,balance:125_000,gold:70_000});
 const restored=migrateSave(structuredClone(s));
 assert.equal(bankBalance(restored),125_000);
 assert.equal(createNewGame([]).bankGold,0);
});

test('bank rejects bad quantities, overdraw and balance overflow safely',()=>{
 const s=createNewGame([]);s.gold=100;
 for(const value of ['',0,-1,1.5,'abc',Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>depositGold(s,value));
  assert.equal(s.gold,100);
 }
 assert.throws(()=>depositGold(s,101),/手持ち/);
 assert.throws(()=>withdrawGold(s,1),/預けた/);
 s.bankGold=MAX_BANK_GOLD;
 assert.throws(()=>depositGold(s,1),/上限/);
 const restored=migrateSave({...s,bankGold:-7});assert.equal(restored.bankGold,0);
});

test('festival victory recording is within the event, excludes repeat battles',()=>{
 const started=HUNT_FESTIVAL.start;
 assert.ok(!isFestivalBattle({},started-1));
 assert.ok(isFestivalBattle({},started));
 assert.ok(isFestivalBattle({},HUNT_FESTIVAL.end-1));
 assert.ok(!isFestivalBattle({},HUNT_FESTIVAL.end));
 assert.ok(!isFestivalBattle({rematch:true},started));
 assert.ok(!isFestivalBattle({isRaid:true},started));
});

test('festival ledger queues offline requests and clears after acknowledgment, with stable ids',async()=>{
 const mem=storage(),requests=[];
 let online=false;
 const recorder=createFestivalKillRecorder(async b=>{requests.push(b);if(!online)throw new Error('offline');return {ok:true,recorded:true}},mem);
 const valid={battleId:'8e0bf4b4-8cdf-4cb9-b732-168239f87b03',enemyIds:['goblin','slime'],battleType:'normal',clientAt:new Date(HUNT_FESTIVAL.start+3600000).toISOString()};
 const first=await recorder.record(valid);
 assert.equal(first.sent,0);assert.equal(recorder.pending(),1);
 assert.equal(recorder.enqueue(valid),true);assert.equal(recorder.pending(),1);
 const reloaded=createFestivalKillRecorder(async b=>{requests.push(b);return {ok:true,recorded:true}},mem);
 online=true;
 assert.deepEqual(await reloaded.flush(),{sent:1,remaining:0});
 assert.equal(reloaded.pending(),0);
 assert.equal(requests.at(-1).battleId,valid.battleId);
 assert.equal(reloaded.enqueue({...valid,battleId:'another',enemyIds:[]}),false);
});

test('masho 20-25 area attacks never occur on consecutive two turns, and abyss percentage is 40%',()=>{
 const s={cycle:2,characters:[],activePartyIds:[],mashoCave:{highestCleared:25}};
 for(const floor of [20,21,25]){
  const enemy=createMashoEnemy(s,floor,()=>0);
  enemy.instantDeathCycle=false; // isolate area-attack cooldown from the telegraphed finisher
  const battle={turnNumber:0,actors:[{id:'hero',side:'ally',hp:100,maxHp:100}]};
  const first=chooseEnemyAction(battle,enemy,()=>.99);
  assert.equal(first.type,'skill');assert.equal(first.skill?.allTargets,true);
  for(const t of [1,2]){
   battle.turnNumber=t;
   const next=chooseEnemyAction(battle,enemy,()=>.99);
   assert.equal(Boolean(next.skill?.allTargets),false);
  }
  battle.turnNumber=3;
  const third=chooseEnemyAction(battle,enemy,()=>.99);
  assert.equal(third.skill?.allTargets,true);
  if(floor>=21){assert.equal(enemy.ai.find(x=>x.skill?.id==='mashoAbyssRuin')?.skill.maxHpDamageRatio,.4);}
 }
});

test('main game sends festival victories and keeps existing progression audit',()=>{
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/festivalKillRecorder\.record\(/);
 assert.match(main,/progressionAuditApi\.record\(/);
 assert.match(main,/await festivalKillRecorder\.flush\(/);
 assert.match(main,/depositGold\(state,amount\)/);
});
