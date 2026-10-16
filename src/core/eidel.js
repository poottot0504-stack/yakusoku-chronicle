import { OATHBREAKERS } from './oathbreakers.js';
import { bossAreaAttack } from './boss-skills.js';
export function canChallengeEidel(state){const c=state.endgame?.oathbreakerClears??{};return !!state.story?.trueEndingSeen&&OATHBREAKERS.every(x=>c[x.id]);}
export function createEidelEnemy(state){if(!canChallengeEidel(state))throw new Error('十三の背約者をすべて倒す必要があります');const maxHp=600000;return {id:'eidel',name:'第零位 エイデル',element:'dark',level:300,maxHp,hp:maxHp,maxMp:9999,mp:9999,stats:{attack:610,defense:470,magic:590,speed:285},ai:[{type:'attack',power:150},{type:'attack',power:185},bossAreaAttack('零式・断界',125,{kind:'magic',element:'dark'})],isBoss:true,enemyClass:'boss',eidel:true,phase:1,instantDeathCycle:true,instantDeathName:'約束の終焉',exp:0,jobExp:0,gold:100000};}
export function updateEidelPhase(eidel){if(!eidel?.eidel)return 0;const ratio=eidel.hp/Math.max(1,eidel.maxHp);const phase=ratio<=.3?3:ratio<=.65?2:1;if(phase>eidel.phase){eidel.phase=phase;if(phase===2){eidel.name='禁忌を宿す者 エイデル';eidel.stats.attack=Math.round(eidel.stats.attack*1.12);eidel.stats.magic=Math.round(eidel.stats.magic*1.12);}if(phase===3){eidel.name='約束を忘れた男 エイデル';eidel.stats.attack=Math.round(eidel.stats.attack*1.14);eidel.stats.magic=Math.round(eidel.stats.magic*1.14);eidel.stats.speed=Math.round(eidel.stats.speed*1.1);}}return eidel.phase;}
export function settleEidelVictory(state,battle){
 state.endgame??={};const e=state.endgame,ending=battle?.specialEnding==='saved'?'saved':'defeated';
 const saved=e.complete===true||e.eidelEnding==='saved'||ending==='saved';
 e.eidelUnlocked=true;e.eidelEnding=saved?'saved':ending;e.complete=saved;
 return ending;
}
