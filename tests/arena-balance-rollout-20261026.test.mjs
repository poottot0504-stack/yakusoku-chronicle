import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ARENA_QUESTS,ARENA_LEGACY_BOSS_STATS,ARENA_BALANCE_VERSION} from '../src/data/arena-quests.js';
import {createArenaSession,arenaSessionSkills} from '../src/core/arena.js';
import {arenaSeededRandom,verifyArenaTranscript} from '../src/core/arena-proof.js';
import {replayArenaCheckpoint} from '../src/core/arena-replay.js';
import {startTurn,resolveAction,finishTurn} from '../src/core/battle.js';

test('each stronger boss preserves exact pre-update stats for already-issued matches',()=>{
 assert.equal(ARENA_BALANCE_VERSION,2);
 for(const quest of Object.values(ARENA_QUESTS)){
  const legacy=ARENA_LEGACY_BOSS_STATS[quest.id],next=quest.enemy;
  const oldSession=createArenaSession(quest.id,{balanceVersion:1});
  const newSession=createArenaSession(quest.id,{balanceVersion:2});
  const oldBoss=oldSession.battle.actors.find(a=>a.side==='enemy');
  const newBoss=newSession.battle.actors.find(a=>a.side==='enemy');
  assert.equal(oldSession.balanceVersion,1);
  assert.equal(newSession.balanceVersion,2);
  for(const key of ['maxHp','attack','defense','magic','speed']){
   assert.ok(next[key]>legacy[key],quest.id+' '+key);
  }
  assert.ok(oldBoss.stats.attack>=legacy.attack);
  assert.ok(newBoss.stats.attack>oldBoss.stats.attack);
  assert.ok(newBoss.maxHp>oldBoss.maxHp);
  assert.equal(newBoss.artId,oldBoss.artId,'keep pixel art unchanged');
  assert.deepEqual(oldSession.roster,newSession.roster,'fixed player party is unchanged');
 }
});
test('checkpoint replay uses its original recorded boss balance',()=>{
 for(const quest of Object.values(ARENA_QUESTS)){
  for(const v of [1,2]){
   const checkpoint={questId:quest.id,seed:1001,actions:[],balanceVersion:v,
    matchId:'10000000-0000-4000-8000-000000000001'};
   const replayed=replayArenaCheckpoint(checkpoint);
   const fresh=createArenaSession(quest.id,{balanceVersion:v});
   assert.equal(replayed.balanceVersion,v);
   assert.equal(replayed.battle.actors.find(a=>a.side==='enemy').maxHp,
    fresh.battle.actors.find(a=>a.side==='enemy').maxHp);
  }
 }
});
function record(questId,balanceVersion,seed){
 const session=createArenaSession(questId,{balanceVersion}),b=session.battle;
 const rng=arenaSeededRandom(seed),actions=[];
 for(let round=1;round<=100;round++){
  startTurn(b,rng);
  if(!b.planningIds.length)throw Error('no actions possible');
  for(const actorId of [...b.planningIds]){
   const actor=b.actorMap[actorId];
   const best=arenaSessionSkills(session,actorId)
    .filter(s=>(s.type==='attack'||s.type==='magic')&&s.mp<=actor.mp)
    .sort((a,z)=>(z.power??0)-(a.power??0))[0];
   const action=best?{type:'skill',skill:best,targetId:ARENA_QUESTS[questId].enemy.id}:
    {type:'attack',targetId:ARENA_QUESTS[questId].enemy.id};
   actions.push({actorId,type:action.type,...(best?{skillId:best.id}:{}),targetId:action.targetId});
   assert.equal(resolveAction(b,action,rng).ok,true);
  }
  if(!b.actors.some(a=>a.side==='enemy'&&a.hp>0)||!b.actors.some(a=>a.side==='ally'&&a.hp>0))return actions;
  finishTurn(b);
 }
 return actions;
}
test('server must validate genuine old and new records against their persisted ruleset',()=>{
 for(const quest of Object.values(ARENA_QUESTS)){
  for(const v of [1,2]){
   const actions=record(quest.id,v,1001);
   const result=verifyArenaTranscript({questId:quest.id,seed:1001,actions,balanceVersion:v});
   assert.ok(result.turns>0&&result.turns<=100);
  }
 }
});
test('frontend and server version handshake never trust a client claim of boss strength',()=>{
 const edge=readFileSync(new URL('../supabase/functions/yakusoku-arena/index.ts',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const api=readFileSync(new URL('../src/online/arena-api.js',import.meta.url),'utf8');
 assert.match(edge,/balanceVersion===2\?'issue_v2':'issue'/);
 assert.match(edge,/balanceVersion:Number\(match\.balanceVersion\?\?1\)/);
 assert.match(api,/balanceVersion=2/);
 assert.match(main,/balanceVersion:active\.balanceVersion/);
 assert.match(main,/闘技大会<\/b>/);
 assert.doesNotMatch(main,/闘技大会（試作）/);
});
