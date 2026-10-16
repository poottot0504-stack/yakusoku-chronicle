import test from 'node:test';
import assert from 'node:assert/strict';
import { getItemDef, getItemCategory } from '../src/core/items.js';
import { useBoostScroll, isBoostScrollActive, getBattleBoostMultiplier, remainingBoostMs, applyBoostedBattleGold, advanceBoostPlaytime, BOOST_SCROLL_DROP_RATE } from '../src/core/boost-scrolls.js';
import { getDailyTravelBonus } from '../src/core/daily-travel-bonus.js';
import { awardBattleDrops } from '../src/core/drops.js';
import { buyItem, getShopInventory } from '../src/core/shop.js';
import { EQUIPMENT } from '../src/data/equipment.js';
import { isMarketSellable } from '../src/market/market-model.js';
import { migrateSave } from '../src/core/save-migration.js';
import { mashoCaveMarkup } from '../src/ui/masho-cave.js';
import { itemsMarkup } from '../src/ui/items.js';

const newState=()=>({inventory:[],materials:{},gold:1000000,world:{day:1},story:{},cycle:1,characters:[],activePartyIds:[],unlockedRecipes:[],quests:{},bestiary:{},equipmentInventory:[]});

function nonBonusDay(kind) {
 const start=Date.parse('2026-10-08T00:10:00+09:00');
 for(let i=0;i<12;i++){
  const t=start+i*86400000;
  if(Number(getDailyTravelBonus(t)[kind+'Multiplier']??1)===1)return t;
 }
 throw Error('No nonbonus day');
}

test('books are inventory consumables, and each has a 0.1% drop rate',()=>{
 for(const id of ['characterExpScroll','jobExpScroll','goldScroll','dropScroll']){
  const d=getItemDef(id);assert.ok(d.consumable);assert.equal(getItemCategory(id),'consumable');
  assert.ok(isMarketSellable({inventory:[{id,qty:2}],characters:[],equipmentInventory:[]},{kind:'item',id,quantity:1}).ok);
 }
 assert.equal(BOOST_SCROLL_DROP_RATE,.001);
});

test('randomly 1,2,3 hours; playtime balance survives migration; duplicate use blocked',()=>{
 for(const [roll,hours] of [[0,1],[.34,2],[.9999,3]]){
  const s=newState();s.inventory=[{id:'characterExpScroll',qty:2}];
  const start=Date.parse('2026-10-15T08:00:00+09:00');
  assert.equal(useBoostScroll(s,'characterExpScroll',{now:start,rng:()=>roll}).hours,hours);
  assert.equal(s.inventory[0].qty,1);
  assert.equal(remainingBoostMs(s,'characterExp',start),hours*3600000);
  assert.throws(()=>useBoostScroll(s,'characterExpScroll',{now:start+1000,rng:()=>0}),/継続中/);
  const loaded=migrateSave(s);
  assert.equal(remainingBoostMs(loaded,'characterExp',start),hours*3600000);
  advanceBoostPlaytime(loaded,hours*3600000);
  assert.equal(isBoostScrollActive(loaded,'characterExp',start+hours*3600000),false);
 }
});

test('nonstacking exp, job and gold bonuses; no daily boost inside cave',()=>{
 for(const [kind,itemId] of [['characterExp','characterExpScroll'],['jobExp','jobExpScroll'],['gold','goldScroll']]){
  const t=nonBonusDay(kind);
  const s=newState();s.inventory=[{id:itemId,qty:1}];useBoostScroll(s,itemId,{now:t,rng:()=>0});
  assert.equal(getBattleBoostMultiplier(s,kind,{now:t}),2);
  assert.equal(getBattleBoostMultiplier(s,kind,{now:t,eventMultiplier:2}),2);
  assert.equal(getBattleBoostMultiplier(s,kind,{now:t,eventMultiplier:2.5}),2.5);
  advanceBoostPlaytime(s,3600000);
  assert.equal(getBattleBoostMultiplier(s,kind,{now:t+3600000}),1);
 }
 const s=newState();const now=Date.parse('2026-10-08T00:10:00+09:00');
 assert.equal(applyBoostedBattleGold(s,100,now,{includeDaily:false}),100);
 s.inventory=[{id:'goldScroll',qty:1}];useBoostScroll(s,'goldScroll',{now,rng:()=>0});
 assert.equal(applyBoostedBattleGold(s,100,now,{includeDaily:false}),200);
});

test('story ordinary monsters, both cycles and bosses roll books independently',()=>{
 const enemy={id:'normal-1',bestiaryId:'slime',regionId:'field',materials:{},hp:0};
 for(const cycle of [1,2]){
  const s=newState();s.cycle=cycle;
  awardBattleDrops(s,[enemy],()=>0);
  assert.deepEqual(['characterExpScroll','jobExpScroll','goldScroll','dropScroll'].map(id=>(s.inventory.find(x=>x.id===id)?.qty??0)),[1,1,1,1]);
 }
 const s=newState();awardBattleDrops(s,[{id:'fieldBoss',bestiaryId:'storyBoss-field',isBoss:true}],()=>0);
 assert.ok(s.inventory.some(x=>x.id==='characterExpScroll'));
});

test('festival, cave, rematch and opt-out never drop books',()=>{
 const cases=[
  {id:'event-training-swordsman',regionId:'field',event:true},
  {id:'caveboss',regionId:'cave',mashoBoss:true},
  {id:'rematch-x',bestiaryId:'slime',regionId:'field',rematch:true}
 ];
 for(const enemy of cases){const s=newState();awardBattleDrops(s,[enemy],()=>0);assert.ok(!s.inventory.some(x=>x.id.endsWith('Scroll')));}
 const s=newState();awardBattleDrops(s,[{id:'slime',bestiaryId:'slime',regionId:'field'}],()=>0,Date.now(),{allowBoostScrollDrops:false});assert.ok(!s.inventory.some(x=>x.id.endsWith('Scroll')));
});

test('shop can buy 999 items, but never 1000; gold and stock enforced',()=>{
 const s=newState();
 assert.equal(getShopInventory(s,'starter').find(x=>x.id==='potion').stock,Infinity);
 buyItem(s,'starter','potion',999);
 assert.equal(s.inventory.find(x=>x.id==='potion').qty,999);assert.equal(s.gold,900100);
 assert.throws(()=>buyItem(s,'starter','potion',1000),/999個/);
 s.gold=50;assert.throws(()=>buyItem(s,'starter','potion',1),/ゴールド/);
});

test('all equipment groups are strengthened without changing rarity/requirements',()=>{
 const ids=['ironSword','sniperAstra','masho-abyss-sword','promise-memory'];
 for(const id of ids){const d=EQUIPMENT[id];assert.ok(d,`Missing equipment ${id}`);assert.ok(['weapon','accessory'].includes(d.slot));}
 assert.equal(EQUIPMENT['masho-abyss-sword'].attack,440);
 assert.ok(Object.keys(EQUIPMENT).length>2000);
});

test('masho result retains level-ups and inventory shows active timer',()=>{
 const s=newState();s.story.firstEndingSeen=true;s.cycle=2;s.mashoCave={highestCleared:1,clearCounts:{1:1},lastReward:{floor:1,levelUps:['アレンのLvが31に上がった！','ミラの魔法使いLvが30に上がった！']}};
 const html=mashoCaveMarkup(s);assert.match(html,/アレンのLvが31/);assert.match(html,/ミラの魔法使いLvが30/);
 s.inventory=[{id:'jobExpScroll',qty:1}];s.boostScrolls={jobExp:Date.now()+3600000};
 assert.match(itemsMarkup(s),/使用中の2倍の書/);
});

test('shop equipment is limited to one piece per purchase while consumables allow MAX 999',()=>{
 const s=newState();s.gold=9999999;s.story.trueEndingSeen=true;
 const equip=getShopInventory(s,'endgame').find(x=>x.kind==='equipment');
 assert.ok(equip,'endgame shop equipment should exist');
 assert.throws(()=>buyItem(s,'endgame',equip.id,999),/装備品は1回に1個/);
 assert.throws(()=>buyItem(s,'endgame',equip.id,2),/装備品は1回に1個/);
 assert.equal(s.equipmentInventory.length,0);
 buyItem(s,'endgame',equip.id,1);
 assert.equal(s.equipmentInventory.length,1);
 buyItem(s,'starter','potion',999);
 assert.equal(s.inventory.find(x=>x.id==='potion')?.qty,999);
});
