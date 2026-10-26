import { normalizeBattleSkillLoadouts } from './skillbook.js';
import { normalizeSkillPresets,normalizeSkillPresetNames } from './skill-presets.js';
import { normalizeMashoProgress } from './masho-cave.js';
import { normalizeArenaProgress } from './arena.js';
import { normalizeBoostScrolls } from './boost-scrolls.js';
import { applyProgressionCaps } from './progression-caps.js';
import { CURRENT_SAVE_VERSION, createDefaultState, normalizeCharacter } from './save-schema.js';
import { syncRecipeUnlocks } from './crafting.js';
import { normalizeEquipmentForJob, normalizeEquipmentOwnership } from './equipment.js';
import { LEGENDARY_EQUIPMENT_BY_CHARACTER } from '../data/equipment.js';
import { unlockStormSiren } from './encounters.js';

function uniqueExistingActiveIds(ids, characters) {
  const valid = new Set(characters.map(c => c.id));
  const result = [];
  for (const id of ids ?? []) {
    if (valid.has(id) && !result.includes(id) && result.length < 4) result.push(id);
  }
  return result;
}

export function migrateSave(raw = {}) {
  const base = createDefaultState();
  const sourceCharacters = Array.isArray(raw.characters) ? raw.characters : (Array.isArray(raw.party) ? raw.party : []);
  const characters = sourceCharacters.slice(0, 8).map(normalizeCharacter);
  if (characters.length && !characters.some(c => c.isHero)) characters[0].isHero = true;
  const requestedActive = Array.isArray(raw.activePartyIds) ? raw.activePartyIds : characters.slice(0, 4).map(c => c.id);
  let activePartyIds = uniqueExistingActiveIds(requestedActive, characters);
  if (!activePartyIds.length && characters.length) activePartyIds = characters.slice(0, 4).map(c => c.id);
  const migrated = {
    ...base,
    ...raw,
    saveVersion: CURRENT_SAVE_VERSION,
    characters,
    activePartyIds,
    skillPresets: normalizeSkillPresets(raw.skillPresets),
    skillPresetNames: normalizeSkillPresetNames(raw.skillPresetNames),
    bankGold: Number.isSafeInteger(Number(raw.bankGold)) && Number(raw.bankGold)>0 ? Math.min(9_000_000_000_000,Number(raw.bankGold)) : 0,
    inventory: (raw.inventory ?? []).map(x=>({...x})),
    boostScrolls: normalizeBoostScrolls(raw.boostScrolls),
    equipmentInventory: (raw.equipmentInventory ?? []).map(x=>({...x})),
    story: {...(raw.story??{})},
    starterSuppliesGranted: raw.starterSuppliesGranted ?? Boolean(raw.adventure || (raw.cycle??1)>=2 || (raw.inventory??[]).some(x=>['potion','herb'].includes(x.id))),
    starterGearGranted: raw.starterGearGranted ?? Boolean(raw.adventure?.starterGearGranted || (raw.cycle??1)>=2 || (raw.equipmentInventory??[]).some(x=>String(x.instanceId).startsWith('starter-'))),
    world: { ...base.world, ...(raw.world ?? {}) },
    unlockedSpecialJobs: [...(raw.unlockedSpecialJobs ?? [])],
    quests: { ...(raw.quests ?? {}) },
    achievements: { ...(raw.achievements ?? {}) },
    titles: [...(raw.titles ?? [])],
    equipmentBestiary: { ...(raw.equipmentBestiary ?? {}) },
    bestiary: { ...(raw.bestiary ?? {}) },
    rareDropPity: { ...(raw.rareDropPity ?? {}) },
    warpStones: [...(raw.warpStones ?? [])],
    unlockedRecipes: [...(raw.unlockedRecipes ?? [])],
    newRecipes: [...(raw.newRecipes ?? [])],
    jobCaps: { ...base.jobCaps, ...(raw.jobCaps ?? {}) },
    endgame: { ...base.endgame, ...(raw.endgame ?? {}), oathbreakerClears: { ...(raw.endgame?.oathbreakerClears ?? {}) } },
    playTimeSeconds: Math.max(0, Number(raw.playTimeSeconds ?? 0)),
    lastSavedAt: raw.lastSavedAt ?? null,
    market: {
      processedPurchaseIds: [...(raw.market?.processedPurchaseIds ?? [])],
      processedSaleBatchIds: [...(raw.market?.processedSaleBatchIds ?? [])],
      processedReturnIds: [...(raw.market?.processedReturnIds ?? [])],
      everUsed: Boolean(raw.market?.everUsed),
      unlocked: Boolean(raw.market?.unlocked)
    }
  };
  const equipmentById=new Map();
  for(const inst of migrated.equipmentInventory){
    const characterId=inst.instanceId?.match(/^legend-(.+)-weapon$/)?.[1];
    if(characterId&&LEGENDARY_EQUIPMENT_BY_CHARACTER[characterId]&&inst.equipmentId==='heroLegendSword'){
      inst.equipmentId=LEGENDARY_EQUIPMENT_BY_CHARACTER[characterId];inst.dedicatedOwnerId=characterId;
    }
    const key=inst.instanceId??inst;
    const prior=equipmentById.get(key);
    if(!prior)equipmentById.set(key,inst);
    else if(prior.equipmentId===inst.equipmentId){prior.enhanceLevel=Math.max(prior.enhanceLevel??0,inst.enhanceLevel??0);prior.trueEvolved=Boolean(prior.trueEvolved||inst.trueEvolved);}
  }
  migrated.equipmentInventory=[...equipmentById.values()];
  if(migrated.adventure?.completedRegions?.includes('coast')||migrated.story.firstEndingSeen||(migrated.cycle??1)>=2)unlockStormSiren(migrated);
  // Update 59: 旧内部カウンターの楽譜・魔晶石進捗を実アイテムへ引き継ぐ。
  migrated.inventory??=[];
  const addLegacyKey=id=>{if(!migrated.inventory.some(x=>x.id===id))migrated.inventory.push({id,qty:1,unique:true});};
  const oldScores=Math.min(5,migrated.specialJobProgress?.bard?.scores??0),scoreIds=['score-wind','score-forest','score-moon','score-hero','score-ancient'];
  const oldCrystals=Math.min(3,migrated.specialJobProgress?.highWizard?.crystals??0),crystalIds=['crystal-tide','crystal-flame','crystal-star'];
  scoreIds.slice(0,oldScores).forEach(addLegacyKey);crystalIds.slice(0,oldCrystals).forEach(addLegacyKey);
  migrated.specialJobProgress??={};migrated.specialJobProgress.bard??={};migrated.specialJobProgress.highWizard??={};
  migrated.specialJobProgress.bard.scores=scoreIds.filter(id=>migrated.inventory.some(x=>x.id===id&&(x.qty??0)>0)).length;
  migrated.specialJobProgress.highWizard.crystals=crystalIds.filter(id=>migrated.inventory.some(x=>x.id===id&&(x.qty??0)>0)).length;
  const legacyPromise=(migrated.inventory??[]).some(x=>x.id==='promise-memory'&&(x.qty??0)>0);if(legacyPromise){migrated.inventory=(migrated.inventory??[]).filter(x=>x.id!=='promise-memory');migrated.equipmentInventory??=[];if(!migrated.equipmentInventory.some(x=>x.equipmentId==='promise-memory'))migrated.equipmentInventory.push({instanceId:'promise-memory-ring',equipmentId:'promise-memory',enhanceLevel:0,trueEvolved:false});}
  applyProgressionCaps(migrated);
  normalizeMashoProgress(migrated);
  normalizeArenaProgress(migrated);
  for(const character of migrated.characters)normalizeBattleSkillLoadouts(character);
  normalizeEquipmentOwnership(migrated);
  for(const character of migrated.characters)normalizeEquipmentForJob(migrated,character);
  syncRecipeUnlocks(migrated);
  return migrated;
}
