import { ENEMIES } from '../data/enemies.js';
import { COLLECTION_EVENT_202611 } from '../data/collection-event-202611.js';

// This is an eligibility / display preview, NOT an anti-cheat receipt.
// Only an independently validated server battle ledger may award ranked items.
const NORMAL_REGIONS = new Set(['field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss']);

export function collectionEventPhase(now=Date.now()){
 const time=Number(now);
 if(!Number.isFinite(time))return 'invalid';
 return time<COLLECTION_EVENT_202611.startsAt?'upcoming':
  time<COLLECTION_EVENT_202611.endsAt?'active':'ended';
}

export function isCollectionNormalBattle(meta={}){
 if(!NORMAL_REGIONS.has(meta?.regionId))return false;
 // No rematches, extra missions, raids, festivals, story bosses, or cave floors.
 if(meta.rematch||meta.trainingArea||meta.guildQuestId||meta.mashoFloor||meta.eventId||
    meta.boss||meta.rareEncounter||meta.isRaid||meta.specialJob||meta.endgameBoss||
    meta.oathbreaker||meta.eidel||meta.legendTrial)return false;
 return true;
}

export function eligibleCollectionDefeats(meta={},actors=[],startedAt=NaN,finishedAt=Date.now()){
 const started=Number(startedAt),finished=Number(finishedAt);
 if(!isCollectionNormalBattle(meta)||!Array.isArray(actors)||
    !Number.isFinite(started)||!Number.isFinite(finished)||finished<started||
    collectionEventPhase(started)!=='active'||collectionEventPhase(finished)!=='active')return [];
 const valid=[];
 const seen=new Set();
 for(const actor of actors){
  if(actor?.side!=='enemy'||!(Number(actor.hp)<=0)||actor.escaped||
     actor.isBoss||actor.rareMonster||actor.event||actor.mashoBoss)continue;
  const bestiaryId=String(actor.bestiaryId??'');
  // Must be a canonical, ordinary enemy; client-created IDs are ineligible.
  const definition=ENEMIES[bestiaryId];
  if(!definition||!NORMAL_REGIONS.has(definition.regionId)||
     (definition.regionId!==meta.regionId&&!definition.allRegions)||
     definition.rare||definition.rareMonster||definition.event||definition.isBoss||
     definition.enemyClass==='boss'||bestiaryId.startsWith('event-')||
     bestiaryId.startsWith('rare-')||seen.has(actor.id))continue;
  seen.add(actor.id);
  valid.push(bestiaryId);
 }
 return valid;
}

export function collectionDropPreview(meta={},actors=[],startedAt=NaN,finishedAt=Date.now()){
 const enemyIds=eligibleCollectionDefeats(meta,actors,startedAt,finishedAt);
 return {eventId:COLLECTION_EVENT_202611.id,itemId:COLLECTION_EVENT_202611.itemId,
  count:enemyIds.length*COLLECTION_EVENT_202611.guaranteedDropsPerMonster,enemyIds};
}
