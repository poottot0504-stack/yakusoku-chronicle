import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createNewGame,getActiveParty} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState,recordAdventureVictory} from '../src/core/adventure.js';
import {getCharacterResourceCaps} from '../src/core/combat-stats.js';
import {createWorldRun,recordWorldRunVictory,worldRunCanContinue,worldRunSummary} from '../src/core/world-chain.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const heroOf=state=>state.characters.find(c=>c.isHero);
const nextBattle=()=>({
 actors:[{side:'enemy',id:'slime',bestiaryId:'slime',name:'スライム',hp:0}],
 exp:10,jobExp:8,gold:10
});
function realSettlementHarness(){
 const state=ensureAdventureState(createNewGame(createDefaultRoster()));
 const before=structuredClone(state);
 const snapshots=[];
 let started=0,results=0;
 const ctx={
  state,worldRun:createWorldRun('field'),battle:nextBattle(),
  battleMeta:{exploration:true,regionId:'field',boss:false,rareEncounter:false,enemy:{id:'slime',name:'スライム'},enemies:[{id:'slime',bestiaryId:'slime'}]},
  ECLIPSE_EVENT:{id:'eclipse-gate-2026'},
  TRAINING_FESTIVAL:{id:'training-festival'},TWIN_STAR_FESTIVAL:{id:'twin-star-festival'},
  view:'adventure',
  clearNormalAuto:()=>{},syncPlayTime:()=>{},syncBattlePartyToState:()=>{},
  recordAdventureVictory,recordWorldRunVictory,worldRunCanContinue,worldRunSummary,
  awardBattleDrops:()=>[],formatDropLines:()=>[],auditVictory:()=>{},recordAchievementEvent:()=>{},
  updateQuestProgress:()=>{},getActiveParty,getCharacterResourceCaps,
  getActivePartyMock:()=>getActiveParty(state),
  makeEncounterGroup:()=>[{id:'slime',bestiaryId:'slime'}],
  startBattle:(encounters,params)=>{
   assert.equal(params.exploration,true);
   assert.equal(encounters.length,1);
   started++;
   ctx.battleMeta={exploration:true,regionId:'field',boss:false,rareEncounter:false,enemy:{id:'slime',name:'スライム'},enemies:encounters};
   ctx.battle=nextBattle();
   ctx.worldRun.goldBefore=state.gold;
  },
  saveNow:()=>snapshots.push({
   completed:ctx.worldRun?.completed,
   charExp:heroOf(state).exp,
   charLevel:heroOf(state).level,
   jobExp:heroOf(state).jobExp?.[heroOf(state).currentJob],
   jobLevel:heroOf(state).jobLevels[heroOf(state).currentJob],
   gold:state.gold
  }),
  battleScreen:{classList:{remove:()=>{}}},
  renderGame:()=>results++,
  toast:()=>{}
 };
 ctx.worldRun.goldBefore=state.gold;
 vm.createContext(ctx);
 const a=main.indexOf('function finishWorldRunVictory(){');
 const b=main.indexOf('// Three genuine battles',a);
 const c=main.indexOf('function finishBattleVictory(){');
 const d=main.indexOf('function finishBattleDefeat(){',c);
 assert.ok(a>=0&&b>a&&c>=0&&d>c);
 vm.runInContext(main.slice(a,b)+'\n'+main.slice(c,d),ctx);
 return {ctx,before,snapshots,get started(){return started;},get results(){return results;},win:()=>vm.runInContext('finishBattleVictory()',ctx)};
}

test('ten world-map victories credit and persist ten rounds of real character/job XP',()=>{
 const h=realSettlementHarness();
 const c=h.ctx.state.characters.find(x=>x.isHero);
 const startCharExp=c.exp??0,job=c.currentJob,startJobExp=c.jobExp?.[job]??0,startGold=h.ctx.state.gold;
 for(let i=1;i<=10;i++){
  h.win();
  assert.equal(h.snapshots[i-1]?.completed,i,'battle '+i+' saved after settlement');
  assert.equal(h.snapshots[i-1].charExp-startCharExp,12*i,'battle '+i+' character XP (10*1.2)');
  assert.equal(h.snapshots[i-1].jobExp-startJobExp,12*i,'battle '+i+' job XP (8*1.5)');
  assert.ok(h.snapshots[i-1].gold> (i===1?startGold:h.snapshots[i-2].gold),'battle '+i+' gold reward is credited (daily bonuses may apply)');
  if(i<10)assert.equal(h.started,i,'next fight starts after saving battle '+i);
 }
 assert.equal(c.exp-startCharExp,120);
 assert.equal(c.jobExp[job]-startJobExp,120);
 assert.equal(h.ctx.worldRun,null);
 assert.equal(h.results,1,'only the final result screen appears');
 assert.match(h.ctx.state.adventure.message,/10\/10戦 クリア/);
 assert.equal(h.snapshots.length,11,'10 rewards + final summary all persisted');
});

test('a KO party member is never granted XP for any world-map battle',()=>{
 const state=ensureAdventureState(createNewGame(createDefaultRoster()));
 const first=getActiveParty(state)[0],ko=getActiveParty(state)[1];
 ko.hp=0;
 const initial=ko.exp??0,job=ko.currentJob,initialJob=ko.jobExp?.[job]??0;
 for(let i=0;i<10;i++)recordAdventureVictory(state,{regionId:'field',enemyIds:['slime'],exp:10,jobExp:8,gold:0});
 assert.equal(ko.exp??0,initial);
 assert.equal(ko.jobExp?.[job]??0,initialJob);
 assert.ok((first.exp??0)>0,'the living party member gains XP');
});
