import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHARACTER_LEVEL_MAX,JOB_LEVEL_MAX,applyProgressionCaps} from '../src/core/progression-caps.js';
import {awardCharacterExp,awardJobExp,requiredCharacterExpForLevel,requiredExpForLevel} from '../src/core/progression.js';
import {migrateSave} from '../src/core/save-migration.js';
import {MASHO_FLOORS,MASHO_MAX_FLOOR,getMashoFloors,canEnterMashoFloor,createMashoEnemy,
 getMashoAbyssDropPool,settleMashoVictory} from '../src/core/masho-cave.js';
import {MASHO_DEPTH_BOSSES,MASHO_DEPTH_EQUIPMENT,MASHO_DEPTH_REWARD_BY_FLOOR} from '../src/data/masho-depth-rewards.js';
import {EQUIPMENT} from '../src/data/equipment.js';
import {canEquip,canEquipForJob} from '../src/core/equipment.js';
import {mashoCaveMarkup} from '../src/ui/masho-cave.js';
import {actorArt} from '../src/ui/battle-art.js';
import {createMashoRun} from '../src/core/masho-chain.js';

const save=(level=1000,highest=29)=>({
 cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:highest,clearCounts:{}},
 characters:[{id:'hero',isHero:true,name:'勇者',level,exp:0,currentJob:'swordsman',
  jobLevels:{swordsman:1000},jobExp:{swordsman:0},hp:1000,maxHp:1000,
  mp:1000,maxMp:1000,stats:{attack:100,defense:100,magic:100,speed:100}}],
 activePartyIds:[],equipmentInventory:[],materials:{},gold:0,ui:{}
});
function win(s,floor,roll=0){
 let n=0;const rng=()=>n++===0?roll:0.99;
 const battle={mashoFloor:floor,actors:[{side:'enemy',mashoBoss:true,mashoFloor:floor,hp:0},
  {side:'ally',hp:1}]};
 return settleMashoVictory(s,battle,rng,Date.UTC(2026,10,12));
}

test('first-clear save migration upgrades both caps without erasing Lv500/Job400 records',()=>{
 assert.equal(CHARACTER_LEVEL_MAX,1500);
 assert.equal(JOB_LEVEL_MAX,1000);
 const old=save(500,28);old.characters[0].jobLevels.swordsman=400;
 const s=migrateSave(old);
 assert.equal(s.levelCap,1500);
 assert.deepEqual(s.jobCaps,{basic:1000,advanced:1000,special:1000});
 assert.equal(s.characters[0].level,500);
 assert.equal(s.characters[0].jobLevels.swordsman,400);
 s.activePartyIds=['hero'];
 const c=s.characters[0];c.hp=1000;
 awardCharacterExp(s,'hero',requiredCharacterExpForLevel(500,'swordsman'));
 awardJobExp(c,requiredExpForLevel(400,'swordsman'),s);
 assert.equal(c.level,501);
 assert.equal(c.jobLevels.swordsman,401);
});

test('Lv1500 character and job1000 remain fixed at their upper bound',()=>{
 const s=save(1499,29);const c=s.characters[0];s.activePartyIds=['hero'];
 c.jobLevels.swordsman=999;
 awardCharacterExp(s,'hero',requiredCharacterExpForLevel(1499,'swordsman')+100,s);
 awardJobExp(c,requiredExpForLevel(999,'swordsman')+100,s);
 assert.equal(c.level,1500);
 assert.equal(c.jobLevels.swordsman,1000);
 awardCharacterExp(s,'hero',100000000);
 awardJobExp(c,100000000,s);
 assert.equal(c.level,1500);
 assert.equal(c.jobLevels.swordsman,1000);
});

test('29F follows the 28F clear; 30F requires BOTH 29F clear and hero Lv1000',()=>{
 assert.equal(MASHO_MAX_FLOOR,30);assert.equal(MASHO_FLOORS.length,30);
 const s=save(999,28);
 assert.equal(canEnterMashoFloor(s,29),true);
 assert.equal(canEnterMashoFloor(s,30),false);
 s.mashoCave.highestCleared=29;
 assert.equal(canEnterMashoFloor(s,30),false);
 assert.match(getMashoFloors(s).find(f=>f.floor===30).lockedReason,/Lv1000/);
 assert.match(mashoCaveMarkup(s),/主人公Lv1000以上が必要です/);
 s.characters[0].level=1000;
 assert.equal(canEnterMashoFloor(s,30),true);
 assert.equal(createMashoRun(29).floor,29);
 assert.equal(createMashoRun(30).floor,30);
 assert.throws(()=>createMashoRun(31),/階層/);
 const neverCleared=save(1500,28);
 assert.equal(canEnterMashoFloor(neverCleared,30),false);
});

test('user-supplied axe and dragon art are used and the final dragon is clearly strongest',()=>{
 const s=save(1000,30);
 const f25=createMashoEnemy(s,25,()=>0);
 const f28=createMashoEnemy(s,28,()=>0);
 const f29=createMashoEnemy(s,29,()=>0);
 const f30=createMashoEnemy(s,30,()=>0);
 assert.equal(f29.name,'骸鐘の処刑王ベルネクロス【魔障】');
 assert.equal(f30.name,'究極銀河竜・星界の覇王【魔障】');
 assert.equal(f29.artId,MASHO_DEPTH_BOSSES[29].id);
 assert.equal(f30.artId,MASHO_DEPTH_BOSSES[30].id);
 assert.equal(f29.maxHp,Math.round(f25.maxHp*20));
 assert.equal(f30.maxHp,Math.round(f25.maxHp*32));
 assert.ok(f30.maxHp>f29.maxHp&&f29.maxHp>f28.maxHp);
 assert.ok(f30.stats.attack>f29.stats.attack&&f29.stats.attack>f28.stats.attack);
 assert.ok(f30.ai.some(a=>a.skill?.id==='galaxyFinalBurst'&&a.skill.multiHit===3));
 assert.ok(f30.ai.some(a=>a.skill?.maxHpDamageRatio===.65));
 assert.equal(f30.instantDeathCycle,true);
 for(const boss of [f29,f30]){
  const art=actorArt({...boss,side:'enemy'});
  assert.ok(art.src.startsWith('data:image/webp;base64,'),boss.name);
  assert.equal(art.aspect,56/52);
 }
});

test('29F and 30F each have 4 new equippable and correctly slotted rewards',()=>{
 for(const floor of [29,30]){
  const pool=getMashoAbyssDropPool(floor);
  assert.equal(pool.length,4);
  assert.equal(new Set(pool.map(g=>g.id)).size,4);
  assert.deepEqual(pool.map(d=>d.slot),['weapon','body','accessory','accessory']);
  assert.deepEqual(pool.slice(2).map(d=>d.accessoryType),['ring','charm']);
  assert.deepEqual(pool.map(g=>g.id),MASHO_DEPTH_REWARD_BY_FLOOR[floor]);
  for(const gear of pool){
   assert.equal(EQUIPMENT[gear.id],gear);
   assert.equal(MASHO_DEPTH_EQUIPMENT[gear.id],gear);
   assert.equal(gear.mashoDepthFloor,floor);
   assert.equal(gear.requiredLevel,floor===29?900:1000);
   assert.ok(gear.rarity==='legendary');
  }
 }
 const classes=[{currentJob:'darkKnight',jobLevels:{darkKnight:900}},
  {currentJob:'dragoon',jobLevels:{dragoon:1000}}];
 const axe=EQUIPMENT[MASHO_DEPTH_REWARD_BY_FLOOR[29][0]];
 const spear=EQUIPMENT[MASHO_DEPTH_REWARD_BY_FLOOR[30][0]];
 assert.equal(canEquipForJob(classes[0],axe,{}),true);
 assert.equal(canEquip(classes[0],axe,{}),true);
 assert.equal(canEquipForJob(classes[1],spear,{}),true);
 assert.equal(canEquip(classes[1],spear,{}),true);
 const unqualified={currentJob:'dragoon',jobLevels:{dragoon:999}};
 assert.equal(canEquip(unqualified,spear,{}),false);
});

test('29F and 30F battle rewards save actual loot without duplication',()=>{
 for(const floor of [29,30]){
  const s=save(1000,floor);
  const reward=win(s,floor,0);
  assert.ok(reward.equipment);
  assert.ok(getMashoAbyssDropPool(floor).some(x=>x.id===reward.equipment.equipmentId));
  assert.equal(s.equipmentInventory.length,1);
  assert.equal(s.mashoCave.clearCounts[floor],1);
  assert.ok(win(save(1000,floor),floor,.005).equipment===null);
 }
});

test('deployment SQL expands actual Postgres CHECK constraints but requires a separate release',()=>{
 const migration=readFileSync(new URL('../supabase/release-sql/20261112_masho_29_30_level_1500_job_1000.sql',import.meta.url),'utf8');
 const edge=readFileSync(new URL('../supabase/functions/yakusoku-player-stats/index.ts',import.meta.url),'utf8');
 for(const x of ['BEGIN;','COMMIT;','job_level BETWEEN 1 AND 1000','level BETWEEN 1 AND 1500',
 'max_level_after BETWEEN 1 AND 1500','exp_awarded BETWEEN 0 AND 8000000'])
  assert.ok(migration.includes(x),x);
 for(const x of ['policy_version:14','levelAfter>1500','jobLevelAfter>1000',
  '29:"masho29-bellnecros",30:"masho30-galaxy-dragon"',
  'if(expAwarded>(deepEndgameBoss?8_000_000:2_000_000))'])
  assert.ok(edge.includes(x),x);
});
