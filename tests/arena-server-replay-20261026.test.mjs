import test from 'node:test';
import assert from 'node:assert/strict';
import {createArenaSession,arenaSessionSkills} from '../src/core/arena.js';
import {startTurn,resolveAction,finishTurn} from '../src/core/battle.js';
import {arenaSeededRandom,verifyArenaTranscript} from '../src/core/arena-proof.js';

function recordRun(questId,seed,{defend=false}={}){
 const session=createArenaSession(questId),b=session.battle,rng=arenaSeededRandom(seed),actions=[];
 const maxRounds=100;
 for(let round=1;round<=maxRounds;round++){
  startTurn(b,rng);
  for(const actorId of [...b.planningIds]){
   const actor=b.actorMap[actorId];
   const skill=arenaSessionSkills(session,actorId).filter(x=>x.type!=='heal'&&(x.mp??0)<=actor.mp).sort((a,b)=>b.power-a.power)[0];
   const action=defend&&round===1?{type:'defend'}:skill?{type:'skill',skill,targetId:b.actors.find(x=>x.side==='enemy').id}:{type:'attack',targetId:b.actors.find(x=>x.side==='enemy').id};
   actions.push({actorId,type:action.type,...(action.skill?{skillId:action.skill.id}:{}),...(action.targetId?{targetId:action.targetId}:{})});
   const result=resolveAction(b,action,rng);assert.equal(result.ok,true);
  }
  const winner=b.actors.every(x=>x.side!=='enemy'||x.hp<=0);
  const loser=b.actors.every(x=>x.side!=='ally'||x.hp<=0);
  if(winner||loser)return {actions,round,winner,loser};
  finishTurn(b);
 }
 return {actions,round:maxRounds,winner:false};
}
test('server replay validates genuine fixed-party 3-turn S achievements without trusting claimed totals',()=>{
 for(const questId of ['arena30','arena50','arena70']){
  const successes=[];
  for(let seed=1001;seed<1033;seed++){
   const rec=recordRun(questId,seed);
   const result=verifyArenaTranscript({questId,seed,actions:rec.actions,reportedGrade:'S',reportedCoins:999999});
   if(result.grade==='S')successes.push({seed,round:result.turns,coins:result.coins});
  }
  assert.ok(successes.length>0,questId+' has no validated S replay');
  assert.ok(successes.every(x=>x.round<=3&&x.coins===5));
 }
});
test('tampered client turn count, claimed coins, or grade never affect replay award',()=>{
 const questId='arena30',seed=1001,run=recordRun(questId,seed);
 const x=verifyArenaTranscript({questId,seed,actions:run.actions,reportedTurns:1,reportedCoins:9000,reportedGrade:'S',victory:false});
 const y=verifyArenaTranscript({questId,seed,actions:run.actions});
 assert.deepEqual(x,y);
});
test('server rejects nonexistent targets, illegal powers, foreign actors, and missing actions',()=>{
 const questId='arena30',seed=1001,run=recordRun(questId,seed);
 const mutate=fn=>{const a=structuredClone(run.actions);fn(a);assert.throws(()=>verifyArenaTranscript({questId,seed,actions:a}),/無効/);};
 mutate(a=>a[0].actorId='fake');
 mutate(a=>a[0].skillId='admin-godkill');
 mutate(a=>a[0].targetId='arena-actor-0');
 mutate(a=>a[0].targetId='nonexistent');
 mutate(a=>a.pop());
 mutate(a=>a.push(a[0]));
 mutate(a=>a[0]={actorId:'arena-actor-0',type:'item',targetId:'arena-actor-0'});
});
test('server replays normal 100-turn cap safely, and enforces seeded input',()=>{
 assert.throws(()=>arenaSeededRandom(-1),/不正/);
 assert.throws(()=>verifyArenaTranscript({questId:'arena30',seed:-1,actions:[]}),/無効/);
 assert.throws(()=>verifyArenaTranscript({questId:'arena30',seed:1001,actions:Array.from({length:401},()=>({actorId:'fake',type:'wait'}))}),/無効/);
 assert.throws(()=>verifyArenaTranscript({questId:'arena999',seed:1001,actions:[]}),/クエスト/);
 const result=recordRun('arena30',1001,{defend:true});
 assert.ok(result.actions.length>=4);
 const verified=verifyArenaTranscript({questId:'arena30',seed:1001,actions:result.actions});
 assert.deepEqual(verified.grade,result.winner?'S':null);
});
