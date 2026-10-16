const DEFAULT_ENDPOINT='https://nmxmrxfyriutakewqgkk.supabase.co/functions/v1/yakusoku-market';
const DEFAULT_SUPABASE_URL='https://nmxmrxfyriutakewqgkk.supabase.co';
const DEFAULT_PUBLISHABLE_KEY='sb_publishable_Tb2PB9MgyCRcoIjOWfS-jg_ZpKdw4n_';
const SUPABASE_ESM='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';

const validSlot=slot=>{const n=Number(slot);if(!Number.isInteger(n)||n<1||n>5)throw new Error('セーブスロットは1〜5です');return n;};

function browserStorage(storage){
 if(storage)return storage;
 try{return globalThis.localStorage??undefined;}catch{return undefined;}
}

async function createDefaultAuth(storage){
 const {createClient}=await import(SUPABASE_ESM);
 const client=createClient(DEFAULT_SUPABASE_URL,DEFAULT_PUBLISHABLE_KEY,{auth:{storage:browserStorage(storage),persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 return client.auth;
}

export function createMarketApi({storage,fetchImpl=globalThis.fetch,supabaseAuth=null,endpoint=DEFAULT_ENDPOINT,publishableKey=DEFAULT_PUBLISHABLE_KEY}={}){
 let auth=supabaseAuth;
 async function authClient(){if(!auth)auth=await createDefaultAuth(storage);return auth;}
 async function ensureSession(){
  const a=await authClient();
  const current=await a.getSession();
  if(current?.error)throw current.error;
  if(current?.data?.session?.access_token)return current.data.session;
  const created=await a.signInAnonymously();
  if(created?.error)throw created.error;
  const session=created?.data?.session;
  if(!session?.access_token)throw new Error('フリーマーケットの匿名セッションを開始できません');
  return session;
 }
 async function call(action,slot,payload={}){
  const saveSlot=validSlot(slot),session=await ensureSession();
  if(typeof fetchImpl!=='function')throw new Error('ネットワーク機能が利用できません');
  const response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:publishableKey},body:JSON.stringify({action,saveSlot,...payload})});
  const body=await response.json().catch(()=>({}));
  if(!response.ok||body?.ok===false){const code=body?.code??null;const message=code==='SHOP_ITEM_FORBIDDEN'?'ショップ商品と薬草はフリーマーケットに出品できません':body?.error||'フリーマーケットサーバーに接続できません';const error=new Error(message);error.code=code;throw error;}
  return body?.data;
 }
 return {
  ensureSession,
  profile:slot=>call('profile',slot),
  openStore:slot=>call('openStore',slot),
  browse:({slot=1,search='',category='all',sort='newest',inStockOnly=true}={})=>call('browse',slot,{search:String(search??''),category:category??'all',sort:sort??'newest',inStockOnly:Boolean(inStockOnly)}),
  myStore:slot=>call('myStore',slot),
  history:(slot,limit=100)=>call('history',slot,{limit}),
  createListing:(slot,payload)=>call('createListing',slot,payload),
  updatePrice:(slot,listingId,unitPrice)=>call('updatePrice',slot,{listingId,unitPrice}),
  cancel:(slot,listingId)=>call('cancel',slot,{listingId}),
  purchase:(slot,listingId,quantity=1,requestId=(globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`),expectedUnitPrice=null)=>call('purchase',slot,{listingId,quantity,requestId,...(expectedUnitPrice==null?{}:{expectedUnitPrice})}),
  pendingPurchases:slot=>call('pendingPurchases',slot),
  ackPurchase:(slot,purchaseId)=>call('ackPurchase',slot,{purchaseId}),
  saleBatch:slot=>call('saleBatch',slot),
  ackSaleBatch:(slot,batchId)=>call('ackSaleBatch',slot,{batchId}),
  pendingReturns:slot=>call('pendingReturns',slot),
  ackReturn:(slot,returnId)=>call('ackReturn',slot,{returnId})
 };
}

export {DEFAULT_ENDPOINT as MARKET_ENDPOINT,DEFAULT_PUBLISHABLE_KEY as MARKET_PUBLISHABLE_KEY};
