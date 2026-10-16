import { YAKUSOKU_PUBLISHABLE_KEY, yakusokuAuthorizedFetch, setYakusokuSession, signOutYakusoku } from './supabase-auth.js';

export const ACCOUNT_ENDPOINT='https://nmxmrxfyriutakewqgkk.supabase.co/functions/v1/yakusoku-account';

async function parseResponse(res){
 const data=await res.json().catch(()=>({}));
 if(res.ok&&data?.ok!==false)return data;
 const err=new Error(data?.error??`account_http_${res.status}`);err.code=data?.error??'';err.status=res.status;throw err;
}

export function createAccountApi({storage=globalThis.localStorage,fetchImpl=globalThis.fetch?.bind(globalThis),saveScope='normal'}={}){
 if(typeof fetchImpl!=='function')throw new Error('通信機能を利用できません');
 const post=async(action,payload={},auth=true)=>{
  const options={storage,fetchImpl,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,save_scope:saveScope,...payload})};
  if(auth)return parseResponse(await yakusokuAuthorizedFetch(ACCOUNT_ENDPOINT,options));
  return parseResponse(await fetchImpl(ACCOUNT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',apikey:YAKUSOKU_PUBLISHABLE_KEY},body:options.body}));
 };
 return {
  status:()=>post('status'),
  create:(loginId,password,initialSaves=[])=>post('create',{login_id:loginId,password,initial_saves:initialSaves}),
  login:(loginId,password)=>post('login',{login_id:loginId,password},false),
  showRecovery:()=>post('show_recovery'),
  resetPassword:(loginId,recoveryCode,newPassword)=>post('reset_password',{login_id:loginId,recovery_code:recoveryCode,new_password:newPassword},false),
  loadSlots:()=>post('load_slots'),
  saveSlot:(slot,saveData,updatedAt)=>post('save_slot',{slot,save_data:saveData,updated_at:updatedAt}),
  deleteSlot:slot=>post('delete_slot',{slot}),
  applySession:session=>setYakusokuSession(storage,session),
  logout:()=>signOutYakusoku(storage,'local')
 };
}
