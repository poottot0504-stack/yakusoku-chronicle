import { normalizeCharacter } from './save-schema.js';

const TIER_JOB_LEVEL = { early:10, mid:30, late:50, hiddenEvent:60, hiddenBoss:70 };

export function createJoinCharacter(template, heroLevel) {
  const favoredJob = template.favoredJob ?? template.currentJob ?? 'swordsman';
  const jobLv = TIER_JOB_LEVEL[template.joinTier] ?? 1;
  return normalizeCharacter({
    ...template,
    isHero:false,
    level:Math.max(1, Math.floor(heroLevel * 0.9)),
    currentJob:favoredJob,
    favoredJob,
    jobLevels:{ ...(template.jobLevels ?? {}), [favoredJob]: template.jobLevels?.[favoredJob] ?? jobLv }
  });
}

export function recruitCharacter(state, template) {
  if (state.characters.length >= 8) throw new Error('仲間は8人までです');
  if (state.characters.some(c => c.id === template.id)) throw new Error('同じキャラクターは加入済みです');
  const hero = state.characters.find(c=>c.isHero) ?? state.characters[0];
  const character = createJoinCharacter(template, hero?.level ?? 1);
  state.characters.push(character);
  return character;
}

export function setActiveParty(state, characterIds) {
  if (!Array.isArray(characterIds) || characterIds.length < 1 || characterIds.length > 4) throw new Error('戦闘編成は1〜4人です');
  if (new Set(characterIds).size !== characterIds.length) throw new Error('同じキャラクターを重複編成できません');
  const ids = new Set(state.characters.map(c=>c.id));
  if (characterIds.some(id=>!ids.has(id))) throw new Error('未加入のキャラクターは編成できません');
  state.activePartyIds = [...characterIds];
  return state.activePartyIds;
}
