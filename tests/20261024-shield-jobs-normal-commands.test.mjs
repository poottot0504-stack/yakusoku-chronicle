import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBattle, startTurn, resolveAction } from '../src/core/battle.js';
import { battleMarkup } from '../src/ui/battle.js';
import { jobsMarkup } from '../src/ui/jobs.js';
import { createNewGame } from '../src/state/game-state.js';
import { createDefaultRoster } from '../src/data/characters.js';
import { getBattleSkills, getSkillBook } from '../src/core/skillbook.js';
import { distributeShieldCover } from '../src/core/shielder-guard.js';

const make=(id,job,level=70)=>({
 id,name:id,currentJob:job,jobLevels:{[job]:level},level:150,
 hp:900,maxHp:900,mp:100,maxMp:100,stats:{attack:65,defense:100,magic:18,speed:15},
 buffs:[],statusAilments:[],equipment:{}
});
const enemy=()=>({...make('enemy','swordsman',1),hp:1500,maxHp:1500,isBoss:false,ai:[{type:'attack',power:20}]});

for(const job of ['shielder','greatShielder']){
 test(`${job}: uses same five regular battle commands and does not force defend`,()=>{
  const tank=make('tank',job,300),ally=make('ally','healer');
  const battle=createBattle([tank,ally],enemy());
  startTurn(battle);
  const ui=battleMarkup({ui:{}},battle);
  for(const cmd of ['attack','skills','item','defend','escape'])assert.match(ui,new RegExp(`data-command="${cmd}"`));
  assert.doesNotMatch(ui,/防御専念/);
  const selected=resolveAction(battle,{type:'attack',targetId:'enemy'},()=>.5);
  assert.equal(selected.ok,true);
  assert.equal(battle.plannedActions.tank.type,'attack');
  const resolved=resolveAction(battle,{type:'defend'},()=>.5);
  assert.equal(resolved.ok,true);
  assert.equal(battle.actorMap.tank.guarding,false);
  assert.ok(battle.actorMap.enemy.hp<1500);
  const cover=distributeShieldCover(battle.actors,battle.actorMap.ally,80);
  assert.equal(cover.protectedDamage,0,'Lv300 cover stays automatic, even when attacker chose attack');
 });
 test(`${job}: passives still auto-apply but cannot be manually cast as free battle skills`,()=>{
  const tank=make('tank',job,300);
  assert.ok(getSkillBook(job).every(x=>x.autoPassive));
  assert.deepEqual(getBattleSkills(tank),[]);
 });
}

test('the class change list is text-only for both shield jobs, while the in-battle sprites stay available',()=>{
 const state=createNewGame(createDefaultRoster());
 const html=jobsMarkup(state,state.characters[0].id);
 for(const job of ['shielder','greatShielder']){
  const start=html.indexOf(`data-job-id="${job}"`);
  assert.ok(start>=0);
  const end=html.indexOf('</button>',start);
  const row=html.slice(start,end);
  assert.doesNotMatch(row,/<img|job-shield-sprite|background-image:/i);
  assert.match(row,/肩代わり/);
 }
 const battleArt=readFileSync(new URL('../src/ui/battle-art.js',import.meta.url),'utf8');
 assert.match(battleArt,/shield-jobs\.png/);
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/job-shield-sprite/);
});

test('raid shield characters do not have disabled buttons or forced guard validation',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const raidUI=readFileSync(new URL('../src/raid/raidBattle.js',import.meta.url),'utf8');
 assert.doesNotMatch(main,/isShieldGuardJob\(actor\.currentJob\)&&action\.type!=='guard'/);
 assert.doesNotMatch(main,/for\(const btn of modal\.querySelectorAll\('\[data-raid-action="attack"/);
 for(const button of ['data-raid-action="attack"','data-raid-open-skills','data-raid-open-items','data-raid-action="guard"'])
   assert.ok(raidUI.includes(button));
});
