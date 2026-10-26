// Arena production endpoint. Uses the private SQL ledger and verified JWT user.
// The owner's existing Cloudflare Workers origin is the sole default allowed origin.
// Set ARENA_ENABLED=false to disable future calls immediately, or explicitly
// override ARENA_ALLOWED_ORIGINS to change permitted browser hosts.
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import { verifyArenaTranscript } from '../../../src/core/arena-proof.js';

const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const corsHeaders=(origin:string)=>({
 'Access-Control-Allow-Origin':origin,
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info',
 'Access-Control-Max-Age':'600',
 Vary:'Origin'
});
const respond=(status:number,body:unknown,origin:string)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json; charset=utf-8',...(origin?corsHeaders(origin):{})}
});
function safeString(x:unknown,length=128):string|null{
 return typeof x==='string'&&x.length>0&&x.length<=length?x:null;
}
const validSlot=(x:unknown)=>Number.isInteger(x)&&Number(x)>=1&&Number(x)<=5;
function errorMessage(err:unknown){
 const message=String((err as {message?:string})?.message??err);
 const known=['ARENA_RATE_LIMIT','ARENA_MATCH_EXPIRED','ARENA_MATCH_NOT_FOUND','ARENA_INSUFFICIENT_COINS','ARENA_GEAR_MAXED','ARENA_GEAR_NOT_FOUND','ARENA_REQUEST_CONFLICT','INVALID_ARENA_ITEM'];
 return known.find(x=>message.includes(x))??'ARENA_REQUEST_FAILED';
}
Deno.serve(async req=>{
 const requestOrigin=req.headers.get('origin')??'';
 const allowedOrigins=(Deno.env.get('ARENA_ALLOWED_ORIGINS')??'https://muddy-credit-f5af.starload.workers.dev').split(',').map(x=>x.trim()).filter(Boolean);
 const origin=requestOrigin&&allowedOrigins.includes(requestOrigin)?requestOrigin:'';
 if(req.method==='OPTIONS')return origin?new Response(null,{status:204,headers:corsHeaders(origin)}):respond(403,{ok:false,error:'ORIGIN_FORBIDDEN'},'');
 if(req.method!=='POST')return respond(405,{ok:false,error:'METHOD_NOT_ALLOWED'},origin);
 if(!origin)return respond(403,{ok:false,error:'ORIGIN_FORBIDDEN'},'');
 if(Deno.env.get('ARENA_ENABLED')==='false')return respond(503,{ok:false,error:'ARENA_NOT_RELEASED'},origin);
 const bearer=req.headers.get('authorization')??'';
 const token=/^Bearer\s+(\S+)$/i.exec(bearer)?.[1];
 if(!token)return respond(401,{ok:false,error:'LOGIN_REQUIRED'},origin);
 const endpoint=Deno.env.get('SUPABASE_URL')??'';
 const publicKey=Deno.env.get('SUPABASE_ANON_KEY')??Deno.env.get('SUPABASE_PUBLISHABLE_KEY')??'';
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
 if(!endpoint||!publicKey||!serviceKey)return respond(503,{ok:false,error:'ARENA_SERVER_NOT_CONFIGURED'},origin);
 if(Number(req.headers.get('content-length')??0)>120000)return respond(413,{ok:false,error:'PAYLOAD_TOO_LARGE'},origin);
 const account=createClient(endpoint,publicKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:{user},error:userError}=await account.auth.getUser(token);
 if(userError||!user)return respond(401,{ok:false,error:'LOGIN_REQUIRED'},origin);
 // All DB mutations use a backend-only service key. Never accept userId in JSON.
 const admin=createClient(endpoint,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
 let body:Record<string,unknown>;
 try{
  const raw=await req.text();
  if(raw.length>120000)throw new Error('PAYLOAD_TOO_LARGE');
  body=JSON.parse(raw);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('INVALID_JSON');
 }catch{return respond(400,{ok:false,error:'INVALID_JSON'},origin);}
 const {action,saveSlot}=body;
 if(!validSlot(saveSlot))return respond(400,{ok:false,error:'INVALID_SLOT'},origin);
 const slot=Number(saveSlot);
 const rpc=async(name:string,args:Record<string,unknown>)=>{
  const {data,error}=await admin.rpc('arena_server_'+name,{p_user:user.id,p_slot:slot,...args});
  if(error)throw error;
  return data;
 };
 try{
  if(action==='profile')return respond(200,{ok:true,data:await rpc('profile',{})},origin);
  if(action==='start'){
   const quest=safeString(body.questId,20);
   if(!['arena30','arena50','arena70'].includes(quest??''))return respond(400,{ok:false,error:'INVALID_QUEST'},origin);
   const seed=new Uint32Array(1);crypto.getRandomValues(seed);
   const id=crypto.randomUUID();
   // Older open tabs start v1; updated clients opt in to the stronger v2 bosses.
   const balanceVersion=body.balanceVersion==null?1:body.balanceVersion;
   if(balanceVersion!==1&&balanceVersion!==2)
    return respond(400,{ok:false,error:'INVALID_BALANCE_VERSION'},origin);
   await rpc(balanceVersion===2?'issue_v2':'issue',{p_quest:quest,p_id:id,p_seed:seed[0]});
   return respond(200,{ok:true,data:{matchId:id,questId:quest,seed:seed[0],balanceVersion,expiresInSeconds:3600}},origin);
  }
  if(action==='resume'){
   const matchId=safeString(body.matchId,50);
   if(!matchId||!validId.test(matchId))return respond(400,{ok:false,error:'INVALID_MATCH_ID'},origin);
   const match=await rpc('lookup',{p_id:matchId});
   if(!match)return respond(404,{ok:false,error:'ARENA_MATCH_NOT_FOUND'},origin);
   return respond(200,{ok:true,data:{matchId,questId:match.questId,seed:Number(match.seed),
    status:match.status,expiresAt:match.expiresAt,balanceVersion:Number(match.balanceVersion??1)}},origin);
  }
  if(action==='claim'){
   const matchId=safeString(body.matchId,50);
   if(!matchId||!validId.test(matchId))return respond(400,{ok:false,error:'INVALID_MATCH_ID'},origin);
   const match=await rpc('lookup',{p_id:matchId});
   if(!match)return respond(404,{ok:false,error:'ARENA_MATCH_NOT_FOUND'},origin);
   if(match.status==='settled'){
    // Duplicate claims return the original DB receipt; never credit twice.
    const settled=await rpc('claim',{p_id:matchId,p_victory:false,p_turns:1});
    return respond(200,{ok:true,data:settled},origin);
   }
   if(new Date(match.expiresAt).getTime()<Date.now())return respond(410,{ok:false,error:'ARENA_MATCH_EXPIRED'},origin);
   if(!Array.isArray(body.actions))return respond(400,{ok:false,error:'INVALID_ACTIONS'},origin);
   let verified;
   try{verified=verifyArenaTranscript({questId:match.questId,seed:Number(match.seed),actions:body.actions,
    balanceVersion:Number(match.balanceVersion??1)});}
   catch{return respond(400,{ok:false,error:'INVALID_TRANSCRIPT'},origin);}
   const result=await rpc('claim',{p_id:matchId,p_victory:verified.victory,p_turns:verified.turns});
   return respond(200,{ok:true,data:result},origin);
  }
  if(action==='craft'){
   const item=safeString(body.equipmentId,80),requestId=safeString(body.requestId,50);
   if(!item||!requestId||!validId.test(requestId))return respond(400,{ok:false,error:'INVALID_CRAFT_REQUEST'},origin);
   const data=await rpc('craft',{p_item:item,p_request:requestId});
   return respond(200,{ok:true,data},origin);
  }
  if(action==='enhance'){
   const gearId=safeString(body.gearId,50),requestId=safeString(body.requestId,50);
   if(!gearId||!validId.test(gearId)||!requestId||!validId.test(requestId))return respond(400,{ok:false,error:'INVALID_ENHANCE_REQUEST'},origin);
   const data=await rpc('enhance',{p_gear:gearId,p_request:requestId});
   return respond(200,{ok:true,data},origin);
  }
  return respond(400,{ok:false,error:'INVALID_ACTION'},origin);
 }catch(err){
  const code=errorMessage(err);
  return respond(code==='ARENA_RATE_LIMIT'?429:code==='ARENA_INSUFFICIENT_COINS'?409:400,{ok:false,error:code},origin);
 }
});
