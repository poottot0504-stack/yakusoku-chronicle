import { EQUIPMENT } from '../data/equipment.js';

// Resolve by immutable inventory instance ID, not by a character's editable name.
export function depthAccessoryEffects(state,character){
 const ids=[character?.equipment?.accessory1,character?.equipment?.accessory2,character?.equipment?.weapon].filter(Boolean);
 const defs=ids.map(ref=>{
  const item=typeof ref==='object'?ref:state?.equipmentInventory?.find(x=>x.instanceId===ref);
  return EQUIPMENT[item?.equipmentId]??null;
 }).filter(Boolean);
 return {
  mashoTurnRegenRatio:Math.min(.05,defs.reduce((sum,d)=>sum+Math.max(0,Number(d.turnRegenRatio??0)),0)),
  mashoTurnMpRegenRatio:Math.min(.05,defs.reduce((sum,d)=>sum+Math.max(0,Number(d.turnMpRegenRatio??d.turnRegenRatio??0)),0)),
  mashoArmorShredPerHit:Math.max(0,...defs.map(d=>Number(d.armorShredPerHit??0))),
  mashoArmorShredMaxStacks:Math.max(0,...defs.map(d=>Number(d.armorShredMaxStacks??0)))
 };
}

export function applyDepthArmorShred(attacker,target,damage){
 if(attacker?.side!=='ally'||target?.side!=='enemy'||!(damage>0)||!(target?.hp>0))return false;
 const rate=Number(attacker.mashoArmorShredPerHit??0);
 if(!(rate>0))return false;
 const maximum=Math.min(10,Math.max(1,Number(attacker.mashoArmorShredMaxStacks??10)));
 target.mashoArmorShredStacks=Math.min(maximum,Math.max(0,Number(target.mashoArmorShredStacks??0))+1);
 return true;
}

export function applyDepthTurnRegen(actor){
 if(!actor||actor.side!=='ally'||!(actor.hp>0))return {hp:0,mp:0};
 const rate=Math.max(0,Math.min(.05,Number(actor.mashoTurnRegenRatio??0)));
 const mpRate=Math.max(0,Math.min(.05,Number(actor.mashoTurnMpRegenRatio??rate)));
 if(rate<=0&&mpRate<=0)return {hp:0,mp:0};
 const hpBefore=actor.hp,mpBefore=actor.mp??0;
 if(rate>0)actor.hp=Math.min(actor.maxHp,actor.hp+Math.max(1,Math.floor(actor.maxHp*rate)));
 if(mpRate>0)actor.mp=Math.min(actor.maxMp??0,(actor.mp??0)+Math.max(1,Math.floor((actor.maxMp??0)*mpRate)));
 return {hp:actor.hp-hpBefore,mp:actor.mp-mpBefore};
}
