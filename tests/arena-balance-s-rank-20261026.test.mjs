import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_QUESTS } from '../src/data/arena-quests.js';
import { createArenaSession,arenaRank,arenaSessionSkills } from '../src/core/arena.js';
import { startTurn,resolveAction,finishTurn } from '../src/core/battle.js';

function fight(questId,seed){
 const session=createArenaSession(questId),b=session.battle;
 let n=seed>>>0;
 const rng=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const hp0=b.actors.find(a=>a.side==='enemy').maxHp;
 const history=[];
 for(let turn=1;turn<=3;turn++){
  startTurn(b,rng);
  let resolved=false;
  while(b.awaitingActorId){
   const a=b.actorMap[b.awaitingActorId];
   const skills=arenaSessionSkills(session,a.id).filter(s=>s.type!=='heal'&&s.mp<=a.mp);
   const skill=skills.sort((x,y)=>(y.power??0)-(x.power??0))[0];
   const action=skill?{type:'skill',skill,targetId:ARENA_QUESTS[questId].enemy.id}:{type:'attack',targetId:ARENA_QUESTS[questId].enemy.id};
   const result=resolveAction(b,action,rng);
   if(!result.ok)throw new Error(JSON.stringify(result));
   if(result.resolved)resolved=true;
  }
  assert.ok(resolved,'four fixed actors must finish planning');
  const enemy=b.actors.find(x=>x.side==='enemy');
  history.push({turn,hp:enemy.hp});
  if(enemy.hp<=0)return {turn,hp0,history,s:true};
  if(!b.actors.some(x=>x.side==='ally'&&x.hp>0))return {turn,hp0,history,s:false};
  finishTurn(b);
 }
 return {turn:4,hp0,history,s:false};
}
for(const id of Object.keys(ARENA_QUESTS)){
 test(id+' S rank is attainable under reproducible standard game combat',()=>{
  const outcomes=Array.from({length:32},(_,i)=>fight(id,i+1001));
  const fastest=Math.min(...outcomes.filter(x=>x.s).map(x=>x.turn),101);
  const wins=outcomes.filter(x=>x.s).length;
  console.log('[arena-balance]',id,JSON.stringify({fastest,S_wins:wins,attempts:outcomes.length,example:outcomes.find(x=>x.s)??outcomes[0]}));
  assert.ok(wins>=1,id+' no successful S clear within 32 seed simulations: '+JSON.stringify(outcomes[0]));
  assert.ok(fastest<=3);
  assert.equal(arenaRank(fastest)?.grade,'S');
 });
}
