import test from 'node:test';
import assert from 'node:assert/strict';
import {MASHO_ABYSS_WEAPONS} from '../src/data/masho-abyss-weapons.js';
import {EQUIPMENT,createEquipmentInstance} from '../src/data/equipment.js';
import {JOBS} from '../src/data/jobs.js';
import {canEquip,canEquipForJob,equipmentJobLabel} from '../src/core/equipment.js';
import {MASHO_ABYSS_DROP_RATE,settleMashoVictory} from '../src/core/masho-cave.js';

const elgancio=EQUIPMENT['masho-abyss-instrument'];
const character=(job,level=150)=>({id:'hero',currentJob:job,jobLevels:{[job]:level}});
test('abyss weapon catalog has five unchanged item identifiers and no adjustment to the original drop rate',()=>{
 assert.deepEqual(Object.keys(MASHO_ABYSS_WEAPONS),['masho-abyss-sword','masho-abyss-staff','masho-abyss-dagger','masho-abyss-bow','masho-abyss-instrument']);
 assert.equal(MASHO_ABYSS_DROP_RATE,.002);
 assert.equal(elgancio.name,'斬罪のエルガンシオ');
 assert.equal(elgancio.weaponType,'fist');
 assert.deepEqual(elgancio.alternateWeaponTypes,['instrument']);
});
test('Elgancio can be equipped by fighter and berserker, respecting Job Lv150',()=>{
 for(const job of ['fighter','berserker']){
  assert.ok(JOBS[job].weaponTypes.includes('fist'));
  assert.equal(canEquipForJob(character(job),elgancio,{}),true);
  assert.equal(canEquip(character(job,149),elgancio,{}),false);
  assert.equal(canEquip(character(job,150),elgancio,{}),true);
 }
 assert.match(equipmentJobLabel(elgancio),/格闘家/);
 assert.match(equipmentJobLabel(elgancio),/ベルセルク/);
});
test('legacy Bard-owned and enhanced instance IDs remain usable without changing save data',()=>{
 assert.equal(canEquip(character('bard',150),elgancio,{}),true);
 assert.equal(canEquip(character('bard',149),elgancio,{}),false);
 assert.match(equipmentJobLabel(elgancio),/吟遊詩人/);
 const previousSaveCopy={instanceId:'legacy-keep-001',equipmentId:'masho-abyss-instrument',enhanceLevel:10};
 assert.equal(canEquip(character('bard',150),EQUIPMENT[previousSaveCopy.equipmentId],{},previousSaveCopy),true);
 assert.equal(canEquip(character('fighter',150),EQUIPMENT[previousSaveCopy.equipmentId],{},previousSaveCopy),true);
 const newCopy=createEquipmentInstance('masho-abyss-instrument');
 assert.equal(newCopy.equipmentId,previousSaveCopy.equipmentId);
});
test('fighter and berserker gain one of the five weapons; no unrelated job compatibility changes',()=>{
 const pool=Object.values(MASHO_ABYSS_WEAPONS);
 for(const job of ['fighter','berserker']){
  assert.equal(pool.filter(item=>canEquip(character(job,150),item,{})).length,1);
 }
 const intended={
  sword:['swordsman','redMage','darkKnight','bard'],
  staff:['mage','healer','blackMage','bard'],
  dagger:['thief','redMage','bard','trickster'],
  bow:['archer','sniper','bard','trickster']
 };
 for(const [key,jobs] of Object.entries(intended)){
  const def=EQUIPMENT['masho-abyss-'+key];
  assert.equal(def.alternateWeaponTypes,undefined);
  for(const job of jobs)assert.equal(canEquip(character(job,150),def,{}),true);
 }
 assert.equal(canEquip(character('swordsman',150),elgancio,{}),false);
 assert.equal(canEquip(character('mage',150),elgancio,{}),false);
 assert.equal(canEquip(character('fighter',150),{slot:'weapon',weaponType:'instrument',requiredLevel:1},{}),false);
});
test('abyss loot is floor-specific without losing the original Elgancio item id',()=>{
 const state={cycle:2,characters:[],activePartyIds:[],mashoCave:{highestCleared:25},gold:0};
 const result=settleMashoVictory(state,{mashoFloor:23,actors:[{side:'enemy',mashoBoss:true,mashoFloor:23,hp:0},{side:'ally',hp:1}]},(()=>{let n=0;return()=>n++===0?0:0.99999;})(),Date.UTC(2026,9,20));
 assert.equal(result.equipment.equipmentId,'masho-abyss-bow');
 assert.equal(state.equipmentInventory[0].equipmentId,'masho-abyss-bow');
});
