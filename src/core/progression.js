import { applyProgressionCaps, CHARACTER_LEVEL_MAX, JOB_LEVEL_MAX } from './progression-caps.js';
import { getCurrentGateCap } from './level-gates.js';
import { JOBS } from '../data/jobs.js';
import { getCharacterResourceCaps } from './combat-stats.js';
const LEVEL_100_EXP={swordsman:6335647,mage:6417166,thief:8627330,fighter:7453717,healer:7453717,archer:7200000,sniper:7453717};
const DEFAULT_LEVEL_100_EXP=7453717;
function cumulativeExpForLevel(level,jobId='swordsman'){const lv=Math.max(1,Number(level)||1);const target=LEVEL_100_EXP[jobId]??DEFAULT_LEVEL_100_EXP;return Math.round(target*Math.pow((lv-1)/99,2));}
export function requiredExpForLevel(level,jobId='swordsman'){const lv=Math.max(1,Number(level)||1);return Math.max(1,cumulativeExpForLevel(lv+1,jobId)-cumulativeExpForLevel(lv,jobId));}
function characterExpMultiplierForLevel(level){
  const lv=Math.max(1,Number(level)||1);
  if(lv>=200)return 5;
  if(lv>=180)return 4;
  if(lv>=150)return 3;
  if(lv>=120)return 2;
  if(lv>=100)return 1.5;
  return 1;
}
export function requiredCharacterExpForLevel(level,jobId='swordsman'){
  return Math.max(1,Math.ceil(requiredExpForLevel(level,jobId)*characterExpMultiplierForLevel(level)));
}
function activeAndAlive(state,id){const c=state.characters.find(x=>x.id===id);return !!c && state.activePartyIds.includes(id) && c.hp>0;}
export function awardCharacterExp(state,characterId,amount,{won=true}={}){
  const c=state.characters.find(x=>x.id===characterId); if(!c||!won||!activeAndAlive(state,characterId)) return 0;
  applyProgressionCaps(state);const cap=Math.min(CHARACTER_LEVEL_MAX,c.isHero?getCurrentGateCap(state):(state.levelCap??100));
  if(c.level>=cap){const stored=Math.floor(amount*.25);c.hiddenExp=(c.hiddenExp??0)+stored;return stored;}
  c.exp=(c.exp??0)+amount;
  while(c.level<cap){const need=requiredCharacterExpForLevel(c.level,c.currentJob);if(c.exp<need)break;c.exp-=need;c.level++;const post200=c.level>=200;const hpGain=(post200?4:7)+Math.ceil((c.stats?.defense??1)*(post200?.5:1));const mpGain=(post200?1:2)+Math.ceil((c.stats?.magic??1)*(post200?.25:.5));c.maxHp+=hpGain;c.maxMp+=mpGain;const {maxHP,maxMP}=getCharacterResourceCaps(state,c);c.hp=Math.min(maxHP,c.hp+hpGain);c.mp=Math.min(maxMP,c.mp+mpGain);c.stats??={attack:1,defense:1,magic:1,speed:1};const favored={gunbreaker:['attack','defense'],astrologian:['magic','speed'],swordsman:['attack','defense'],mage:['magic','speed'],thief:['speed','attack'],fighter:['attack','speed'],healer:['magic','defense'],archer:['speed','attack'],sniper:['attack','speed']}[c.favoredJob??c.currentJob]??['attack','defense'];for(const k of ['attack','defense','magic','speed'])c.stats[k]=(c.stats[k]??1)+1;const bonus=favored[(c.level+characterId.length)%favored.length];c.stats[bonus]=(c.stats[bonus]??1)+1;}
  return amount;
}
export function awardJobExp(character,amount,state=null){
  const job=character.currentJob; character.jobExp ??={}; character.jobLevels??={};
  character.jobExp[job]=(character.jobExp[job]??0)+amount;
  if(state)applyProgressionCaps(state);const category=JOBS[job]?.unlock?.type??'basic';const cap=Math.min(JOB_LEVEL_MAX,state?.jobCaps?.[category]??100);
  while((character.jobLevels[job]??1)<cap){const lv=character.jobLevels[job]??1;const need=requiredExpForLevel(lv,job);if(character.jobExp[job]<need)break;character.jobExp[job]-=need;character.jobLevels[job]=lv+1;}
  return amount;
}
