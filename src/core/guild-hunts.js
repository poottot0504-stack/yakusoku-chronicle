import { QUESTS } from '../data/quests.js';
import { ENEMIES } from '../data/enemies.js';
import { makeEncounterEnemy } from './adventure.js';

/** Accepted guild contracts can be cleared after their target's chapter or weather has passed. */
export function makeGuildHuntEnemy(state,questId,rng=Math.random){
 const quest=QUESTS[questId];
 if(!quest?.generatedSideQuest||quest.npcId!=='guildMaster'||quest.goal?.type!=='defeat')throw new Error('指定討伐の依頼がありません');
 if(state.quests?.[questId]?.status!=='accepted')throw new Error('依頼を受注してから挑戦してください');
 const target=ENEMIES[quest.goal.id];
 if(!target||target.isBoss||target.rareMonster||!target.regionId)throw new Error('依頼対象の魔物を呼び出せません');
 return makeEncounterEnemy(state,target.regionId,rng,quest.goal.id);
}
