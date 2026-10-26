// Authoritative arena API, prototype-only. The server refuses requests until
// ARENA_ENABLED=true in the staging Edge Function. No local coin minting.
import { yakusokuAuthorizedFetch } from './supabase-auth.js';

export const ARENA_ENDPOINT='https://nmxmrxfyriutakewqgkk.supabase.co/functions/v1/yakusoku-arena';
const validSlot=slot=>{if(!Number.isInteger(Number(slot))||Number(slot)<1||Number(slot)>5)throw new Error('セーブスロットが不正です');return Number(slot);};
export function createArenaApi({storage,fetchImpl=globalThis.fetch?.bind(globalThis),
 authorizedFetch=yakusokuAuthorizedFetch,endpoint=ARENA_ENDPOINT}={}){
 if(typeof authorizedFetch!=='function')throw new Error('認証機能が利用できません');
 const post=async(action,saveSlot,payload={})=>{
  const resp=await authorizedFetch(endpoint,{
   storage,fetchImpl,method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({action,saveSlot:validSlot(saveSlot),...payload})
  });
  const parsed=await resp.json().catch(()=>({}));
  if(!resp.ok||parsed?.ok!==true){
   const code=parsed?.error??('ARENA_HTTP_'+resp.status);
   const error=new Error(code==='ARENA_NOT_RELEASED'?'闘技大会のサーバーは現在準備中です':String(code));
   error.code=code;throw error;
  }
  return parsed.data;
 };
 return Object.freeze({
  profile:saveSlot=>post('profile',saveSlot),
  start:(saveSlot,questId)=>post('start',saveSlot,{questId}),
  claim:(saveSlot,matchId,actions)=>post('claim',saveSlot,{matchId,actions}),
  craft:(saveSlot,equipmentId,requestId=crypto.randomUUID())=>post('craft',saveSlot,{equipmentId,requestId}),
  enhance:(saveSlot,gearId,requestId=crypto.randomUUID())=>post('enhance',saveSlot,{gearId,requestId})
 });
}
