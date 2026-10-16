import { createEquipmentInstance } from '../data/equipment.js';
import { yakusokuAuthorizedFetch } from '../online/supabase-auth.js';

export const RANKING_APOLOGY_REWARD_ID='ranking-apology-star-ring';
export const RANKING_APOLOGY_ENDPOINT='https://nmxmrxfyriutakewqgkk.supabase.co/functions/v1/yakusoku-player-stats';

export const RANKING_APOLOGY_DELIVERY_PREFIX='yakusoku.rankingApologyDelivered.v1.';

export function wasRankingApologyDelivered(storage,playerId){
  if(!storage||!playerId)return false;
  try{return storage.getItem(`${RANKING_APOLOGY_DELIVERY_PREFIX}${playerId}`)==='1';}catch{return false;}
}

export function markRankingApologyDelivered(storage,playerId){
  if(!storage||!playerId)return false;
  try{storage.setItem(`${RANKING_APOLOGY_DELIVERY_PREFIX}${playerId}`,'1');return true;}catch{return false;}
}

export function grantRankingApologyReward(state){
  state.equipmentInventory??=[];
  if(state.equipmentInventory.some(x=>x?.equipmentId===RANKING_APOLOGY_REWARD_ID))return false;
  state.equipmentInventory.push(createEquipmentInstance(RANKING_APOLOGY_REWARD_ID));
  return true;
}

export function createRankingApologyApi(endpoint=RANKING_APOLOGY_ENDPOINT,fetchFn=globalThis.fetch?.bind(globalThis),storage=globalThis.localStorage){
  async function call(action,playerId){
    if(!fetchFn)throw new Error('通信機能を利用できません');
    const response=await yakusokuAuthorizedFetch(endpoint,{storage,fetchImpl:fetchFn,method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,player_id:playerId})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data?.ok===false)throw new Error(data?.error||'運営サーバーに接続できません');
    return data;
  }
  return {
    status:playerId=>call('ranking_apology_status',playerId),
    claim:playerId=>call('ranking_apology_claim',playerId)
  };
}
