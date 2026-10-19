import { ENEMIES,ENEMY_LIST,STORY_BOSS_FIRST_LIST,STORY_BOSS_NGP_LIST } from '../data/enemies.js';
import { getHero } from '../state/game-state.js';
import { createEquipmentInstance } from '../data/equipment.js';
function ensure(state,id){state.bestiary??={};return state.bestiary[id]??=( {encounters:0,defeats:0,elements:{},skills:[],drops:[]} );}

export function syncLegacyStoryBossBestiary(state){
 state.bestiary??={};
 const cleared=new Set(state.adventure?.completedRegions??[]);
 const firstEndingSeen=Boolean(state.story?.firstEndingSeen)||(state.cycle??1)>=2;
 for(const boss of STORY_BOSS_FIRST_LIST){
  if(!firstEndingSeen&&!cleared.has(boss.regionId))continue;
  const rec=ensure(state,boss.id);
  rec.encounters=Math.max(1,rec.encounters??0);
  rec.defeats=Math.max(1,rec.defeats??0);
 }
 if((state.cycle??1)>=2){
  for(const boss of STORY_BOSS_NGP_LIST){
   if(!cleared.has(boss.regionId))continue;
   const rec=ensure(state,boss.id);
   rec.encounters=Math.max(1,rec.encounters??0);
   rec.defeats=Math.max(1,rec.defeats??0);
  }
 }
 return state.bestiary;
}
export function recordEncounter(state,id){const e=ensure(state,id);e.encounters++;return e;}
export function recordObservedElement(state,id,element,multiplier){const e=ensure(state,id);e.elements[element]=multiplier;return e;}
export function recordObservedSkill(state,id,skillId){const e=ensure(state,id);if(!e.skills.includes(skillId))e.skills.push(skillId);return e;}
export function recordObservedDrop(state,id,dropId){const e=ensure(state,id);if(!e.drops.includes(dropId))e.drops.push(dropId);return e;}
export function recordDefeat(state,id){const e=ensure(state,id);e.defeats++;const complete=ENEMY_LIST.every(x=>(state.bestiary?.[x.id]?.defeats??0)>0);if(complete){state.equipmentInventory??=[];if(!state.equipmentInventory.some(x=>x.equipmentId==='promise-memory'))state.equipmentInventory.push(createEquipmentInstance('promise-memory','promise-memory-ring'));state.inventory=(state.inventory??[]).filter(x=>x.id!=='promise-memory');state.titles??=[];if(!state.titles.includes('魔物博士'))state.titles.push('魔物博士');}return e;}
export function getBestiaryEntry(state,id){const def=ENEMIES[id];const e=state.bestiary?.[id];if(!e||e.encounters<=0)return {id,name:'？？？',encountered:false};return {id,name:def?.name??id,image:def?.image??null,encountered:true,defeats:e.defeats,elements:{...e.elements},skills:[...e.skills],drops:[...e.drops]};}
export function createBestiaryRematch(state,id){const def=ENEMIES[id];if(def?.rareMonster)throw new Error('希少モンスターとは図鑑から再戦できません');if(def?.eclipseEvent)throw new Error('星蝕の魔物とはイベント期間中の専用クエストで戦ってください');const e=state.bestiary?.[id];if(!e||e.defeats<=0)throw new Error('未討伐の魔物とは再戦できません');const hero=getHero(state);return {mode:'rematch',enemy:{...structuredClone(def),level:hero?.level??def.level,enemyClass:def.enemyClass??'normal',rematch:true}};}
