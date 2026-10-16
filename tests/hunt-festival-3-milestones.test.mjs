import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HUNT_FESTIVAL,HUNT_FESTIVAL_BONUSES,FESTIVAL_EQUIPMENT } from '../src/data/hunt-festival.js';
import { festivalMarkup,festivalDetailsMarkup,festivalTitleMarkup } from '../src/ui/hunt-festival.js';
import { grantFestivalReward,grantFestivalBonus } from '../src/core/hunt-festival.js';
import { createNewGame } from '../src/state/game-state.js';
import { migrateSave } from '../src/core/save-migration.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/online/hunt-festival-api.js',import.meta.url),'utf8');
const stamp=HUNT_FESTIVAL.start+3600_000;
const baseReceipt={id:'6ef77234-2d2e-4e40-b5c1-6200b0f77111',weapon:'oneHandSword',saveSlot:1};
const bonus5={id:'1c338f26-bd76-4a09-a20e-6200b0f77122',milestone:5000,saveSlot:1};
const bonus10={id:'48e879c3-3a09-4b5a-9c8b-6200b0f77133',milestone:10000,saveSlot:1};
const render=(data,flags={})=>festivalMarkup({data:{phase:'active',eligible:true,receipt:null,bonusReceipts:{},...data},delivered:false,bonusDelivered:{},pending:0,...flags},stamp);

test('festival has fixed 2,500, 5,000, 10,000 cumulative goals without replacing the original gear',()=>{
 assert.deepEqual(HUNT_FESTIVAL.milestones,[2500,5000,10000,50000,100000]);
 assert.equal(HUNT_FESTIVAL.goal,2500);
 assert.equal(HUNT_FESTIVAL.maxGoal,100000);
 assert.equal(Object.keys(FESTIVAL_EQUIPMENT).length,24);
 assert.deepEqual(HUNT_FESTIVAL_BONUSES[5000].materials,[{id:'orihal',qty:2}]);
 assert.equal(HUNT_FESTIVAL_BONUSES[5000].gold,1_000_000);
 assert.deepEqual(HUNT_FESTIVAL_BONUSES[10000].materials,[{id:'orichalcum',qty:2}]);
 assert.equal(HUNT_FESTIVAL_BONUSES[10000].gold,5_000_000);
 assert.doesNotMatch(JSON.stringify(HUNT_FESTIVAL_BONUSES),/forgeCharm|ExpScroll|goldScroll|dropScroll/);
});

test('festival shows all milestone tiers and only eligible available claim actions',()=>{
 const initial=render({total:2100});
 assert.match(initial,/\/ 2,500体/);
 assert.match(initial,/aria-valuemax="2500"/);
 assert.match(initial,/2,500体/);
 assert.match(initial,/5,000体/);
 assert.match(initial,/10,000体/);
 assert.doesNotMatch(initial,/data-hunt-(reward|bonus)/);
 const first=render({total:2500});
 assert.match(first,/data-hunt-reward/);
 assert.doesNotMatch(first,/data-hunt-bonus/);
 const fiveLocked=render({total:5000,receipt:baseReceipt});
 assert.match(fiveLocked,/先に2,500体報酬を受け取ってください/);
 assert.doesNotMatch(fiveLocked,/data-hunt-bonus/);
 const fiveReady=render({total:5300,receipt:baseReceipt},{delivered:true});
 assert.match(fiveReady,/data-hunt-bonus="5000"/);
 assert.doesNotMatch(fiveReady,/data-hunt-bonus="10000"/);
 const allReady=render({total:11000,receipt:baseReceipt,bonusReceipts:{5000:bonus5}},{delivered:true,bonusDelivered:{5000:true}});
 assert.match(allReady,/data-hunt-bonus="10000"/);
 assert.doesNotMatch(allReady,/data-hunt-bonus="5000"/);
 assert.match(allReady,/次は50,000体へ/);
});

test('festival correctly shows unclaimed bonus receipts for recovery',()=>{
 const html=render({total:10000,receipt:baseReceipt,bonusReceipts:{5000:bonus5,10000:bonus10}},{delivered:true});
 assert.match(html,/data-hunt-bonus="5000">受取を再開する/);
 assert.match(html,/data-hunt-bonus="10000">受取を再開する/);
 assert.match(festivalDetailsMarkup(),/5段階目標/);
 assert.match(festivalTitleMarkup(stamp),/最大100,000体まで、全5段階報酬/);
});

test('old 2,500 reward remains nine pieces and can be restored',()=>{
 const state=createNewGame([]);
 assert.equal(grantFestivalReward(state,baseReceipt,1),true);
 assert.equal(state.equipmentInventory.filter(x=>x.instanceId.startsWith('festival-')).length,9);
 assert.equal(grantFestivalReward(state,baseReceipt,1),false);
});

test('bonus stages grant two forging materials per milestone exactly once across save migrations',()=>{
 const state=createNewGame([]);
 state.gold=123;
 grantFestivalReward(state,baseReceipt,1);
 assert.equal(grantFestivalBonus(state,bonus5,1),true);
 assert.equal(state.gold,1_000_123,'the 5,000 milestone adds 1,000,000G');
 assert.equal(state.materials.orihal,2);
 assert.equal(state.inventory.find(x=>x.id==='orihal'),undefined,'rare materials must not enter the consumable inventory');
 assert.equal(grantFestivalBonus(state,bonus5,1),false);
 const restored=migrateSave(structuredClone(state));
 assert.equal(grantFestivalBonus(restored,bonus5,1),false);
 assert.equal(restored.materials.orihal,2);
 assert.equal(grantFestivalBonus(restored,bonus10,1),true);
 assert.equal(restored.materials.orichalcum,2);
 assert.equal(restored.materials.orihal,2);
 assert.equal(restored.gold,6_000_123,'the 10,000 milestone adds 5,000,000G exactly once');
 assert.equal(grantFestivalBonus(restored,bonus10,1),false);
 assert.equal(restored.materials.orichalcum,2);
});

test('bonus receipts reject invalid milestone, wrong slot, changed receipts and excessive materials',()=>{
 const state=createNewGame([]);state.gold=900;
 assert.throws(()=>grantFestivalBonus(state,{...bonus5,milestone:7500},1),/受取情報/);
 assert.throws(()=>grantFestivalBonus(state,bonus5,2),/SLOT 1/);
 assert.equal(state.gold,900);
 grantFestivalBonus(state,bonus5,1);
 assert.throws(()=>grantFestivalBonus(state,{...bonus5,id:'other'},1),/受取済み/);
 const full=createNewGame([]);
 full.materials.orichalcum=998;
 assert.throws(()=>grantFestivalBonus(full,bonus10,1),/所持上限/);
 assert.equal(full.materials.orichalcum,998,'failed claim does not grant partial rewards');
 assert.equal(full.festivalReceipts?.[`${HUNT_FESTIVAL.id}:10000`],undefined);
 const almostFull=createNewGame([]);
 almostFull.materials.orihal=997;
 assert.equal(grantFestivalBonus(almostFull,bonus5,1),true);
 assert.equal(almostFull.materials.orihal,999);
 const legacyFull=createNewGame([]);
 legacyFull.materials.orihal=997;
 legacyFull.inventory.push({id:'orihal',qty:1});
 assert.throws(()=>grantFestivalBonus(legacyFull,bonus5,1),/所持上限/);
});

test('bonus descriptions show only Orihal and Orichalcum materials at 5000 and 10000',()=>{
 const html=festivalDetailsMarkup();
 assert.match(html,/オリハル2個/);
 assert.match(html,/オリハルコン2個/);
 assert.match(html,/1,000,000G/);
 assert.match(html,/5,000,000G/);
 assert.doesNotMatch(html,/強化護符50個/);
 assert.match(render({total:6000,receipt:baseReceipt},{delivered:true}),/オリハル ×2/);
 assert.match(render({total:10000,receipt:baseReceipt},{delivered:true}),/オリハルコン ×2/);
});

test('main game integrates authenticated bonus receipts with save markers and cloud save',()=>{
 assert.match(api,/yakusoku_hunt_festival_claim_bonus/);
 assert.match(api,/p_milestone:goal,p_save_slot:slot/);
 assert.match(main,/if\(el\.hasAttribute\('data-hunt-bonus'\)\)/);
 assert.match(main,/festivalApi\.claimBonus\(goal,slot\)/);
 assert.match(main,/grantFestivalBonus\(target,receipt,slot\);saveNow\(\)/);
 assert.match(main,/target\.gold=priorGold/);
 assert.match(main,/huntBonusDelivered\.v1/);
 assert.match(main,/festivalView\.bonusDelivered=/);
});

test('bonuses reject overflow atomically, never adding partial gold or items',()=>{
 const state=createNewGame([]);
 state.gold=Number.MAX_SAFE_INTEGER-100;
 state.materials.orihal=5;
 assert.throws(()=>grantFestivalBonus(state,bonus5,1),/所持金の上限/);
 assert.equal(state.gold,Number.MAX_SAFE_INTEGER-100);
 assert.equal(state.materials.orihal,5);
 assert.equal(state.festivalReceipts?.[`${HUNT_FESTIVAL.id}:5000`],undefined);
});
