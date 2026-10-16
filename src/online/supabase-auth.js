export const YAKUSOKU_SUPABASE_URL='https://nmxmrxfyriutakewqgkk.supabase.co';
export const YAKUSOKU_PUBLISHABLE_KEY='sb_publishable_Tb2PB9MgyCRcoIjOWfS-jg_ZpKdw4n_';
const SUPABASE_JS_URL='https://esm.sh/@supabase/supabase-js@2.95.0?bundle';

let clientPromise=null;
let sessionPromise=null;

function browserStorage(storage){
 if(storage)return storage;
 try{return globalThis.localStorage??undefined;}catch{return undefined;}
}

async function getClient(storage){
 if(!clientPromise){
  clientPromise=import(SUPABASE_JS_URL).then(({createClient})=>createClient(
   YAKUSOKU_SUPABASE_URL,
   YAKUSOKU_PUBLISHABLE_KEY,
   {auth:{storage:browserStorage(storage),persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}
  ));
 }
 return clientPromise;
}

export async function ensureYakusokuSession(storage=globalThis.localStorage){
 const client=await getClient(storage);
 const current=await client.auth.getSession();
 if(current?.error)throw current.error;
 if(current?.data?.session?.access_token)return current.data.session;
 if(!sessionPromise){
  sessionPromise=client.auth.signInAnonymously().then(result=>{
   if(result?.error)throw result.error;
   if(!result?.data?.session?.access_token)throw new Error('匿名セッションを開始できません');
   return result.data.session;
  }).finally(()=>{sessionPromise=null;});
 }
 return sessionPromise;
}

export async function yakusokuAuthHeaders(storage=globalThis.localStorage,extra={}){
 const session=await ensureYakusokuSession(storage);
 return {
  ...extra,
  authorization:`Bearer ${session.access_token}`,
  apikey:YAKUSOKU_PUBLISHABLE_KEY
 };
}

export async function yakusokuAuthorizedFetch(endpoint,{
 storage=globalThis.localStorage,
 fetchImpl=globalThis.fetch?.bind(globalThis),
 headers={},
 ...options
}={}){
 if(typeof fetchImpl!=='function')throw new Error('通信機能を利用できません');
 const authHeaders=await yakusokuAuthHeaders(storage,headers);
 return fetchImpl(endpoint,{...options,headers:authHeaders});
}


export async function getYakusokuClient(storage=globalThis.localStorage){
 return getClient(storage);
}
export async function setYakusokuSession(storage=globalThis.localStorage,session){
 const client=await getClient(storage);
 const access_token=String(session?.access_token??''),refresh_token=String(session?.refresh_token??'');
 if(!access_token||!refresh_token)throw new Error('ログイン情報が不正です');
 const result=await client.auth.setSession({access_token,refresh_token});
 if(result?.error)throw result.error;
 return result.data?.session??null;
}
export async function signOutYakusoku(storage=globalThis.localStorage,scope='local'){
 const client=await getClient(storage);
 const result=await client.auth.signOut({scope});
 if(result?.error)throw result.error;
 return true;
}
