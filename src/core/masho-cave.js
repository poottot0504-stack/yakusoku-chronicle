import { MASHO_ABYSS_WEAPONS,MASHO_ABYSS_SPELLBOOK } from '../data/masho-abyss-weapons.js';
import { MASHO_DEPTH_BOSSES,MASHO_DEPTH_REWARD_BY_FLOOR,MASHO_DEPTH_EQUIPMENT } from '../data/masho-depth-rewards.js';
import { addMaterial } from './material-cap.js';
import { STORY_CHAPTERS } from '../data/story.js';
import { BOSSES } from '../data/bosses.js';
import { OATHBREAKER_DATA } from '../data/oathbreakers.js';
import { RAID_BOSSES } from '../raid/raidRules.js';
import { MASHO_EQUIPMENT } from '../data/masho-equipment.js';
import { SHIELDER_CAVE_SHIELDS } from '../data/shielder-equipment.js';
import { createEquipmentInstance } from '../data/equipment.js';
import { hasFirstClear, applyProgressionCaps } from './progression-caps.js';
import { scaledCharacterExp } from './adventure.js';
import { awardCharacterExp, awardJobExp } from './progression.js';
import { JOBS } from '../data/jobs.js';
import { isTwinStarFestivalActive, isTrainingFestivalActive } from './events.js';
import { TWIN_STAR_FESTIVAL, TRAINING_FESTIVAL } from '../data/events.js';
import { recordEquipmentObtained } from './equipment-bestiary.js';
import { applyBoostedBattleGold, getBattleBoostMultiplier } from './boost-scrolls.js';
import { bossAreaAttack } from './boss-skills.js';
import { normalizeElement, regionElement, elementProfile } from './elements.js';

export const MASHO_DROP_RATE=.05;
// 21F–28F share the same rare equipment chance: 0.5% per cleared battle.
export const MASHO_ABYSS_DROP_RATE=.005;
export const MASHO_MAX_FLOOR=28;
// 第15〜20階層で全22職業の全部位を必ず入手可能にする。
export const MASHO_FLOOR_DROP_FOCUS=Object.freeze({
 15:{group:'magic',parts:['weapon','ring','charm'],label:'魔法系：武器・指輪・チャーム'},
 16:{group:'physical',parts:['shield','head','body'],label:'物理系：盾・頭・体'},
 17:{group:'physical',parts:['weapon','ring','charm'],label:'物理系：武器・指輪・チャーム'},
 18:{group:'magic',parts:['shield','head','body'],label:'魔法系：盾・頭・体'},
 19:{group:'physical',parts:['arms','waist','legs'],label:'物理系：腕・腰・脚'},
 20:{group:'magic',parts:['arms','waist','legs'],label:'魔法系：腕・腰・脚'}
});
// 21〜24階層は指定された希少武器を固定。25階層は新魔本と
// 既存の希少短剣から抽選し、旧装備が入手不能になる事態を防ぐ。
export const MASHO_ABYSS_FLOOR_REWARDS=Object.freeze({
 21:['masho-abyss-sword'],
 22:['masho-abyss-instrument'],
 23:['masho-abyss-bow'],
 24:['masho-abyss-staff'],
 25:[MASHO_ABYSS_SPELLBOOK.id,'masho-abyss-dagger']
});
export function getMashoAbyssDropPool(floor){
 return (MASHO_ABYSS_FLOOR_REWARDS[floor]??(MASHO_DEPTH_REWARD_BY_FLOOR[floor]?[MASHO_DEPTH_REWARD_BY_FLOOR[floor]]:[])).map(id=>id===MASHO_ABYSS_SPELLBOOK.id?MASHO_ABYSS_SPELLBOOK:(MASHO_DEPTH_EQUIPMENT[id]??MASHO_ABYSS_WEAPONS[id])).filter(Boolean);
}
export function getMashoEquipmentDropPool(floor){
 const f=MASHO_FLOORS[floor-1];
 if(!f||f.tier===4)return [];
 const normal=Object.values(MASHO_EQUIPMENT).filter(d=>d.mashoTier===f.tier);
 const focus=MASHO_FLOOR_DROP_FOCUS[floor];
 if(!focus)return normal;
 return normal.filter(def=>{
  const jobId=def.allowedJobs?.[0],job=JOBS[jobId];
  if(!job)return false;
  const isMagic=job.stats.magic>job.stats.attack||jobId==='redMage';
  return focus.parts.some(part=>def.id.endsWith('-'+part))&&(focus.group==='magic'?isMagic:!isMagic);
 });
}
export function getMashoFloorDropLabel(floor){
 const standard=MASHO_FLOOR_DROP_FOCUS[floor]?.label??(floor>=21&&floor<=28?getMashoAbyssDropPool(floor).map(d=>d.name).join(' ／ '):'');
 const shields=SHIELDER_CAVE_SHIELDS.filter(d=>floor>=d.mashoFloor);
 return [standard,...shields.map(d=>`${d.name}（${(d.dropRate*100).toFixed(1)}%）`)].filter(Boolean).join(' ／ ')||null;
}
const story=STORY_CHAPTERS.map(ch=>({id:`storyBoss-${ch.regionId}`,name:ch.bossName,kind:'story',element:normalizeElement(ch.bossElement)==='none'?regionElement(ch.regionId):normalizeElement(ch.bossElement)}));
const oaths=OATHBREAKER_DATA.map(o=>({...o,kind:'oath'}));
const raids=RAID_BOSSES.map(b=>({id:b.id,name:b.name,kind:'raid',element:b.element}));
const endings=Object.values(BOSSES).map(b=>({...b,kind:'story'}));
export const MASHO_BOSS_POOL=[...story,...raids,...oaths,...endings,{id:'eidel',name:'第零位 エイデル',kind:'final',element:'dark'}];
const pools=Array.from({length:20},()=>[]);
story.forEach((b,i)=>pools[i].push(b));
oaths.forEach((b,i)=>pools[i].push(b));
raids.forEach((b,i)=>pools[10+i].push(b));
endings.forEach((b,i)=>pools[15+i].push(b));
pools[18].push(oaths.at(-1),raids.at(-1));pools[19].push(MASHO_BOSS_POOL.at(-1));
export const MASHO_FLOORS=pools.map((bosses,i)=>({floor:i+1,level:150+Math.round(i*150/19),tier:i>=14?3:i>=7?2:1,bosses,exp:100000+i*12000,jobExp:50000+i*8000,gold:15000+i*5000}));
for(let i=0;i<5;i++)MASHO_FLOORS.push({floor:21+i,level:310+i*10,tier:4,bosses:[raids[i]],exp:600000+i*50000,jobExp:300000+i*25000,gold:200000+i*25000});
// 26–28F: dedicated endgame guardians. Their stats derive exactly from floor 25.
for(const [key,b] of Object.entries(MASHO_DEPTH_BOSSES)){const floor=Number(key);MASHO_FLOORS.push({floor,level:360+(floor-26)*10,tier:5,bosses:[{...b,kind:'depth'}],exp:900000+(floor-26)*100000,jobExp:450000+(floor-26)*50000,gold:350000+(floor-26)*50000});}
export function normalizeMashoProgress(state){
 const old=state.mashoCave??{},highest=Math.max(0,Math.min(MASHO_MAX_FLOOR,Math.floor(Number(old.highestCleared)||0)));
 const pastAbyssClears=Array.from({length:8},(_,i)=>Math.max(0,Math.floor(Number(old.clearCounts?.[i+21])||0))).reduce((a,b)=>a+b,0);
 state.mashoCave={...old,highestCleared:highest,clearCounts:{...(old.clearCounts??{})},abyssClearCount:Math.max(0,Math.floor(Number(old.abyssClearCount??pastAbyssClears)||0))};return state.mashoCave;
}
export function getMashoFloors(state){const highest=normalizeMashoProgress(state).highestCleared,unlocked=hasFirstClear(state);return MASHO_FLOORS.map(f=>({...f,cleared:f.floor<=highest,available:unlocked&&f.floor<=highest+1}));}
export function canEnterMashoFloor(state,floor){return Number.isInteger(floor)&&getMashoFloors(state).some(f=>f.floor===floor&&f.available);}
const pick=(list,rng)=>list[Math.max(0,Math.min(list.length-1,Math.floor(rng()*list.length)))];
export function createMashoEnemy(state,floor,rng=Math.random){
 if(!hasFirstClear(state))throw new Error('魔障の洞窟は一周目クリアで解放されます');
 if(!canEnterMashoFloor(state,floor))throw new Error('先に前の階層をクリアしてください');
 const f=MASHO_FLOORS[floor-1],b=pick(f.bosses,rng),level=f.level,statFloor=Math.min(floor,20);
 const depth=MASHO_DEPTH_BOSSES[floor];
 const multiplier=depth?1.25:floor>20?1+(floor-20)*.05:1;
 const floor25BaseHp=Math.round(Math.round(18000+Math.pow(19,1.65)*2500)*1.25);
 const maxHp=depth?Math.round(floor25BaseHp*depth.hpRatio):Math.round(Math.round(18000+Math.pow(statFloor-1,1.65)*2500)*(floor<=14?5:1)*multiplier);
 const stats=Object.fromEntries(Object.entries({attack:200+(statFloor-1)*27,defense:120+(statFloor-1)*19,magic:190+(statFloor-1)*28,speed:90+(statFloor-1)*9}).map(([key,value])=>[key,Math.round(value*(floor>=15?10:5)*multiplier*(floor>=20&&['attack','magic'].includes(key)?.7:1))]));
 if(depth){
  const base25Stats={attack:Math.round((200+19*27)*10*1.25*.7),magic:Math.round((190+19*28)*10*1.25*.7)};
  stats.attack=Math.round(base25Stats.attack*depth.attackRatio);
  stats.magic=Math.round(base25Stats.magic*depth.attackRatio);
  // HP and offensive strength are exactly specified; defenses escalate modestly.
  stats.defense=Math.round(stats.defense*(1+.07*(floor-25)));
  stats.speed=Math.round(stats.speed*(1+.05*(floor-25)));
 }
 const element=normalizeElement(b.element)==='none'?(b.kind==='oath'?'dark':regionElement('cave')):normalizeElement(b.element);
 return {id:`masho-${floor}-${b.id}`,artId:b.id,name:b.name+'【魔障】',...elementProfile(element),mashoBoss:true,mashoFloor:floor,regionId:'cave',...(b.kind==='raid'?{raidBoss:true,bossId:b.id}:{}),level,maxHp,hp:maxHp,maxMp:Math.round(9999*multiplier),mp:Math.round(9999*multiplier),stats,isBoss:true,enemyClass:'boss',instantDeathCycle:b.kind==='oath'||b.kind==='final'||b.id==='lich',instantDeathName:b.instantDeathName??'魔障の死刻',ai:[{type:'attack',power:110},{type:'attack',power:140},bossAreaAttack(`${b.name}・魔障波`,85+floor,{kind:element==='none'?'physical':'magic',element}),...(floor>20?[{type:'skill',skill:{id:'mashoAbyssRuin',name:'魔障・終焉の波動',kind:'magic',element:'none',allTargets:true,alwaysHit:true,canCrit:false,maxHpDamageRatio:.4,description:'全員に最大HPの40％ダメージ。防御力を無視する。防御で回避可能。'}}]:[])],exp:f.exp,jobExp:f.jobExp,gold:f.gold,stealTable:[],plunderTable:[]};
}
export function getMashoRewardPreview(state,floor,now=Date.now()){
 const f=MASHO_FLOORS[floor-1];if(!f)return null;
 const event=isTwinStarFestivalActive(now)?TWIN_STAR_FESTIVAL:isTrainingFestivalActive(now)?TRAINING_FESTIVAL:null;
 const characterExpMultiplier=getBattleBoostMultiplier(state,'characterExp',{now,eventMultiplier:event?.characterExpMultiplier??1,includeDaily:false}),jobExpMultiplier=getBattleBoostMultiplier(state,'jobExp',{now,eventMultiplier:event?.jobExpMultiplier??1,includeDaily:false});
 // 魔障の洞窟は『今日の旅ボーナス』対象外。期間イベントと周回倍率だけ適用する。
 return {exp:scaledCharacterExp(f.exp,state.cycle,characterExpMultiplier),jobExp:Math.floor(f.jobExp*(state.cycle>=2?2:1)*jobExpMultiplier),gold:Math.max(0,Math.floor(Number(f.gold)||0)),characterExpMultiplier,jobExpMultiplier};
}
export function settleMashoVictory(state,battle,rng=Math.random,now=Date.now()){
 if(battle.mashoRewardSettled)return battle.mashoRewardSettled;
 const floor=battle.mashoFloor,enemies=battle.actors?.filter(a=>a.side==='enemy')??[];
 if(!canEnterMashoFloor(state,floor)||!enemies.length||enemies.some(e=>!e.mashoBoss||e.mashoFloor!==floor||e.hp>0||e.escaped)||!battle.actors.some(a=>a.side==='ally'&&a.hp>0))throw new Error('魔障の洞窟の勝利が確認できません');
 applyProgressionCaps(state);const f=MASHO_FLOORS[floor-1],reward=getMashoRewardPreview(state,floor,now);
 const levelUps=[];
 for(const c of state.characters??[]){if(!(state.activePartyIds??[]).includes(c.id)||c.hp<=0)continue;const lv=c.level,jlv=c.jobLevels?.[c.currentJob]??1;awardCharacterExp(state,c.id,reward.exp);awardJobExp(c,reward.jobExp,state);if(c.level>lv)levelUps.push(`${c.name}のLvが${c.level}に上がった！`);if(c.jobLevels[c.currentJob]>jlv)levelUps.push(`${c.name}の${JOBS[c.currentJob]?.name??c.currentJob}Lvが${c.jobLevels[c.currentJob]}に上がった！`);}
 state.gold=(state.gold??0)+applyBoostedBattleGold(state,reward.gold,now,{includeDaily:false});
 let promiseOre=0;if(floor>=18&&floor<=20){promiseOre=floor===20?2:1;state.materials??={};addMaterial(state,'promiseOre',promiseOre);}
 const progress=normalizeMashoProgress(state);progress.highestCleared=Math.max(progress.highestCleared,floor);progress.clearCounts[floor]=(progress.clearCounts[floor]??0)+1;if(floor>20)progress.abyssClearCount++;
 let equipment=null;const equipmentDropRate=Math.min(1,(floor>20?MASHO_ABYSS_DROP_RATE:MASHO_DROP_RATE)*getBattleBoostMultiplier(state,'drop',{now,includeDaily:false}));if(rng()<equipmentDropRate){const def=pick(floor>20?getMashoAbyssDropPool(floor):getMashoEquipmentDropPool(floor),rng);equipment=createEquipmentInstance(def.id);state.equipmentInventory??=[];state.equipmentInventory.push(equipment);recordEquipmentObtained(state,def.id,{source:'魔障の洞窟'});}
 const enhanceCrystalId=floor<=10?'enhanceCrystal':floor<=20?'advancedEnhanceCrystal':'ultimateEnhanceCrystal';
 const enhanceCrystalBaseRate=floor<=10?.25:floor<=20?.20:.12;
 const enhanceCrystalChance=Math.min(1,enhanceCrystalBaseRate*getBattleBoostMultiplier(state,'drop',{now,includeDaily:false}));
 // A material safety net every five completed abyss runs (across floors 21-25).
 // Abyss weapons and depth-exclusive equipment share the 0.5% base chance (21–28F).
 const abyssMaterialGuaranteed=floor>20&&progress.abyssClearCount%5===0;
 const enhanceMaterial=abyssMaterialGuaranteed||rng()<enhanceCrystalChance?{id:enhanceCrystalId,name:floor<=10?'強化結晶':floor<=20?'上級強化結晶':'究極強化結晶',qty:1}:null;
 if(enhanceMaterial){state.materials??={};addMaterial(state,enhanceCrystalId,1);}
 // Rare shield slots never replace existing Masho gear or consume the older drop/material RNG checks.
 // They use their own tiny base chances and respect the same event drop boost.
 let shieldEquipment=null;
 if(floor>=15&&!equipment){
  const bonus=getBattleBoostMultiplier(state,'drop',{now,includeDaily:false});
  let roll=rng();
  for(const def of SHIELDER_CAVE_SHIELDS.filter(d=>floor>=d.mashoFloor).sort((a,b)=>b.mashoFloor-a.mashoFloor)){
   const chance=Math.min(1,def.dropRate*bonus);
   if(roll<chance){
    shieldEquipment=createEquipmentInstance(def.id);
    state.equipmentInventory??=[];state.equipmentInventory.push(shieldEquipment);
    recordEquipmentObtained(state,def.id,{source:'魔障の洞窟'});
    break;
   }
   roll-=chance;
  }
 }
 const receipt={floor,...reward,equipment,shieldEquipment,levelUps,promiseOre,enhanceMaterial};progress.lastReward=receipt;battle.mashoRewardSettled=receipt;
 state.adventure??={};state.adventure.message=`魔障の洞窟 第${floor}階層クリア！`;return receipt;
}
