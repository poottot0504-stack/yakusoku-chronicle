import test from 'node:test';
import assert from 'node:assert/strict';
import { getDailyTravelBonus } from '../src/core/daily-travel-bonus.js';
import {
 useBoostScroll,advanceBoostPlaytime,eligibleBoostPlaytimeMs,
 remainingBoostMs,isBoostScrollActive,normalizeBoostScrolls,scrollDurationLabel
} from '../src/core/boost-scrolls.js';
import { awardBattleDrops } from '../src/core/drops.js';
import { settleMashoVictory, MASHO_DROP_RATE,MASHO_ABYSS_DROP_RATE } from '../src/core/masho-cave.js';
import { migrateSave } from '../src/core/save-migration.js';
import { getItemDef } from '../src/core/items.js';
import { isMarketSellable } from '../src/market/market-model.js';

const makeState=()=>({inventory:[],materials:{},gold:0,world:{day:1},story:{firstEndingSeen:true},cycle:1,characters:[],activePartyIds:[],unlockedRecipes:[],quests:{},bestiary:{},equipmentInventory:[],mashoCave:{highestCleared:25}});
const withBook=(itemId='dropScroll',hours=1)=>{const s=makeState();s.inventory.push({id:itemId,qty:2});useBoostScroll(s,itemId,{rng:()=>((hours-1)/3+.01)});return s;};
function getNeutralDay(){const base=Date.parse('2026-10-08T00:00:00+09:00');for(let i=0;i<7;i++){const t=base+i*86400000;const d=getDailyTravelBonus(t);if((d.monsterMaterialDropMultiplier??1)===1)return t;}throw Error('Unable to find non drop rate day');}
function caveWin(s,floor,roll,now=Date.now()) {
 return settleMashoVictory(s,{mashoFloor:floor,actors:[{side:'enemy',hp:0,mashoBoss:true,mashoFloor:floor},{side:'ally',hp:1}]},()=>roll,now);
}

test('all four scrolls can be traded and the new book randomly lasts 1 to 3 hours of playtime',()=>{
 assert.equal(getItemDef('dropScroll').boostKind,'drop');
 for(const hrs of [1,2,3]){
  const s=withBook('dropScroll',hrs);
  assert.equal(remainingBoostMs(s,'drop'),hrs*3600000);
  assert.ok(isMarketSellable(s,{kind:'item',id:'dropScroll',quantity:1}).ok);
  assert.throws(()=>useBoostScroll(s,'dropScroll'),/継続中/);
  assert.equal(remainingBoostMs(migrateSave(s),'drop'),hrs*3600000);
  advanceBoostPlaytime(s,hrs*3600000);
  assert.equal(remainingBoostMs(s,'drop'),0);
 }
 assert.equal(scrollDurationLabel(2*3600000+5*60000+3000),'02:05:03');
});

test('scroll clocks pause during background/idle; active battles consume even after long input gaps',()=>{
 const t=1000000;
 assert.equal(eligibleBoostPlaytimeMs({from:t,now:t+180000,lastInputAt:t}),180000);
 assert.equal(eligibleBoostPlaytimeMs({from:t,now:t+3600000,lastInputAt:t}),300000);
 assert.equal(eligibleBoostPlaytimeMs({from:t+300000,now:t+3600000,lastInputAt:t}),0);
 assert.equal(eligibleBoostPlaytimeMs({from:t,now:t+3600000,lastInputAt:t,inCombat:true}),3600000);
 const s=withBook('characterExpScroll',2);
 advanceBoostPlaytime(s,eligibleBoostPlaytimeMs({from:t,now:t+3600000,lastInputAt:t}));
 assert.equal(remainingBoostMs(s,'characterExp'),2*3600000-300000);
 // Backgrounded time is not fed into the book clock; reload preserves the balance.
 assert.equal(remainingBoostMs(migrateSave(s),'characterExp'),2*3600000-300000);
});

test('legacy Unix-expiry save converts once to the playable remaining balance',()=>{
 const now=Date.now();
 const raw={characterExp:now+7200000,jobExp:now-5000,gold:now+1000};
 const converted=normalizeBoostScrolls(raw,now);
 assert.equal(converted.characterExp.remainingMs,7200000);
 assert.equal(converted.jobExp.remainingMs,0);
 assert.equal(converted.gold.remainingMs,1000);
 assert.equal(converted.drop.remainingMs,0);
 assert.equal(normalizeBoostScrolls(converted,now+999999999).characterExp.remainingMs,7200000);
});

test('story materials and ores get doubled drop chance; book drop probability itself stays 0.1%',()=>{
 const now=getNeutralDay();
 const enemy={id:'slime',bestiaryId:'slime',regionId:'field',hp:0,materials:{normal:'testMaterial'}};
 const noBook=makeState(),withDropBook=withBook();
 const dropsWithout=awardBattleDrops(noBook,[enemy],()=>.8,now);
 const dropsWith=awardBattleDrops(withDropBook,[enemy],()=>.8,now);
 assert.ok(!dropsWithout.some(x=>x.id==='testMaterial'));
 assert.ok(dropsWith.some(x=>x.id==='testMaterial'));
 // Story book rolls remain 0.1%, regardless of whether the drop chance book is active.
 const withBookAndRoll=withBook();
 const awards=awardBattleDrops(withBookAndRoll,[enemy],()=>.000999,now);
 assert.equal(awards.filter(x=>x.id==='dropScroll')[0]?.qty,1);
 const withBookAndFail=withBook();
 awardBattleDrops(withBookAndFail,[enemy],()=>.001,now);
 assert.equal(withBookAndFail.inventory.find(x=>x.id==='dropScroll')?.qty,1);
});

test('daily monster-material 2x and the scroll do not become a 4x bonus',()=>{
 const t=Date.parse('2026-10-08T00:00:00+09:00');
 let daily=t;
 for(let i=0;i<9;i++){
  const next=t+i*86400000;
  if((getDailyTravelBonus(next).monsterMaterialDropMultiplier??1)===2){daily=next;break;}
 }
 assert.equal(getDailyTravelBonus(daily).monsterMaterialDropMultiplier,2);
 // rare material .06 * existing ordinary monster 2 * daily bonus 2 = .24
 // with scroll the drop chance must stay .24, not jump to .48
 const enemy={id:'slime',bestiaryId:'slime',regionId:'field',materials:{rare:'testRareMaterial'}};
 const s=withBook();
 assert.ok(!awardBattleDrops(s,[enemy],()=>.3,daily).some(x=>x.id==='testRareMaterial'));
 assert.ok(awardBattleDrops(s,[enemy],()=>.2,daily).some(x=>x.id==='testRareMaterial'));
});

test('cave drop book changes 5% to 10%, and floors 21-25 from 0.2% to 0.4%',()=>{
 assert.equal(MASHO_DROP_RATE,.05);assert.equal(MASHO_ABYSS_DROP_RATE,.002);
 assert.equal(caveWin(makeState(),1,.08).equipment,null);
 assert.ok(caveWin(withBook(),1,.08).equipment);
 assert.equal(caveWin(makeState(),21,.003).equipment,null);
 assert.ok(caveWin(withBook(),21,.003).equipment);
 assert.equal(caveWin(withBook(),21,.004).equipment,null);
});

test('drop chance book does not enhance rematches or event quest loot',()=>{
 const eventEnemy={id:'event-training-x',regionId:'field',event:true,materials:{normal:'testMaterial'}};
 const rematch={id:'rematch-x',bestiaryId:'slime',regionId:'field',rematch:true,materials:{normal:'testMaterial'}};
 for(const enemy of [eventEnemy,rematch]){
  const state=withBook();
  assert.ok(!awardBattleDrops(state,[enemy],()=>.8,getNeutralDay()).some(x=>x.id==='testMaterial'));
 }
});
