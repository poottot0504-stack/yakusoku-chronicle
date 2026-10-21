import { JOBS } from '../data/jobs.js';
import { getCharacterSkillCatalog, getSelectedSkillIds, setBattleSkillLoadout, BATTLE_SKILL_LIMIT } from './skillbook.js';

export const SKILL_PRESET_COUNT = 10;

// Presets belong to the save slot, not to one character or one current job.
// Store canonical (sourceJob, originalId) pairs: learned skills may use different
// battle IDs depending on whether their source job is currently equipped.
const validSkillEntry = entry => {
 if(!entry || typeof entry !== 'object')return null;
 const sourceJob = String(entry.sourceJob ?? '');
 const skillId = String(entry.skillId ?? '');
 if(!JOBS[sourceJob] || !/^[A-Za-z0-9_-]{1,90}$/.test(skillId))return null;
 return {sourceJob,skillId};
};
export function normalizeSkillPresets(raw) {
 const source = Array.isArray(raw) ? raw : [];
 return Array.from({length:SKILL_PRESET_COUNT},(_,index)=>{
  const preset = source[index];
  if(!preset || typeof preset !== 'object' || !Array.isArray(preset.skills))return null;
  const seen = new Set(),skills = [];
  for(const entry of preset.skills){
   const valid = validSkillEntry(entry);
   if(!valid)continue;
   const key = valid.sourceJob+'::'+valid.skillId;
   if(seen.has(key))continue;
   seen.add(key);skills.push(valid);
   if(skills.length>=BATTLE_SKILL_LIMIT)break;
  }
  return {
   originJob: JOBS[preset.originJob] ? preset.originJob : '',
   sourceCharacterName: String(preset.sourceCharacterName??'').slice(0,40),
   skills
  };
 });
}
function assertSlot(slot) {
 const value=Number(slot);
 if(!Number.isInteger(value)||value<1||value>SKILL_PRESET_COUNT)throw new Error('セット番号が不正です');
 return value-1;
}
function findCharacter(state,characterId){
 const character=state?.characters?.find(c=>c.id===characterId);
 if(!character)throw new Error('キャラクターが見つかりません');
 return character;
}
export function getSkillPresets(state){return normalizeSkillPresets(state?.skillPresets);}
export function saveSkillPreset(state,characterId,slot){
 const index=assertSlot(slot),character=findCharacter(state,characterId);
 const catalog=new Map(getCharacterSkillCatalog(character).map(skill=>[skill.id,skill]));
 const skills=getSelectedSkillIds(character).map(id=>catalog.get(id)).filter(Boolean)
  .map(skill=>({sourceJob:skill.sourceJob,skillId:skill.originalId}));
 const presets=getSkillPresets(state);
 presets[index]={originJob:character.currentJob,sourceCharacterName:String(character.name??'').slice(0,40),skills};
 state.skillPresets=presets;
 return {slot:index+1,count:skills.length};
}
export function applySkillPreset(state,characterId,slot){
 const index=assertSlot(slot),character=findCharacter(state,characterId);
 const preset=getSkillPresets(state)[index];
 if(!preset)throw new Error('このセットはまだ保存されていません');
 const available=new Map(getCharacterSkillCatalog(character).filter(s=>s.learned)
  .map(s=>[s.sourceJob+'::'+s.originalId,s.id]));
 const ids=[],seen=new Set();
 for(const skill of preset.skills){
  const id=available.get(skill.sourceJob+'::'+skill.skillId);
  if(id&&!seen.has(id)){ids.push(id);seen.add(id);}
 }
 if(preset.skills.length>0&&ids.length===0)throw new Error('この職業で使える習得済みスキルがありません。転職・習得状況を確認してください');
 // The core setter continues to enforce currently learned skills and the ten-slot cap.
 setBattleSkillLoadout(character,ids);
 return {slot:index+1,equipped:ids.length,skipped:preset.skills.length-ids.length,characterId:character.id};
}
