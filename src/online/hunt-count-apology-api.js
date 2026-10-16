import { YAKUSOKU_SUPABASE_URL,yakusokuAuthorizedFetch } from './supabase-auth.js';

export function createHuntCountApologyApi({endpoint=YAKUSOKU_SUPABASE_URL+'/rest/v1/rpc',storage=globalThis.localStorage,fetchFn=globalThis.fetch?.bind(globalThis)}={}){
 async function call(name,data={}){
  const response=await yakusokuAuthorizedFetch(`${endpoint}/${name}`,{
   storage,fetchImpl:fetchFn,method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(data)
  });
  const json=await response.json().catch(()=>({}));
  if(!response.ok||json?.error)throw new Error(json?.message??json?.error??'お詫び配布サーバーに接続できません');
  return json;
 }
 return {
  status:()=>call('yakusoku_hunt_count_apology_status'),
  claim:slot=>call('yakusoku_hunt_count_apology_claim',{p_save_slot:slot})
 };
}
