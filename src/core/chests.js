import { CHESTS } from '../data/chests.js';
import { addMaterial } from './material-cap.js';
function consume(state,id){const x=state.inventory?.find(i=>i.id===id&&i.qty>0);if(!x)throw new Error('鍵がありません');x.qty--;}
function reward(state,r){if(r.kind==='gold')state.gold=(state.gold??0)+r.amount;else if(r.kind==='material'){state.materials??={};addMaterial(state,r.id,r.qty??1);}else{state.inventory??=[];const x=state.inventory.find(i=>i.id===r.id);if(x)x.qty=(x.qty??0)+(r.qty??1);else state.inventory.push({id:r.id,qty:r.qty??1});}}
export function detectTrap(character,chest,rng=Math.random){if(!chest.trap)return false;const thief=character?.currentJob==='thief';const lv=character?.jobLevels?.thief??0;const speed=character?.stats?.speed??0;return thief&&rng()<Math.min(.95,.2+lv*.005+speed*.003);}
export function detectMimic(character,chest,rng=Math.random){if(!chest.mimic)return false;if(character?.items?.includes('truthEye'))return true;const thief=character?.currentJob==='thief';const lv=character?.jobLevels?.thief??0;const speed=character?.stats?.speed??0;return thief&&rng()<Math.min(.95,.15+lv*.007+speed*.004);}
export function openChest(state,chestId,options={},rng=Math.random){const chest=CHESTS[chestId];if(!chest)throw new Error('宝箱がありません');state.chestState??={};const day=state.world?.day??1;const rec=state.chestState[chestId];if(chest.type==='normal'&&rec&&day-rec.day<chest.respawnDays)throw new Error('宝箱は空です');if(chest.type!=='normal'&&rec?.opened)throw new Error('この宝箱は一度だけ開けられます');
 if(chest.mimic&&options.action==='inspect'){return {mimic:true,detected:detectMimic(options.character,chest,rng),options:['fight','leave']};}
 if(chest.mimic&&options.action!=='defeated')return {mimic:true,options:['fight','leave']};
 if(chest.keyType==='consumable')consume(state,chest.keyId);if(chest.keyType==='permanent'&&!(state.keyItems??[]).includes(chest.keyId))throw new Error('必要な鍵がありません');
 let trapTriggered=false;if(chest.trap){if(options.useTrapKit){consume(state,'trapKit');trapTriggered=rng()>=.7;}else trapTriggered=!detectTrap(options.character,chest,rng);}
 for(const r of chest.rewards??[])reward(state,r);state.chestState[chestId]={opened:true,day};return {opened:true,trapTriggered,rewards:chest.rewards??[],mimic:!!chest.mimic};}
