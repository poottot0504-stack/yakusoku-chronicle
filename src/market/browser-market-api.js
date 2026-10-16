import {createMarketApi,MARKET_ENDPOINT,MARKET_PUBLISHABLE_KEY} from './market-api.js';

const SUPABASE_URL='https://nmxmrxfyriutakewqgkk.supabase.co';
const SUPABASE_JS_URL='https://esm.sh/@supabase/supabase-js@2.95.0?bundle';

export async function createBrowserMarketApi({storage=globalThis.localStorage,fetchImpl=globalThis.fetch,loadSupabase=()=>import(SUPABASE_JS_URL)}={}){
 const {createClient}=await loadSupabase();
 const client=createClient(SUPABASE_URL,MARKET_PUBLISHABLE_KEY,{auth:{storage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 return createMarketApi({supabaseAuth:client.auth,fetchImpl,endpoint:MARKET_ENDPOINT,publishableKey:MARKET_PUBLISHABLE_KEY});
}
