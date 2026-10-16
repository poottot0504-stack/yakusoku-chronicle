import { isFestivalBattle } from './hunt-festival-record.js';

// A battle ticket is requested when the fight begins, not once a win is reported.
// Issuance and validation are server-side. When a connection fails, preserve
// the legacy event queue rather than throwing away legitimate offline wins.
export function festivalBattleType(meta={}){
 return meta.eventId?'event':meta.trainingArea?'training':meta.boss?'boss':meta.rareEncounter?'rare':'normal';
}

export function reserveFestivalBattle(meta,enemies,beginBattle,{now=Date.now(),newId=()=>crypto.randomUUID()}={}){
 if(!isFestivalBattle(meta,now)||!Array.isArray(enemies)||enemies.length<1||enemies.length>5)return null;
 const enemyIds=enemies.map(e=>String(e?.bestiaryId??e?.id??''));
 if(enemyIds.some(id=>!id||id.length>120))return null;
 const battleId=newId(),battleType=festivalBattleType(meta);
 // An explicit Promise constructor is not needed: the microtask also avoids
 // throwing from the battle-start path if a networking wrapper rejects.
 const ticketPromise=Promise.resolve().then(()=>beginBattle({battleId,enemyIds,battleType}))
  .then(r=>r?.ok===true&&r?.protocol===2)
  .catch(()=>false);
 return {battleId,battleType,enemyIds,ticketPromise};
}

export async function buildRecordedFestivalVictory(proof,audit){
 if(!audit?.battleId||!Array.isArray(audit.enemyIds)||!audit.enemyIds.length)return null;
 const ticketed=Boolean(await proof?.ticketPromise);
 // A missing or rejected ticket keeps a normal (legacy) battle pending; it does
 // not silently discard the user's already-completed fight.
 return {battleId:audit.battleId,enemyIds:audit.enemyIds,battleType:audit.battleType,
  clientAt:audit.clientAt,...(ticketed?{protocol:2}:{})};
}
