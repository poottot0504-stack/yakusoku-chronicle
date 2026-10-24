export const CURRENT_SAVE_VERSION = 7;
export const EQUIPMENT_SLOTS = ['weapon','spellbook','shield','head','body','arms','waist','legs','accessory1','accessory2'];

export function createEmptyEquipment() {
  return Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot, null]));
}

export function normalizeCharacter(raw = {}, index = 0) {
  const id = raw.id ?? `c${index + 1}`;
  return {
    id,
    name: raw.name ?? `仲間${index + 1}`,
    defaultName: raw.defaultName ?? raw.name ?? `仲間${index + 1}`,
    isHero: raw.isHero === true || (index === 0 && raw.isHero !== false),
    level: Math.max(1, Number(raw.level ?? 1)),
    exp: Number(raw.exp ?? 0),
    hiddenExp: Number(raw.hiddenExp ?? 0),
    hp: Number(raw.hp ?? raw.maxHp ?? 100),
    mp: Number(raw.mp ?? raw.maxMp ?? 30),
    maxHp: Number(raw.maxHp ?? raw.hp ?? 100),
    maxMp: Number(raw.maxMp ?? raw.mp ?? 30),
    stats: { attack: 1, defense: 1, magic: 1, speed: 1, ...(raw.stats ?? {}) },
    currentJob: raw.currentJob ?? 'swordsman',
    jobLevels: { ...(raw.jobLevels ?? { [raw.currentJob ?? 'swordsman']: 1 }) },
    jobExp: { ...(raw.jobExp ?? {}) },
    battleSkillLoadouts: structuredClone(raw.battleSkillLoadouts??{}),
    battleSkillLoadoutManual: {...(raw.battleSkillLoadoutManual??{})},
    learnedSkills: [...(raw.learnedSkills ?? [])],
    inheritedSkills: [...(raw.inheritedSkills ?? [])],
    masteredJobs: [...(raw.masteredJobs ?? [])],
    masteryBonuses: { ...(raw.masteryBonuses ?? {}) },
    favoredJob: raw.favoredJob ?? raw.currentJob ?? 'swordsman',
    equipment: { ...createEmptyEquipment(), ...(raw.equipment ?? {}) },
    weaponProficiency: { ...(raw.weaponProficiency ?? {}) },
    titles: [...(raw.titles ?? [])],
    uniqueSkillId: raw.uniqueSkillId ?? null,
    statusAilments: [...(raw.statusAilments ?? [])],
    buffs: [...(raw.buffs ?? [])],
    debuffs: [...(raw.debuffs ?? [])]
  };
}

export function createDefaultState() {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    characters: [],
    activePartyIds: [],
    skillPresets: Array.from({length:10},()=>null),
    skillPresetNames: Array.from({length:10},()=>''),
    gold: 0,
    bankGold: 0,
    inventory: [],
    boostScrolls: {},
    materials: {},
    equipmentInventory: [],
    unlockedRecipes: [],
    newRecipes: [],
    unlockedSpecialJobs: [],
    quests: {},
    achievements: {},
    titles: [],
    equipmentBestiary: {},
    bestiary: {},
    rareDropPity: {},
    lastInnId: null,
    warpStones: [],
    difficulty: 'NORMAL',
    hardUnlocked: false,
    story: {},
    world: { timePhase: 'morning', weather: 'clear', battleCountInPhase: 0 },
    cycle: 1,
    levelCap: 100,
    jobCaps: { basic: 100, advanced: 100, special: 100 },
    playTimeSeconds: 0,
    lastSavedAt: null,
    endgame: { unlocked: false, oathbreakerClears: {}, eidelUnlocked: false, eidelEnding: null },
    market: { processedPurchaseIds: [], processedSaleBatchIds: [], processedReturnIds: [], everUsed: false, unlocked: false }
  };
}
