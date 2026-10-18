import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame } from '../src/state/game-state.js';
import { createDefaultRoster } from '../src/data/characters.js';
import { ensureAdventureState } from '../src/core/adventure.js';
import { ALL_JOBS, getJobPassive, describeJobPassive } from '../src/data/jobs.js';
import { jobsMarkup } from '../src/ui/jobs.js';
import { statusMarkup } from '../src/ui/status.js';
import { createBattle } from '../src/core/battle.js';
import { raidPowerStat, raidActionPayload } from '../src/raid/raidBattle.js';
import { calculateRaidSkillDamage, applyRaidSkillEffect, applyRaidBossAction } from '../src/raid/raidPartyTurn.js';
import { applyJobPassiveToStat } from '../src/data/jobs.js';

const makeState=()=>ensureAdventureState(createNewGame(createDefaultRoster()));
const availableDate=Date.parse('2027-01-01T12:00:00+09:00');

test('every job has one small, readable intrinsic passive',()=>{
 assert.equal(ALL_JOBS.length,20);
 for(const job of ALL_JOBS){
  const passive=getJobPassive(job.id);
  assert.ok(passive,`Missing passive for ${job.id}`);
  assert.ok(['attack','defense','magic','speed'].includes(passive.stat));
  assert.ok(passive.rate>=.025&&passive.rate<=.04,`Passive balance out of bounds: ${job.id}`);
  const description=describeJobPassive(job.id);
  assert.ok(description.includes(passive.name));
  assert.ok(description.includes(`${Math.round(passive.rate*1000)/10}%`));
 }
});

test('job selection displays passives for locked and unlocked jobs but marks only current one active',()=>{
 const state=makeState(),character=state.characters[0];
 const html=jobsMarkup(state,character.id,availableDate);
 for(const job of ALL_JOBS){
  const start=html.indexOf(`data-job-id="${job.id}"`);
  assert.ok(start>=0,`Missing job row: ${job.id}`);
  const row=html.slice(start,html.indexOf('</button>',start));
  assert.ok(row.includes(`✨ パッシブ：${describeJobPassive(job.id)}`),`Missing description: ${job.id}`);
  assert.equal(row.includes('【発動中】'),job.id===character.currentJob,`Active marker mismatch: ${job.id}`);
 }
 assert.equal((html.match(/【発動中】/g)||[]).length,1);
 assert.ok(html.includes('未解放のジョブも効果を確認できます'));
});

test('status panel follows active job without changing saved stats',()=>{
 const state=makeState(),character=state.characters[0];
 const originalStats=JSON.stringify(character.stats);
 const initialJob=character.currentJob;
 assert.ok(statusMarkup(state,character.id).includes(`✨ 発動中の固有パッシブ：${describeJobPassive(initialJob)}`));
 character.currentJob='highWizard'; // UI-only assertion, no unlock bypass in game logic.
 assert.ok(statusMarkup(state,character.id).includes(`✨ 発動中の固有パッシブ：${describeJobPassive('highWizard')}`));
 assert.equal(JSON.stringify(character.stats),originalStats);
});

test('battle applies exactly the current job passive once without modifying the saved hero',()=>{
 const base={id:'hero',name:'テスト冒険者',level:200,currentJob:'swordsman',
   stats:{attack:100,defense:100,magic:100,speed:100},
   battleFlatStats:{attack:20,defense:10,magic:30,speed:5},
   hp:1000,maxHp:1000,mp:100,maxMp:100,statusAilments:[]};
 const enemy={id:'test-enemy',name:'テスト魔物',level:1,hp:1000,maxHp:1000,
   stats:{attack:100,defense:100,magic:100,speed:100}};
 const initial=structuredClone(base);
 const flat={attack:120,defense:110,magic:130,speed:105};
 for(const job of ALL_JOBS){
  const character={...structuredClone(base),currentJob:job.id};
  const before=structuredClone(character);
  const battle=createBattle([character],enemy);
  const actor=battle.actorMap[character.id];
  const passive=getJobPassive(job.id);
  for(const [stat,normal] of Object.entries(flat)){
   const expected=stat===passive.stat?Math.round(normal*(1+passive.rate)):normal;
   assert.equal(actor.stats[stat],expected,`${job.id} should modify only ${passive.stat}, checked ${stat}`);
  }
  assert.equal(actor.jobPassive,passive.name);
  assert.deepEqual(character,before,'Combat should not write passive stat changes to save');
  assert.deepEqual(battle.actorMap[enemy.id].stats,enemy.stats,'Opponent should never inherit a party job passive');
 }
 assert.deepEqual(base,initial);
});

test('shared passive stat calculation matches all 20 jobs and stays on their own stat',()=>{
 for(const job of ALL_JOBS){
  const p=getJobPassive(job.id),actor={currentJob:job.id};
  for(const stat of ['attack','defense','magic','speed'])
   assert.equal(applyJobPassiveToStat(actor,stat,100),
    stat===p.stat?Math.round(100*(1+p.rate)):100,
    `${job.id}/${stat}`);
 }
 assert.equal(applyJobPassiveToStat({currentJob:'unknown'},'attack',100),100);
});

test('raid attacks and spells use the same job passive values as regular battles',()=>{
 const hero={id:'hero',name:'冒険者',level:100,currentJob:'swordsman',
  jobLevels:{swordsman:100,mage:100,thief:100,highWizard:100},
  hp:10000,maxHp:10000,mp:1000,
  stats:{attack:100,defense:100,magic:100,speed:100}};
 const before=structuredClone(hero);
 const defaultHero={...hero,currentJob:'unknown'};
 assert.equal(raidPowerStat(hero,'attack').value,103);
 assert.equal(raidPowerStat(defaultHero,'attack').value,100);
 assert.ok(raidActionPayload('attack',hero).damage>raidActionPayload('attack',defaultHero).damage);
 const mage={...hero,currentJob:'mage'};
 assert.equal(raidPowerStat(mage,'magic').value,103);
 const thief={...hero,currentJob:'thief'};
 assert.equal(raidPowerStat(thief,'attack').value,126,'Thief 3% speed passive supports raid speed-based damage');
 const wizard={...hero,currentJob:'highWizard'};
 assert.equal(raidPowerStat(wizard,'magic').value,104);
 const skill={type:'magic',kind:'magic',power:100,mp:0};
 const damage=calculateRaidSkillDamage(wizard,skill,{defense:0,magicDefense:0});
 // level100 + jobLv100 + magic104*4, power 100%, wizard profile damage 1.35.
 assert.equal(damage,Math.round((100+100+104*4)*1.8*1.35));
 assert.deepEqual(hero,before,'Raid calculations should not mutate saved hero attributes');
});

test('raid heals and defensive boss damage apply passive without permanent stat changes',()=>{
 const wizard={id:'wiz',currentJob:'highWizard',level:200,stats:{magic:100,defense:100},hp:50,maxHp:10000,mp:100};
 const healing=applyRaidSkillEffect({actor:wizard,skill:{type:'heal',power:100,mp:0},targetId:'wiz',party:[wizard]});
 assert.equal(healing.healing,Math.floor(104*100*.6));
 const makeParty=job=>[{id:'tank',name:'守護者',currentJob:job,hp:10000,maxHp:10000,stats:{defense:100}}];
 const paladin=makeParty('paladin'),unknown=makeParty('unknown');
 applyRaidBossAction({kind:'single',name:'通常攻撃'},paladin,[],{attack:900,magicAttack:900},'ifrit',()=>.2);
 applyRaidBossAction({kind:'single',name:'通常攻撃'},unknown,[],{attack:900,magicAttack:900},'ifrit',()=>.2);
 assert.ok(paladin[0].hp>unknown[0].hp,'Paladin defense passive should reduce raid boss damage');
 assert.equal(paladin[0].stats.defense,100,'Do not overwrite saved defensive stats');
});
