import { yakusokuAuthorizedFetch,YAKUSOKU_SUPABASE_URL } from './supabase-auth.js';
export function createCollectionScoreApi({storage=globalThis.localStorage,authorizedFetch=yakusokuAuthorizedFetch,fetchImpl=globalThis.fetch?.bind(globalThis)}={}){
 return {
  async begin({battleId,regionId,enemyIds,displayName}){
   const response=await authorizedFetch(
    `${YAKUSOKU_SUPABASE_URL}/rest/v1/rpc/yakusoku_collection_begin`,{
     storage,fetchImpl,method:'POST',headers:{'content-type':'application/json'},
     body:JSON.stringify({p_battle_id:battleId,p_region_id:regionId,
      p_enemy_ids:enemyIds,p_display_name:displayName})
    });
   if(!response.ok)throw new Error('イベント討伐記録の開始処理に失敗しました');
   const payload=await response.json().catch(()=>null);
   if(payload?.ok!==true||payload?.battleId!==battleId)
    throw new Error('イベント討伐記録の開始確認に失敗しました');
   return payload;
  }
 };
}
