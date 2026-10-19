import { EQUIPMENT } from '../data/equipment.js';
import { JOBS } from '../data/jobs.js';
import { getCharacterResourceCaps } from './combat-stats.js';
import { getEnhancedStats } from './forge.js';
import { getRequiredJobLevel } from './equipment-requirements.js';

function weaponJobLabel(item){
 const jobs=Object.values(JOBS).filter(job=>job.weaponTypes?.includes(item.weaponType)&&(!item.allowedJobs||item.allowedJobs.includes(job.id)));
 if(!jobs.length)return '';
 return `${jobs.map(job=>job.name).join('・')}装備可`;
}
const ARMOR_JOB_LABELS={
 swordsman:'剣士専用',magic:'魔法使い・ヒーラー専用',thief:'盗賊専用',fighter:'格闘家専用',archer:'アーチャー専用'
};
export function equipmentJobLabel(item){
 if(!item)return '';
 if(item.slot==='weapon')return weaponJobLabel(item);
 if(item.eventJobGroup){const m={swordsman:'剣士専用',mage:'魔法使い専用',healer:'ヒーラー専用',thief:'盗賊専用',fighter:'格闘家専用',archer:'アーチャー専用',bard:'吟遊詩人専用'};return m[item.eventJobGroup]??'';}
 if(item.allowedJobs)return item.allowedJobs.map(id=>JOBS[id]?.name??id).join('・')+'専用';
 if(item.armorGroup)return ARMOR_JOB_LABELS[item.armorGroup]??'';
 return '';
}

function equippedWeaponDef(character,state){const ref=character.equipment?.weapon;if(!ref)return null;if(typeof ref==='object')return EQUIPMENT[ref.equipmentId];const inst=state?.equipmentInventory?.find(x=>x.instanceId===ref);return EQUIPMENT[inst?.equipmentId??ref]??null;}
export function canEquipForJob(character,item,state){
 if(!item)return false;
 if(item.ownerCharacterId&&item.ownerCharacterId!==character.id)return false;
 if(item.allowedJobs&&!item.allowedJobs.includes(character.currentJob))return false;
 const job=JOBS[character.currentJob];if(!job)return false;
 if(item.armorGroup&&!job.equipmentGroups?.includes(item.armorGroup))return false;
 if(item.slot==='weapon')return job.weaponTypes.includes(item.weaponType);
 if(item.slot==='shield'&&!item.mashoOffhand&&!item.festivalOffhand){
   if(job.shield==='none')return false;
   if(job.shield==='small'&&item.shieldSize!=='small')return false;
 }
 return true;
}
export function canEquip(character,item,state,instance=null){
 if(!canEquipForJob(character,item,state))return false;const jobLevel=character.jobLevels?.[character.currentJob]??1;if(jobLevel<getRequiredJobLevel(item,instance))return false;
 const job=JOBS[character.currentJob];
 if(item.slot==='shield'&&!item.mashoOffhand&&!item.festivalOffhand){
   if(job.shield==='none')return false;const w=equippedWeaponDef(character,state);if(w?.twoHanded)return false;
   if(job.shield==='small'&&item.shieldSize!=='small')return false;
   if(job.shield==='staffOnly'&&w?.weaponType!=='staff')return false;
 }
 return true;
}
function clampResources(state,c){const {maxHP,maxMP}=getCharacterResourceCaps(state,c);c.hp=Math.max(0,Math.min(maxHP,c.hp??0));c.mp=Math.max(0,Math.min(maxMP,c.mp??0));}
const ownerId=inst=>EQUIPMENT[inst?.equipmentId]?.ownerCharacterId??inst?.ownerCharacterId??inst?.dedicatedOwnerId;
function resolveSlot(item,slot){if(!item)throw new Error('装備が見つかりません');if(item.slot==='accessory'){const expected=item.accessoryType==='charm'?'accessory2':'accessory1';if(slot!==expected)throw new Error(item.accessoryType==='charm'?'チャーム欄に装備してください':'指輪欄に装備してください');return slot;}if(item.slot!==slot)throw new Error('装備スロットが違います');return slot;}
export function equipItem(state,characterId,instanceId,slot){
 const c=state.characters.find(x=>x.id===characterId);const inst=state.equipmentInventory.find(x=>x.instanceId===instanceId);if(!c||!inst)throw new Error('装備が見つかりません');const item=EQUIPMENT[inst.equipmentId];resolveSlot(item,slot);
 if(ownerId(inst)&&ownerId(inst)!==c.id)throw new Error('この装備は別の仲間の専用装備です');
 if(!canEquip(c,item,state,inst))throw new Error(`装備できません。必要職業Lv ${getRequiredJobLevel(item,inst)}`);
 if(item.unique&&['accessory1','accessory2'].includes(slot)){const other=slot==='accessory1'?'accessory2':'accessory1';const oi=state.equipmentInventory.find(x=>x.instanceId===c.equipment?.[other]);if(oi?.equipmentId===inst.equipmentId)throw new Error('同じユニーク装備は重複装備できません');}
 const changed=new Set([c]);
 for(const wearer of state.characters??[])for(const [oldSlot,ref] of Object.entries(wearer.equipment??{}))if((typeof ref==='object'?ref?.instanceId:ref)===instanceId){wearer.equipment[oldSlot]=null;changed.add(wearer);}
 c.equipment??={};
 if(item.slot==='weapon'&&item.twoHanded&&c.equipment.shield)c.equipment.shield=null;
 c.equipment[slot]=instanceId;for(const wearer of changed)clampResources(state,wearer);return c;
}
export function unequipAllEquipment(state,characterId){
 const character=(state.characters??[]).find(c=>c.id===characterId);
 if(!character)throw new Error('キャラクターが見つかりません');
 const slots=Object.keys(character.equipment??{});
 const changed=slots.filter(slot=>Boolean(character.equipment[slot]));
 for(const slot of changed)character.equipment[slot]=null;
 clampResources(state,character);
 return {character,removed:changed.length};
}

export function unequipItem(state,characterId,slot){const c=state.characters.find(x=>x.id===characterId);if(!c)throw new Error('キャラクターが見つかりません');const old=c.equipment[slot];c.equipment[slot]=null;return old;}
export function getEquippedItems(character,state){return Object.values(character.equipment??{}).filter(Boolean).map(ref=>typeof ref==='object'?ref:state?.equipmentInventory?.find(x=>x.instanceId===ref)??null).filter(Boolean);}


function recommendationScore(character,inst){
 const def=EQUIPMENT[inst?.equipmentId];if(!def)return -Infinity;
 const stats=getEnhancedStats(inst),job=JOBS[character.currentJob],base=job?.stats??{attack:3,defense:3,magic:3,speed:3};
 const attackW=1.8+Number(base.attack??3)*.62,magicW=1.8+Number(base.magic??3)*.62,defenseW=1.2+Number(base.defense??3)*.48,speedW=1.1+Number(base.speed??3)*.42;
 const hpW=.035+Number(base.defense??3)*.008,mpW=.035+Number(base.magic??3)*.018;
 const resist=Object.values(def.elementResist??{}).reduce((n,v)=>n+Math.max(0,Number(v)||0),0);
 const enhanceBonus=Math.max(0,Number(inst.enhanceLevel??0))*.15+(inst.trueEvolved?4:0);
 return Number(stats.attack??0)*attackW+Number(stats.magic??0)*magicW+Number(stats.defense??0)*defenseW+Number(stats.speed??0)*speedW+Number(stats.maxHp??0)*hpW+Number(stats.maxMp??0)*mpW+resist*170+enhanceBonus;
}
function availableRecommendationInstances(state,character){
 const occupied=new Map();
 for(const c of state.characters??[])for(const ref of Object.values(c.equipment??{})){const id=typeof ref==='object'?ref?.instanceId:ref;if(id)occupied.set(id,c.id);}
 return (state.equipmentInventory??[]).filter(inst=>{const owner=ownerId(inst),wearer=occupied.get(inst.instanceId);return (!owner||owner===character.id)&&(!wearer||wearer===character.id);});
}
function jobLevelAllows(character,def,inst=null){return (character.jobLevels?.[character.currentJob]??1)>=getRequiredJobLevel(def,inst);}
function shieldCompatibleForWeapon(character,shieldDef,weaponDef,state,shieldInstance=null){
 if(!shieldDef||!canEquipForJob(character,shieldDef,state)||!jobLevelAllows(character,shieldDef,shieldInstance))return false;
 const job=JOBS[character.currentJob];if(!job||job.shield==='none'||weaponDef?.twoHanded)return false;
 if(job.shield==='small'&&shieldDef.shieldSize!=='small')return false;
 if(job.shield==='staffOnly'&&weaponDef?.weaponType!=='staff')return false;
 return true;
}
function bestBySlot(character,instances,slot,state){
 let best=null,bestScore=-Infinity;
 for(const inst of instances){const def=EQUIPMENT[inst.equipmentId];if(!def)continue;const actual=def.slot==='accessory'?(def.accessoryType==='charm'?'accessory2':'accessory1'):def.slot;if(actual!==slot)continue;if(!canEquipForJob(character,def,state)||!jobLevelAllows(character,def,inst))continue;const score=recommendationScore(character,inst);if(score>bestScore){best=inst;bestScore=score;}}
 return best;
}
export function equipRecommendedEquipment(state,characterId){
 const c=state.characters?.find(x=>x.id===characterId);if(!c)throw new Error('キャラクターが見つかりません');
 const pool=availableRecommendationInstances(state,c);if(!pool.length)throw new Error('おすすめできる装備がありません');
 const weapons=pool.filter(inst=>EQUIPMENT[inst.equipmentId]?.slot==='weapon'&&canEquipForJob(c,EQUIPMENT[inst.equipmentId],state)&&jobLevelAllows(c,EQUIPMENT[inst.equipmentId],inst));
 const shields=pool.filter(inst=>EQUIPMENT[inst.equipmentId]?.slot==='shield');
 let bestWeapon=null,bestShield=null,bestCombo=-Infinity;
 for(const weapon of weapons){
   const wDef=EQUIPMENT[weapon.equipmentId];let shield=null,shieldScore=0;
   if(!wDef.twoHanded){for(const candidate of shields){const sDef=EQUIPMENT[candidate.equipmentId];if(!shieldCompatibleForWeapon(c,sDef,wDef,state,candidate))continue;const score=recommendationScore(c,candidate);if(!shield||score>shieldScore){shield=candidate;shieldScore=score;}}}
   const combo=recommendationScore(c,weapon)+shieldScore;if(combo>bestCombo){bestCombo=combo;bestWeapon=weapon;bestShield=shield;}
 }
 const before={...(c.equipment??{})};c.equipment??={};
 if(bestWeapon) equipItem(state,c.id,bestWeapon.instanceId,'weapon');
 if(bestShield){try{equipItem(state,c.id,bestShield.instanceId,'shield');}catch{}}
 for(const slot of ['head','body','arms','waist','legs','accessory1','accessory2']){const best=bestBySlot(c,pool,slot,state);if(best){try{equipItem(state,c.id,best.instanceId,slot);}catch{}}}
 normalizeEquipmentOwnership(state);clampResources(state,c);
 const changed=Object.keys(c.equipment??{}).filter(slot=>(before[slot]??null)!==(c.equipment?.[slot]??null));
 return {character:c,changedSlots:changed};
}

export function normalizeEquipmentForJob(state,character,{preserveAccessories=false}={}){for(const slot of Object.keys(character.equipment??{})){const ref=character.equipment[slot];if(!ref)continue;const inst=typeof ref==='object'?ref:state.equipmentInventory?.find(x=>x.instanceId===ref);const item=EQUIPMENT[inst?.equipmentId??ref];if(preserveAccessories&&['accessory1','accessory2'].includes(slot)&&!item?.raidGear&&!item?.allowedJobs&&canEquip(character,item,state,inst))continue;if(item&&!canEquip(character,item,state,inst))character.equipment[slot]=null;}clampResources(state,character);return character;}

export function normalizeEquipmentOwnership(state){
 const used=new Set();
 for(const c of state.characters??[])for(const [slot,ref] of Object.entries(c.equipment??{})){
  if(!ref)continue;
  const iid=typeof ref==='object'?ref.instanceId:ref;
  const inst=(state.equipmentInventory??[]).find(x=>x.instanceId===iid)??(typeof ref==='object'?ref:null);
  const item=EQUIPMENT[inst?.equipmentId];let validSlot=false;
  try{validSlot=resolveSlot(item,slot)===slot;}catch{}
  if(!inst||!validSlot||!canEquip(c,item,state,inst)||(ownerId(inst)&&ownerId(inst)!==c.id)||(iid&&used.has(iid))){c.equipment[slot]=null;continue;}
  if(iid)used.add(iid);
 }
 return state;
}
