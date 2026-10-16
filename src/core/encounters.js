import { ENEMY_LIST } from '../data/enemies.js';
export function unlockStormSiren(state){
 state.story??={};state.story.rareGate=true;state.inventory??=[];
 const token=state.inventory.find(x=>x.id==='moonToken');
 if(token)token.qty=Math.max(1,token.qty??0);else state.inventory.push({id:'moonToken',qty:1,unique:true});
 return state;
}
function hasItem(state,id){return (state.inventory??[]).some(x=>x.id===id&&(x.qty??1)>0);}
function conditionsPass(state,e){const c=e.conditions;if(!c)return true;if(c.time&&state.world?.timePhase!==c.time)return false;if(c.weather&&state.world?.weather!==c.weather)return false;if(c.storyFlag&&!state.story?.[c.storyFlag])return false;if(c.itemId&&!hasItem(state,c.itemId))return false;return true;}
export function getEncounterCandidates(state,regionId){return ENEMY_LIST.filter(e=>e.regionId===regionId&&!e.isBoss&&conditionsPass(state,e)).map(e=>({...e,weight:(e.weight??1)*(1+(state.rareEncounterBoost?.[e.id]??0))}));}
export function rollEncounter(state,regionId,rng=Math.random){const c=getEncounterCandidates(state,regionId);if(!c.length)return null;const total=c.reduce((s,x)=>s+x.weight,0);let r=rng()*total;for(const e of c){r-=e.weight;if(r<=0)return e;}return c.at(-1);}
export function recordRareEncounterFailure(state,enemyId){state.rareEncounterBoost??={};state.rareEncounterBoost[enemyId]=Math.min(.5,(state.rareEncounterBoost[enemyId]??0)+.1);state.bestiary??={};state.bestiary[enemyId]??={encounters:0,defeats:0};state.bestiary[enemyId].encounters++;return state.rareEncounterBoost[enemyId];}
