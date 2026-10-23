import { yakusokuAuthorizedFetch, YAKUSOKU_SUPABASE_URL } from './supabase-auth.js';
import { COLLECTION_EVENT_202611 } from '../data/collection-event-202611.js';
import { COLLECTION_RANKING_PAGE_SIZE } from '../ui/collection-ranking.js';

// The RPC must be a public READ-ONLY, security-invoker or carefully audited
// server implementation returning ONLY public display fields.
const RPC='yakusoku_collection_public_ranking';
export function createCollectionRankingApi({storage=globalThis.localStorage,fetchImpl=globalThis.fetch?.bind(globalThis),authorizedFetch=yakusokuAuthorizedFetch}={}){
 return {
  async page(page=1){
   if(!Number.isSafeInteger(page)||page<1||page>100000)throw new Error('ページが不正です');
   const response=await authorizedFetch(`${YAKUSOKU_SUPABASE_URL}/rest/v1/rpc/${RPC}`,{
    storage,fetchImpl,method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({p_event_id:COLLECTION_EVENT_202611.id,p_page:page,p_page_size:COLLECTION_RANKING_PAGE_SIZE})
   });
   if(!response.ok)throw new Error('公開ランキングを取得できませんでした。');
   const data=await response.json().catch(()=>null);
   if(!data||!Array.isArray(data.rows)||!Number.isSafeInteger(data.totalParticipants)||data.totalParticipants<0)
    throw new Error('ランキングのデータ形式が不正です');
   // Only allowlisted fields from server; do not forward private data to UI.
   const rows=data.rows.slice(0,COLLECTION_RANKING_PAGE_SIZE).map(row=>({
    rank:row.rank,displayName:row.displayName,count:row.count
   }));
   return {
    rows,totalParticipants:data.totalParticipants,
    myRank:Number.isSafeInteger(data.myRank)?data.myRank:null,
    myCount:Number.isSafeInteger(data.myCount)?data.myCount:0
   };
  }
 };
}
