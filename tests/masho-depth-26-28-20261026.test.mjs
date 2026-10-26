import test from 'node:test';
import assert from 'node:assert/strict';
import { MASHO_DEPTH_BOSSES,MASHO_DEPTH_REWARD_BY_FLOOR,MASHO_DEPTH_EQUIPMENT } from '../src/data/masho-depth-rewards.js';
import { MASHO_MAX_FLOOR,MASHO_FLOORS,createMashoEnemy,getMashoFloors,getMashoAbyssDropPool,settleMashoVictory } from '../src/core/masho-cave.js';
import { EQUIPMENT } from '../src/data/equipment.js';
import { canEquipForJob } from '../src/core/equipment.js';
import { migrateSave } from '../src/core/save-migration.js';
import { depthAccessoryEffects,applyDepthTurnRegen,applyDepthArmorShred } from '../src/core/masho-depth-effects.js';
import { getEffectiveCombatStat } from '../src/core/combat-stats.js';
import { actorArt } from '../src/ui/battle-art.js';
import { mashoCaveMarkup } from '../src/ui/masho-cave.js';
import { createMashoRun } from '../src/core/masho-chain.js';

const state=(highest=25)=>({cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:highest},characters:[],activePartyIds:[],gold:0,ui:{}});
const win=(s,floor,rng)=>settleMashoVictory(s,{mashoFloor:floor,actors:[{side:'enemy',mashoBoss:true,mashoFloor:floor,hp:0},{side:'ally',hp:1}]},rng,0);

test('three new floors follow existing 25F clears in sequence, preserving old saves',()=>{
 const s=state();
 assert.equal(MASHO_MAX_FLOOR,28);
 assert.equal(MASHO_FLOORS.length,28);
 assert.equal(getMashoFloors(s).filter(f=>f.available).at(-1).floor,26);
 const restored=migrateSave(s);
 assert.equal(restored.mashoCave.highestCleared,25);
 assert.match(mashoCaveMarkup(s),/28階層/);
 assert.match(mashoCaveMarkup(s),/翠晶樹皇ユグドラヴェイン/);
 assert.match(mashoCaveMarkup(s),/氷晶神竜グラシエル/);
 assert.equal(createMashoRun(28).floor,28);
 assert.throws(()=>createMashoRun(29),/階層/);
});

test('three guardians have exact ratios against 25F HP and attack, with unique art',()=>{
 const s=state(28),f25=createMashoEnemy(s,25,()=>0);
 for(const [floor,hp,attack] of [[26,10,1.5],[27,12,1.6],[28,14,1.7]]){
  const boss=createMashoEnemy(s,floor,()=>0);
  assert.equal(boss.maxHp,Math.round(f25.maxHp*hp),floor+' HP');
  assert.ok(Math.abs(boss.stats.attack-f25.stats.attack*attack)<=2,floor+' attack');
  assert.ok(Math.abs(boss.stats.magic-f25.stats.magic*attack)<=2,floor+' magic');
  assert.equal(boss.name,MASHO_DEPTH_BOSSES[floor].name+'【魔障】');
  assert.equal(boss.artId,MASHO_DEPTH_BOSSES[floor].id);
  const art=actorArt({...boss,side:'enemy'});
  assert.ok(art.src.startsWith('data:image/svg+xml;'),floor+' original sprite data');
  assert.equal(art.aspect,56/52,'consistent art aspect for all 3 bosses');
 }
});

test('selected reward names and slot rules are registered for only those floors',()=>{
 const names=['悠久樹の祝福','獄炎の蝕戒','終極のクラウソラス'];
 for(const [index,name] of names.entries()){
  const floor=index+26,loot=getMashoAbyssDropPool(floor);
  assert.equal(loot.length,1);
  assert.equal(loot[0].name,name);
  assert.equal(loot[0],EQUIPMENT[MASHO_DEPTH_REWARD_BY_FLOOR[floor]]);
  const s=state(floor),r=win(s,floor,()=>0);
  assert.equal(r.equipment?.equipmentId,loot[0].id);
  assert.equal(win(state(floor),floor,()=>1).equipment,null);
 }
 const hero={id:'hero',name:'好きな名前',isHero:true,currentJob:'shielder',jobLevels:{shielder:400}};
 const mimic={...hero,id:'mira',isHero:false,name:'アレン'};
 assert.equal(canEquipForJob(hero,MASHO_DEPTH_EQUIPMENT['masho-28-final-claussolas'],{}),true);
 assert.equal(canEquipForJob(mimic,MASHO_DEPTH_EQUIPMENT['masho-28-final-claussolas'],{}),false);
});

test('eternal tree restores one percent of both max resources per turn',()=>{
 const s={equipmentInventory:[{instanceId:'charm',equipmentId:'masho-26-eternal-tree-blessing'}]};
 const c={equipment:{accessory2:'charm'}},effect=depthAccessoryEffects(s,c);
 const actor={side:'ally',maxHp:10000,maxMp:2000,hp:5000,mp:600,...effect};
 assert.equal(effect.mashoTurnRegenRatio,.01);
 assert.deepEqual(applyDepthTurnRegen(actor),{hp:100,mp:20});
 assert.equal(actor.hp,5100);
 assert.equal(actor.mp,620);
});

test('infernal ring guarantees max ten hits of 0.1 percent armor erosion',()=>{
 const s={equipmentInventory:[{instanceId:'ring',equipmentId:'masho-27-infernal-eclipse-ring'}]};
 const attacker={side:'ally',...depthAccessoryEffects(s,{equipment:{accessory1:'ring'}})};
 const target={side:'enemy',hp:1000,stats:{defense:1000},mashoArmorShredStacks:0};
 for(let i=0;i<30;i++)assert.equal(applyDepthArmorShred(attacker,target,5),true);
 assert.equal(target.mashoArmorShredStacks,10);
 assert.ok(Math.abs(getEffectiveCombatStat(target,'defense')-990)<1e-9);
 assert.equal(applyDepthArmorShred({...attacker,side:'enemy'},target,5),false);
});
