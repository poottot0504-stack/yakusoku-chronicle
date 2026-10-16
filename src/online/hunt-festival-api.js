import { yakusokuAuthorizedFetch,YAKUSOKU_SUPABASE_URL } from './supabase-auth.js';
import { HUNT_FESTIVAL } from '../data/hunt-festival.js';
export function createFestivalApi(storage=globalThis.localStorage){
 async function call(name,params={}){
  const res=await yakusokuAuthorizedFetch(`${YAKUSOKU_SUPABASE_URL}/rest/v1/rpc/${name}`,{storage,method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(params)});
  const data=await res.json().catch(()=>null);
  if(!res.ok||!data)throw new Error(({festival_not_started:'イベント開始前です',festival_not_achieved:'目標討伐数にまだ到達していません',festival_not_participated:'開催期間中に討伐へ参加すると受取対象になります',festival_wrong_slot:'最初に選択したセーブスロットで受け取ってください',festival_claim_base_first:'先に2,500体達成報酬を受け取ってください',invalid_milestone:'対象の報酬が見つかりません'})[data?.message]??'討伐祭の情報を取得できません。通信を確認して再試行してください');
  return data;
 }
 return {snapshot:()=>call('yakusoku_hunt_festival_snapshot'),claim:(weapon,slot)=>call('yakusoku_hunt_festival_claim',{p_weapon:weapon,p_save_slot:slot}),claimBonus:(goal,slot)=>call('yakusoku_hunt_festival_claim_bonus',{p_milestone:goal,p_save_slot:slot}),beginBattle:(battle)=>call('yakusoku_hunt_festival_begin',{p_battle_id:battle.battleId,p_enemy_ids:battle.enemyIds,p_battle_type:battle.battleType}),recordBattle:(battle)=>call(battle.protocol===2?'yakusoku_hunt_festival_record_v2':'yakusoku_hunt_festival_record',{p_battle_id:battle.battleId,p_enemy_ids:battle.enemyIds,p_battle_type:battle.battleType,p_client_at:battle.clientAt})};
}
