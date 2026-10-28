import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const CORS={
 'access-control-allow-origin':'*',
 'access-control-allow-headers':'authorization, x-client-info, apikey, content-type',
 'access-control-allow-methods':'POST, OPTIONS',
 'content-type':'application/json'
};
const ok=(data:unknown,status=200)=>new Response(JSON.stringify({ok:true,data}),{status,headers:CORS});
const fail=(error:string,code=error,status=400)=>new Response(JSON.stringify({ok:false,error,code}),{status,headers:CORS});
const MARKET_DEFAULT_MAX_PRICE=30_000_000;
const MARKET_RARE_MAX_PRICE=3_000_000_000;
const MARKET_RARE_IDS=new Set([
 'masho-26-eternal-tree-blessing',
 'masho-27-infernal-eclipse-ring',
 'masho-28-final-claussolas'
]);
const listingMaxPrice=(body:any)=>body?.itemKind==='equipment' &&
 MARKET_RARE_IDS.has(String(body?.itemId??'')) &&
 body?.itemPayload?.kind==='equipment' &&
 body?.itemPayload?.equipmentId===body.itemId
 ? MARKET_RARE_MAX_PRICE:MARKET_DEFAULT_MAX_PRICE;
const slotOf=(v:unknown)=>{const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=5?n:null;};
const text=(v:unknown)=>String(v??'');

function publicKey(){
 const encoded=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
 if(encoded){try{return JSON.parse(encoded).default as string;}catch{}}
 return Deno.env.get('SUPABASE_ANON_KEY')??'';
}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 if(req.method!=='POST')return fail('METHOD_NOT_ALLOWED','METHOD_NOT_ALLOWED',405);
 const authHeader=req.headers.get('authorization')??'';
 if(!authHeader.startsWith('Bearer '))return fail('AUTH_REQUIRED','AUTH_REQUIRED',401);
 const url=Deno.env.get('SUPABASE_URL')??'';const key=publicKey();
 if(!url||!key)return fail('SERVER_CONFIG_ERROR','SERVER_CONFIG_ERROR',500);
 const supabase=createClient(url,key,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const token=authHeader.slice(7);
 const {data:userData,error:userError}=await supabase.auth.getUser(token);
 if(userError||!userData.user)return fail('AUTH_REQUIRED','AUTH_REQUIRED',401);
 let body:any;try{body=await req.json();}catch{return fail('INVALID_JSON','INVALID_JSON');}
 const saveSlot=slotOf(body?.saveSlot);if(!saveSlot)return fail('INVALID_SLOT','INVALID_SLOT');
 const action=text(body?.action);
 const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data;};
 try{
  switch(action){
   case'profile':return ok(await rpc('market_get_profile',{p_save_slot:saveSlot}));
   case'setDisplayName':return ok(await rpc('market_set_profile',{p_save_slot:saveSlot,p_display_name:text(body.name)}));
   case'openStore':return ok(await rpc('market_open_store',{p_save_slot:saveSlot}));
   case'browse':return ok(await rpc('market_browse',{p_search:text(body.search),p_category:text(body.category||'all'),p_sort:text(body.sort||'newest'),p_in_stock_only:body.inStockOnly!==false}));
   case'myStore':return ok(await rpc('market_my_store',{p_save_slot:saveSlot}));
   case'history':return ok(await rpc('market_transaction_history',{p_save_slot:saveSlot,p_limit:Math.min(100,Math.max(1,Math.floor(Number(body.limit)||100)))}));
   case'createListing':{
    const price=Number(body.unitPrice),quantity=Number(body.quantity);
    if(!Number.isSafeInteger(price)||price<1||price>listingMaxPrice(body))return fail('INVALID_PRICE','INVALID_PRICE');
    if(!Number.isInteger(quantity)||quantity<1)return fail('INVALID_QUANTITY','INVALID_QUANTITY');
    return ok(await rpc('market_create_listing',{p_save_slot:saveSlot,p_category:text(body.category),p_item_kind:text(body.itemKind),p_item_id:text(body.itemId),p_item_name:text(body.itemName),p_item_payload:body.itemPayload??{},p_unit_price:price,p_quantity:quantity}));
   }
   case'updatePrice':{
    const price=Number(body.unitPrice);if(!Number.isSafeInteger(price)||price<1||price>MARKET_RARE_MAX_PRICE)return fail('INVALID_PRICE','INVALID_PRICE');
    return ok(await rpc('market_update_price',{p_save_slot:saveSlot,p_listing_id:text(body.listingId),p_unit_price:price}));
   }
   case'cancel':return ok(await rpc('market_cancel_listing',{p_save_slot:saveSlot,p_listing_id:text(body.listingId)}));
   case'purchase':{
    const quantity=Number(body.quantity);if(!Number.isInteger(quantity)||quantity<1)return fail('INVALID_QUANTITY','INVALID_QUANTITY');
    const expectedUnitPrice=Number(body.expectedUnitPrice);if(!Number.isSafeInteger(expectedUnitPrice)||expectedUnitPrice<1||expectedUnitPrice>MARKET_RARE_MAX_PRICE)return fail('INVALID_PRICE','INVALID_PRICE');
    return ok(await rpc('market_purchase',{p_save_slot:saveSlot,p_listing_id:text(body.listingId),p_quantity:quantity,p_request_id:text(body.requestId),p_expected_unit_price:expectedUnitPrice}));
   }
   case'pendingPurchases':return ok(await rpc('market_pending_purchases',{p_save_slot:saveSlot}));
   case'ackPurchase':return ok(await rpc('market_ack_purchase',{p_save_slot:saveSlot,p_purchase_id:text(body.purchaseId)}));
   case'saleBatch':return ok(await rpc('market_get_or_create_sale_batch',{p_save_slot:saveSlot}));
   case'ackSaleBatch':return ok(await rpc('market_ack_sale_batch',{p_save_slot:saveSlot,p_batch_id:text(body.batchId)}));
   case'pendingReturns':return ok(await rpc('market_get_pending_returns',{p_save_slot:saveSlot}));
   case'ackReturn':return ok(await rpc('market_ack_return',{p_save_slot:saveSlot,p_return_id:text(body.returnId)}));
   default:return fail('UNKNOWN_ACTION','UNKNOWN_ACTION');
  }
 }catch(error:any){
  const message=text(error?.message||'MARKET_ERROR');
  const code=['AUTH_REQUIRED','INVALID_SLOT','INVALID_NAME','PROFILE_REQUIRED','INVALID_CATEGORY','INVALID_KIND','INVALID_PRICE','INVALID_QUANTITY','SHOP_ITEM_FORBIDDEN','STORE_REQUIRED','LISTING_LIMIT','LISTING_NOT_EDITABLE','LISTING_NOT_FOUND','LISTING_UNAVAILABLE','SELF_PURCHASE','INSUFFICIENT_STOCK','STORE_EXPIRED','REQUEST_ID_REQUIRED','PRICE_CHANGED'].find(x=>message.includes(x))??'MARKET_ERROR';
  const status=code==='AUTH_REQUIRED'?401:['LISTING_UNAVAILABLE','STORE_EXPIRED','PRICE_CHANGED'].includes(code)?409:400;
  return fail(code,code,status);
 }
});