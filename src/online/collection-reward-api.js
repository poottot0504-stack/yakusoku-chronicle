import { yakusokuAuthorizedFetch,YAKUSOKU_SUPABASE_URL } from './supabase-auth.js';
export function createCollectionRewardApi({storage=globalThis.localStorage,fetchImpl=globalThis.fetch?.bind(globalThis),authorizedFetch=yakusokuAuthorizedFetch}={}){
 async function call(name,params={}){
  const response=await authorizedFetch(`${YAKUSOKU_SUPABASE_URL}/rest/v1/rpc/${name}`,{
   storage,fetchImpl,method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(params)
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result)throw new Error(
   result?.message==='collection_rank_not_final'?'最終順位の確定をお待ちください。':
   result?.message==='collection_rank_under_review'?'報酬を確認中です。':
   result?.message==='collection_not_participated'?'イベントに参加した記録がありません。':
   result?.message==='collection_wrong_slot'?'最初に選んだセーブスロットで受け取ってください。':
   '報酬の受取状況を取得できませんでした。');
  return result;
 }
 return {
  snapshot:()=>call('yakusoku_collection_claim_snapshot'),
  claim:slot=>call('yakusoku_collection_claim',{p_save_slot:slot})
 };
}
