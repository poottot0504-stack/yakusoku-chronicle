import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame } from '../src/state/game-state.js';
import { saveToSlot, loadFromSlot } from '../src/save/save-slots.js';
import { EQUIPMENT } from '../src/data/equipment.js';
import { HUNT_FESTIVAL_BONUSES, FESTIVAL_WEAPONS, HUNT_FESTIVAL } from '../src/data/hunt-festival.js';
import { grantFestivalReward, grantFestivalBonus } from '../src/core/hunt-festival.js';
import { grantHuntCountApology, canReceiveHuntCountApology } from '../src/core/hunt-count-apology.js';
import { townMarkup } from '../src/ui/adventure.js';

const gear=(weapon,slot=1)=>({id:'d44aeeee-1111-4111-8111-111111111111',weapon,saveSlot:slot});
const bonus5=(slot=1)=>({id:'d44aeeee-2222-4222-8222-222222222222',milestone:5000,saveSlot:slot});
const bonus10=(slot=1)=>({id:'d44aeeee-3333-4333-8333-333333333333',milestone:10000,saveSlot:slot});
const apology=(slot=1)=>({id:'d44aeeee-4444-4444-8444-444444444444',eligible:true,claimed:true,rewardId:'enhanceCrystal',quantity:5,saveSlot:slot});
const newGame=()=>createNewGame([]);
const testStorage=()=>{
 const data=new Map();
 return {getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,String(value));},removeItem:key=>{data.delete(key);}};
};

for(const type of Object.keys(FESTIVAL_WEAPONS)){
 test(`2,500-stage ${type}: all nine gear ids are valid, unique, and saved`,()=>{
  const state=newGame();
  assert.equal(grantFestivalReward(state,gear(type),1),true);
  const pieces=state.equipmentInventory.filter(x=>x.instanceId.startsWith('festival-'));
  assert.equal(pieces.length,9);
  assert.equal(new Set(pieces.map(x=>x.instanceId)).size,9);
  assert.equal(pieces[0].equipmentId,`hunt2026-weapon-${type}`);
  for(const entry of pieces)assert.ok(EQUIPMENT[entry.equipmentId],`missing ${entry.equipmentId}`);
  const storage=testStorage(),session={mode:'guest',storage};
  saveToSlot(session,1,state);
  const restored=loadFromSlot(session,1);
  assert.equal(restored.equipmentInventory.filter(x=>x.instanceId.startsWith('festival-')).length,9);
  assert.equal(grantFestivalReward(restored,gear(type),1),false);
 });
}

test('5k and 10k award both materials and currency, no duplicates after reload',()=>{
 const s=newGame();s.gold=50;
 grantFestivalReward(s,gear('oneHandSword'),1);
 assert.equal(grantFestivalBonus(s,bonus5(),1),true);
 assert.equal(grantFestivalBonus(s,bonus10(),1),true);
 assert.equal(s.gold,6_000_050);
 assert.equal(s.materials.orihal,2);
 assert.equal(s.materials.orichalcum,2);
 const session={mode:'guest',storage:testStorage()};
 saveToSlot(session,1,s);
 const reloaded=loadFromSlot(session,1);
 assert.equal(grantFestivalBonus(reloaded,bonus5(),1),false);
 assert.equal(grantFestivalBonus(reloaded,bonus10(),1),false);
 assert.equal(reloaded.gold,6_000_050);
 assert.equal(reloaded.materials.orihal,2);
 assert.equal(reloaded.materials.orichalcum,2);
});

test('near material cap: failed 5k claim does not pay gold or consume receipt',()=>{
 const s=newGame();s.gold=123;s.materials.orihal=9998;
 assert.throws(()=>grantFestivalBonus(s,bonus5(),1),/所持上限/);
 assert.equal(s.gold,123);
 assert.equal(s.materials.orihal,9998);
 assert.equal(s.festivalReceipts?.[`${HUNT_FESTIVAL.id}:5000`],undefined);
 s.materials.orihal=9997;
 assert.equal(grantFestivalBonus(s,bonus5(),1),true);
 assert.equal(s.gold,1_000_123);
 assert.equal(s.materials.orihal,9999);
});

test('near material cap: failed 10k claim does not pay gold or consume receipt',()=>{
 const s=newGame();s.gold=456;s.materials.orichalcum=9998;
 assert.throws(()=>grantFestivalBonus(s,bonus10(),1),/所持上限/);
 assert.equal(s.gold,456);
 assert.equal(s.materials.orichalcum,9998);
 assert.equal(s.festivalReceipts?.[`${HUNT_FESTIVAL.id}:10000`],undefined);
 s.materials.orichalcum=9997;
 assert.equal(grantFestivalBonus(s,bonus10(),1),true);
 assert.equal(s.gold,5_000_456);
 assert.equal(s.materials.orichalcum,9999);
});

test('currency safe integer overflow blocks the 10k claim atomically',()=>{
 const s=newGame();s.gold=Number.MAX_SAFE_INTEGER-4_000_000;
 assert.throws(()=>grantFestivalBonus(s,bonus10(),1),/所持金/);
 assert.equal(s.materials.orichalcum??0,0);
 assert.equal(s.gold,Number.MAX_SAFE_INTEGER-4_000_000);
});

test('apology NPC gives exactly 5 forging crystals, disappears, and stays delivered after reload',()=>{
 const s=newGame();s.materials.enhanceCrystal=80;
 const receipt=apology();
 assert.match(townMarkup(s,{eligible:true,claimed:false},1),/data-hunt-count-apology-npc/);
 assert.equal(grantHuntCountApology(s,receipt,1),true);
 assert.equal(s.materials.enhanceCrystal,85);
 assert.doesNotMatch(townMarkup(s,receipt,1),/data-hunt-count-apology-npc/);
 const session={mode:'guest',storage:testStorage()};
 saveToSlot(session,1,s);
 const reloaded=loadFromSlot(session,1);
 assert.equal(grantHuntCountApology(reloaded,receipt,1),false);
 assert.equal(reloaded.materials.enhanceCrystal,85);
 assert.doesNotMatch(townMarkup(reloaded,receipt,1),/data-hunt-count-apology-npc/);
});

test('apology 9994=>9999 works, 9995 is blocked, later retry pays full five',()=>{
 const s=newGame();s.materials.enhanceCrystal=9995;
 assert.equal(canReceiveHuntCountApology(s),false);
 assert.throws(()=>grantHuntCountApology(s,apology(),1),/所持上限/);
 assert.equal(s.materials.enhanceCrystal,9995);
 assert.equal(s.huntCountApologyReceiptId,undefined);
 s.materials.enhanceCrystal=9994;
 assert.equal(grantHuntCountApology(s,apology(),1),true);
 assert.equal(s.materials.enhanceCrystal,9999);
});

test('different-slot apology cannot be applied locally even when remote receipt exists',()=>{
 const s=newGame();
 assert.throws(()=>grantHuntCountApology(s,apology(2),1),/一致/);
 assert.equal(s.materials.enhanceCrystal??0,0);
 assert.doesNotMatch(townMarkup(s,apology(2),1),/data-hunt-count-apology-npc/);
});

test('both first and bonus reward preserve slot linkage',()=>{
 const s=newGame();
 assert.throws(()=>grantFestivalReward(s,gear('oneHandSword',2),1),/SLOT 2/);
 assert.throws(()=>grantFestivalBonus(s,bonus5(2),1),/SLOT 2/);
 assert.throws(()=>grantFestivalBonus(s,bonus10(2),1),/SLOT 2/);
 assert.equal(s.equipmentInventory.length,0);
 assert.equal(s.materials.orihal??0,0);
 assert.equal(s.materials.orichalcum??0,0);
});
