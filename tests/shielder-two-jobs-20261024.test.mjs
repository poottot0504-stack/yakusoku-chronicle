import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_JOBS, JOBS } from '../src/data/jobs.js';
import { canChangeJob } from '../src/core/jobs.js';
import { getSkillBook, getAllowedSkillSourceJobs, getCharacterSkillCatalog } from '../src/core/skillbook.js';
import { isShieldGuardJob,shieldProgressBonus,shieldStatusImmunity,
 applyShieldOpeningShouts,distributeShieldCover,shielderCoverTarget } from '../src/core/shielder-guard.js';
import { createBattle,startTurn,getPendingActor,resolveAction } from '../src/core/battle.js';
import { canEquipForJob,equipmentJobLabel } from '../src/core/equipment.js';
import { EQUIPMENT } from '../src/data/equipment.js';
import { RECIPES } from '../src/data/recipes.js';
import { SHIELDER_CAVE_SHIELDS,SHIELDER_CRAFTING_SHIELDS } from '../src/data/shielder-equipment.js';
import {getMashoFloorDropLabel,getMashoEquipmentDropPool} from '../src/core/masho-cave.js';
import {actorArt} from '../src/ui/battle-art.js';
import {readFileSync} from 'node:fs';

const unit=(id,name='仲間',job='swordsman',lv=1)=>({
 id,name,currentJob:job,jobLevels:{[job]:lv},level:150,
 hp:600,maxHp:600,mp:40,maxMp:40,stats:{attack:30,defense:50,magic:20,speed:20},
 buffs:[],statusAilments:[],equipment:{}
});
test('new jobs are defined as initial and advanced, with only Shielder Lv30 unlocking GreatShielder',()=>{
 assert.equal(ALL_JOBS.length,24);
 const newIds=ALL_JOBS.map(x=>x.id);
 assert.ok(newIds.includes('shielder')&&newIds.includes('greatShielder'));
 assert.equal(JOBS.shielder.unlock.type,'basic');
 assert.equal(JOBS.greatShielder.unlock.type,'advanced');
 const hero=unit('hero');
 assert.equal(canChangeJob({unlockedSpecialJobs:[]},hero,'shielder'),true);
 assert.equal(canChangeJob({},hero,'greatShielder'),false);
 hero.jobLevels.shielder=29;
 assert.equal(canChangeJob({},hero,'greatShielder'),false);
 hero.jobLevels.shielder=30;
 assert.equal(canChangeJob({},hero,'greatShielder'),true);
});
test('shield class skill milestone catalog is self-contained and avoids inherited skills',()=>{
 assert.deepEqual(getAllowedSkillSourceJobs('shielder'),['shielder']);
 assert.deepEqual(getAllowedSkillSourceJobs('greatShielder'),['greatShielder']);
 const skills=getSkillBook('shielder');
 for(const lv of [1,10,20,30,45,60,70,80,95,100,120,150,200,250,300])assert.ok(skills.some(s=>s.level===lv),String(lv));
 assert.ok(skills.every(s=>s.autoPassive&&s.mp===0));
 const character=unit('s','盾士','shielder',300);character.jobLevels.swordsman=400;
 const catalog=getCharacterSkillCatalog(character);
 assert.ok(catalog.length>=15);
 assert.ok(catalog.every(s=>s.sourceJob==='shielder'));
});
test('shield jobs can attack while their first-turn passive shout remains automatic',()=>{
 const shielder=unit('s','盾士','shielder',70),ally=unit('a');
 const enemy={...unit('enemy','魔物'),isBoss:false,ai:[{type:'attack',power:80}]};
 const b=createBattle([shielder,ally],enemy);
 startTurn(b);
 assert.equal(b.log.filter(x=>x.includes('攻撃の掛け声')).length,1);
 assert.ok(b.actorMap.a.buffs.some(effect=>effect.id==='shieldAttackShout'));
 assert.equal(b.actorMap.a.buffs[0].turns,3);
 const first=resolveAction(b,{type:'attack',targetId:'enemy'},()=>.5);
 assert.equal(first.ok,true);
 const second=resolveAction(b,{type:'defend'},()=>.5);
 assert.equal(second.ok,true);
 assert.equal(second.resolved,true);
 assert.equal(b.actorMap.s.guarding,false,'attacking should not be silently changed into guarding');
 assert.ok(b.actorMap.enemy.hp<600,'shield class attack should actually damage the enemy');
});
test('great shielder can also attack instead of being forced to defend',()=>{
 const guardian=unit('great','大盾士','greatShielder',70);
 const enemy={...unit('enemy','魔物'),isBoss:false,ai:[{type:'attack',power:60}]};
 const battle=createBattle([guardian],enemy);
 startTurn(battle);
 assert.ok(battle.actorMap.great.buffs.some(x=>x.id==='shieldDefenseShout'));
 const outcome=resolveAction(battle,{type:'attack',targetId:'enemy'},()=>.5);
 assert.equal(outcome.ok,true);
 assert.equal(battle.actorMap.great.guarding,false);
 assert.ok(battle.actorMap.enemy.hp<600);
});
test('protection is 50% normally and 100% from level 300, including AoE',()=>{
 const protector={...unit('s','守り手','shielder',1),side:'ally'};
 const target={...unit('t','右隣'),side:'ally'};
 assert.equal(shielderCoverTarget([protector,target],target).id,'s');
 let result=distributeShieldCover([protector,target],target,100);
 assert.equal(result.protectedDamage,50);
 assert.ok(result.guardDamage>0);
 assert.equal(distributeShieldCover([protector,target],target,100,{allTargets:true}).guard.id,'s');
 protector.jobLevels.shielder=300;
 result=distributeShieldCover([protector,target],target,100);
 assert.equal(result.protectedDamage,0);
 assert.equal(result.guard.id,'s');
});
test('leftmost adjacent guardian wins; dead left falls back to right great guardian',()=>{
 const left={...unit('left','左盾士','shielder',50),side:'ally'};
 const target={...unit('target','ヒーラー'),side:'ally'};
 const right={...unit('right','大盾士','greatShielder',300),side:'ally'};
 assert.equal(shielderCoverTarget([left,target,right],target).id,'left');
 left.hp=0;
 assert.equal(shielderCoverTarget([left,target,right],target).id,'right');
 assert.equal(distributeShieldCover([left,target,right],target,99).protectedDamage,0);
});
test('progression bonuses and rare status immunity apply at requested levels',()=>{
 const c=unit('s','盾士','shielder',10);
 assert.ok(Math.abs(shieldProgressBonus(c,'hp')-.03)<1e-9);
 c.jobLevels.shielder=60;
 assert.ok(Math.abs(shieldProgressBonus(c,'hp')-.15)<1e-9);
 c.jobLevels.shielder=150;
 assert.ok(Math.abs(shieldProgressBonus(c,'defense')-.15)<1e-9);
 c.jobLevels.shielder=250;
 assert.equal(shieldStatusImmunity(c,'curse'),true);
 assert.equal(shieldStatusImmunity(c,'confusion'),true);
 assert.equal(shieldStatusImmunity(c,'poison'),false);
});
test('shield jobs cannot wield attack weapons but can equip conventional armor and shields',()=>{
 for(const job of ['shielder','greatShielder']){
  const c=unit('owner','盾',job,400);
  const regular=Object.values(EQUIPMENT).filter(def=>['weapon','shield','head','body','arms','waist','legs','accessory'].includes(def.slot)&&!def.ownerCharacterId);
  assert.ok(regular.length>300);
  for(const def of regular){
   assert.equal(canEquipForJob(c,def,{}),def.slot!=='weapon'||def.weaponType==='shield'&&(!def.allowedJobs||def.allowedJobs.includes(job)),`${job} compatibility for ${def.id}`);
   if(def.slot!=='weapon'||def.weaponType==='shield')assert.match(equipmentJobLabel(def),/盾士|大盾士/,`equipment label ${def.id}`);
  }
 }
});
test('seven crafted shields and three special Masho drops are real equipment definitions',()=>{
 assert.equal(SHIELDER_CRAFTING_SHIELDS.length,7);
 assert.equal(SHIELDER_CAVE_SHIELDS.length,3);
 for(const def of SHIELDER_CRAFTING_SHIELDS){
  assert.equal(EQUIPMENT[def.id].slot,'shield');
  assert.ok(RECIPES[`craft-${def.id}`],def.id);
 }
 for(const def of SHIELDER_CAVE_SHIELDS){
  assert.equal(EQUIPMENT[def.id].slot,'shield');
  assert.ok(def.dropRate>0&&def.dropRate<=.01);
  assert.match(getMashoFloorDropLabel(def.mashoFloor),new RegExp(def.name));
 }
 assert.ok(getMashoEquipmentDropPool(16).some(x=>x.allowedJobs?.includes('shielder')));
});
test('original sprites remain available in battle, but job change menu has no portraits',()=>{
 const a=actorArt({side:'ally',currentJob:'shielder'});
 const b=actorArt({side:'ally',currentJob:'greatShielder'});
 assert.equal(a.index,0);
 assert.equal(b.index,1);
 assert.equal(a.cols,2);
 assert.equal(b.cols,2);
 assert.equal(a.src,'./assets/battle/shield-jobs.png?v=20261024-opaque');
 const atlas=readFileSync(new URL('../assets/battle/shield-jobs.png',import.meta.url));
 assert.equal(atlas.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(atlas.readUInt32BE(16),180,'two cells share a 180px atlas width');
 assert.equal(atlas.readUInt32BE(20),120,'sprites match the other 90x120 job art');
 assert.ok(atlas.includes(Buffer.from('tRNS')),'transparent background required');

 const menu=readFileSync(new URL('../src/ui/jobs.js',import.meta.url),'utf8');
 assert.doesNotMatch(menu,/job-shield-sprite/);
});
