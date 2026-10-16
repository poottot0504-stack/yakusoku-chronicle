import { migrateSave } from '../core/save-migration.js';
import { normalizeCharacter } from '../core/save-schema.js';

export function getHero(state) {
  return state.characters.find(c => c.isHero) ?? state.characters[0] ?? null;
}

export function getActiveParty(state) {
  const byId = new Map(state.characters.map(c => [c.id, c]));
  return (state.activePartyIds ?? []).map(id => byId.get(id)).filter(Boolean);
}

export function createNewGame(partyConfig = []) {
  const characters = partyConfig.slice(0, 8).map((c, i) => normalizeCharacter({...c, isHero: c.isHero ?? i === 0}, i));
  return migrateSave({ saveVersion: 3, characters, activePartyIds: characters.slice(0,4).map(c => c.id) });
}
