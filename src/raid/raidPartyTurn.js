import { useBattleItem } from '../core/items.js';
import { RAID_JOB_PROFILES, calculateRaidBossDamage } from './raidBattle.js';
import { tryInflictRaidPartyStatus, raidStatusLabel } from './raidStatus.js';
import { getSkillElement, getElementMultiplier, elementLabel } from '../core/elements.js';

const profileFor=actor=>RAID_JOB_PROFILES[actor?.currentJob]??RAID_JOB_PROFILES.swordsman;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const RAID_BOSS_ELEMENT=Object.freeze({anima:'light',ifrit:'fire',chryps:'water',fenrir:'ice',lich:'dark'});

export function createRaidTurnState(party=[]){
 const actorIds=(party??[]).filter(x=>(x?.hp??0)>0).slice(0,4).map(x=>x.id);
 return {actorIds,index:0,actions:[],complete:actorIds.length===0,currentActorId:actorIds[0]??null};
}

export function planRaidPartyAction(turn,action){
 if(!turn||turn.complete)return turn;
 const expected=turn.actorIds[turn.index];
 if(!action||action.actorId!==expected)throw new Error('現在の行動キャラクターではありません');
 const actions=[...turn.actions,action],index=turn.index+1,complete=index>=turn.actorIds.length;
 return {...turn,actions,index,complete,currentActorId:complete?null:turn.actorIds[index]};
}

export function currentRaidTurnActor(turn,party=[]){
 const id=turn?.currentActorId;
 return id?(party??[]).find(x=>x.id===id)??null:null;
}

export function calculateRaidSkillDamage(actor,skill,bossStats={},statBonus={},boss={}){
 const p=profileFor(actor),lv=Math.max(1,actor?.level??1),jobLv=actor?.jobLevels?.[actor?.currentJob]??1;
 const magic=skill?.kind==='magic'||skill?.type==='magic';
 const atk=Math.max(1,(actor?.stats?.attack??1)+(statBonus?.attack??0));
 const mag=Math.max(1,(actor?.stats?.magic??1)+(statBonus?.magic??0));
 const source=magic?mag:atk;
 const defense=Math.max(0,magic?(bossStats?.magicDefense??bossStats?.magicAttack??0):(bossStats?.defense??0));
 const mitigation=300/(300+defense*(1-Math.max(0,Math.min(.8,Number(skill?.defensePierce??0))))),power=Math.max(0,Number(skill?.power??100))/100,hits=Math.max(1,Number(skill?.multiHit??1));
 const baseDamage=Math.max(0,Math.round((lv+jobLv+source*4)*1.8*power*hits*mitigation*p.damage));const element=getSkillElement(skill);return Math.max(0,Math.round(baseDamage*getElementMultiplier(element,boss)));
}

export function applyRaidSkillEffect({actor,skill,targetId,party=[],statBonus={},bossStats={},boss={}}){
 if(!actor||!skill)return {ok:false,message:'特技・魔法が見つかりません'};
 const cost=Math.max(0,Number(skill.mp??0));
 if((actor.mp??0)<cost)return {ok:false,message:'MPが足りない！'};
 if(skill.type==='revive'&&!party.some(x=>x.id===targetId&&(x.hp??0)<=0))return {ok:false,message:'戦闘不能の仲間がいません'};
 actor.mp=Math.max(0,(actor.mp??0)-cost);
 if(skill.type==='heal'){
  const amount=skill.flatHeal??Math.max(20,Math.floor(((actor?.stats?.magic??1)+(statBonus?.magic??0))*(skill.power??30)*.6));
  const alive=party.filter(x=>(x?.hp??0)>0);
  const targets=skill.target==='all'?alive:[party.find(x=>x.id===targetId)??actor].filter(x=>(x?.hp??0)>0);
  let healing=0;for(const t of targets){const before=t.hp??0;t.hp=Math.min(t.maxHp??before,before+(skill.fullHeal?Math.max(0,(t.maxHp??before)-before):skill.healRatio!=null?Math.floor((t.maxHp??before)*skill.healRatio):amount));healing+=Math.max(0,t.hp-before);}
  let revived=0;const revivedIds=[];
  if(skill.reviveFallenRatio&&skill.target==='all'){for(const t of party.filter(x=>(x?.hp??0)<=0)){t.hp=Math.max(1,Math.floor((t.maxHp??1)*skill.reviveFallenRatio));revived++;revivedIds.push(t.id);}}
  const clearTargets=skill.highClear?party.filter(x=>(x?.hp??0)>0):skill.clear?targets:[];for(const t of clearTargets){t.statusAilments=[];t.statusResistTurns={};}
  return {ok:true,kind:'heal',healing,revived,payload:{healing,supportActions:revived?1:0},targets:[...targets.map(x=>x.id),...revivedIds]};
 }
 if(skill.type==='revive'){
  const target=party.find(x=>x.id===targetId&&((x.hp??0)<=0));if(!target)return {ok:false,message:'戦闘不能の仲間がいません'};
  const before=target.hp??0;target.hp=Math.max(1,Math.round((target.maxHp??1)*(skill.hpRatio??.3)));const healing=Math.max(0,target.hp-before);
  return {ok:true,kind:'revive',healing,payload:{healing},targets:[target.id]};
 }
 if(skill.type==='buff'){
  const targets=skill.target==='all'?party.filter(x=>(x.hp??0)>0):[actor];
  for(const t of targets)t.raidBuff={attackPct:Number(skill.selfBuff?.attackPct??0),magicPct:Number(skill.selfBuff?.magicPct??0),defensePct:Number(skill.selfBuff?.defensePct??0),turns:Math.max(1,Number(skill.turns??3))};
  return {ok:true,kind:'buff',payload:{supportActions:1},targets:targets.map(x=>x.id)};
 }
 const damage=calculateRaidSkillDamage(actor,skill,bossStats,statBonus,boss);
 const supportActions=(skill.status||skill.debuff||skill.defenseDownPct)?1:0;
 const bossStatusAttempt=skill.status?{id:skill.status,strong:skill.strongStatus===true}:null;
 return {ok:true,kind:'damage',damage,payload:{damage,supportActions},targets:[],bossStatusAttempt};
}


export function applyRaidItemEffect({state,itemId,targetId,party=[]}){
 const target=(party??[]).find(x=>x.id===targetId);
 if(!state||!itemId||!target)return {ok:false,message:'アイテムの対象が見つかりません'};
 try{
  const result=useBattleItem(state,itemId,target);
  const supportActions=(result.mpRestored??0)>0||((result.character?.statusAilments??[]).length===0)?1:0;
  return {ok:true,kind:'item',itemName:result.item?.name??itemId,targetName:target.name??'仲間',healing:result.healed??0,mpRestored:result.mpRestored??0,payload:{type:'item',healing:result.healed??0,supportActions}};
 }catch(err){return {ok:false,message:err?.message??'アイテムを使えません'};}
}

export function applyRaidBossAction(action,party=[],plannedActions=[],bossStats={},bossId='',rng=Math.random,bossName='レイドボス'){
 const alive=()=>party.filter(x=>(x?.hp??0)>0);
 const guardIds=new Set((plannedActions??[]).filter(x=>x?.type==='guard').map(x=>x.actorId));
 const logs=[],koIds=[];
 const ko=t=>{if(!t||(t.hp??0)<=0)return;t.hp=0;koIds.push(t.id);};
 if(action?.kind==='wipe'){
  for(const t of alive()){if(guardIds.has(t.id))logs.push(`🛡️ ${t.name}は${bossName}の${action.name??'終焉の刻'}を防いだ！`);else{ko(t);logs.push(`⚠️ ${bossName}の${action.name??'終焉の刻'}！ ${t.name}は倒れた！`);}}
  return {koIds,logs};
 }
 if(action?.kind==='death'){
  const targets=alive();if(targets.length){const t=action.targetId?targets.find(t=>t.id===action.targetId):targets[clamp(Math.floor(rng()*targets.length),0,targets.length-1)];if(!t)return {koIds,logs};if(guardIds.has(t.id)){logs.push(`🛡️ ${t.name}は即死攻撃を防いだ！`);return {koIds,logs};}ko(t);logs.push(`💀 ${bossName}の${action.name??'死の宣告'}！ ${t.name}は倒れた！`);}return {koIds,logs};
 }
 const magicBoss=['anima','chryps','lich'].includes(bossId);
 const isStatus=action?.kind==='statusAoe'||action?.kind==='statusSingle';
 const isAoe=action?.kind==='aoe'||action?.kind==='statusAoe';
 const hit=t=>{
  const magical=isStatus?Boolean(action?.magic):magicBoss;const kind=isAoe?(magical?'magicAoe':'aoe'):(magical?'magic':'single');
  const actionElement=getSkillElement(action),element=actionElement!=='none'?actionElement:(RAID_BOSS_ELEMENT[bossId]??'none');
  const targetDefense=Math.max(0,((t?.stats?.defense??0)+(t?.battleFlatStats?.defense??0))*(1+(t.raidBuff?.turns>0?(t.raidBuff.defensePct??0):0)));
  const elementMult=getElementMultiplier(element,t);
  let damage=calculateRaidBossDamage(bossStats,{defense:targetDefense},kind);
  if(isStatus)damage=Math.max(1,Math.round(damage*Math.max(.1,Number(action?.damageScale??.7))));
  damage=Math.max(1,Math.round(damage*elementMult));
  if(guardIds.has(t.id))damage=Math.max(1,Math.round(damage*.5));t.hp=Math.max(0,(t.hp??0)-damage);if(t.hp<=0)koIds.push(t.id);
  let suffix=guardIds.has(t.id)?'（防御）':'';
  if(element!=='none'&&elementMult<1)suffix+=` / ${elementLabel(element)}耐性 ${Math.round((1-elementMult)*100)}%`;
  if(isStatus&&(t.hp??0)>0){const status=tryInflictRaidPartyStatus(t,action,rng,{guarding:guardIds.has(t.id)});if(status.applied)suffix+=` / ${status.label}付与`;else if(status.attempted)suffix+=` / ${raidStatusLabel(action.status)}は効かなかった`;}
  logs.push(`${isAoe?'🔥':'⚔️'} ${bossName}の${action?.name??(isAoe?'全体攻撃':'強襲')}！ ${t.name}に${damage}ダメージ${suffix}`);
 };
 if(isAoe){for(const t of [...alive()])hit(t);}else{const targets=alive();if(targets.length)hit(targets[clamp(Math.floor(rng()*targets.length),0,targets.length-1)]);}
 return {koIds,logs};
}
