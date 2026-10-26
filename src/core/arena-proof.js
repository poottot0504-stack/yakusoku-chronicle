// Side-effect-free replay validator to be used by a future AUTHENTICATED SERVER.
// This module never credits coins or accesses a browser save. The caller MUST
// fetch seed/quest/user/session from an authoritative DB record, not the client.
// Server must atomically award once per authenticated session after verification.
import {createArenaSession,arenaSessionSkills,arenaRank} from './arena.js';
import {startTurn,resolveAction,finishTurn} from './battle.js';
const finiteSeed=seed=>Number.isSafeInteger(seed)&&seed>=0&&seed<=0xffffffff;
export function arenaSeededRandom(seed){
 if(!finiteSeed(seed))throw new Error('サーバーから発行された乱数が不正です');
 let value=seed>>>0;
 return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}
const invalid=message=>{throw new Error('闘技大会の戦闘記録が無効です: '+message);};
const winner=b=>b.actors.some(a=>a.side==='ally'&&a.hp>0)&&!b.actors.some(a=>a.side==='enemy'&&a.hp>0);
const loser=b=>!b.actors.some(a=>a.side==='ally'&&a.hp>0);
function validatedAction(session,b,entry,actorId){
 if(!entry||typeof entry!=='object'||Array.isArray(entry))invalid('行動データ');
 if(entry.actorId!==actorId)invalid('行動者または順番');
 const type=entry.type,targetId=entry.targetId;
 const current=b.actorMap[actorId];
 if(!current||current.hp<=0)invalid('行動できないキャラクター');
 if(!['attack','skill','defend','wait'].includes(type))invalid('持ち込み道具・逃走・未定義コマンドは禁止');
 if(type==='defend'||type==='wait'){
  if(entry.skillId!=null||targetId!=null)invalid('防御・待機に不正な付加情報');
  return {type};
 }
 let skill;
 if(type==='skill'){
  if(typeof entry.skillId!=='string')invalid('特技ID');
  skill=arenaSessionSkills(session,actorId).find(x=>x.id===entry.skillId);
  if(!skill||skill.autoPassive)invalid('固定編成外のスキル');
  if((current.mp??0)<(skill.mp??0))invalid('MP不足');
 }else if(entry.skillId!=null)invalid('通常攻撃に特技ID');
 const target=b.actorMap[targetId];
 if(!target||typeof targetId!=='string')invalid('存在しない対象');
 const skillType=skill?.type;
 const alliesAction=['heal','revive','buff'].includes(skillType);
 const desiredSide=alliesAction?'ally':'enemy';
 if(target.side!==desiredSide)invalid('対象側が不正');
 if(skillType==='revive'&&target.hp>0)invalid('戦闘不能でない対象を蘇生');
 if(skillType==='heal'&&target.hp<=0)invalid('戦闘不能の対象を通常回復');
 if(!alliesAction&&target.hp<=0)invalid('討伐済み敵を攻撃');
 return type==='skill'?{type,skill,targetId}:{type,targetId};
}
/** @param {{questId?: string,seed?: number,actions?: any[],balanceVersion?: number}} [input] */
export function verifyArenaTranscript({questId,seed,actions,balanceVersion=2}={}){
 // No user IDs, victory booleans, turn counts or coin totals from the client
 // are ever accepted as authoritative verification inputs.
 if(!finiteSeed(seed))invalid('乱数シード');
 if(!Array.isArray(actions)||actions.length>400||JSON.stringify(actions).length>100000)invalid('行動数上限');
 const session=createArenaSession(questId,{balanceVersion}),b=session.battle,rng=arenaSeededRandom(seed);
 let consumed=0;
 for(let round=1;round<=100;round++){
  startTurn(b,rng);
  if(!b.planningIds.length)invalid('操作可能な味方がいません');
  for(const actorId of [...b.planningIds]){
   const entry=actions[consumed++];
   if(!entry)invalid('行動ログ不足');
   const action=validatedAction(session,b,entry,actorId);
   const result=resolveAction(b,action,rng);
   if(result?.ok!==true)invalid(result?.message??'行動失敗');
  }
  if(winner(b)||loser(b)){
   if(consumed!==actions.length)invalid('戦闘終了後に余分な行動がある');
   const rank=winner(b)?arenaRank(round):null;
   return {questId,victory:!!rank,turns:round,grade:rank?.grade??null,coins:rank?.coins??0};
  }
  finishTurn(b);
  // Damage-over-time or other end-of-round effects can finish the battle.
  if(winner(b)||loser(b)){
   if(consumed!==actions.length)invalid('戦闘終了後に余分な行動がある');
   const rank=winner(b)?arenaRank(round):null;
   return {questId,victory:!!rank,turns:round,grade:rank?.grade??null,coins:rank?.coins??0};
  }
 }
 if(consumed!==actions.length)invalid('行動数と終了位置が一致しません');
 return {questId,victory:false,turns:100,grade:null,coins:0};
}
