import { RARE_MONSTER_LIST } from '../data/rare-monsters.js';
import { recordEncounter } from './bestiary.js';
import { recordAchievementEvent } from './achievements.js';
import { getDailyTravelBonus } from './daily-travel-bonus.js';

const REGION_ORDER=['field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss'];
const stageIndex=id=>REGION_ORDER.indexOf(id);
const partyAverageLevel=state=>{const ids=new Set(state.activePartyIds??[]);const party=(state.characters??[]).filter(c=>ids.has(c.id));const src=party.length?party:(state.characters??[]).slice(0,4);return Math.max(1,Math.floor(src.reduce((n,c)=>n+(c.level??1),0)/Math.max(1,src.length)));};

export function rollRareMonster(regionId,rng=Math.random,now=Date.now()){
 if(stageIndex(regionId)<4)return null;
 const daily=getDailyTravelBonus(now);const multiplier=daily.active?Number(daily.rareEncounterMultiplier??1):1;
 if(rng()>=Math.min(1,.01*multiplier))return null;
 return RARE_MONSTER_LIST[Math.min(9,Math.floor(rng()*10))];
}
function makeOne(state,def,regionId,slot){
 const average=partyAverageLevel(state);const level=average+5;const idx=stageIndex(regionId);const rewardScale=1+Math.max(0,level-average)*.12;const baseExp=(120+level*32+idx*30)*rewardScale;const baseJobExp=(55+level*14+idx*12)*rewardScale;
 const defense=8+level*.55+(def.defenseBonus??0);
 return {...structuredClone(def),id:`${def.id}-${Date.now()}-${slot}`,bestiaryId:def.id,regionId,level,maxHp:def.hp,hp:def.hp,maxMp:200,mp:200,stats:{attack:Math.round(10+level*1.1),defense:Math.round(defense),magic:Math.round(11+level*1.05),speed:Math.round(18+level*.65)},exp:Math.round(baseExp),jobExp:Math.round(baseJobExp),gold:0};
}
export function makeRareEncounterGroup(state,regionId,rng=Math.random){
 const def=rollRareMonster(regionId,rng);if(!def)return null;
 const count=def.id==='rare-cactenten'?2+Math.floor(rng()*4):1;const group=[];
 for(let i=0;i<count;i++)group.push(makeOne(state,def,regionId,i+1));
 recordEncounter(state,def.id);recordAchievementEvent(state,{type:'rareEncounter'});
 if(group.length>1)group.forEach((e,i)=>e.name=`${def.name}${String.fromCharCode(65+i)}`);
 return group;
}

export function getRareBattleRewards(battle){
 const rare=(battle?.actors??[]).filter(x=>x.side==='enemy'&&x.rareMonster);const defeated=rare.filter(x=>x.hp<=0&&!x.escaped);const escaped=rare.filter(x=>x.escaped);
 return {exp:defeated.reduce((n,x)=>n+(x.exp??0),0)*2,jobExp:defeated.reduce((n,x)=>n+(x.jobExp??0),0),gold:0,enemyIds:defeated.map(x=>x.bestiaryId??x.id),defeatedCount:defeated.length,escapedCount:escaped.length};
}
