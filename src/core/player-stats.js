import { yakusokuAuthorizedFetch } from '../online/supabase-auth.js';

export const PLAYER_STATS_STORAGE_KEY='yakusoku.playerStatsId.v1';
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fallbackUuid(){
 const bytes=new Uint8Array(16);
 if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
 else for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256);
 bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
 const h=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function getOrCreatePlayerStatsId(storage){
 let id='';
 try{id=storage?.getItem?.(PLAYER_STATS_STORAGE_KEY)??'';}catch{}
 if(UUID_RE.test(id))return id;
 id=globalThis.crypto?.randomUUID?.()??fallbackUuid();
 try{storage?.setItem?.(PLAYER_STATS_STORAGE_KEY,id);}catch{}
 return id;
}
export async function sendPlayerStatsPing(fetchImpl,endpoint,playerId,storage=globalThis.localStorage){
 try{
  const response=await yakusokuAuthorizedFetch(endpoint,{storage,fetchImpl,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ping',player_id:playerId}),keepalive:true});
  if(!response?.ok)return {ok:false,status:response?.status??0};
  const data=await response.json().catch(()=>({ok:true}));
  return {ok:data?.ok!==false,...data};
 }catch{return {ok:false,status:0};}
}
export function startPlayerStatsHeartbeat({
 storage=globalThis.localStorage,endpoint,fetchImpl=globalThis.fetch?.bind(globalThis),
 setIntervalImpl=globalThis.setInterval?.bind(globalThis),clearIntervalImpl=globalThis.clearInterval?.bind(globalThis)
}={}){
 const playerId=getOrCreatePlayerStatsId(storage);
 const ping=()=>fetchImpl&&endpoint?sendPlayerStatsPing(fetchImpl,endpoint,playerId,storage):Promise.resolve({ok:false,status:0});
 const firstPing=ping();
 const timer=setIntervalImpl?.(()=>{void ping();},300000);
 return {playerId,firstPing,stop(){if(timer!==undefined)clearIntervalImpl?.(timer);}};
}
