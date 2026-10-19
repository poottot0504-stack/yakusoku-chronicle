import { TWIN_STAR_FESTIVAL, HALLOWEEN_EVENT, HALLOWEEN_ENEMIES, TRAINING_FESTIVAL, TRAINING_FESTIVAL_ENEMIES } from '../data/events.js';
import { ECLIPSE_EVENT } from '../data/eclipse-2026.js';
import { ECLIPSE_ENEMIES } from '../data/eclipse-enemies.js';
import { recordEncounter } from './bestiary.js';
import { bossAreaAttack } from './boss-skills.js';

export function getHalloweenStatus(now=Date.now()){
 const t=Number(now);
 if(t<HALLOWEEN_EVENT.announcementStart)return {phase:'hidden',announced:false,active:false};
 if(t<HALLOWEEN_EVENT.startsAt)return {phase:'announced',announced:true,active:false};
 if(t<HALLOWEEN_EVENT.endsAt)return {phase:'active',announced:true,active:true};
 return {phase:'ended',announced:false,active:false};
}
export const isHalloweenActive=(now=Date.now())=>getHalloweenStatus(now).active;

// Event promotion appears at 2026-10-28 00:00 JST; battles start Oct 31.
// Never resurrect the advertisement after 2026-11-02 00:00 JST.
export function getEclipseEventStatus(now=Date.now()){
 const t=Number(now);
 if(t<ECLIPSE_EVENT.announcementStart)return {phase:'hidden',announced:false,active:false};
 if(t<ECLIPSE_EVENT.startsAt)return {phase:'announced',announced:true,active:false};
 if(t<ECLIPSE_EVENT.endsAt)return {phase:'active',announced:true,active:true};
 return {phase:'ended',announced:false,active:false};
}


export function eventBossLevel(partyAverage){return Math.min(300,Math.max(1,Math.floor(Number(partyAverage)||1)+5));}

function partyAverageLevel(state){const active=new Set(state.activePartyIds??[]);const party=(state.characters??[]).filter(c=>active.has(c.id));const source=party.length?party:(state.characters??[]).slice(0,4);return Math.max(1,Math.min(300,Math.floor(source.reduce((n,c)=>n+(c.level??1),0)/Math.max(1,source.length))));}
function stats(level,scale=1){return {attack:Math.round((7+level*1.02)*scale),defense:Math.round((4+level*.44)*scale),magic:Math.round((6+level*.88)*scale),speed:Math.round(7+level*.46)};}
function enemy(def,level,wave,slot,scale=1){const boss=def.isBoss===true,eventBoost=boss?1:1.40;const maxHp=Math.max(40,Math.round(((boss?260:64)+level*(boss?31:12)*scale)*eventBoost));const enemyStats=stats(level,boss?1.25*scale:scale);if(!boss)for(const k of ['attack','defense','magic','speed'])enemyStats[k]=Math.round(enemyStats[k]*eventBoost);return {...structuredClone(def),id:`${def.id}-w${wave}-${slot}-${Date.now()}`,bestiaryId:def.id,level,maxHp,hp:maxHp,maxMp:30+level*2,mp:30+level*2,stats:enemyStats,ai:boss?[{type:'attack'},{type:'attack',power:118},bossAreaAttack('パンプキン・ナイト',62,{kind:'magic',element:'dark'})]:[{type:'attack'}],exp:Math.round((115+level*30)*(boss?2.3:1)),jobExp:Math.round((52+level*13)*(boss?2:1)),gold:Math.round((22+level*6)*(boss?2.2:1)),isBoss:boss,enemyClass:def.enemyClass,eventEnemy:true,eventBoss:boss,eventInstantDeathChance:boss?.05:undefined,eventInstantDeathName:boss?'死の宣告':undefined};}
function makeHalloweenWaveBase(state,wave=1,levelOverride=null){const avg=partyAverageLevel(state),w=Math.max(1,Math.min(3,Number(wave)||1)),level=levelOverride??(w===3?eventBossLevel(avg):Math.min(300,avg+w-1));if(w===1)return [enemy(HALLOWEEN_ENEMIES.pumpkinSlime,level,w,1,.82),enemy(HALLOWEEN_ENEMIES.pumpkinSlime,level,w,2,.82),enemy(HALLOWEEN_ENEMIES.ghostWolf,level,w,3,.86)];if(w===2)return [enemy(HALLOWEEN_ENEMIES.candyMimic,level,w,1,.92),enemy(HALLOWEEN_ENEMIES.moonWraith,level,w,2,.9),enemy(HALLOWEEN_ENEMIES.moonWraith,level,w,3,.9)];return [enemy(HALLOWEEN_ENEMIES.pumpkinKing,level,w,1,1)];}

// Short-run three-wave encounter for the October 31 - November 1 eclipse event.
// Difficulty follows the active party, without doubling all stats for high-level players.
function eclipseMonster(def,level,wave,slot,{hpScale=1,statScale=1}={}){
 const boss=!!def.isBoss,lv=Math.max(1,Math.min(300,Math.floor(Number(level)||1)));
 const hp=Math.max(45,Math.round(((boss?280:boss===false&&def.enemyClass==='strong'?94:65)+lv*(boss?24:def.enemyClass==='strong'?11:9))*hpScale));
 const profile=stats(lv,statScale);
 return {...structuredClone(def),id:`${def.id}-w${wave}-${slot}-${Date.now()}`,bestiaryId:def.id,level:lv,maxHp:hp,hp,maxMp:40+lv*2,mp:40+lv*2,stats:profile,
  ai:boss?[{type:'attack'},{type:'attack',power:108},bossAreaAttack('虚星の衝撃',60,{kind:'magic',element:'dark'})]:[{type:'attack'}],
  exp:Math.round((95+lv*24)*(boss?2.2:def.enemyClass==='strong'?1.3:1)),
  jobExp:Math.round((46+lv*10)*(boss?2:1)),gold:Math.round((18+lv*5)*(boss?2:1)),
  isBoss:boss,enemyClass:def.enemyClass,eventEnemy:true,eventBoss:boss};
}

export function makeEclipseWave(state,wave=1){
 const w=Math.max(1,Math.min(3,Math.floor(Number(wave)||1)));
 const highest=eventPartyHighestLevel(state);
 const lv=Math.min(300,highest+(w-1));
 const hpScale=highest<30?.8:highest>=150?1.15:1;
 const statScale=highest<30?.85:highest>=150?1.06:1;
 const defs=w===1?[ECLIPSE_ENEMIES.slime,ECLIPSE_ENEMIES.mimic]
  :w===2?[ECLIPSE_ENEMIES.wraith,ECLIPSE_ENEMIES.dragonet]
  :[ECLIPSE_ENEMIES.nox];
 return defs.map((def,index)=>eclipseMonster(def,lv,w,index+1,{hpScale,statScale}));
}
export function getNextEclipseWave(wave){
 const w=Number(wave)||1;
 return w>=3?null:w+1;
}

export function getNextHalloweenWave(wave){const w=Number(wave)||1;return w>=3?null:w+1;}
export function recordHalloweenWaveEncounters(state,enemies=[]){for(const e of enemies){const id=e.bestiaryId??e.id;if(id)recordEncounter(state,id);}return state.bestiary;}

export function getTrainingFestivalStatus(now=Date.now()){
 const t=Number(now);
 if(t<TRAINING_FESTIVAL.announcementStart)return {phase:'hidden',announced:false,active:false};
 if(t<TRAINING_FESTIVAL.startsAt)return {phase:'announced',announced:true,active:false};
 if(t<TRAINING_FESTIVAL.endsAt)return {phase:'active',announced:true,active:true};
 return {phase:'ended',announced:false,active:false};
}
export const isTrainingFestivalActive=(now=Date.now())=>getTrainingFestivalStatus(now).active;
export function getNextEventBoundary(now=Date.now()){
 const boundaries=[HALLOWEEN_EVENT,TRAINING_FESTIVAL,TWIN_STAR_FESTIVAL,ECLIPSE_EVENT].flatMap(event=>[event.announcementStart,event.startsAt,event.endsAt]);
 return boundaries.filter(time=>time>now).sort((a,b)=>a-b)[0]??null;
}
/* Event difficulty: party average +3/+4/+5 by wave. */
export function eventEnemyLevel(partyAverage,wave=1){
 const avg=Math.max(1,Number(partyAverage)||1);
 const w=Math.max(1,Math.min(3,Number(wave)||1));
 return w===3?eventBossLevel(avg):Math.min(300,Math.floor(avg)+(w+2));
}
function trainingEnemy(def,level,wave,slot,scale=1){const boss=def.isBoss===true,eventBoost=boss?1:1.40,maxHp=Math.max(50,Math.round(((boss?300:80)+level*(boss?32:13)*scale)*eventBoost));const enemyStats=stats(level,boss?1.25:scale);if(!boss)for(const k of ['attack','defense','magic','speed'])enemyStats[k]=Math.round(enemyStats[k]*eventBoost);return {...structuredClone(def),id:`${def.id}-w${wave}-${slot}-${Date.now()}`,bestiaryId:def.id,level,maxHp,hp:maxHp,maxMp:40+level*2,mp:40+level*2,stats:enemyStats,ai:def.healer?[{type:'healAlly',power:35},{type:'attack'}]:boss?[{type:'attack'},{type:'attack',power:120},bossAreaAttack('師範の号令',65)]:[{type:'attack'}],exp:Math.round(100+level*28),jobExp:Math.round((70+level*17)*(boss?2:1)),gold:Math.round(20+level*5),isBoss:boss,enemyClass:def.enemyClass,eventEnemy:true,eventBoss:boss,eventInstantDeathChance:boss?.05:undefined,eventInstantDeathName:boss?'死の宣告':undefined};}
function makeTrainingFestivalWaveBase(state,wave=1,levelOverride=null){const avg=partyAverageLevel(state),w=Math.max(1,Math.min(3,Number(wave)||1)),lv=levelOverride??eventEnemyLevel(avg,w);if(w===1)return [trainingEnemy(TRAINING_FESTIVAL_ENEMIES.swordsman,lv,w,1),trainingEnemy(TRAINING_FESTIVAL_ENEMIES.fighter,lv,w,2)];if(w===2)return [trainingEnemy(TRAINING_FESTIVAL_ENEMIES.mage,lv,w,1),trainingEnemy(TRAINING_FESTIVAL_ENEMIES.thief,lv,w,2),trainingEnemy(TRAINING_FESTIVAL_ENEMIES.healer,lv,w,3)];return [trainingEnemy(TRAINING_FESTIVAL_ENEMIES.master,lv,w,1)];}
export function getNextTrainingFestivalWave(wave){const w=Number(wave)||1;return w>=3?null:w+1;}

export function halloweenCharacterExpMultiplier(wave=1){return Number(wave)>=3?2.5:2;}

export function getTwinStarFestivalStatus(now=Date.now()){
 const t=Number(now),event=TWIN_STAR_FESTIVAL;
 if(t<event.announcementStart)return {phase:'hidden',announced:false,active:false};
 if(t<event.startsAt)return {phase:'announced',announced:true,active:false};
 if(t<event.endsAt)return {phase:'active',announced:true,active:true};
 return {phase:'ended',announced:false,active:false};
}
export const isTwinStarFestivalActive=(now=Date.now())=>getTwinStarFestivalStatus(now).active;

// Only participating members determine event difficulty; reserves are excluded.
function eventPartyHighestLevel(state){
 const active=new Set(state.activePartyIds??[]);
 const party=(state.characters??[]).filter(c=>active.has(c.id));
 const source=party.length?party:(state.characters??[]).slice(0,4);
 return Math.max(1,...source.map(c=>Math.floor(Number(c.level)||1)));
}
function makeScaledEventWave(state,wave,makeBase){
 const highest=eventPartyHighestLevel(state),w=Math.max(1,Math.min(3,Math.floor(Number(wave)||1)));
 if(highest<30)return makeBase(state,w);
 const enemies=makeBase(state,w,highest+w+2);
 for(const e of enemies){
  for(const key of ['maxHp','hp','maxMp','mp'])e[key]*=2;
  for(const key of Object.keys(e.stats))e.stats[key]*=2;
 }
 return enemies;
}
export function makeHalloweenWave(state,wave=1){return makeScaledEventWave(state,wave,makeHalloweenWaveBase);}
function makeBalancedTrainingFestivalWave(state,wave=1,festival=TRAINING_FESTIVAL){
 const highest=eventPartyHighestLevel(state),w=Math.max(1,Math.min(3,Math.floor(Number(wave)||1)));
 // October's training festival is more approachable; the later Twin Star Festival keeps its existing balance.
 const keepTwinStarBalance=festival?.id===TWIN_STAR_FESTIVAL.id;
 if(keepTwinStarBalance&&highest<30)return makeTrainingFestivalWaveBase(state,w);
 const level=keepTwinStarBalance?Math.min(300,highest+w):Math.min(300,Math.max(1,highest+w-1));
 const enemies=makeTrainingFestivalWaveBase(state,w,level);
 for(const e of enemies){
  const hpScale=keepTwinStarBalance?1.4:highest<30?0.95:1.2;
  const statScale=keepTwinStarBalance?1.35:highest<30?0.9:1.15;
  for(const key of ['maxHp','hp','maxMp','mp'])e[key]=Math.max(1,Math.round((Number(e[key])||0)*hpScale));
  for(const key of Object.keys(e.stats??{}))e.stats[key]=Math.max(1,Math.round((Number(e.stats[key])||0)*statScale));
  e.ai=(e.ai??[]).map(action=>{
   const next={...action};
   if(next.type==='healAlly')next.power=keepTwinStarBalance?24:20;
   else if(next.type==='attack'&&typeof next.power==='number')next.power=Math.max(100,Math.round(next.power*(keepTwinStarBalance?0.88:0.82)));
   else if(!keepTwinStarBalance&&next.type==='skill'&&next.skill?.id==='bossAreaAttack')next.skill={...next.skill,power:55};
   return next;
  });
  if(e.eventBoss){
   e.eventInstantDeathChance=keepTwinStarBalance?0.02:0;
   e.eventInstantDeathName=keepTwinStarBalance?'死の宣告':undefined;
  }
 }
 return enemies;
}
export function makeTrainingFestivalWave(state,wave=1,festival=TRAINING_FESTIVAL){return makeBalancedTrainingFestivalWave(state,wave,festival);}
