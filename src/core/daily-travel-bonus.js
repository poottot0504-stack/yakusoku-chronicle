export const DAILY_TRAVEL_BONUS_START = Date.parse('2026-10-07T15:00:00Z'); // 2026-10-08 00:00 JST
const DAY_MS = 86_400_000;

export const DAILY_TRAVEL_BONUSES = [
  {
    id: 'character-exp',
    name: 'キャラクター経験値2倍',
    description: '戦闘で得られるキャラクター経験値が2倍になります。同種の2倍の書や経験値2倍イベントとは倍率が重複しません。',
    characterExpMultiplier: 2,
  },
  {
    id: 'job-exp',
    name: 'ジョブ経験値2倍',
    description: '戦闘で得られるジョブ経験値が2倍になります。ジョブ同種の2倍の書や経験値2倍イベントとは倍率が重複しません。',
    jobExpMultiplier: 2,
  },
  {
    id: 'gold',
    name: 'もらえるゴールド2倍',
    description: '戦闘勝利でもらえるゴールドが2倍になります。',
    goldMultiplier: 2,
  },
  {
    id: 'enhance',
    name: '強化成功率アップ',
    description: '鍛冶屋の装備強化成功率が15ポイント上昇します。成功率は最大100%です。',
    enhanceSuccessBonus: 0.15,
  },
  {
    id: 'monster-material',
    name: 'モンスター素材ドロップ率アップ',
    description: 'モンスター固有素材のドロップ率が2倍になります。',
    monsterMaterialDropMultiplier: 2,
  },
  {
    id: 'rare-monster',
    name: 'レアモンスター遭遇率アップ',
    description: 'レアモンスターの遭遇率が通常の3倍になります。',
    rareEncounterMultiplier: 3,
  },
];

function seededRandom(seed) {
  let x = (Number(seed) >>> 0) || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function bonusOrderForCycle(cycle, previousLast = -1) {
  const order = DAILY_TRAVEL_BONUSES.map((_, i) => i);
  const rng = seededRandom(0x20261008 ^ Math.imul(cycle + 1, 0x9e3779b1));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (cycle === 0) {
    const firstIndex = order.indexOf(0);
    [order[0], order[firstIndex]] = [order[firstIndex], order[0]];
  }
  if (order[0] === previousLast) {
    const swapIndex = order.findIndex((value, i) => i > 0 && value !== previousLast);
    [order[0], order[swapIndex]] = [order[swapIndex], order[0]];
  }
  return order;
}

export function getDailyTravelBonusDayIndex(now = Date.now()) {
  const t = Number(now);
  if (!Number.isFinite(t) || t < DAILY_TRAVEL_BONUS_START) return -1;
  return Math.floor((t - DAILY_TRAVEL_BONUS_START) / DAY_MS);
}

export function getDailyTravelBonusIndex(dayIndex) {
  const day = Math.floor(Number(dayIndex));
  if (!Number.isFinite(day) || day < 0) return -1;
  const targetCycle = Math.floor(day / DAILY_TRAVEL_BONUSES.length);
  const position = day % DAILY_TRAVEL_BONUSES.length;
  let order = [];
  let previousLast = -1;
  for (let cycle = 0; cycle <= targetCycle; cycle++) {
    order = bonusOrderForCycle(cycle, previousLast);
    previousLast = order.at(-1);
  }
  return order[position];
}

export function getDailyTravelBonus(now = Date.now()) {
  const dayIndex = getDailyTravelBonusDayIndex(now);
  if (dayIndex < 0) {
    return {
      active: false,
      startsAt: DAILY_TRAVEL_BONUS_START,
      nextChangeAt: DAILY_TRAVEL_BONUS_START,
      dayIndex: -1,
    };
  }
  const index = getDailyTravelBonusIndex(dayIndex);
  const bonus = DAILY_TRAVEL_BONUSES[index];
  return {
    ...bonus,
    active: true,
    index,
    dayIndex,
    startsAt: DAILY_TRAVEL_BONUS_START + dayIndex * DAY_MS,
    nextChangeAt: DAILY_TRAVEL_BONUS_START + (dayIndex + 1) * DAY_MS,
  };
}

export function getNextDailyTravelBonusBoundary(now = Date.now()) {
  return getDailyTravelBonus(now).nextChangeAt;
}

export function applyDailyBattleGoldBonus(amount, now = Date.now()) {
  const bonus = getDailyTravelBonus(now);
  const multiplier = bonus.active ? Number(bonus.goldMultiplier ?? 1) : 1;
  return Math.max(0, Math.floor((Number(amount) || 0) * multiplier));
}
