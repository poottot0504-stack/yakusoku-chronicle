import { CHARACTER_TEMPLATES } from '../data/characters.js';
export const MAX_CHARACTER_NAME_LENGTH = 8;

function getCharacter(state, characterId) {
  const character = state?.characters?.find(c => c.id === characterId);
  if (!character) throw new Error('キャラクターが見つかりません');
  return character;
}

function normalizedName(value) {
  const name = String(value ?? '').trim();
  if (!name) throw new Error('名前を入力してください');
  if (Array.from(name).length > MAX_CHARACTER_NAME_LENGTH) throw new Error('名前は8文字以内で入力してください');
  return name;
}

export function renameCharacter(state, characterId, value) {
  const character = getCharacter(state, characterId);
  character.defaultName ??= character.name;
  character.name = normalizedName(value);
  return character.name;
}

export function resetCharacterName(state, characterId) {
  const character = getCharacter(state, characterId);
  character.defaultName ??= character.name;
  character.name = character.defaultName;
  return character.name;
}


// Story introductions are authored with the original eight names. Replace them
// in a single pass, matching longer names first so "レン" never edits "アレン".
// Include unchanged names in the matcher to protect them from substring edits.
// Never use this on dynamic battle or level-up messages, which already contain
// the player's current names.
export function personalizeStoryNames(state, text) {
  const source=String(text??'');
  const players=new Map((state?.characters??[]).map(c=>[c.id,c]));
  const originals=new Map();
  for(const template of CHARACTER_TEMPLATES){
    const player=players.get(template.id);
    const original=String(template.name??'');
    if(original)originals.set(original,String(player?.name??original));
  }
  // Preserve legacy character names when a save has a non-standard defaultName.
  for(const player of state?.characters??[]){
    const original=String(player.defaultName??'');
    if(original&&!originals.has(original))originals.set(original,String(player.name??original));
  }
  const names=[...originals.keys()].sort((a,b)=>b.length-a.length);
  if(!names.length)return source;
  const escapeRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return source.replace(new RegExp(names.map(escapeRe).join('|'),'g'),original=>originals.get(original)??original);
}
