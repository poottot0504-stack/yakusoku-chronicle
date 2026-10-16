const AUTOSAVE_REASONS=new Set(['inn','bossVictory','importantEvent','rareEquipment','legendaryEquipment']);
export function shouldAutosave(reason){return AUTOSAVE_REASONS.has(reason);}
