/** Deterministic UI-side decision making; never awards XP or bypasses battle/raid rules. */
import { getElementMultiplier, getSkillElement } from './elements.js';

export const AUTO_DEFAULTS=Object.freeze({enabled:false,speed:1,strategy:'balanced'});
const SPEEDS=[1,2,4];
export function normalizeAutoSettings(raw={}){
 return {enabled:raw?.enabled===true,speed:SPEEDS.includes(Number(raw?.speed))?Number(raw.speed):1,strategy:['balanced','aggressive','safe'].includes(raw?.strategy)?raw.strategy:'balanced'};
}
const pct=a=>Number(a?.hp??0)/Math.max(1,Number(a?.maxHp??1));
const readySkill=(skill,actor)=>skill&&Number(skill.mp??0)<=Number(actor?.mp??0);
const strongestLowHp=arr=>[...arr].sort((a,b)=>pct(a)-pct(b))[0];
const isMagic=s=>s?.kind==='magic'||s?.type==='magic';
const enemyDebuffed=(enemy,skill)=>{
 if(!enemy)return true;
 const ailments=enemy.statusAilments??[],debuffs=enemy.debuffs??[];
 if(skill.status&&ailments.some(x=>x.id===skill.status&&Number(x.turns??0)>1))return true;
 if((skill.defenseDownPct||skill.debuff)&&debuffs.some(x=>Number(x.turns??0)>1))return true;
 return false;
};
function offensiveScore(skill,enemies,actor,strategy){
 const power=Math.max(0,Number(skill.power??100));
 const targets=skill.allTargets?enemies:enemies.slice(0,1);
 const hits=Math.max(1,Number(skill.multiHit??1));
 const mult=targets.reduce((n,e)=>n+getElementMultiplier(getSkillElement(skill),e),0)/Math.max(1,targets.length);
 const offensive=(power*hits/100)*mult*(skill.allTargets?Math.max(1,Math.min(enemies.length,4)*.84):1);
 const utility=skill.debuff||skill.defenseDownPct||skill.status?(enemyDebuffed(enemies[0],skill)?0:.27):0;
 const mpPenalty=(strategy==='aggressive'?.002:.012)*Number(skill.mp??0);
 const threshold=actor.mp/Math.max(1,actor.maxMp??actor.mp);
 return offensive+utility-mpPenalty-(threshold<.2?.40:0);
}
export function chooseAutoAction({actor,allies=[],enemies=[],skills=[],strategy='balanced',warning=false,turn=1,raid=false}){
 const alive=enemies.filter(e=>Number(e.hp??0)>0),friends=allies.filter(a=>Number(a.hp??0)>0);
 if(!actor||!alive.length)return {type:raid?'guard':'defend'};
 if(warning)return {type:raid?'guard':'defend'};
 const usable=skills.filter(s=>readySkill(s,actor));
 const dead=allies.filter(x=>Number(x.hp??0)<=0);
 const revive=usable.filter(s=>s.type==='revive').sort((a,b)=>(a.mp??0)-(b.mp??0))[0];
 if(dead.length&&revive)return {type:'skill',skill:revive,skillId:revive.id,targetId:dead[0].id};
 const danger=strategy==='safe'?.62:strategy==='aggressive'?.26:.43;
 const injured=friends.filter(a=>pct(a)<danger),critical=strongestLowHp(injured);
 if(critical){
  const healers=usable.filter(s=>s.type==='heal');
  const missingMany=friends.filter(a=>pct(a)<.75).length>=2;
  const appropriate=healers.filter(s=>missingMany?s.target==='all':true).sort((a,b)=>Number(b.healRatio??0)*500+Number(b.power??b.flatHeal??0)-(Number(a.healRatio??0)*500+Number(a.power??a.flatHeal??0)));
  const heal=appropriate[0]??healers[0];
  if(heal)return {type:'skill',skill:heal,skillId:heal.id,targetId:heal.target==='all'?actor.id:critical.id};
 }
 // A passive shield shout is a DIFFERENT effect from a mage's active buff.
 // Check the effect ID of each usable skill on its actual targets, rather
 // than blocking every active buff whenever one shield shout is present.
 // For raids keep the separate raidBuff state, which is not a normal buff list.
 const buffIsActive=(target,id)=>(target.buffs??[]).some(e=>e.id===id&&(e.permanent===true||Number(e.turns??0)>1));
 const needsBuff=skill=>{
  if(raid)return Number(actor.raidBuff?.turns??0)<=1;
  const targets=skill.target==='all'?friends:[actor];
  const id=skill.id??'focus';
  return targets.some(target=>!buffIsActive(target,id));
 };
 if((turn<=2||turn%3===1)&&alive.some(x=>Number(x.hp??0)>Math.max(150,(actor.stats?.attack??1)*2))){
  const buffs=usable.filter(s=>s.type==='buff'&&!s.autoPassive&&needsBuff(s));
  if(buffs.length){
   const pick=buffs.sort((a,b)=>Number(b.selfBuff?.attackPct??0)+Number(b.selfBuff?.magicPct??0)+Number(b.selfBuff?.defensePct??0)-(Number(a.selfBuff?.attackPct??0)+Number(a.selfBuff?.magicPct??0)+Number(a.selfBuff?.defensePct??0)))[0];
   return {type:'skill',skill:pick,skillId:pick.id,targetId:actor.id};
  }
 }
 // Apply real utility-only debuffs early, but never recast every turn.
 const strongEnemy=alive.some(x=>Number(x.hp??0)>Math.max(220,(actor.stats?.attack??1)*4));
 if(strongEnemy&&(turn===1||(turn>1&&turn<=7&&turn%3===1))){
  const debuffSkill=usable.find(s=>['attack','magic'].includes(s.type)&&Number(s.power??0)<=0&&(s.debuff||s.defenseDownPct||s.status)&&!enemyDebuffed(alive[0],s));
  if(debuffSkill)return {type:'skill',skill:debuffSkill,skillId:debuffSkill.id,targetId:alive[0].id};
 }
 const offense=usable.filter(s=>['attack','magic'].includes(s.type)&&Number(s.power??0)>0);
 const target=[...alive].sort((a,b)=>Number(a.hp??0)-Number(b.hp??0))[0];
 const best=offense.map(s=>({skill:s,score:offensiveScore(s,alive,actor,strategy)})).sort((a,b)=>b.score-a.score)[0];
 if(best&&best.score>(strategy==='safe'?1.18:strategy==='aggressive'?.80:1.0))return {type:'skill',skill:best.skill,skillId:best.skill.id,targetId:target?.id};
 return {type:'attack',targetId:target?.id};
}
