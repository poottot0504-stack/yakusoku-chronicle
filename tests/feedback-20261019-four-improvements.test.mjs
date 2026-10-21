import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState} from '../src/core/adventure.js';
import {getCharacterResourceCaps} from '../src/core/combat-stats.js';
import {unequipAllEquipment,toggleEquipmentLock} from '../src/core/equipment.js';
import {getSellableQuantity,sell,sellEquipmentInstance} from '../src/core/selling.js';
import {isMarketSellable,listMarketCandidates} from '../src/market/market-model.js';
import {migrateSave} from '../src/core/save-migration.js';
import {equipmentMarkup} from '../src/ui/equipment.js';
import {mashoCaveMarkup} from '../src/ui/masho-cave.js';
import {settleMashoVictory} from '../src/core/masho-cave.js';
import {createMashoRun,recordMashoRunVictory,mashoRunCanContinue,mashoRunSummary} from '../src/core/masho-chain.js';

function equippedState(){
 const state=ensureAdventureState(createNewGame(createDefaultRoster()));
 state.equipmentInventory=[
  {instanceId:'gold-1',equipmentId:'ironSword',enhanceLevel:1},
  {instanceId:'gold-2',equipmentId:'ironSword',enhanceLevel:10,locked:true},
  {instanceId:'gold-3',equipmentId:'ironSword',enhanceLevel:0},
  {instanceId:'helm-1',equipmentId:'leatherHead',enhanceLevel:0}
 ];
 state.characters[0].equipment={...state.characters[0].equipment,weapon:'gold-1',head:'helm-1'};
 state.characters[0].hp=999999;state.characters[0].mp=999999;
 return state;
}

test('dock has both current HP and blue MP meters with bounded values',()=>{
 const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 assert.match(js,/class="dock-hp"/);
 assert.match(js,/class="dock-mp"/);
 assert.match(js,/c\.mp\?\?0/);
 assert.match(js,/caps\.maxMP/);
 assert.match(css,/\.party-dock \.dock-member>\.dock-mp b\{background:linear-gradient/);
});

test('unequip all preserves inventory, other characters, and clamps current resources',()=>{
 const state=equippedState();
 const hero=state.characters[0];
 const other=state.characters[1];
 const otherBefore=structuredClone(other);
 const inventoryBefore=structuredClone(state.equipmentInventory);
 const result=unequipAllEquipment(state,hero.id);
 assert.equal(result.removed,2);
 assert.equal(hero.equipment.weapon,null);
 assert.equal(hero.equipment.head,null);
 assert.deepEqual(other,otherBefore);
 assert.deepEqual(state.equipmentInventory,inventoryBefore);
 const caps=getCharacterResourceCaps(state,hero);
 assert.ok(hero.hp<=caps.maxHP&&hero.hp>=0);
 assert.ok(hero.mp<=caps.maxMP&&hero.mp>=0);
 assert.equal(unequipAllEquipment(state,hero.id).removed,0);
 assert.throws(()=>unequipAllEquipment(state,'unknown'),/見つかりません/);
});

test('locks protect exact equipment copies from quick-sale and bulk-sale, and survive save migration',()=>{
 const state=equippedState();
 assert.equal(getSellableQuantity(state,'equipment','ironSword'),1);
 assert.throws(()=>sellEquipmentInstance(state,'gold-1'),/装備中/);
 assert.throws(()=>sellEquipmentInstance(state,'gold-2'),/ロック中/);
 assert.equal(isMarketSellable(state,{kind:'equipment',instanceId:'gold-2',quantity:1}).ok,false);
 assert.ok(!listMarketCandidates(state).some(x=>x.instanceId==='gold-2'));
 const gold=state.gold;
 assert.equal(sellEquipmentInstance(state,'gold-3').instanceId,'gold-3');
 assert.ok(state.gold>gold);
 assert.ok(state.equipmentInventory.some(x=>x.instanceId==='gold-2'));
 assert.throws(()=>sell(state,{kind:'equipment',id:'ironSword',quantity:1}),/所持数/);
 assert.equal(migrateSave(state).equipmentInventory.find(x=>x.instanceId==='gold-2').locked,true);
 assert.equal(toggleEquipmentLock(state,'gold-2').locked,false);
 assert.equal(getSellableQuantity(state,'equipment','ironSword'),1);
 assert.equal(toggleEquipmentLock(state,'gold-2').locked,true);
 assert.throws(()=>toggleEquipmentLock(state,'fake'),/見つかりません/);
});

test('bulk sale skips locked copies and sells only free unlocked pieces',()=>{
 const s=equippedState();
 s.characters[0].equipment.weapon=null;
 assert.equal(getSellableQuantity(s,'equipment','ironSword'),2);
 sell(s,{kind:'equipment',id:'ironSword',quantity:2});
 assert.deepEqual(s.equipmentInventory.filter(x=>x.equipmentId==='ironSword').map(x=>x.instanceId),['gold-2']);
 assert.equal(getSellableQuantity(s,'equipment','ironSword'),0);
});

test('equipment details include per-instance locked/available sale states and guarded all-remove button',()=>{
 const s=equippedState();
 const html=equipmentMarkup(s,s.characters[0].id);
 assert.match(html,/data-unequip-all/);
 assert.match(html,/data-equip-lock="gold-2"/);
 assert.match(html,/data-equip-sell-ask="gold-2" disabled/);
 assert.match(html,/data-equip-sell-ask="gold-1" disabled/);
 assert.match(html,/data-equip-sell-ask="gold-3"/);
 assert.match(html,/data-equipment-details-key=/);
 assert.match(html,/詳細・売却・ロック/);
 assert.match(html,/🔓 ロック解除/);
});

test('ten Masho battles settle one at a time, keep rare drop rate, and grant fifth-clear materials',()=>{
 const state={cycle:2,characters:[],activePartyIds:[],gold:0,materials:{},equipmentInventory:[],mashoCave:{highestCleared:25}};
 const run=createMashoRun(21);
 for(let i=0;i<10;i++){
  const b={mashoFloor:21,actors:[{side:'enemy',mashoBoss:true,mashoFloor:21,hp:0},{side:'ally',hp:100}]};
  const oldGold=state.gold;
  const receipt=settleMashoVictory(state,b,()=>1,0);
  assert.equal(settleMashoVictory(state,b,()=>0,0),receipt,'repeat settlement must never pay twice');
  recordMashoRunVictory(run,receipt,state.gold-oldGold);
  assert.equal(run.completed,i+1);
  assert.equal(mashoRunCanContinue(run),i<9);
 }
 const summary=mashoRunSummary(run);
 assert.equal(summary.completed,10);
 assert.equal(summary.materials.ultimateEnhanceCrystal,2);
 assert.equal(state.materials.ultimateEnhanceCrystal,2);
 assert.equal(state.mashoCave.clearCounts[21],10);
 assert.equal(state.mashoCave.abyssClearCount,10);
 assert.equal(summary.equipment.length,0);
 assert.equal(summary.earnedGold,state.gold);
 assert.throws(()=>recordMashoRunVictory(run,{floor:21}),/確認できません/);
});

test('stopping ten-run prevents next fight, and wrong floors cannot steal reward',()=>{
 const run=createMashoRun(4);
 assert.equal(mashoRunCanContinue(run),false);
 assert.throws(()=>recordMashoRunVictory(run,{floor:5}),/確認できません/);
 recordMashoRunVictory(run,{floor:4,exp:5,jobExp:7,promiseOre:1,equipment:{equipmentId:'ironSword'}},500);
 assert.equal(mashoRunCanContinue(run),true);
 run.stopAfterCurrent=true;
 assert.equal(mashoRunCanContinue(run),false);
 const summary=mashoRunSummary(run,'stopped');
 assert.equal(summary.earnedGold,500);
 assert.deepEqual(summary.equipment,['ironSword']);
 assert.equal(summary.completed,1);
 assert.throws(()=>createMashoRun(26),/階層/);
 assert.throws(()=>createMashoRun(1,100),/10連戦/);
});

test('cleared cave floors get ten-run controls, current progress summary is visible',()=>{
 const s={cycle:2,characters:[],activePartyIds:[],ui:{mashoResultVisible:true},mashoCave:{highestCleared:3,lastRunSummary:{floor:2,total:10,completed:4,status:'stopped',earnedGold:100,exp:200,jobExp:300,promiseOre:0,materials:{},equipment:[]}}};
 const html=mashoCaveMarkup(s);
 assert.match(html,/data-masho-run10="1"/);
 assert.match(html,/data-masho-run10="3"/);
 assert.doesNotMatch(html,/data-masho-run10="4"/);
 assert.match(html,/10連戦 4\/10戦/);
 assert.match(html,/獲得済み報酬は保存されています/);
});

test('game wiring enforces real sequential battle, one-click initiation, defeat and safe stop',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const battle=readFileSync(new URL('../src/ui/battle.js',import.meta.url),'utf8');
 assert.match(main,/recordMashoRunVictory\(mashoRun,receipt/);
 assert.match(main,/saveNow\(\);battle=null;/);
 assert.match(main,/if\(mashoRunCanContinue\(mashoRun\)\)/);
 assert.match(main,/mashoRunSummary\(mashoRun,'defeat'\)/);
 assert.match(main,/if\(el\.dataset\.mashoRun10\|\|el\.dataset\.mashoRunConfirm\)/);
 assert.match(main,/if\(el\.hasAttribute\('data-masho-run-stop'\)\)/);
 assert.match(battle,/data-masho-run-stop/);
 assert.match(main,/sellEquipmentInstance\(state,el\.dataset\.equipSellConfirm\)/);
 assert.match(main,/unequipAllEquipment\(state,selectedId\(\)\)/);
});
