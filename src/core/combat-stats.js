import { getMashoSetCount } from './masho-set.js';
import { getEnhancedStats } from './forge.js';
import { EQUIPMENT } from '../data/equipment.js';
export function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
export function getCritRate(actor,skill={}){const buff=(actor.buffs??[]).reduce((n,b)=>n+(b.critRate??0),0);return clamp((actor.critRate??.05)+buff+(skill.critRateBonus??0),0,.70);}
export function getCritMultiplier(actor,skill={}){return clamp((actor.critMultiplier??1.5)+(skill.critMultiplierBonus??0),1,2.5);}
export function getEvasion(target){return clamp(target.evasion??0,0,.50);}

export function getEquipmentStatBonus(state,character){const total={attack:0,defense:0,magic:0,speed:0,maxHp:0,maxMp:0};for(const ref of Object.values(character?.equipment??{})){if(!ref)continue;const inst=typeof ref==='object'?ref:state.equipmentInventory?.find(x=>x.instanceId===ref);if(!inst)continue;const stats=getEnhancedStats(inst);for(const k of Object.keys(total))total[k]+=stats[k]??0;}if(getMashoSetCount(state,character)===9)for(const k of Object.keys(total))total[k]+=10;return total;}

const RESIST_KEYS=['fire','water','thunder','ice','light','dark'];
export function getEquipmentElementResist(state,character){
 const total=Object.fromEntries(RESIST_KEYS.map(k=>[k,0]));
 for(const ref of Object.values(character?.equipment??{})){
  if(!ref)continue;
  const inst=typeof ref==='object'?ref:state.equipmentInventory?.find(x=>x.instanceId===ref);
  const def=EQUIPMENT[inst?.equipmentId??ref];if(!def)continue;
  for(const k of RESIST_KEYS)total[k]+=Math.max(0,Number(def.elementResist?.[k]??0));
 }
 for(const k of RESIST_KEYS)total[k]=Math.min(.75,total[k]);
 return total;
}

// Battle actors already contain equipment flat stats; effects never mutate saved stats.
export function getEffectiveCombatStat(actor={},stat){
 const effects=[...(actor.buffs??[]),...(actor.debuffs??[])].filter(e=>e.turns==null||e.turns>0);
 const flat=effects.reduce((n,e)=>n+(e.values?.[stat]??0),0);
 const pct=effects.reduce((n,e)=>n+(e[`${stat}Pct`]??(stat==='magic'?e.attackPct:0)??0),0);
 return Math.max(0,((actor.stats?.[stat]??(['attack','magic'].includes(stat)?1:0))+flat)*Math.max(.25,1+pct));
}
export function getCharacterResourceCaps(state,character){
 const bonus=getEquipmentStatBonus(state,character);
 return {maxHP:Math.max(1,(character?.maxHp??1)+bonus.maxHp),maxMP:Math.max(0,(character?.maxMp??0)+bonus.maxMp)};
}
