// 盾士・大盾士: 4人パーティの左から右への並び順に応じて自動護衛する。
// 1体の被弾につき左側で最初に有効な護衛者だけが肩代わりする。
import { applyTimedEffect } from './effects.js';
export const SHIELD_GUARD_JOBS=Object.freeze(['shielder','greatShielder']);
const HP_LEVELS=[10,20,30,45,60];
const DEF_LEVELS=[80,95,100,120,150];
export const isShieldGuardJob=(jobId)=>SHIELD_GUARD_JOBS.includes(jobId);
export const shieldJobLevel=a=>Math.max(1,Number(a?.jobLevels?.[a?.currentJob]??1)||1);
export const shieldProgressRate=(level,thresholds)=>thresholds.filter(min=>level>=min).length*.03;
export function shieldProgressBonus(character,kind){
 if(!isShieldGuardJob(character?.currentJob))return 0;
 const lv=shieldJobLevel(character);
 return shieldProgressRate(lv,kind==='hp'?HP_LEVELS:DEF_LEVELS);
}
export function shieldStatusImmunity(character,status){
 return isShieldGuardJob(character?.currentJob)&&shieldJobLevel(character)>=250&&
  ['curse','confusion'].includes(status);
}
export function applyShieldOpeningShouts(battle){
 if(!battle||battle.turnNumber!==0)return [];
 const allies=battle.actors?.filter(a=>a.side==='ally'&&a.hp>0)??[];
 const active=new Set(),logs=[];
 for(const protector of allies){
  if(!isShieldGuardJob(protector.currentJob)||shieldJobLevel(protector)<70)continue;
  const isGreat=protector.currentJob==='greatShielder';
  const id=isGreat?'shieldDefenseShout':'shieldAttackShout';
  if(active.has(id))continue;
  active.add(id);
  const values=isGreat?{defensePct:.20}:{attackPct:.20,magicPct:.20};
  for(const target of allies)applyTimedEffect(target,{kind:'buff',id,turns:3,...values});
  logs.push(`🛡️ ${protector.name}の${isGreat?'防御':'攻撃'}の掛け声！ 味方全体の${isGreat?'防御':'攻撃・魔法'}が20%上昇（3ターン）`);
 }
 battle.log?.push(...logs);
 return logs;
}
export function shielderCoverTarget(allies,target){
 if(!target||target.hp<=0)return null;
 const index=allies.findIndex(x=>x.id===target.id);
 if(index<0)return null;
 for(let pos=0;pos<index;pos++){
  const protector=allies[pos];
  if(!isShieldGuardJob(protector.currentJob)||protector.hp<=0||
     protector.statusAilments?.some(e=>e.turns>0&&['sleep','paralysis','freeze'].includes(e.id)))continue;
  const distance=index-pos;
  if((protector.currentJob==='shielder'&&distance!==1)||
     (protector.currentJob==='greatShielder'&&distance!==1))continue;
  return protector;
 }
 // A Great Shielder also guards the character immediately to their left.
 const protector=allies[index+1];
 if(protector?.currentJob==='greatShielder'&&protector.hp>0&&
    !protector.statusAilments?.some(e=>e.turns>0&&['sleep','paralysis','freeze'].includes(e.id)))
   return protector;
 return null;
}
export function distributeShieldCover(actors,target,amount,{allTargets=false,allowNoSide=false}={}){
 const damage=Math.max(0,Math.floor(Number(amount)||0));
 if((target?.side!=='ally'&&!allowNoSide)||damage<=0)return {protectedDamage:damage,guardDamage:0,guard:null};
 const allies=(actors??[]).filter(a=>a.side==='ally'||allowNoSide&&a.side==null);
 const guardian=shielderCoverTarget(allies,target);
 if(!guardian)return {protectedDamage:damage,guardDamage:0,guard:null};
 const share=shieldJobLevel(guardian)>=300?damage:Math.floor(damage/2);
 const cut=Math.max(0,Number(guardian.shieldCoverReduction??0));
 // Area attacks also redirect adjacent damage. The guard stance itself mitigates redirected damage by 35%, but cannot
 // make redirected damage 0; thus a tank can still be knocked out.
 const absorbed=Math.max(1,Math.round(share*.65*(1-Math.min(.5,cut))));
 return {protectedDamage:damage-share,guardDamage:absorbed,guard:guardian};
}
export function applyShieldCoverDamage(battle,target,amount,options={}){
 const split=distributeShieldCover(battle?.actors,target,amount,options);
 target.hp=Math.max(0,target.hp-split.protectedDamage);
 if(split.guard){
  split.guard.hp=Math.max(0,split.guard.hp-split.guardDamage);
  battle?.log?.push(`🛡️ ${split.guard.name}が${target.name}をかばった！（肩代わり ${split.guardDamage}ダメージ）`);
 }
 return split;
}
