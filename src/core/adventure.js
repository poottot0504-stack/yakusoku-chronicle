import { EQUIPMENT } from '../data/equipment.js';
import { depthAccessoryEffects } from './masho-depth-effects.js';
import { shieldProgressBonus } from './shielder-guard.js';
import { REGIONS } from '../data/regions.js';
import { STORY_CHAPTERS, STORY_BY_REGION } from '../data/story.js';
import { rollEncounter, unlockStormSiren } from './encounters.js';
import { ENEMIES } from '../data/enemies.js';
import { awardCharacterExp, awardJobExp } from './progression.js';
import { recordDefeat, recordEncounter } from './bestiary.js';
import { handleBossVictory, startNewGamePlus } from './new-game-plus.js';
import { getEquipmentStatBonus, getCharacterResourceCaps, getEquipmentElementResist } from './combat-stats.js';
import { recordNormalBattle } from './world.js';
import { BOSSES } from '../data/bosses.js';
import { getDifficultyTuning } from './difficulty.js';
import { canEnterStage, getStageGate } from './level-gates.js';
import { bossAreaAttack } from './boss-skills.js';
import { JOBS } from '../data/jobs.js';
import { makeRareEncounterGroup } from './rare-monsters.js';
import { getDailyTravelBonus } from './daily-travel-bonus.js';
import { applyBoostedBattleGold, getBattleBoostMultiplier } from './boost-scrolls.js';
import { elementProfile, regionElement, normalizeElement } from './elements.js';

const regionIndex=id=>Math.max(0,STORY_CHAPTERS.findIndex(x=>x.regionId===id));
export function ensureAdventureState(state){
 state.world??={timePhase:'morning',weather:'clear',battleCountInPhase:0,day:1,regionId:'field'};
 state.world.day??=1; state.world.regionId??='field';
 state.adventure??={regionId:'field',regionWins:{},completedRegions:[],chapter:1,message:'王都の門が開いた。約束の星を探す旅へ出よう。',chests:{},visitedTowns:['field']};
 state.adventure.regionWins??={}; state.adventure.completedRegions??=[]; state.adventure.chests??={}; state.adventure.visitedTowns??=['field'];
 state.story??={}; state.story.chapter??=1; state.gold??=600;
 state.inventory??=[];
 if(!state.starterSuppliesGranted){
  if(!state.inventory.some(x=>x.id==='potion'))state.inventory.push({id:'potion',qty:5,price:100});
  if(!state.inventory.some(x=>x.id==='herb'))state.inventory.push({id:'herb',qty:3,price:35});
  state.starterSuppliesGranted=true;
 }
 state.equipmentInventory??=[];
 if(!state.starterGearGranted&&!state.adventure.starterGearGranted){const map=[['hero','ironSword'],['mira','noviceStaff'],['ren','bronzeDagger'],['sora','oakMace'],['gald','trainingFist'],['luna','noviceStaff'],['kai','ironSword'],['noa','bronzeDagger']];for(const [cid,equipmentId] of map){const instanceId=`starter-${cid}`;if(!state.equipmentInventory.some(x=>x.instanceId===instanceId))state.equipmentInventory.push({instanceId,equipmentId,enhanceLevel:0,trueEvolved:false});const c=state.characters.find(x=>x.id===cid);if(c&&!c.equipment.weapon)c.equipment.weapon=instanceId;}}
 state.starterGearGranted=true;state.adventure.starterGearGranted=true;
 return state;
}
const stageRegions=state=>STORY_CHAPTERS.map((ch,i)=>({...REGIONS[ch.regionId],...ch,stage:i+1,gate:getStageGate(state.cycle??1,i+1)}));
export function getVisibleRegions(state){
 ensureAdventureState(state);const completed=new Set(state.adventure.completedRegions??[]);
 return stageRegions(state).filter((_,i)=>i===0||completed.has(STORY_CHAPTERS[i-1].regionId));
}
export function getUnlockedRegions(state){ensureAdventureState(state);return stageRegions(state).filter((_,i)=>canEnterStage(state,i+1).ok);}

export function travelToRegion(state,regionId){
 if(!getUnlockedRegions(state).some(x=>x.id===regionId))throw new Error('まだ行けない場所です');
 state.adventure.regionId=regionId; state.world.regionId=regionId; state.currentLocationId=`${regionId}-town`;
 if(!state.adventure.visitedTowns.includes(regionId))state.adventure.visitedTowns.push(regionId);
 state.adventure.message=STORY_BY_REGION[regionId]?.intro??''; return regionId;
}
function scaledStats(level,boss=false){const k=boss?1.2:1;return {attack:Math.round((8+level*1.15)*k),defense:Math.round((4+level*.48)*k),magic:Math.round((7+level*.95)*k),speed:Math.round(7+level*.5)};}
export function normalMonsterStatMultiplier(regionIdx=0){const i=Math.max(0,Number(regionIdx)||0);return i<=2?1.15:i<=5?1.25:i<=7?1.35:1.45;}
// 1周目・第5章以降の後半戦補正。2周目は既存の専用補正を使うため重ねない。
export function lateStoryCombatScale(regionIdx=0,cycle=1){
 const i=Math.max(0,Number(regionIdx)||0);const c=Math.max(1,Number(cycle)||1);
 if(c>=2||i<4)return {hp:1,attack:1,magic:1,defense:1,speed:1};
 if(i>=8)return {hp:2.3,attack:1.6,magic:1.6,defense:1.3,speed:1.15};
 return {hp:2,attack:1.5,magic:1.5,defense:1.3,speed:1.15};
}
export function earlyNormalMonsterCombatScale(level=1){const n=Math.max(1,Number(level)||1);return n<=5?{damage:.60,statusUse:.35}:n<=10?{damage:.75,statusUse:.55}:n<=15?{damage:.90,statusUse:.75}:{damage:1,statusUse:1};}
function activePartyCharacters(state){const active=new Set(state.activePartyIds??[]);const party=(state.characters??[]).filter(c=>active.has(c.id));return party.length?party:(state.characters??[]).slice(0,4);}
function partyAverageLevel(state){const source=activePartyCharacters(state);return Math.max(1,Math.floor(source.reduce((sum,c)=>sum+(c.level??1),0)/Math.max(1,source.length)));}
export function storyBossTargetLevel(partyAverage,stageIndex=0){
 const bonus=7+Math.min(3,Math.max(0,Number(stageIndex)||0)%4);
 return Math.min(300,Math.max(1,Math.floor(Number(partyAverage)||1)+bonus));
}
export function getStoryBossPartyProfile(state){
 const party=activePartyCharacters(state);
 const total={offense:0,defense:0,magic:0,speed:0,maxHp:0};
 for(const c of party){
  const gear=getEquipmentStatBonus(state,c);
  const attack=(c.stats?.attack??0)+(gear.attack??0);
  const magic=(c.stats?.magic??0)+(gear.magic??0);
  total.offense+=Math.max(attack,magic);
  total.defense+=(c.stats?.defense??0)+(gear.defense??0);
  total.magic+=magic;
  total.speed+=(c.stats?.speed??0)+(gear.speed??0);
  total.maxHp+=(c.maxHp??0)+(gear.maxHp??0);
 }
 const n=Math.max(1,party.length);
 return Object.fromEntries(Object.entries(total).map(([k,v])=>[k,v/n]));
}
export function makeEncounterEnemy(state,regionId=state.adventure?.regionId??'field',rng=Math.random,forcedEnemyId=null){
 ensureAdventureState(state);
 const forced=forcedEnemyId?ENEMIES[forcedEnemyId]:null;
 if(forcedEnemyId&&(!forced||(forced.regionId!==regionId&&!forced.allRegions)||forced.isBoss||forced.rareMonster))throw new Error('指定討伐の対象が不正です');
 const base=forced??rollEncounter(state,regionId,rng)??{id:`${regionId}-wanderer`,name:'旅の魔物',level:1};
 const idx=regionIndex(regionId);const average=partyAverageLevel(state);const level=average+3+Math.min(2,Math.floor(rng()*3));const tune=getDifficultyTuning(state);const normalBoost=normalMonsterStatMultiplier(idx);const lateScale=lateStoryCombatScale(idx,state.cycle??1);const early=earlyNormalMonsterCombatScale(level);const maxHp=Math.round((72+level*15)*tune.enemyHp*normalBoost*lateScale.hp);const stats=scaledStats(level);for(const k of ['attack','defense','magic','speed'])stats[k]=Math.round(stats[k]*normalBoost*lateScale[k]);stats.attack=Math.round(stats.attack*tune.enemyDamage*early.damage);stats.magic=Math.round(stats.magic*tune.enemyDamage*early.damage);
 const rewardScale=1+Math.max(0,level-average)*.12;const enemy={...elementProfile(normalizeElement(base.element)==='none'?regionElement(regionId):normalizeElement(base.element)),...structuredClone(base),regionId,id:`${base.id}-${Date.now()}-${Math.floor(rng()*9999)}`,bestiaryId:base.id,level,maxHp,hp:maxHp,mp:20+level*2,maxMp:20+level*2,stats,ai:base.ai?structuredClone(base.ai):[{type:'attack'}],exp:Math.round((120+level*32+idx*30)*rewardScale),gold:Math.round((24+level*7+idx*8)*rewardScale),jobExp:Math.round((55+level*14+idx*12)*rewardScale),enemyClass:idx>=7?'strong':'normal',statusMoveWeight:early.statusUse};
 // First journey, chapters 1–5: ordinary encounters only; keep rewards unchanged.
 if((state.cycle??1)<2&&idx>=0&&idx<=4){
  for(const key of ['maxHp','hp','maxMp','mp'])enemy[key]=Math.max(1,Math.round(enemy[key]*.8));
  for(const key of Object.keys(enemy.stats))enemy.stats[key]=Math.max(1,Math.round(enemy.stats[key]*.8));
 }
 // Monster-specific multipliers come after ordinary chapter/difficulty balancing.
 if(base.combatScale){const scale=base.combatScale;enemy.maxHp=Math.max(1,Math.round(enemy.maxHp*(scale.hp??1)));enemy.hp=enemy.maxHp;for(const stat of ['attack','defense','magic','speed'])enemy.stats[stat]=Math.max(1,Math.round(enemy.stats[stat]*(scale[stat]??1)));}
 recordEncounter(state,base.id);return enemy;
}
export function makeRegionBoss(state,regionId=state.adventure?.regionId??'field',bossCycle=state.cycle??1){
 ensureAdventureState(state);
 const idx=regionIndex(regionId),ch=STORY_BY_REGION[regionId],average=partyAverageLevel(state),profile=getStoryBossPartyProfile(state);
 const enhanced=bossCycle>=2,cycleFloor=enhanced?110+idx*10:(idx+1)*10;
 const level=Math.max(cycleFloor,storyBossTargetLevel(average,idx));
 const tune=getDifficultyTuning(state),cycleTune=enhanced?{hp:1.35,attack:1.2,magic:1.2,defense:1.15,speed:1.08}:{hp:1,attack:1,magic:1,defense:1,speed:1},lateScale=lateStoryCombatScale(idx,bossCycle);
 // 装備込みのパーティ火力に合わせて耐久を伸ばし、Stage3以降は最低+2500HP。
 const adaptiveHp=Math.round((profile.offense+profile.magic)*5);
 const stageHpBonus=idx>=2?2500:0;
 const maxHp=Math.round(((420+level*42+idx*120)+stageHpBonus+adaptiveHp)*tune.enemyHp*cycleTune.hp*lateScale.hp);
 const stats=scaledStats(level,true);
 stats.attack=Math.max(Math.round(stats.attack*tune.enemyDamage*cycleTune.attack),Math.round(profile.defense*.82));
 stats.magic=Math.max(Math.round(stats.magic*tune.enemyDamage*cycleTune.magic),Math.round(profile.magic*.72));
 stats.defense=Math.max(Math.round(stats.defense*cycleTune.defense),Math.round(profile.offense*.58));
 stats.speed=Math.max(Math.round(stats.speed*cycleTune.speed),Math.round(profile.speed*.9));
 stats.attack=Math.round(stats.attack*lateScale.attack);stats.magic=Math.round(stats.magic*lateScale.magic);stats.defense=Math.round(stats.defense*lateScale.defense);stats.speed=Math.round(stats.speed*lateScale.speed);
 const rewardScale=1+Math.max(0,level-average)*.1;const bestiaryId=bossCycle>=2?`storyBoss-ngp-${regionId}`:`storyBoss-${regionId}`;recordEncounter(state,bestiaryId);return {id:`${regionId}Boss`,bestiaryId,name:ch?.bossName??'守護者',level,maxHp,hp:maxHp,mp:100,maxMp:100,stats,ai:[{type:'attack'},{type:'attack',power:112},bossAreaAttack('全体強襲',70)],isBoss:true,enemyClass:'boss',exp:Math.round((900+level*120+idx*300)*rewardScale),gold:Math.round((180+level*24+idx*90)*rewardScale),jobExp:Math.round((360+level*50+idx*120)*rewardScale),...elementProfile(normalizeElement(ch?.bossElement)==='none'?regionElement(regionId):normalizeElement(ch?.bossElement))};
}

export function makeEncounterGroup(state,regionId=state.adventure?.regionId??'field',rng=Math.random){
 const rare=makeRareEncounterGroup(state,regionId,rng);if(rare)return rare;
 const roll=rng(); const count=roll<.55?1:roll<.85?2:3; const group=[];
 // 複数戦は手数が増えるため、1体あたりのHP/火力を抑えて総負荷を調整する。
 const groupTune=count===1?{hp:1,damage:1}:count===2?{hp:.86,damage:.88}:{hp:.72,damage:.78};
 for(let i=0;i<count;i++){const e=makeEncounterEnemy(state,regionId,rng);e.id=`${e.id}-slot${i+1}`;e.maxHp=Math.max(1,Math.round(e.maxHp*groupTune.hp));e.hp=e.maxHp;e.stats.attack=Math.max(1,Math.round(e.stats.attack*groupTune.damage));e.stats.magic=Math.max(1,Math.round(e.stats.magic*groupTune.damage));group.push(e);} if(group.length>1){const seen={};for(const e of group){const base=e.name;seen[base]=(seen[base]??0)+1;e.name=`${base}${String.fromCharCode(64+seen[base])}`;}}
 return group;
}
export function canChallengeBoss(state,regionId=state.adventure?.regionId??'field'){ensureAdventureState(state);const hero=state.characters.find(c=>c.isHero)??state.characters[0];if(state.cycle>=2&&regionId==='abyss'&&(hero?.level??0)<200)return false;return (state.adventure.regionWins[regionId]??0)>=3&&!state.adventure.completedRegions.includes(regionId);}
export const GLOBAL_MONSTER_EXP_MULTIPLIER=1.2;
export function scaledCharacterExp(exp,cycle=1,multiplier=1){
 const cycleBoost=Number(cycle)>=2?2:1;
 return Math.floor((Number(exp)||0)*GLOBAL_MONSTER_EXP_MULTIPLIER*cycleBoost*(Number(multiplier)||1));
}
export function mergeLatestLevelUps(previous=[],next=[]){
 const result=[...(previous??[])];
 for(const line of next??[]){
  const match=String(line).match(/^(.+?)のLvが\d+に上がった！$/);
  if(!match){result.push(line);continue;}
  const prefix=`${match[1]}のLvが`;
  const index=result.findIndex(x=>String(x).startsWith(prefix));
  if(index>=0)result[index]=line;else result.push(line);
 }
 return result;
}
export function recordAdventureVictory(state,{regionId=state.adventure?.regionId??'field',boss=false,enemyId,enemyIds,exp=0,gold=0,jobExp=0,characterExpMultiplier=1,jobExpMultiplier=1,countsForExploration=true,now=Date.now()}={}){
 ensureAdventureState(state);state.gold+=applyBoostedBattleGold(state,gold,now); const active=new Set(state.activePartyIds??[]);const cycleBoost=state.cycle>=2?2:1;const levelUps=[],rewardsByCharacter={};
 for(const c of state.characters){if(active.has(c.id)&&c.hp>0){const beforeLevel=c.level,beforeJob=c.jobLevels?.[c.currentJob]??1;const charGained=awardCharacterExp(state,c.id,scaledCharacterExp(exp,state.cycle,getBattleBoostMultiplier(state,'characterExp',{now,eventMultiplier:characterExpMultiplier})),{won:true});const baseJobGain=Math.max(0,Number(jobExp||exp*.4)||0);const earlyJobBoost=beforeJob<=30?1.5:1;const finalJobExpMultiplier=Math.min(2,Math.max(1,cycleBoost*earlyJobBoost,getBattleBoostMultiplier(state,'jobExp',{now,eventMultiplier:jobExpMultiplier})));const jobGained=awardJobExp(c,Math.floor(baseJobGain*finalJobExpMultiplier),state);rewardsByCharacter[c.id]={characterExp:charGained,jobExp:jobGained};const afterJob=c.jobLevels?.[c.currentJob]??1;if(c.level>beforeLevel)levelUps.push(`${c.name}のLvが${c.level}に上がった！`);if(afterJob>beforeJob)levelUps.push(`⚔️ ${c.name}の${JOBS[c.currentJob]?.name??c.currentJob}Lvが${afterJob}に上がった！`);}}
 const ids=enemyIds?.length?enemyIds:(enemyId?[enemyId]:[]);for(const id of ids){try{recordDefeat(state,id);}catch{}}
 if(!countsForExploration){state.adventure.message=['🎃 イベント戦勝利！ キャラクター経験値2倍！',...levelUps].join('\n');return {state,levelUps,rewardsByCharacter};}
 if(!boss){recordNormalBattle(state);if(String(regionId).startsWith('training:')){state.adventure.message=['修練勝利！ 経験値・素材を獲得した。',...levelUps].join('\n');return {state,levelUps,rewardsByCharacter};}state.adventure.regionWins[regionId]=(state.adventure.regionWins[regionId]??0)+1;state.adventure.message=['勝利！ 地域の探索度が上がった。',...levelUps].join('\n');return {state,levelUps,rewardsByCharacter};}
 if(!state.adventure.completedRegions.includes(regionId))state.adventure.completedRegions.push(regionId);
 if(regionId==='coast')unlockStormSiren(state);
 const idx=regionIndex(regionId);state.story.chapter=Math.min(10,idx+2);state.story.gateCaps??={};state.story.gateCaps[(state.cycle>=2?100:0)+(idx+1)*10]=true;
 state.adventure.message=(idx===9?'終焉の王を退けた。星は再び輝き始めた。':`${STORY_BY_REGION[regionId].bossName}を倒し、新たな道が開いた。`)+(levelUps.length?'\n'+levelUps.join('\n'):'');
 if(regionId==='abyss'){if(state.cycle<2){handleBossVictory(state,'firstFinal');state.story.firstEndingSeen=true;state.hardUnlocked=true;}}
 return {state,levelUps,rewardsByCharacter};
}

export function usePotion(state,characterId){const item=state.inventory?.find(x=>x.id==='potion'&&(x.qty??0)>0);if(!item)throw new Error('ポーションがありません');const c=state.characters.find(x=>x.id===characterId);if(!c||c.hp<=0)throw new Error('対象に使えません');const before=c.hp;const {maxHP}=getCharacterResourceCaps(state,c);c.hp=Math.min(maxHP,c.hp+Math.max(50,Math.floor(maxHP*.45)));item.qty--;return c.hp-before;}

export function syncBattlePartyToState(state,battle){
 for(const actor of battle?.actors??[]){if(actor.side!=='ally')continue;const c=state.characters.find(x=>x.id===actor.id);if(!c)continue;const {maxHP,maxMP}=getCharacterResourceCaps(state,c);c.hp=Math.max(0,Math.min(maxHP,actor.hp??c.hp));c.mp=Math.max(0,Math.min(maxMP,actor.mp??c.mp));c.statusAilments=[...(actor.statusAilments??[])];c.buffs=[];c.debuffs=[];}return state;
}

export function startAdventureNewGamePlus(state){state.starterGearGranted=state.starterGearGranted||state.adventure?.starterGearGranted||false;startNewGamePlus(state);state.adventure={regionId:'field',regionWins:{},completedRegions:[],chapter:1,message:'時を越え、もう一度約束の旅が始まる。',chests:{},visitedTowns:['field'],starterGearGranted:state.starterGearGranted};state.world??={};state.world.regionId='field';state.world.battleCountInPhase=0;return state;}

export function getAdventureBattleParty(state){const byId=new Map((state.characters??[]).map(c=>[c.id,c]));return (state.activePartyIds??[]).map(id=>byId.get(id)).filter(Boolean).map(c=>{const out=structuredClone(c);Object.assign(out,depthAccessoryEffects(state,c));const bonus=getEquipmentStatBonus(state,c);out.battleFlatStats={attack:bonus.attack,defense:bonus.defense,magic:bonus.magic,speed:bonus.speed};const shieldRef=c.equipment?.shield;
const shieldInstance=typeof shieldRef==='object'?shieldRef:state.equipmentInventory?.find(x=>x.instanceId===shieldRef);
out.shieldCoverReduction=Math.max(0,Number(EQUIPMENT[shieldInstance?.equipmentId]?.coverDamageReduction??0));
out.elementResist=getEquipmentElementResist(state,c);out.statusResistance=Math.max(0,out.statusResistance??out.masteryBonuses?.statusResistance??0);out.statusSuccessBonus=Math.max(0,out.statusSuccessBonus??out.masteryBonuses?.statusDebuffSuccessBonus??0);out.debuffSuccessBonus=Math.max(0,out.debuffSuccessBonus??out.masteryBonuses?.statusDebuffSuccessBonus??0);out.maxHp=Math.round((out.maxHp+(bonus.maxHp??0))*(1+shieldProgressBonus(c,'hp')));out.maxMp+=(bonus.maxMp??0);out.hp=Math.min(out.hp,out.maxHp);out.mp=Math.min(out.mp,out.maxMp);return out;});}

export function makeBestiaryRematchEnemy(state,enemyId){const base=ENEMIES[enemyId];if(!base)throw new Error('魔物が見つかりません');if(base.rareMonster)throw new Error('希少モンスターとは図鑑から再戦できません');if((state.bestiary?.[enemyId]?.defeats??0)<=0)throw new Error('未討伐の魔物とは再戦できません');if(base.bestiaryCategory==='storyBoss'){const enemy=makeRegionBoss(state,base.regionId,base.cycle??1);return {...enemy,id:`rematch-${enemyId}`,bestiaryId:enemyId,name:`${base.name}【再戦】`,exp:0,jobExp:0,rematch:true};}const hero=state.characters.find(c=>c.isHero)??state.characters[0];const level=Math.max(base.level??1,hero?.level??1);const boost=normalMonsterStatMultiplier(regionIndex(base.regionId));const maxHp=Math.round((100+level*20)*boost);const stats=scaledStats(level);for(const k of ['attack','defense','magic','speed'])stats[k]=Math.round(stats[k]*boost);return {...structuredClone(base),id:`rematch-${enemyId}`,bestiaryId:enemyId,name:`${base.name}【再戦】`,level,maxHp,hp:maxHp,maxMp:50,mp:50,stats,ai:[{type:'attack'}],exp:0,jobExp:0,gold:Math.max(10,level*8),rematch:true};}

export function makeEndgameBoss(state,bossId){const def=BOSSES[bossId];if(!def)throw new Error('エンドゲームボスが見つかりません');const level=def.level;const tune=getDifficultyTuning(state);const maxHp=Math.round(def.hp*tune.enemyHp);return {...structuredClone(def),maxHp,hp:maxHp,maxMp:999,mp:999,stats:{attack:(90+level*.75)*tune.enemyDamage,defense:75+level*.55,magic:(85+level*.7)*tune.enemyDamage,speed:45+level*.25},ai:[{type:'attack'},{type:'attack',power:130},bossAreaAttack('終焉波',90,{kind:'magic',element:'dark'})],isBoss:true,enemyClass:'boss',exp:bossId==='trueFinal'?0:25000,jobExp:bossId==='trueFinal'?0:12000,gold:bossId==='trueFinal'?50000:30000};}
export function makeLegendaryTrialEnemy(state,characterId){const hero=state.characters.find(c=>c.isHero)??state.characters[0],c=state.characters.find(x=>x.id===characterId);if(!c)throw new Error('仲間が見つかりません');if(state.cycle<2||(hero?.level??0)<190)throw new Error('Lv190・2周目で解放されます');const tune=getDifficultyTuning(state),maxHp=Math.round(60000*tune.enemyHp);return {id:`legend-trial-${characterId}`,name:`${c.name}の伝説の影`,element:'dark',level:190,maxHp,hp:maxHp,maxMp:999,mp:999,stats:{attack:190*tune.enemyDamage,defense:135,magic:175*tune.enemyDamage,speed:92},ai:[{type:'attack'},{type:'attack',power:140},bossAreaAttack('伝説の衝撃',95)],isBoss:true,enemyClass:'boss',exp:10000,jobExp:5000,gold:5000};}
