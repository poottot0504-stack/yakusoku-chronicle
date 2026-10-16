import { applyProgressionCaps } from './progression-caps.js';
import { getHero } from '../state/game-state.js';
import { EQUIPMENT, LEGENDARY_EQUIPMENT_BY_CHARACTER } from '../data/equipment.js';
import { canEquip } from './equipment.js';
export { LEGENDARY_EQUIPMENT_BY_CHARACTER } from '../data/equipment.js';
export function getUnlockedMilestones(state){const h=getHero(state);const out=[];if((h?.level??0)>=100&&state.cycle===1)out.push('firstFinalBoss');if(state.cycle>=2&&(h?.level??0)>=190)out.push('legendaryTrials');if(state.cycle>=2&&(h?.level??0)>=195)out.push('blacksmithTrial');if(state.cycle>=2&&(h?.level??0)>=200)out.push('trueFinalBoss');return out;}
export function unlockPostTrueEndingCaps(state){state.levelCap=500;state.jobCaps={basic:400,advanced:400,special:400};state.endgame??={};state.endgame.unlocked=true;state.endgame.oathbreakerClears??={};return state;}
export function handleBossVictory(state,bossId){state.story??={};state.story.bossFlags??={};state.story.bossFlags[bossId]=true;if(bossId==='firstFinal'){state.story.firstEndingSeen=true;state.hardUnlocked=true;applyProgressionCaps(state);}if(bossId==='blacksmith')state.story.blacksmithDefeated=true;if(bossId==='trueFinal'){state.story.trueEndingSeen=true;unlockPostTrueEndingCaps(state);}return state;}
export function startNewGamePlus(state){if(!state.story?.firstEndingSeen)throw new Error('第一エンディング未達成です');state.cycle=2;applyProgressionCaps(state);const keepFirst=true;const rareGate=state.story.rareGate===true;state.story={firstEndingSeen:keepFirst,bossFlags:{},chapter:1,freeWarpUnlocked:false,rareGate};state.chestState={};state.currentLocationId=state.lastInnId??'start';state.pendingAutosaveReason='newGamePlus';return state;}

export function unlockLegendaryTrials(state){
 const h=getHero(state);if(state.cycle<2||(h?.level??0)<190) return [];
 state.story??={};state.story.legendaryTrialsUnlocked??=state.characters.map(c=>c.id);
 return [...state.story.legendaryTrialsUnlocked];
}
export function completeLegendaryTrial(state,characterId){
 const unlocked=unlockLegendaryTrials(state);if(!unlocked.includes(characterId))throw new Error('伝説試練は未解放です');
 state.story.legendaryTrialsCompleted??=[];if(state.story.legendaryTrialsCompleted.includes(characterId))return null;
 const c=state.characters.find(x=>x.id===characterId);if(!c)throw new Error('キャラクターが見つかりません');
 const equipmentId=LEGENDARY_EQUIPMENT_BY_CHARACTER[characterId];if(!equipmentId)throw new Error('この仲間の伝説装備はありません');
 state.equipmentInventory??=[];const instanceId=`legend-${characterId}-weapon`;let inst=state.equipmentInventory.find(x=>x.instanceId===instanceId);
 if(!inst){inst={instanceId,equipmentId,enhanceLevel:10,trueEvolved:false,dedicatedOwnerId:characterId};state.equipmentInventory.push(inst);}
 if(canEquip(c,EQUIPMENT[equipmentId],state,inst))c.equipment.weapon=instanceId;
 state.story.legendaryTrialsCompleted.push(characterId);return inst;
}
export function unlockBlacksmithTrial(state){const h=getHero(state);return state.cycle>=2&&(h?.level??0)>=195?{id:'blacksmith'}:null;}
export function unlockTrueFinalBoss(state){const h=getHero(state);return state.cycle>=2&&(h?.level??0)>=200?{id:'trueFinal'}:null;}
