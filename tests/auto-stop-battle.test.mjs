import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function harness(raid=false){
 const settings={enabled:true,strategy:'balanced',speed:1};
 const actor={id:'hero',hp:100};
 let queued=null,actions=0,saves=0;
 const c={battle:{phase:'planning',awaitingActorId:'hero',actors:[{...actor,side:'ally'}]},state:{characters:[actor]},raidRoom:raid?{roomId:'room1',currentHp:1000,maxHp:1000}:null,raidAutoStopped:false,raidTurnState:{currentActorId:'hero'},raidTurnExecuting:false,raidEndedReason:null,raidPendingBossAction:null,raidExecutionId:1,raidAutoRound:1,normalAutoTimer:null,raidAutoTimer:null,document:{hidden:false,querySelectorAll:()=>[]},modal:{classList:{contains:()=>false}},autoSettings:()=>settings,saveAutoSettings:p=>{Object.assign(settings,p);saves++;},setTimeout:f=>{queued=f;return 1;},clearTimeout:()=>{queued=null;},clearNormalAuto:()=>{queued=null;},clearRaidAuto:()=>{queued=null;},getPendingActor:b=>b.actors[0],getBattleSkills:()=>[],chooseAutoAction:()=>({type:'attack'}),act:()=>actions++,planRaidAction:()=>actions++,currentRaidPartyActor:()=>actor,raidPartyMembers:()=>[actor],isRaidWindowDefeated:()=>false,toast:()=>{},el:{hasAttribute:()=>true}};
 vm.createContext(c);
 const normal=src.slice(src.indexOf('function scheduleNormalAuto(){'),src.indexOf('function scheduleRaidAuto(){'));
 const raidFn=src.slice(src.indexOf('function scheduleRaidAuto(){'),src.indexOf('async function limitAutoRaidCalls('));
 vm.runInContext(normal+raidFn,c);
 const stop=src.split('\n').find(l=>l.includes("if(el.hasAttribute('data-auto-stop'))"));
 return {c,settings,stop:()=>vm.runInContext('(function(){'+stop+'})()',c),schedule:()=>raid?c.scheduleRaidAuto():c.scheduleNormalAuto(),get queued(){return queued;},get actions(){return actions;},get saves(){return saves;}};
}
for(const raid of [false,true])test(`${raid?'raid':'normal'} stop keeps auto setting and prevents rescheduling`,()=>{
 const h=harness(raid);h.schedule();const late=h.queued;assert.equal(typeof late,'function');
 h.stop();assert.equal(h.settings.enabled,true);assert.equal(h.saves,0);
 late();assert.equal(h.actions,0);h.schedule();assert.equal(h.queued,null);
 if(raid){h.c.raidAutoStopped=false;h.c.raidRoom={roomId:'room2',currentHp:1000,maxHp:1000};}
 else h.c.battle={phase:'planning',awaitingActorId:'hero',actors:[{id:'hero',side:'ally',hp:100}]};
 h.schedule();assert.equal(typeof h.queued,'function');h.queued();assert.equal(h.actions,1);
});
