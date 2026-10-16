import { NPCS } from '../data/npcs.js';
import { QUESTS } from '../data/quests.js';
export function getNpcById(npcId){return NPCS[npcId]??null;}
export function getNpcsForLocation(state,location){return Object.values(NPCS).filter(n=>n.location===location&&(!n.weather||state.world?.weather===n.weather));}
export function getNpcQuestState(state,npcId){const npc=getNpcById(npcId);if(!npc)return null;const quests=npc.questIds.map(id=>({quest:QUESTS[id],record:state.quests?.[id]??null})).filter(x=>x.quest);return {npc,quests};}
