// Deterministically reconstruct an unfinished tournament session from committed
// full rounds. The server still validates the complete transcript at settlement.
import {createArenaSession,arenaSessionSkills} from './arena.js';
import {arenaSeededRandom} from './arena-proof.js';
import {startTurn,resolveAction,finishTurn} from './battle.js';
const invalid=()=>{throw new Error('闘技大会の再開データが戦闘と一致しません');};
const terminal=b=>!b.actors.some(x=>x.side==='enemy'&&x.hp>0)||
 !b.actors.some(x=>x.side==='ally'&&x.hp>0);
export function replayArenaCheckpoint(record){
 if(!record||!Array.isArray(record.actions)||record.actions.length>400)invalid();
 const session=createArenaSession(record.questId,{balanceVersion:record.balanceVersion??1}),battle=session.battle;
 const rng=arenaSeededRandom(record.seed);
 let pos=0,round=0;
 startTurn(battle,rng);
 while(pos<record.actions.length){
  if(round++>=100||battle.phase!=='planning'||!battle.planningIds.length)invalid();
  const ids=[...battle.planningIds];
  if(record.actions.length-pos<ids.length)invalid();
  for(const actorId of ids){
   const entry=record.actions[pos++];
   if(entry?.actorId!==actorId)invalid();
   let action;
   if(entry.type==='defend'||entry.type==='wait'){
    if(entry.targetId!==undefined||entry.skillId!==undefined)invalid();
    action={type:entry.type};
   }else{
    const targetId=entry.targetId,target=battle.actorMap[targetId];
    if(!target||typeof targetId!=='string')invalid();
    if(entry.type==='attack'){
     if(target.side!=='enemy'||target.hp<=0||entry.skillId!==undefined)invalid();
     action={type:'attack',targetId};
    }else if(entry.type==='skill'){
     const skill=arenaSessionSkills(session,actorId).find(s=>s.id===entry.skillId);
     if(!skill||skill.mp>battle.actorMap[actorId].mp)invalid();
     const support=['heal','revive','buff'].includes(skill.type);
     if(target.side!==(support?'ally':'enemy'))invalid();
     if(skill.type==='heal'&&target.hp<=0)invalid();
     if(!support&&target.hp<=0)invalid();
     action={type:'skill',skill,targetId};
    }else invalid();
   }
   const result=resolveAction(battle,action,rng);
   if(result?.ok!==true)invalid();
  }
  if(battle.phase!=='complete')invalid();
  if(terminal(battle)){
   if(pos!==record.actions.length)invalid();
   break;
  }
  finishTurn(battle);
  if(terminal(battle)||battle.turnNumber>=100){
   if(pos!==record.actions.length)invalid();
   break;
  }
  startTurn(battle,rng);
 }
 session.actions=structuredClone(record.actions);
 session.rng=rng;
 session.matchId=record.matchId;
 return session;
}
