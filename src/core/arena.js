import { ARENA_QUESTS,ARENA_RANKS,ARENA_LEGACY_BOSS_STATS,ARENA_BALANCE_VERSION,arenaFixedEquipment } from '../data/arena-quests.js';
import { ARENA_EQUIPMENT,ARENA_CRAFT_COSTS,ARENA_ENHANCE_COSTS,ARENA_ENHANCE_LIMIT } from '../data/arena-equipment.js';
import { EQUIPMENT,createEquipmentInstance } from '../data/equipment.js';
import { JOBS } from '../data/jobs.js';
import { getEnhancedStats } from './forge.js';
import { createBattle } from './battle.js';

const cap=(n,min,max)=>Math.max(min,Math.min(max,n));
const safe=(n,max=999999)=>Number.isSafeInteger(n)?cap(n,0,max):0;
const deepCopy=v=>structuredClone(v);
export function arenaRank(turns){
 if(!Number.isInteger(turns)||turns<1)return null;
 return ARENA_RANKS.find(x=>turns<=x.maxTurns)??null;
}
export function normalizeArenaProgress(state){
 const raw=state.arena??{};
 const best={};
 for(const id of Object.keys(ARENA_QUESTS)){
  const b=Number(raw.best?.[id]);
  if(Number.isInteger(b)&&b>=1&&b<=100)best[id]=b;
 }
 const records={};
 for(const id of Object.keys(ARENA_QUESTS)){
  records[id]={wins:safe(raw.records?.[id]?.wins,999999),attempts:safe(raw.records?.[id]?.attempts,999999)};
 }
 const equippedRestore={};
 const slots=new Set(['weapon','spellbook','shield','accessory1','accessory2']);
 if(raw.equippedRestore&&typeof raw.equippedRestore==='object'&&!Array.isArray(raw.equippedRestore)){
  for(const [characterId,placements] of Object.entries(raw.equippedRestore).slice(0,8)){
   if(typeof characterId!=='string'||characterId.length<1||characterId.length>100||
      !placements||typeof placements!=='object'||Array.isArray(placements))continue;
   const allowed=Object.fromEntries(Object.entries(placements).filter(([slot,id])=>
     slots.has(slot)&&typeof id==='string'&&/^arena-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)));
   if(Object.keys(allowed).length)equippedRestore[characterId]=allowed;
  }
 }
 state.arena={coins:safe(raw.coins,999999),best,records,equippedRestore,
  needsServerSync:raw.needsServerSync===true,
  // Local battle-history de-duplication only. Coins and ownership always come from the server.
  settledMatchIds:[...new Set((Array.isArray(raw.settledMatchIds)?raw.settledMatchIds:[])
    .filter(x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x)))].slice(-100),
  lastResult:raw.lastResult&&ARENA_QUESTS[raw.lastResult.questId]?{
   questId:raw.lastResult.questId,turns:Number.isInteger(raw.lastResult.turns)?cap(raw.lastResult.turns,0,101):null,
   grade:['S','A','B','C'].includes(raw.lastResult.grade)?raw.lastResult.grade:null,
   coins:safe(raw.lastResult.coins,5),victory:raw.lastResult.victory===true
  }:null};
 return state.arena;
}
function fixedCharacter(template,level,i){
 const job=JOBS[template.job];
 if(!job)throw new Error('闘技大会のジョブ設定に誤りがあります');
 const equipment=arenaFixedEquipment(template,level);
 const statBonus={attack:0,defense:0,magic:0,speed:0,maxHp:0,maxMp:0};
 for(const id of Object.values(equipment)){
  if(!EQUIPMENT[id])throw new Error('闘技大会の固定装備が見つかりません: '+id);
  const bonus=getEnhancedStats({equipmentId:id,enhanceLevel:0});
  for(const key of Object.keys(statBonus))statBonus[key]+=bonus[key]??0;
 }
 // Nothing comes from the player's level, inventory, passives or account.
 const stats={
  attack:Math.round(12+job.stats.attack*level*.52)+statBonus.attack,
  defense:Math.round(10+job.stats.defense*level*.38)+statBonus.defense,
  magic:Math.round(12+job.stats.magic*level*.52)+statBonus.magic,
  speed:Math.round(10+job.stats.speed*level*.30)+statBonus.speed
 };
 const maxHp=Math.round(130+level*13+(job.stats.defense-3)*12)+statBonus.maxHp;
 const maxMp=Math.round(40+level*3+(job.stats.magic-3)*10)+statBonus.maxMp;
 return {
  id:'arena-actor-'+i,name:template.slot,currentJob:template.job,
  level,jobLevels:{[template.job]:level},stats,maxHp,hp:maxHp,maxMp,mp:maxMp,
  exp:0,jobExp:{},masteryBonuses:{},inheritedSkills:[],learnedSkills:[],
  battleFlatStats:{attack:0,magic:0,defense:0,speed:0},
  equipment:{...equipment},arenaFixedEquipment:Object.fromEntries(Object.entries(equipment).map(([slot,id])=>[slot,EQUIPMENT[id].name])),
  arenaSkills:deepCopy(template.skills),arenaParticipant:true,isHero:i===0
 };
}
function fixedEnemy(quest){
 const d=quest.enemy;return {
  id:d.id,name:d.name,artId:d.artId,side:'enemy',
  element:d.element,level:quest.level,
  maxHp:d.maxHp,hp:d.maxHp,maxMp:500,mp:500,
  stats:{attack:d.attack,defense:d.defense,magic:d.magic,speed:d.speed},
  ai:[
   {type:'attack',power:100},
   {type:'attack',power:120},
   {type:'skill',skill:{id:'arena-wave',name:'闘技の強襲',type:'attack',kind:'physical',power:75,allTargets:true,mp:0}}
  ],
  enemyClass:'boss',isBoss:true,arenaEnemy:true,
  exp:0,jobExp:0,gold:0,plunderTable:[],stealTable:[]
 };
}
export function createArenaSession(questId,{balanceVersion=ARENA_BALANCE_VERSION}={}){
 const base=ARENA_QUESTS[questId];
 if(!base)throw new Error('闘技大会のクエストが見つかりません');
 if(balanceVersion!==1&&balanceVersion!==ARENA_BALANCE_VERSION)throw new Error('闘技大会のルールが不正です');
 const quest=balanceVersion===1?{...base,enemy:{...base.enemy,...ARENA_LEGACY_BOSS_STATS[questId]}}:base;
 const roster=quest.roster.map((x,i)=>fixedCharacter(x,quest.level,i));
 const battle=createBattle(roster,fixedEnemy(quest),{isBoss:true});
 battle.arenaQuestId=questId;
 battle.arenaFixedParty=true;
 return {questId,roster,battle,balanceVersion,settled:false};
}
export function arenaSessionSkills(session,actorId){
 return deepCopy(session?.roster?.find(x=>x.id===actorId)?.arenaSkills??[]);
}
export function settleArenaSession(state,session){
 if(!session||session.settled||!session.battle||session.battle.arenaQuestId!==session.questId)throw new Error('闘技大会の結果は受取済みか無効です');
 const battle=session.battle,actors=battle.actors??[];
 const win=actors.some(a=>a.side==='ally'&&a.hp>0)&&!actors.some(a=>a.side==='enemy'&&a.hp>0);
 const lost=!actors.some(a=>a.side==='ally'&&a.hp>0);
 const currentRound=cap(Math.max(1,(battle.turnNumber??0)+1),1,100);
 if(!win&&!lost&&!(battle.turnNumber>=100&&battle.phase==='complete'))throw new Error('戦闘が終了していません');
 const rank=win?arenaRank(currentRound):null;
 const progress=normalizeArenaProgress(state);
 const record=progress.records[session.questId];
 const coins=rank?.coins??0;
 if(coins>0){
  progress.coins=Math.min(999999,progress.coins+coins);
  const best=progress.best[session.questId];
  if(!best||currentRound<best)progress.best[session.questId]=currentRound;
  record.wins=Math.min(999999,record.wins+1);
 }
 record.attempts=Math.min(999999,record.attempts+1);
 const result={questId:session.questId,turns:currentRound,grade:rank?.grade??null,coins,victory:Boolean(rank)};
 progress.lastResult=result;
 session.settled=true;
 return result;
}
export function arenaCraftQuote(state,equipmentId){
 const cost=ARENA_CRAFT_COSTS[equipmentId];
 if(!cost||!ARENA_EQUIPMENT[equipmentId])throw new Error('闘技大会の装備ではありません');
 const coins=normalizeArenaProgress(state).coins;
 return {cost,coins,canCraft:coins>=cost};
}
export function craftArenaEquipment(state,equipmentId){
 const q=arenaCraftQuote(state,equipmentId);
 if(!q.canCraft)throw new Error('闘技コインが足りません');
 const item=createEquipmentInstance(equipmentId);
 state.arena.coins-=q.cost;
 state.equipmentInventory??=[];
 state.equipmentInventory.push(item);
 return item;
}
export function arenaEnhanceQuote(state,instanceId){
 const inst=state.equipmentInventory?.find(x=>x.instanceId===instanceId);
 if(!inst||!ARENA_EQUIPMENT[inst.equipmentId])throw new Error('闘技大会の装備が見つかりません');
 const current=safe(inst.enhanceLevel,ARENA_ENHANCE_LIMIT);
 const maxed=current>=ARENA_ENHANCE_LIMIT;
 const cost=maxed?0:ARENA_ENHANCE_COSTS[current];
 const coins=normalizeArenaProgress(state).coins;
 return {level:current,next:maxed?current:current+1,maxed,cost,coins,canEnhance:!maxed&&coins>=cost};
}
export function enhanceArenaEquipment(state,instanceId){
 const q=arenaEnhanceQuote(state,instanceId);
 if(q.maxed)throw new Error('これ以上は強化できません');
 if(!q.canEnhance)throw new Error('闘技コインが足りません');
 const inst=state.equipmentInventory.find(x=>x.instanceId===instanceId);
 state.arena.coins-=q.cost;
 inst.enhanceLevel=q.next;
 return {instanceId,level:q.next,cost:q.cost};
}
