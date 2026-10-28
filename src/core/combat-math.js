import { isShieldGuardJob,shieldJobLevel } from './shielder-guard.js';
import { getCritRate,getCritMultiplier,getEvasion,getEffectiveCombatStat } from './combat-stats.js';
import { getElementMultiplier, getSkillElement } from './elements.js';
export function calculateHitChance(actor,target,skill={}){
 if(skill.alwaysHit) return 1;
 if(skill.kind==='magic' && skill.canEvade!==true) return 1;
 return Math.max(0,Math.min(1,1-getEvasion(target)));
}
export function rollCritical(actor,skill={},rng=Math.random){if(skill.canCrit===false)return false;return rng()<getCritRate(actor,skill);}
export function calculateDamage(actor,target,skill={},rng=Math.random){
 if(target.guarding&&!isShieldGuardJob(target.currentJob))return 0;
 // 割合攻撃は防御力・属性耐性・クリティカルから独立。防御コマンドは有効。
 if(Number.isFinite(skill.maxHpDamageRatio))return Math.max(0,Math.floor(target.maxHp*Math.max(0,Math.min(1,skill.maxHpDamageRatio))));
 const hitChance=calculateHitChance(actor,target,skill);if(hitChance<1&&rng()>=hitChance)return 0;
 const offensive=getEffectiveCombatStat(actor,skill.kind==='magic'?'magic':'attack');
 // The 27F ring also reduces the defensive component of magic damage.
 // Without this, spells used the target's magic stat and never benefited from armor erosion.
 const armorErosion=Math.min(.01,Math.max(0,Number(target.mashoArmorShredStacks??0))*.001);
 const baseDefense=skill.kind==='magic'?(target.side==='enemy'?getEffectiveCombatStat(target,'magic')*(1-armorErosion):0):getEffectiveCombatStat(target,'defense');const originalPierce=Math.max(0,Math.min(.8,skill.defensePierce??0));
 const effectivePierce=isShieldGuardJob(target.currentJob)&&shieldJobLevel(target)>=200?originalPierce*.5:originalPierce;
 const defense=baseDefense*(1-effectivePierce);
 const raw=(offensive*(skill.power??100)/100)-defense*.28;
 const minimum=skill.kind==='magic'?Math.max(1,Math.ceil(offensive*.7)):Math.max(2,Math.ceil(offensive*.6));
 let damage=Math.max(minimum,Math.floor(raw));
 const crit=rollCritical(actor,skill,rng);if(crit) damage=Math.floor(damage*getCritMultiplier(actor,skill));
 const elementMult=getElementMultiplier(getSkillElement(skill),target);damage=Math.trunc(damage*elementMult);
 if(target.guarding&&isShieldGuardJob(target.currentJob))damage=Math.max(1,Math.round(damage*.5));
 if(Number.isFinite(target.damageCap))damage=Math.min(damage,Math.max(0,target.damageCap));
 return damage;
}
