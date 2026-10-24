import { shieldStatusImmunity } from './shielder-guard.js';
const BASE={
 normal:{poison:.70,burn:.70,paralysis:.50,sleep:.40,confusion:.45,freeze:.30,curse:.55,debuff:.70},
 strong:{poison:.50,burn:.50,paralysis:.30,sleep:.25,confusion:.30,freeze:.20,curse:.35,debuff:.50},
 boss:{poison:.30,burn:.30,paralysis:.10,sleep:.10,confusion:.10,freeze:.10,curse:.15,debuff:.30}
};
function bucket(target,kind){if(kind==='buff')return target.buffs??=([]);if(kind==='debuff')return target.debuffs??=([]);return target.statusAilments??=([]);}
export function getEffectiveStatusChance(source,target,effect){
 if(target.guarding)return 0;
 const cls=target.enemyClass??'normal';const key=effect.kind==='debuff'?'debuff':effect.id;
 let chance=effect.chance??BASE[cls]?.[key]??BASE.normal[key]??1;
 if(effect.kind==='status') chance+=source.statusSuccessBonus??source.masteryBonuses?.statusDebuffSuccessBonus??0;
 if(effect.kind==='debuff') chance+=source.debuffSuccessBonus??source.masteryBonuses?.statusDebuffSuccessBonus??0;
 if(target.statusImmunities?.includes(effect.id)||shieldStatusImmunity(target,effect.id)) return 0;
 if(effect.kind==='status') chance*=Math.max(0,1-(target.statusResistance??target.masteryBonuses?.statusResistance??0));
 if((target.statusResistTurns?.[effect.id]??0)>0)return 0;
 return Math.max(0,Math.min(1,chance));
}
export function applyTimedEffect(target,effect,rng=Math.random,source={}){
 if((effect.kind==='status'||effect.kind==='debuff') && rng()>=getEffectiveStatusChance(source,target,effect)) return false;
 const list=bucket(target,effect.kind);const turns=effect.turns??(effect.powerfulPartyWide?2:3);const old=list.find(x=>x.id===effect.id);
 if(old)return false;list.push({...effect,turns});
 return true;
}
export function tickEffects(actor,phase='turnEnd'){
 const tickList=list=>{for(const e of list)e.turns=Math.max(0,e.turns-1);for(let i=list.length-1;i>=0;i--){if(list[i].turns===0){const e=list[i];list.splice(i,1);if(['paralysis','sleep','freeze'].includes(e.id)){actor.statusResistTurns??={};actor.statusResistTurns[e.id]=2;}}}};
 if(phase==='action'||phase==='statusEnd')tickList(actor.statusAilments??[]);else {tickList(actor.buffs??[]);tickList(actor.debuffs??[]);for(const k of Object.keys(actor.statusResistTurns??{}))actor.statusResistTurns[k]=Math.max(0,actor.statusResistTurns[k]-1);}
 return actor;
}
export function cleanseEffects(target,kind='all'){
 if(kind==='status'||kind==='all')target.statusAilments=[];
 if(kind==='debuff'||kind==='all')target.debuffs=[];
 if(kind==='buff'||kind==='all')target.buffs=[];
 return target;
}
export function reviveTarget(target,hpRatio=.3){if(target.hp>0)return target.hp;target.hp=Math.max(1,Math.floor(target.maxHp*hpRatio));return target.hp;}
export function healTarget(target,amount){if(target.hp<=0)return 0;const cursed=target.statusAilments?.some(x=>x.id==='curse'&&x.turns>0);const effective=Math.floor(Math.max(0,amount)*(cursed?.5:1));const before=target.hp;target.hp=Math.min(target.maxHp,target.hp+effective);return target.hp-before;}
