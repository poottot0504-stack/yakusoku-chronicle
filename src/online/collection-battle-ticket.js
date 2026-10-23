import {COLLECTION_EVENT_202611 as EVENT} from '../data/collection-event-202611.js';
import {isCollectionNormalBattle} from '../core/collection-event.js';
import {ENEMIES} from '../data/enemies.js';
export function reserveCollectionBattle(meta,enemies,begin,options={}){
 const now=options.now??Date.now();
 if(now<EVENT.startsAt||now>=EVENT.endsAt||!isCollectionNormalBattle(meta)
    ||!Array.isArray(enemies)||enemies.length<1||enemies.length>5)return null;
 const ids=enemies.map(e=>String(e?.bestiaryId??''));
 if(ids.some(id=>!ENEMIES[id]||ENEMIES[id].isBoss||ENEMIES[id].rareMonster||
     ENEMIES[id].event||ENEMIES[id].rare||id.startsWith('event-')||
     id.startsWith('rare-')||ENEMIES[id].regionId!==meta.regionId&&
       !ENEMIES[id].allRegions))return null;
 const battleId=options.newId?.()??crypto.randomUUID();
 const payload={battleId,regionId:meta.regionId,enemyIds:ids,
  displayName:String(options.displayName??'旅人').slice(0,40)};
 const ticketPromise=Promise.resolve().then(()=>begin(payload))
   .then(r=>r?.ok===true&&r?.battleId===battleId).catch(()=>false);
 return {battleId,startedAt:now,enemyIds:ids,ticketPromise};
}
