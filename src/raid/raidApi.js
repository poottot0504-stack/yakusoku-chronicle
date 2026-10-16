import { yakusokuAuthorizedFetch } from '../online/supabase-auth.js';

const DEFAULT_ENDPOINT='https://nmxmrxfyriutakewqgkk.supabase.co/functions/v1/yakusoku-raid';
const PLAYER_STATS_STORAGE_KEY='yakusoku.playerStatsId.v1';
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fallbackUuid(){
 const bytes=new Uint8Array(16);
 if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
 else for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256);
 bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
 const h=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

export function getRaidPlayerId(storage=globalThis.localStorage){
 let id='';
 try{id=storage?.getItem?.(PLAYER_STATS_STORAGE_KEY)??'';}catch{}
 if(UUID_RE.test(id))return id;
 id=globalThis.crypto?.randomUUID?.()??fallbackUuid();
 try{storage?.setItem?.(PLAYER_STATS_STORAGE_KEY,id);}catch{}
 return id;
}

export function createRaidApi(endpoint=DEFAULT_ENDPOINT,storage=globalThis.localStorage){
 async function call(action,payload={}){
  const mutating=action==='join'||action==='act'||action==='claim';
  const body={action,...payload,...(mutating?{actionId:crypto.randomUUID()}:{})};
  const r=await yakusokuAuthorizedFetch(endpoint,{
   storage,
   method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify(body)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.ok===false)throw new Error(data.message||data.error||'レイドサーバーに接続できません');
  return data;
 }
 return {join:p=>call('join',p),act:p=>call('act',p),claim:p=>call('claim',p),snapshot:p=>call('snapshot',p)};
}
