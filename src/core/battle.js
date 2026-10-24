import { getJobPassive, applyJobPassiveToStat } from '../data/jobs.js';
import { isShieldGuardJob,applyShieldOpeningShouts,applyShieldCoverDamage } from './shielder-guard.js';
import { chooseEnemyAction } from './ai.js';
import { calculateDamage } from './combat-math.js';
import { getEffectiveCombatStat } from './combat-stats.js';
import { healTarget, reviveTarget, applyTimedEffect, tickEffects } from './effects.js';
import { updateEidelPhase } from './eidel.js';
import { ensureEnemyStatusAi } from './enemy-status.js';
import { statusCastChance } from './status-caster-rules.js';
import { getSkillElement, getElementMultiplier, elementLabel } from './elements.js';

const cloneActor=a=>{const out=structuredClone({...a,statusAilments:a.statusAilments??[],buffs:a.buffs??[],debuffs:a.debuffs??[]});if(a.currentJob&&a.level){out.stats={attack:Math.round(a.stats?.attack??1)+(a.battleFlatStats?.attack??0),defense:Math.round(a.stats?.defense??1)+(a.battleFlatStats?.defense??0),magic:Math.round(a.stats?.magic??1)+(a.battleFlatStats?.magic??0),speed:Math.round(a.stats?.speed??1)+(a.battleFlatStats?.speed??0)};const passive=getJobPassive(a.currentJob);if(passive){out.stats[passive.stat]=Math.max(1,applyJobPassiveToStat(a,passive.stat,out.stats[passive.stat]));out.jobPassive=passive.name;}}return out;};
export function createBattle(activeParty,enemy,options={}){
 const enemies=Array.isArray(enemy)?enemy:[enemy];
 const actors=[...activeParty.map(a=>({...cloneActor(a),side:'ally',statusAilments:[],statusResistTurns:{}})),...enemies.map(e=>{const actor={...cloneActor(e),side:'enemy'};actor.ai=ensureEnemyStatusAi(actor);if(actor.isBoss){actor.maxHp=Math.round((actor.maxHp??actor.hp??1)*1.25);actor.hp=actor.maxHp;actor.stats??={};for(const k of ['attack','defense','magic'])actor.stats[k]=Math.round((actor.stats[k]??1)*1.30);actor.stats.speed=Math.round((actor.stats.speed??1)*1.08);actor.bossUpdate26Boost=true;if(actor.eventEnemy){actor.eventBoss=true;actor.eventInstantDeathChance=actor.eventInstantDeathChance??.05;actor.eventInstantDeathName=actor.eventInstantDeathName??'死の宣告';}}return actor;})];
 return {actors,actorMap:Object.fromEntries(actors.map(a=>[a.id,a])),turnOrder:[],turnCursor:0,awaitingActorId:null,actedThisTurn:[],turnNumber:0,isBoss:!!options.isBoss||enemies.some(e=>e.isBoss),log:[],options,plannedActions:{},planningIds:[],planningIndex:0,phase:'planning'};
}
function alive(b){return b.actors.filter(a=>a.hp>0);}
function incapacitating(a){return a.statusAilments?.find(s=>['paralysis','sleep','freeze'].includes(s.id)&&s.turns>0);}
function markActed(b,id){if(!b.actedThisTurn.includes(id))b.actedThisTurn.push(id);}
export function startTurn(battle,rng=Math.random){
 for(const actor of battle.actors)actor.guarding=false;
 // First-turn shouts resolve before speed/command selection and never repeat.
 applyShieldOpeningShouts(battle);
 battle.actedThisTurn=[];battle.turnCursor=0;battle.plannedActions={};battle.phase='planning';
 battle.planningIds=battle.actors.filter(a=>a.side==='ally'&&a.hp>0).map(a=>a.id);battle.planningIndex=0;
 battle.awaitingActorId=battle.planningIds[0]??null;return battle.planningIds;
}
export function getPendingActor(battle){return battle.awaitingActorId?battle.actorMap[battle.awaitingActorId]:null;}
export function undoPlannedAction(battle){if(battle.phase!=='planning'||battle.planningIndex<=0)return false;battle.planningIndex--;const id=battle.planningIds[battle.planningIndex];delete battle.plannedActions[id];battle.awaitingActorId=id;return true;}
function executePlannedTurn(b,rng){
 b.phase='resolving';b.awaitingActorId=null;b.visualTimeline=[];
 for(const [id,action] of Object.entries(b.plannedActions)){
  const actor=b.actorMap[id];if(action?.type==='defend'&&actor?.hp>0&&!actor.skipNextAction&&!incapacitating(actor))actor.guarding=true;
 }
 b.turnOrder=alive(b).sort((a,c)=>getEffectiveCombatStat(c,'speed')-getEffectiveCombatStat(a,'speed')||String(a.id).localeCompare(String(c.id))).map(a=>a.id);
 for(const id of b.turnOrder){
  const a=b.actorMap[id];if(!a||a.hp<=0||battleOutcome(b))continue;
  if(a.skipNextAction){a.skipNextAction=false;continue;}
  const st=incapacitating(a);if(st){b.log.push(`${a.name}は${st.id==='paralysis'?'麻痺':st.id==='sleep'?'睡眠':'凍結'}で動けない！`);continue;}
  let action=a.side==='enemy'?chooseEnemyAction(b,a,rng):(b.plannedActions[id]??{type:'wait'});
  const confused=!isShieldGuardJob(a.currentJob)&&a.statusAilments?.some(x=>x.id==='confusion'&&x.turns>0);
  if(confused&&rng()<.5){const targets=b.actors.filter(x=>x.hp>0&&x.id!==a.id);const target=targets[Math.floor(rng()*Math.max(1,targets.length))];if(target){b.log.push(`${a.name}は混乱している！`);action={type:'attack',targetId:target.id};}}
  // Shield jobs have no attack, item or active-skill command. They always guard.
  if(a.side==='ally'&&isShieldGuardJob(a.currentJob))action={type:'defend'};
  const before=Object.fromEntries(b.actors.map(x=>[x.id,x.hp]));
  const result=resolveActionInternal(b,a,action,rng);markActed(b,id);
  if(result?.ok===true)b.options?.onActionExecuted?.(action,a,result);
  else if(result?.message)b.log.push(`${a.name}: ${result.message}`);
  const skill=action.skill??{},kind=skill.kind==='magic'||skill.type==='magic'||action.type==='rareInstantDeath'?'magic':'physical';
  const label=result?.ok===false?result.message:skill.name??action.name??result?.item?.name??({attack:'攻撃',defend:'防御',wait:'待機',item:'どうぐ',enemyEscape:'逃走',instantDeathWarning:'予兆',rareInstantDeathWarning:'魔力を集中'}[action.type]??'特技');
  b.visualTimeline.push({actors:structuredClone(b.actors),log:[...b.log],visualAction:{actorId:id,actorName:a.name,label,kind},visualEvents:b.actors.filter(x=>!x.escaped).map(x=>({id:x.id,amount:before[x.id]-x.hp,kind,element:skill.element})).filter(x=>x.amount!==0)});
 }
 b.turnCursor=b.turnOrder.length;b.phase='complete';return battleOutcome(b);
}
function pickTarget(b,a,action){
 const wanted=action.targetId?b.actorMap[action.targetId]:null;if(wanted&&wanted.hp>0)return wanted;
 const side=a.side==='ally'?'enemy':'ally';return b.actors.find(x=>x.side===side&&x.hp>0)??null;
}
function battleOutcome(b){const allies=b.actors.some(x=>x.side==='ally'&&x.hp>0);const enemies=b.actors.some(x=>x.side==='enemy'&&x.hp>0);return !enemies?'victory':!allies?'defeat':null;}
const STATUS_JA={poison:'毒',burn:'火傷',paralysis:'麻痺',sleep:'睡眠',confusion:'混乱',freeze:'凍結',curse:'呪い'};
function resolveOffensiveSkill(b,a,action,skill,rng){
 const target=pickTarget(b,a,action);if(!target)return {ok:false,message:'対象がいません'};
 const hitSkill={...skill,power:skill.power??135,kind:skill.kind??(skill.type==='magic'?'magic':'physical'),element:getSkillElement(skill)};
 const targets=skill.allTargets?b.actors.filter(x=>x.side===target.side&&x.hp>0):[target];
 const damageByTarget={},secondaryByTarget={},weaknessByTarget={},resistByTarget={};
 for(const victim of targets){
  let damage=0;
  for(let hit=0;hit<(skill.multiHit??1)&&victim.hp>0;hit++){
    const amount=calculateDamage(a,victim,hitSkill,rng);
    const beforeHp=victim.hp;
    if(a.side==='enemy'&&!skill.allTargets)applyShieldCoverDamage(b,victim,amount);
    else victim.hp=Math.max(0,victim.hp-amount);
    damage+=beforeHp-victim.hp;
   }
  const elementMult=getElementMultiplier(hitSkill.element,victim);damageByTarget[victim.id]=damage;weaknessByTarget[victim.id]=hitSkill.element!=='none'&&elementMult>1;resistByTarget[victim.id]=hitSkill.element!=='none'&&elementMult<1?Math.round((1-elementMult)*100):0;
  if(victim.eidel)updateEidelPhase(victim);
  const secondary=[];
  if(skill.status&&victim.hp>0&&applyTimedEffect(victim,{kind:'status',id:skill.status,turns:skill.strongStatus?5:3,chance:statusCastChance(a,skill)??(skill.strongStatus?.9:undefined)},rng,a))secondary.push(STATUS_JA[skill.status]??skill.status);
  if(skill.debuff&&victim.hp>0&&applyTimedEffect(victim,{kind:'debuff',id:'weak',turns:3,values:skill.debuff},rng,a))secondary.push('能力低下');
  if(skill.defenseDownPct&&victim.hp>0){const pct=victim.isBoss?(skill.bossDefenseDownPct??skill.defenseDownPct*.35):skill.defenseDownPct;if(applyTimedEffect(victim,{kind:'debuff',id:'armorBreak',turns:3,defensePct:-pct},rng,a))secondary.push('防御低下');}
  secondaryByTarget[victim.id]=secondary;
 }
 const details=targets.map(t=>`${t.name}に${damageByTarget[t.id]}ダメージ${weaknessByTarget[t.id]?'（弱点！1.5倍）':''}${resistByTarget[t.id]?`（${elementLabel(hitSkill.element)}耐性 ${resistByTarget[t.id]}%）`:''}${secondaryByTarget[t.id].length?` / ${secondaryByTarget[t.id].join('・')}付与`:''}`).join('、');
 b.log.push(`${a.name}の${skill.name??'特技'}！ ${details}`);
 return {ok:true,type:'skill',damage:damageByTarget[target.id],totalDamage:Object.values(damageByTarget).reduce((n,v)=>n+v,0),damageByTarget,targetId:target.id,secondary:secondaryByTarget[target.id],outcome:battleOutcome(b)};
}
function resolveActionInternal(b,a,action,rng){
 if(action.type==='attack'){
  const target=pickTarget(b,a,action);if(!target)return {ok:false,message:'対象がいません'};
  const rawDamage=calculateDamage(a,target,{...action,power:action.power??100,kind:'physical',element:action.element??'none'},rng);
  const originalHp=target.hp;
  if(a.side==='enemy')applyShieldCoverDamage(b,target,rawDamage);
  else target.hp=Math.max(0,target.hp-rawDamage);
  const damage=originalHp-target.hp;if(target.eidel)updateEidelPhase(target);b.log.push(`${a.name}の攻撃！ ${target.name}は攻撃を受けた　${damage}ダメージ`);return {ok:true,type:'attack',damage,targetId:target.id,outcome:battleOutcome(b)};
 }
 if(action.type==='skill'){
  const skill=action.skill??{};const cost=Math.max(0,Number(skill.mp??0));if((a.mp??0)<cost)return {ok:false,message:'MPが足りない！'};if(skill.type==='revive'&&(!b.actorMap[action.targetId]||b.actorMap[action.targetId].hp>0))return {ok:false,message:'戦闘不能の仲間がいません'};a.mp-=cost;
  if(skill.type==='buff'){const targets=skill.target==='all'?b.actors.filter(x=>x.side===a.side&&x.hp>0):[a];for(const target of targets)applyTimedEffect(target,{kind:'buff',id:skill.id??'focus',turns:skill.turns??3,...(skill.selfBuff??{})},rng);b.log.push(`${a.name}の${skill.name??'集中'}！ ${skill.description??'能力が高まった！'}`);return {ok:true,type:'skill',buffed:true,targetId:a.id,targets:targets.map(x=>x.id)};}
  if(skill.type==='heal'){const target=b.actorMap[action.targetId]??a;const amount=skill.flatHeal??Math.max(20,Math.floor(getEffectiveCombatStat(a,'magic')*(skill.power??30)*.6));const healTargets=skill.target==='all'?b.actors.filter(x=>x.side===a.side&&x.hp>0):[target];let cleared=0;if(skill.cleanseBeforeHeal&&skill.highClear){for(const x of healTargets){cleared+=(x.statusAilments??[]).length;x.statusAilments=[];x.statusResistTurns={};}}let healed=0;for(const x of healTargets){if(skill.fullHeal){if(x.hp>0){healed+=Math.max(0,x.maxHp-x.hp);x.hp=x.maxHp;}}else healed+=healTarget(x,skill.healRatio!=null?Math.floor(x.maxHp*skill.healRatio):amount);}let revived=0;if(skill.reviveFallenRatio&&skill.target==='all'){for(const x of b.actors.filter(x=>x.side===a.side&&x.hp<=0)){reviveTarget(x,skill.reviveFallenRatio);revived++;}}
  const clearTargets=skill.highClear?b.actors.filter(x=>x.side===a.side&&x.hp>0):skill.clear?[target]:[];for(const x of clearTargets){cleared+=(x.statusAilments??[]).length;x.statusAilments=[];x.statusResistTurns={};}const displayedHeal=skill.target==='all'&&!skill.fullHeal&&!skill.healRatio?amount:healed;b.log.push(`${a.name}の${skill.name??'回復'}！ ${skill.target==='all'?'味方全員':target.name}のHPが${displayedHeal}回復${skill.target==='all'&&!skill.fullHeal&&!skill.healRatio?'（1人あたり）':''}${skill.highClear?' / ハイクリア！ 味方全員の状態異常を解除':skill.clear?' / クリア！ 状態異常を解除':''}${revived?` / ${revived}人を蘇生！`:''}`);return {ok:true,type:'skill',healed:displayedHeal,totalHealed:healed,cleared,revived,highClear:!!skill.highClear,targetId:target.id};}
  if(skill.type==='revive'){const target=b.actorMap[action.targetId];if(!target)return {ok:false,message:'対象がいません'};reviveTarget(target,skill.hpRatio??.3);return {ok:true,type:'skill',revived:true,targetId:target.id};}
  return resolveOffensiveSkill(b,a,action,skill,rng);
 }
 if(action.type==='item'){
  const target=b.actorMap[action.targetId];if(!target)return {ok:false,message:'対象がいません'};
  if(typeof b.options?.useItem!=='function')return {ok:false,message:'アイテムを使えません'};
  try{
   const result=b.options.useItem(action.itemId,target);
   if(result?.ok===false)return result;
   b.log.push(`${a.name}は${target.name}に${result?.item?.name??action.itemId}を使用！`);
   return {...result,ok:true,type:'item',targetId:target.id};
  }catch(err){return {ok:false,message:err?.message??'アイテムを使えません'};}
 }
 if(action.type==='enemyEscape'){a.escaped=true;a.hp=0;b.log.push(`${a.name}は逃げ出した！`);return {ok:true,type:'enemyEscape',escaped:true,outcome:battleOutcome(b)};}
 if(action.type==='rareInstantDeathWarning'){b.log.push(`${a.name}は魔力を溜めている……`);b.log.push(action.allTargets?'狙いは……全員！？':`狙いは……${action.targetName??b.actorMap[action.targetId]?.name??'誰か'}！`);return {ok:true,type:'rareInstantDeathWarning',targetId:action.targetId,allTargets:action.allTargets};}
 if(action.type==='rareInstantDeath'){
   const targets=action.allTargets?b.actors.filter(x=>x.side==='ally'&&x.hp>0):[b.actorMap[action.targetId]].filter(x=>x?.hp>0);let defeated=0;
   if(!targets.length){b.log.push(`${a.name}の${action.name??'即死魔法'}！ しかし狙った相手はすでに倒れている！`);return {ok:true,type:'rareInstantDeath',defeated:0};}
   for(const target of targets){if(target.guarding){b.log.push(`${a.name}の${action.name??'即死魔法'}！ ${target.name}は防いだ！`);continue;}if(rng()<(action.successChance??.1)){target.hp=0;defeated++;b.log.push(`${a.name}の${action.name??'即死魔法'}！ ${target.name}は倒れた！`);}else b.log.push(`${a.name}の${action.name??'即死魔法'}！ ${target.name}には効かなかった！`);}
   return {ok:true,type:'rareInstantDeath',defeated,outcome:battleOutcome(b)};
 }
 if(action.type==='defend'){a.guarding=true;b.log.push(`${a.name}は身を守っている`);return {ok:true,type:'defend'};}
 if(action.type==='instantDeathWarning'){b.log.push(`⚠️ ${a.name}から強烈な殺気を感じる！ 次の行動「${action.name??'即死技'}」に備えろ！`);return {ok:true,type:'instantDeathWarning'};}
 if(action.type==='instantDeath'){const target=action.targetId?b.actorMap[action.targetId]:pickTarget(b,a,action);if(!target||target.hp<=0)return {ok:false,message:'対象がいません'};if(target.guarding&&!action.ignoreGuard){b.log.push(`${a.name}の${action.name??'即死技'}！ ${target.name}は完全に防いだ！`);return {ok:true,type:'instantDeath',blocked:true,targetId:target.id};}target.hp=0;b.log.push(`${a.name}の${action.name??'即死技'}！ ${target.name}は倒れた！`);return {ok:true,type:'instantDeath',targetId:target.id,outcome:battleOutcome(b)};}
 if(action.type==='wait')return {ok:true,type:'wait'};
 return {ok:true,type:action.type};
}
export function resolveAction(battle,action,rng=Math.random){
 const actor=getPendingActor(battle);if(!actor)throw new Error('入力待ちの味方がいません');
 if(isShieldGuardJob(actor.currentJob)&&action.type!=='defend')return {ok:false,message:'盾士系は防御のみ選択できます'};
 if(action.type==='skill'&&((actor.mp??0)<Number(action.skill?.mp??0)))return {ok:false,message:'MPが足りない！'};
 battle.plannedActions[actor.id]=action;battle.planningIndex++;battle.awaitingActorId=battle.planningIds[battle.planningIndex]??null;
 if(battle.awaitingActorId)return {ok:true,planned:true};
 const outcome=executePlannedTurn(battle,rng);return {ok:true,planned:true,resolved:true,outcome};
}
export function finishTurn(battle){if(battle.phase!=='complete')throw new Error('ターンが完了していません');for(const actor of battle.actors){if(actor.hp>0){for(const st of actor.statusAilments??[]){let damage=0;if(st.id==='poison'){const rate=actor.isBoss?.015:.03;damage=Math.max(1,Math.floor((actor.maxHp??actor.hp)*rate));}if(st.id==='burn')damage=Math.max(1,Math.floor((actor.maxHp??actor.hp)*.08));if(st.id==='curse')damage=Math.max(1,Math.floor((actor.maxHp??actor.hp)*.05));if(damage){actor.hp=Math.max(0,actor.hp-damage);const label=st.id==='poison'?'毒':st.id==='burn'?'火傷':'呪い';battle.log.push(`${actor.name}：${label} ${damage}ダメージ`);}}}tickEffects(actor,'statusEnd');tickEffects(actor,'turnEnd');}battle.turnNumber++;return battle;}

export function attemptEscape(battle,rng=Math.random){
 if(battle.isBoss)return {success:false,consumesTurn:false,message:'ボス戦からは逃げられない！'};
 const allies=battle.actors.filter(a=>a.side==='ally'&&a.hp>0);const enemies=battle.actors.filter(a=>a.side==='enemy'&&a.hp>0);
 const as=allies.reduce((n,a)=>n+getEffectiveCombatStat(a,'speed'),0)/Math.max(1,allies.length);const es=enemies.reduce((n,a)=>n+getEffectiveCombatStat(a,'speed'),0)/Math.max(1,enemies.length);
 const chance=Math.max(.1,Math.min(.9,.5+(as-es)*.02));const success=rng()<chance;return {success,consumesTurn:true,message:success?'逃げ切った！':'逃げられなかった！'};
}
export function applySmokeBomb(battle,targetId){const t=battle.actorMap[targetId];if(!t)throw new Error('対象がいません');if(battle.isBoss||t.isBoss)return {consumed:false,message:'ボスには煙玉が効かない！'};t.skipNextAction=true;return {consumed:true,message:'敵の次の行動を封じた！'};}
