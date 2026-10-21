import test from 'node:test';
import assert from 'node:assert/strict';
import {EQUIPMENT,createEquipmentInstance} from '../src/data/equipment.js';
import {canEquip,equipRecommendedEquipment} from '../src/core/equipment.js';
import {getMashoEquipmentDropPool,getMashoFloorDropLabel,MASHO_DROP_RATE,MASHO_ABYSS_DROP_RATE,settleMashoVictory} from '../src/core/masho-cave.js';
import {MASHO_EQUIPMENT} from '../src/data/masho-equipment.js';
import {mashoCaveMarkup} from '../src/ui/masho-cave.js';
import {readFileSync} from 'node:fs';

function roster(job,inventory){
 const c={id:'hero',currentJob:job,jobLevels:{[job]:200},level:200,hp:1000,mp:500,stats:{attack:1,defense:1,magic:1,speed:1},equipment:{weapon:null,shield:null}};
 return {characters:[c],equipmentInventory:inventory,activePartyIds:['hero']};
}
test('recommended gear equips a compatible shield even when no weapon candidates exist',()=>{
 const inv=[{instanceId:'shield1',equipmentId:'masho-3-swordsman-shield',enhanceLevel:0}];
 const s=roster('swordsman',inv);
 const before=structuredClone(inv);
 const r=equipRecommendedEquipment(s,'hero');
 assert.equal(s.characters[0].equipment.shield,'shield1');
 assert.equal(s.characters[0].equipment.weapon,null);
 assert.ok(r.changedSlots.includes('shield'));
 assert.deepEqual(s.equipmentInventory,before);
});
test('Masho offhand shields work for no-shield jobs and alongside two-handed weapons',()=>{
 const inv=[
  {instanceId:'greatSword',equipmentId:'greatSword',enhanceLevel:0},
  {instanceId:'mashoShield',equipmentId:'masho-3-berserker-shield',enhanceLevel:0}
 ];
 const s=roster('berserker',inv);
 const r=equipRecommendedEquipment(s,'hero');
 assert.equal(s.characters[0].equipment.weapon,'greatSword');
 assert.equal(s.characters[0].equipment.shield,'mashoShield');
 assert.ok(r.changedSlots.includes('shield'));
 assert.equal(canEquip(s.characters[0],EQUIPMENT['masho-3-berserker-shield'],s,inv[1]),true);
});
test('ordinary shields still obey class, size and staff-only rules',()=>{
 const s=roster('berserker',[
  {instanceId:'w',equipmentId:'greatSword',enhanceLevel:0},
  {instanceId:'shield',equipmentId:'golem-shield',enhanceLevel:0}
 ]);
 equipRecommendedEquipment(s,'hero');
 assert.equal(s.characters[0].equipment.shield,null);
 const mage=roster('mage',[
  {instanceId:'w',equipmentId:'noviceStaff',enhanceLevel:0},
  {instanceId:'shield',equipmentId:'golem-shield',enhanceLevel:0}
 ]);
 equipRecommendedEquipment(mage,'hero');
 assert.equal(mage.characters[0].equipment.shield,null);
});
test('the Cave shows repeat controls before results before END CONTENTS on mobile',()=>{
 const s={cycle:2,story:{firstEndingSeen:true},ui:{mashoResultVisible:true},mashoCave:{highestCleared:25,lastRunSummary:{
  floor:15,total:10,completed:10,status:'completed',earnedGold:100000,exp:200000,jobExp:300000,materials:{},equipment:[]}}};
 const html=mashoCaveMarkup(s);
 const quick=html.indexOf('class="panel masho-quick-actions"');
 const result=html.indexOf('class="panel masho-run-summary"');
 const heading=html.indexOf('class="panel masho-hero"');
 assert.ok(quick>0&&quick<result&&result<heading);
 assert.match(html,/data-masho-run10="15"/);
 const single={...s,mashoCave:{highestCleared:25,lastReward:{floor:15,exp:10,gold:20,jobExp:30}}};
 const singleHtml=mashoCaveMarkup(single);
 assert.ok(singleHtml.indexOf('class="panel masho-result"')<singleHtml.indexOf('class="panel masho-hero"'));
});
test('focused tier-3 drops are job-group and part specific; floors 19/20 retain full drop pools',()=>{
 const allTier3=Object.values(MASHO_EQUIPMENT).filter(d=>d.mashoTier===3);
 assert.equal(allTier3.length,22*9);
 const pools=[15,16,17,18,19,20].map(getMashoEquipmentDropPool);
 for(const pool of pools)assert.ok(pool.length>0);
 assert.equal(pools[0].every(x=>['weapon','shield','ring','charm'].some(t=>x.id.endsWith('-'+t))),true);
 assert.equal(pools[1].every(x=>['head','body','arms','waist','legs'].some(t=>x.id.endsWith('-'+t))),true);
 assert.equal(pools[2].every(x=>['weapon','shield','ring','charm'].some(t=>x.id.endsWith('-'+t))),true);
 assert.equal(pools[3].every(x=>['head','body','arms','waist','legs'].some(t=>x.id.endsWith('-'+t))),true);
 assert.ok(pools[0].some(x=>x.allowedJobs.includes('mage')));
 assert.ok(pools[2].some(x=>x.allowedJobs.includes('fighter')));
 assert.ok(!pools[0].some(x=>x.allowedJobs.includes('fighter')));
 assert.ok(!pools[2].some(x=>x.allowedJobs.includes('mage')));
 assert.equal(pools[4].length,allTier3.length);
 assert.equal(pools[5].length,allTier3.length);
 assert.equal(new Set([...pools[0],...pools[1],...pools[2],...pools[3]].map(x=>x.id)).size,allTier3.length);
 assert.equal(getMashoEquipmentDropPool(7).every(x=>x.mashoTier===1),true);
 assert.equal(getMashoEquipmentDropPool(21).length,0);
 assert.match(getMashoFloorDropLabel(15),/魔法系/);
 assert.match(getMashoFloorDropLabel(16),/物理系/);
 const cave=mashoCaveMarkup({cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:25}});
 assert.match(cave,/狙える装備：魔法系の武器/);
 assert.match(cave,/狙える装備：物理系の防具/);
});
test('drop probability and the five abyss weapons are untouched',()=>{
 assert.equal(MASHO_DROP_RATE,.05);
 assert.equal(MASHO_ABYSS_DROP_RATE,.002);
 const run=(floor,rand)=>settleMashoVictory({cycle:2,story:{firstEndingSeen:true},characters:[],activePartyIds:[],mashoCave:{highestCleared:25},gold:0}, {
   mashoFloor:floor,actors:[{side:'enemy',mashoBoss:true,mashoFloor:floor,hp:0},{side:'ally',hp:1}]
 },rand,0);
 for(const floor of [15,16,17,18]){
  const pool=getMashoEquipmentDropPool(floor);
  const pick=run(floor,(()=>{let n=0;return()=>n++===0?0:0.5;})()).equipment;
  assert.ok(pool.some(x=>x.id===pick.equipmentId));
 }
 const abyss=run(21,(()=>{let n=0;return()=>n++===0?0:0.99;})()).equipment;
 assert.match(abyss.equipmentId,/^masho-abyss-/);
});
test('cache bust and game controls continue to work',()=>{
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(index,/masho-drop-shield-summary-20261021/);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/data-masho-run10/);
 assert.match(main,/data-masho-dismiss-result/);
});
