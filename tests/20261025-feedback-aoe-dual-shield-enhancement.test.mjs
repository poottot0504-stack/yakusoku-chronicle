import test from 'node:test';
import assert from 'node:assert/strict';
import {EQUIPMENT,createEquipmentInstance} from '../src/data/equipment.js';
import {canEquipForJob,equipItem,canEquip,equipRecommendedEquipment,normalizeEquipmentOwnership} from '../src/core/equipment.js';
import {migrateSave} from '../src/core/save-migration.js';
import {distributeShieldCover,applyShieldCoverDamage} from '../src/core/shielder-guard.js';
import {applyRaidBossAction} from '../src/raid/raidPartyTurn.js';
import {equipmentMarkup} from '../src/ui/equipment.js';
import {sortForgeEnhanceInstances} from '../src/ui/forge.js';

const hero=(id,job='shielder')=>({
 id,name:id,currentJob:job,level:200,jobLevels:{[job]:300},
 hp:1800,maxHp:1800,mp:50,maxMp:50,
 stats:{attack:40,defense:140,magic:10,speed:10},
 equipment:{weapon:null,shield:null},statusAilments:[]
});
const shieldIds=['shielder-bronze-guard','shielder-iron-wall','shielder-knight-guard'];
const setup=(job='shielder')=>{
 const c=hero('tank',job);
 const inventory=shieldIds.map((id,n)=>({...createEquipmentInstance(id,'shield-'+n),enhanceLevel:n}));
 inventory.push({...createEquipmentInstance('ironSword','old-sword'),enhanceLevel:0});
 return {characters:[c],activePartyIds:['tank'],equipmentInventory:inventory,materials:{},inventory:[],ui:{equipmentCategory:'all'},gold:10000};
};

for(const job of ['shielder','greatShielder']){
 test(job+' can hold two different shields and cannot equip a normal attack weapon',()=>{
  const s=setup(job),c=s.characters[0];
  assert.equal(canEquipForJob(c,EQUIPMENT.ironSword,s),false);
  assert.equal(canEquip(c,EQUIPMENT.ironSword,s),false);
  assert.throws(()=>equipItem(s,'tank','old-sword','weapon'),/装備できません/);
  const a=equipItem(s,'tank','shield-0','weapon');
  assert.equal(a.equipment.weapon,'shield-0');
  assert.equal(a.equipment.shield,null);
  equipItem(s,'tank','shield-1','shield');
  assert.deepEqual([c.equipment.weapon,c.equipment.shield],['shield-0','shield-1']);
  assert.equal(EQUIPMENT[s.equipmentInventory[0].equipmentId].slot,'shield');
  assert.equal(new Set(Object.values(c.equipment).filter(Boolean)).size,2);
  assert.ok(normalizeEquipmentOwnership(s).characters[0].equipment.weapon==='shield-0');
  const restored=migrateSave(s);
  assert.deepEqual([restored.characters[0].equipment.weapon,restored.characters[0].equipment.shield],['shield-0','shield-1']);
  const html=equipmentMarkup(s,'tank');
  assert.match(html,/武器欄に盾を装備/);
 });
 test(job+' auto equips two best distinct shields, never a regular weapon',()=>{
  const s=setup(job);
  const r=equipRecommendedEquipment(s,'tank');
  assert.ok(r.character.equipment.weapon);
  assert.ok(r.character.equipment.shield);
  assert.notEqual(r.character.equipment.weapon,r.character.equipment.shield);
  for(const slot of ['weapon','shield']){
   const inst=s.equipmentInventory.find(x=>x.instanceId===r.character.equipment[slot]);
   assert.equal(EQUIPMENT[inst.equipmentId].slot,'shield');
  }
  assert.ok(![r.character.equipment.weapon,r.character.equipment.shield].includes('old-sword'));
 });
}

test('existing job-specific Masho and highforge weapons are reclassified as shields and remain equippable',()=>{
 for(const job of ['shielder','greatShielder']){
  const c=hero(job,job);
  for(const id of [`masho-3-${job}-weapon`,`highforge-union-${job}-weapon`]){
   const gear=EQUIPMENT[id];assert.ok(gear,id);
   assert.equal(gear.weaponType,'shield');
   assert.equal(gear.attack??0,0);
   assert.ok(gear.defense>0);
   assert.equal(canEquipForJob(c,gear,{}),true);
  }
 }
});

test('shield can move between weapon and shield slot without duplication',()=>{
 const s=setup();equipItem(s,'tank','shield-0','shield');
 equipItem(s,'tank','shield-0','weapon');
 assert.equal(s.characters[0].equipment.weapon,'shield-0');
 assert.equal(s.characters[0].equipment.shield,null);
});

test('AoE redirects half of damage to adjacent guardian and full damage at Lv300',()=>{
 const tank={...hero('tank'),side:'ally'},ally={...hero('ally','healer'),side:'ally'};
 tank.jobLevels.shielder=100;
 const half=distributeShieldCover([tank,ally],ally,100,{allTargets:true});
 assert.equal(half.protectedDamage,50);assert.ok(half.guardDamage>0);
 tank.jobLevels.shielder=300;
 const result=applyShieldCoverDamage({actors:[tank,ally],log:[]},ally,100,{allTargets:true});
 assert.equal(result.protectedDamage,0);
 assert.equal(ally.hp,1800);
 assert.ok(tank.hp<1800);
});

test('Raid AoE also covers nearby ally, with no redirected HP gained or duplicate damage',()=>{
 const tank=hero('tank','shielder'),ally=hero('ally','healer');
 const before=ally.hp;
 const result=applyRaidBossAction({kind:'aoe',name:'全体衝撃'},[tank,ally],[],{attack:120,magicAttack:120},'dummy',()=>.5,'試練の魔物');
 assert.ok(result.logs.some(x=>x.includes('肩代わり')));
 assert.equal(ally.hp,before,'Lv300 completely covers the ally on AoE');
 assert.ok(tank.hp<1800);
});

test('all equipped enhancement stages remain first after +1 and later upgrades',()=>{
 const inventory=[
  {instanceId:'spare',enhanceLevel:0},
  {instanceId:'worn1',enhanceLevel:1},
  {instanceId:'worn7',enhanceLevel:7},
  {instanceId:'spare2',enhanceLevel:15},
  {instanceId:'worn15',enhanceLevel:15}
 ];
 const map=new Map([['worn1',[{}]],['worn7',[{}]],['worn15',[{}]]]);
 assert.deepEqual(sortForgeEnhanceInstances(inventory,map).map(i=>i.instanceId),
  ['worn1','worn7','worn15','spare','spare2']);
});
