import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ALL_JOBS,JOBS,getJobPassive,applyJobPassiveToStat} from '../src/data/jobs.js';
import {canChangeJob,changeJob} from '../src/core/jobs.js';
import {EQUIPMENT} from '../src/data/equipment.js';
import {canEquipForJob,canEquip,equipmentJobLabel} from '../src/core/equipment.js';
import {RECIPES} from '../src/data/recipes.js';
import {syncRecipeUnlocks,canCraft,craftItem,getAvailableRecipes} from '../src/core/crafting.js';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {getSkillBook,getCharacterSkillCatalog,getBattleSkills,getSkillInheritanceFamily} from '../src/core/skillbook.js';
import {actorArt,battleStageMarkup} from '../src/ui/battle-art.js';
import {jobsMarkup} from '../src/ui/jobs.js';
import {forgeMarkup} from '../src/ui/forge.js';
import {migrateSave} from '../src/core/save-migration.js';

const state=()=>createNewGame(createDefaultRoster());
const ready=(jobId)=>{
 const s=state(),c=s.characters[0],pre=jobId==='dragoon'?'paladin':'blackMage';
 c.jobLevels[pre]=30;
 return {s,c,pre};
};
const paths=['weapon','head','body','arms','waist','legs','ring','charm'];
const levels=['novice','veteran','astral','celestial','eternal'];
const materials=['union','nova','star','blaze','thunder','promise'];

test('22 jobs include two special jobs with exactly the requested per-character Lv30 unlocks',()=>{
 assert.equal(ALL_JOBS.length,22);
 for(const [jobId,precursor] of [['dragoon','paladin'],['summoner','blackMage']]){
  const job=JOBS[jobId];
  assert.equal(job.unlock.type,'special');
  assert.deepEqual(job.unlock.requires,{[precursor]:30});
  const s=state(),c=s.characters[0],other=s.characters[1];
  assert.equal(canChangeJob(s,c,jobId),false);
  other.jobLevels[precursor]=30;
  assert.equal(canChangeJob(s,c,jobId),false,'another character cannot unlock the job for this character');
  c.jobLevels[precursor]=29;
  assert.equal(canChangeJob(s,c,jobId),false);
  c.jobLevels[precursor]=30;
  assert.equal(canChangeJob(s,c,jobId),true);
  const changed=changeJob(s,c.id,jobId);
  assert.equal(changed.currentJob,jobId);
  assert.equal(changed.jobLevels[jobId],1);
  assert.equal(canChangeJob(s,other,jobId),true);
  other.jobLevels[precursor]=29;
  assert.equal(canChangeJob(s,other,jobId),false);
  assert.equal(canChangeJob(s,c,'bishop'),false,'existing special trials remain gated');
  const saved=migrateSave(s);
  assert.equal(saved.characters[0].currentJob,jobId);
  assert.equal(saved.characters[0].jobLevels[jobId],1);
 }
});

test('both jobs have balanced passives and native battle stat amplification',()=>{
 for(const [job,stat,rate] of [['dragoon','attack',.035],['summoner','magic',.04]]){
  assert.deepEqual([getJobPassive(job).stat,getJobPassive(job).rate],[stat,rate]);
  const actor={currentJob:job};
  assert.equal(applyJobPassiveToStat(actor,stat,1000),Math.round(1000*(1+rate)));
  assert.equal(applyJobPassiveToStat(actor,stat==='attack'?'magic':'attack',1000),1000);
 }
});

test('each new job has unique active skills 1-300 with elemental effects, defense and auto-combat support',()=>{
 for(const jobId of ['dragoon','summoner']){
  const {s,c}=ready(jobId);
  changeJob(s,c.id,jobId);
  const book=getSkillBook(jobId);
  assert.ok(book.length>=14);
  assert.ok(book.some(x=>x.level===1));
  assert.ok(book.some(x=>x.level===100));
  assert.ok(book.some(x=>x.level===120));
  assert.ok(book.some(x=>x.level===300));
  assert.equal(new Set(book.map(x=>x.id)).size,book.length);
  assert.ok(book.every(x=>x.description&&Number.isFinite(x.mp)));
  assert.ok(book.some(x=>x.allTargets));
  assert.equal(getBattleSkills(c).length>0,true);
  assert.ok(getCharacterSkillCatalog(c).some(x=>x.sourceJob===jobId));
  assert.equal(getSkillInheritanceFamily(jobId),jobId==='dragoon'?'swordsman':'mage');
 }
 const summons=getSkillBook('summoner');
 assert.ok(summons.some(x=>x.name.includes('イフリート')&&x.element==='fire'));
 assert.ok(summons.some(x=>x.name.includes('ラムウ')&&x.element==='thunder'));
 assert.ok(summons.some(x=>x.name.includes('フェニックス')&&x.type==='heal'&&x.target==='all'));
 assert.ok(summons.some(x=>x.name.includes('バハムート')));
 assert.ok(getSkillBook('dragoon').some(x=>x.multiHit>1));
});

test('every equipment slot gets job-specific five-tier equipment and the matching forge recipe',()=>{
 const slots={weapon:'weapon',head:'head',body:'body',arms:'arms',waist:'waist',legs:'legs',ring:'accessory',charm:'accessory'};
 for(const jobId of ['dragoon','summoner']){
  const {s,c}=ready(jobId);
  changeJob(s,c.id,jobId);
  for(const tier of levels)for(const part of paths){
   const id=`${jobId}-${tier}-${part}`,item=EQUIPMENT[id];
   assert.ok(item,`missing ${id}`);
   assert.equal(item.slot,slots[part]);
   assert.deepEqual(item.allowedJobs,[jobId]);
   assert.equal(item.specialJobGear,jobId);
   assert.ok(item.elementResist);
   assert.ok(RECIPES[`craft-${id}`]);
   assert.equal(RECIPES[`craft-${id}`].category,part==='ring'?'ring':part==='charm'?'charm':part==='weapon'?'weapon':'armor');
  }
  for(const part of paths){
   const gear=EQUIPMENT[`${jobId}-novice-${part}`];
   assert.equal(canEquipForJob(c,gear,s),true);
   assert.equal(canEquip(c,gear,s),true);
   const wrong={...c,currentJob:jobId==='dragoon'?'summoner':'dragoon'};
   assert.equal(canEquipForJob(wrong,gear,s),false);
   assert.ok(equipmentJobLabel(gear).includes(JOBS[jobId].name));
  }
  assert.ok(JOBS[jobId].equipmentGroups.includes(jobId==='dragoon'?'swordsman':'magic'));
 }
});

test('new gear unlocks once prerequisite level reached, can craft, and all six high-forge tiers exist',()=>{
 for(const jobId of ['dragoon','summoner']){
  const s=state(),c=s.characters[0],precursor=jobId==='dragoon'?'paladin':'blackMage';
  const noviceId=`${jobId}-novice-weapon`,recipeId=`craft-${noviceId}`;
  assert.equal(canCraft(s,recipeId).locked,true);
  c.jobLevels[precursor]=30;
  const newly=syncRecipeUnlocks(s);
  assert.ok(newly.includes(recipeId),`recipe did not unlock for ${jobId}`);
  assert.ok(getAvailableRecipes(s).some(r=>r.id===recipeId));
  s.gold=100000;s.materials.ironIngot=99;
  assert.equal(canCraft(s,recipeId).ok,true);
  assert.equal(craftItem(s,recipeId).outputId,noviceId);
  assert.ok(s.equipmentInventory.some(x=>x.equipmentId===noviceId));
  for(const tier of materials)for(const part of ['weapon','body','ring','charm']){
   const id=`highforge-${tier}-${jobId}-${part}`,gear=EQUIPMENT[id];
   assert.ok(gear&&RECIPES[`craft-${id}`],id);
   assert.deepEqual(gear.allowedJobs,[jobId]);
  }
 }
});

test('jobs, forging, and native combat sprites include Dragoon and Summoner',()=>{
 for(const job of ['dragoon','summoner']){
  const a=actorArt({side:'ally',currentJob:job,id:'hero'});
  assert.equal(a.src,`./assets/battle/${job}.png?v=approved-height-20261020`);
  assert.deepEqual([a.cols,a.rows,a.index,a.aspect],[1,1,0,.75]);
  const png=readFileSync(new URL(`../assets/battle/${job}.png`,import.meta.url));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),90,'all sprites share exactly the same 90px width');
  assert.equal(png.readUInt32BE(20),120,'all sprites share exactly the same 120px height');
  assert.ok(png.includes(Buffer.from('tRNS')),'background must be transparent');
  const markup=battleStageMarkup({}, {actors:[{id:'hero',side:'ally',currentJob:job,name:'冒険者',hp:100,maxHp:100}]});
  assert.match(markup,new RegExp(`assets/battle/${job}\\.png`));
  assert.match(markup,/width="90" height="120"/);
  const {s,c}=ready(job),jobs=jobsMarkup(s,c.id),forge=['weapon','armor','ring','charm'].map(page=>forgeMarkup(s,page)).join('');
  assert.match(jobs,new RegExp(JOBS[job].name));
  assert.match(jobs,/Lv30/);
  assert.ok(forge.includes(JOBS[job].name));
 }
});
