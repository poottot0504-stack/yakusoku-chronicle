import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
  "Content-Type":"application/json",
  "Cache-Control":"no-store"
};
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
const asInt=(v:unknown,fallback=0)=>Number.isFinite(Number(v))?Math.trunc(Number(v)):fallback;
function jstDate(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const get=(t:string)=>parts.find(p=>p.type===t)?.value??"";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function bearer(req:Request){
  const h=req.headers.get("authorization")??"";
  const m=h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]??"";
}


const LEVEL_100_EXP:Record<string,number>={swordsman:6335647,mage:6417166,thief:8627330,fighter:7453717,healer:7453717,archer:7200000,sniper:7453717};
const DEFAULT_LEVEL_100_EXP=7453717;
function cumulativeBaseExp(level:number,jobId:string){
  const lv=Math.max(1,Number(level)||1),target=LEVEL_100_EXP[jobId]??DEFAULT_LEVEL_100_EXP;
  return Math.round(target*Math.pow((lv-1)/99,2));
}
function requiredBaseExp(level:number,jobId:string){
  const lv=Math.max(1,Number(level)||1);
  return Math.max(1,cumulativeBaseExp(lv+1,jobId)-cumulativeBaseExp(lv,jobId));
}
function characterLevelMultiplier(level:number){
  const lv=Math.max(1,Number(level)||1);
  if(lv>=200)return 5;
  if(lv>=180)return 4;
  if(lv>=150)return 3;
  if(lv>=120)return 2;
  if(lv>=100)return 1.5;
  return 1;
}
function requiredCharacterExp(level:number,jobId:string){
  return Math.max(1,Math.ceil(requiredBaseExp(level,jobId)*characterLevelMultiplier(level)));
}
function progressionScore(level:number,exp:number,jobId:string){
  const lv=Math.max(1,Math.min(500,asInt(level,1)));
  let score=Math.max(0,asInt(exp,0));
  for(let i=1;i<lv;i++)score+=requiredCharacterExp(i,jobId);
  return score;
}
// Validate deep-cave floor AND the game's canonical boss ID. Never infer
// a high-EXP boss merely from an attacker-chosen "masho-28-..." string.
const MASHO_DEEP_BOSS_IDS:Record<number,string>={
  21:"anima",22:"ifrit",23:"chryps",24:"fenrir",25:"lich",
  26:"masho26-yggdravain",27:"masho27-volgrad",28:"masho28-graciel"
};
function mashoFloor(enemyIds:string[]){
  if(enemyIds.length!==1)return null;
  const match=String(enemyIds[0]).match(/^masho-(2[0-8]|1[0-9]|[1-9])-([a-z0-9-]+)$/i);
  if(!match)return null;
  const floor=Number(match[1]);
  if(floor>20 && MASHO_DEEP_BOSS_IDS[floor]!==match[2])return null;
  return floor;
}
// Keep in sync with src/core/masho-cave.js's MASHO_FLOORS.
function mashoFloorRewards(floor:number){
  if(floor>=1&&floor<=20)return {exp:100000+(floor-1)*12000,jobExp:50000+(floor-1)*8000};
  if(floor>=21&&floor<=25)return {exp:600000+(floor-21)*50000,jobExp:300000+(floor-21)*25000};
  if(floor>=26&&floor<=28)return {exp:900000+(floor-26)*100000,jobExp:450000+(floor-26)*50000};
  return null;
}
function allowedMashoJobGain(jobBefore:number,jobId:string,enemyIds:string[],cycle:number){
  const floor=mashoFloor(enemyIds);
  if(!floor)return 15;
  // Exact floor rewards (1–28) with an upper bound for NG+ and event boosts.
  let budget=(mashoFloorRewards(floor)?.jobExp??0)*(cycle>=2?2:1)*2;
  let lv=Math.max(1,Math.min(400,asInt(jobBefore,1))),gained=0;
  while(lv<400&&gained<60){
    // No stored job-exp remainder: the first level may need just 1 EXP.
    const need=gained===0?1:requiredBaseExp(lv,jobId);
    if(budget<need)break;
    budget-=need;lv++;gained++;
  }
  return Math.max(15,gained+2);
}
const REGION_ORDER=["field","forest","coast","cave","snow","desert","swamp","volcano","ruins","abyss"];
function maxRawBattleExp(battleType:string,regionId:string,avgLevel:number,enemyCount:number,enemyIds:string[]=[],cycle=1){
  if(regionId==="masho"){
    const floor=battleType==="boss"?mashoFloor(enemyIds):null;
    // All 28 floors. Unrecognized/deceptive IDs stay on the conservative cap.
    const reward=floor?mashoFloorRewards(floor):null;
    return reward?Math.min(2_000_000,reward.exp*(cycle>=2?2:1)*2+32):330000;
  }
  if(battleType==="raid")return 50000;
  if(battleType==="training")return 50000;
  if(battleType==="event")return 100000;
  const idx=Math.max(0,REGION_ORDER.indexOf(regionId));
  if(battleType==="rare"){
    const level=Math.max(1,avgLevel+5);
    const per=(120+level*32+idx*30)*1.6;
    return Math.ceil(per*Math.max(1,Math.min(5,enemyCount||1))+500);
  }
  if(battleType==="boss"){
    const level=Math.min(300,Math.max(1,avgLevel+10));
    const story=(900+level*120+idx*300)*2;
    return Math.max(100000,Math.ceil(story+5000));
  }
  const level=Math.max(1,avgLevel+5);
  const per=(120+level*32+idx*30)*1.6;
  return Math.ceil(per*Math.max(1,Math.min(3,enemyCount||1))+500);
}
function maxCharacterExpMultiplier(battleType:string,regionId:string,cycle:number){
  let mult=1.2*(cycle>=2?2:1)*2;
  if(battleType==="rare")mult*=2;
  if(regionId==="event:halloween-2026")mult*=2.5;
  else if(regionId==="twin-star-festival-2026")mult*=2;
  else if(regionId==="masho")mult*=2;
  return mult;
}

let publicStatsCache:{expiresAt:number,payload:{ok:boolean,online_60m:number,today_jst:number,total_players:number}}|null=null;

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const url=new URL(req.url);
    const body=req.method==="POST"?await req.json().catch(()=>({})):{};
    const action=String(body?.action??url.searchParams.get("action")??(req.method==="GET"?"stats":""));
    const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!supabaseUrl||!serviceKey)return reply({ok:false,error:"server_config"},500);
    const db=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

    async function requireUser(){
      const token=bearer(req);
      if(!token)return {error:reply({ok:false,error:"auth_required"},401)};
      const {data,error}=await db.auth.getUser(token);
      if(error||!data?.user)return {error:reply({ok:false,error:"invalid_session"},401)};
      return {user:data.user};
    }
    const emittedSecurityTypes=new Set<string>();
    let emittedSecurityCount=0;
    async function securityEvent(authUserId:string|null,playerId:string|null,eventType:string,severity=2,detail:Record<string,unknown>={}){
      if(emittedSecurityCount>=3 || emittedSecurityTypes.has(eventType))return;
      emittedSecurityTypes.add(eventType);
      emittedSecurityCount++;
      try{await db.from("yakusoku_security_events").insert({auth_user_id:authUserId,player_id:playerId,event_type:eventType,severity,detail});}catch{}
    }
    async function bindIdentity(authUserId:string,requestedPlayerId:string){
      if(!UUID_RE.test(requestedPlayerId))return {error:reply({ok:false,error:"invalid_player_id"},400)};
      const {data:existing,error:readError}=await db.from("yakusoku_player_identity").select("player_id").eq("auth_user_id",authUserId).maybeSingle();
      if(readError)return {error:reply({ok:false,error:"db_identity_read"},500)};
      if(existing){
        if(existing.player_id!==requestedPlayerId){
          await securityEvent(authUserId,existing.player_id,"identity_mismatch",4,{requested_player_id:requestedPlayerId});
          return {error:reply({ok:false,error:"identity_mismatch"},409)};
        }
        await db.from("yakusoku_player_identity").update({last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("auth_user_id",authUserId);
        return {playerId:existing.player_id};
      }
      const nowIso=new Date().toISOString();
      const {error:insertError}=await db.from("yakusoku_player_identity").insert({auth_user_id:authUserId,player_id:requestedPlayerId,created_at:nowIso,updated_at:nowIso,last_seen_at:nowIso});
      if(insertError){
        await securityEvent(authUserId,requestedPlayerId,"identity_bind_rejected",4,{code:insertError.code??"unknown"});
        return {error:reply({ok:false,error:"player_id_already_bound"},409)};
      }
      return {playerId:requestedPlayerId};
    }
    async function authenticatedPlayer(){
      const auth=await requireUser();
      if(auth.error)return auth;
      const requested=String(body?.player_id??url.searchParams.get("player_id")??body?.events?.[0]?.playerId??"");
      const identity=await bindIdentity(auth.user!.id,requested);
      if(identity.error)return identity;
      return {user:auth.user,playerId:identity.playerId};
    }

    if(action==="stats"){
      if(publicStatsCache && Date.now()<publicStatsCache.expiresAt)return reply(publicStatsCache.payload);
      const now=new Date(),cutoff=new Date(now.getTime()-3600000).toISOString(),today=jstDate(now);
      const [online,todayResult,total]=await Promise.all([
        db.from("yakusoku_player_activity").select("*",{count:"exact",head:true}).gte("last_seen_at",cutoff),
        db.from("yakusoku_player_activity").select("*",{count:"exact",head:true}).eq("last_seen_jst_date",today),
        db.from("yakusoku_player_activity").select("*",{count:"exact",head:true})
      ]);
      if(online.error||todayResult.error||total.error)return reply({ok:false,error:"db_stats"},500);
      const payload={ok:true,online_60m:online.count??0,today_jst:todayResult.count??0,total_players:total.count??0};
      publicStatsCache={expiresAt:Date.now()+10000,payload};
      return reply(payload);
    }

    const authp=await authenticatedPlayer();
    if(authp.error)return authp.error;
    const authUserId=authp.user!.id,playerId=authp.playerId!;

    if(action==="ping"){
      const now=new Date(),nowIso=now.toISOString(),today=jstDate(now);
      const {data:existing,error:readError}=await db.from("yakusoku_player_activity").select("player_id").eq("player_id",playerId).maybeSingle();
      if(readError)return reply({ok:false,error:"db_read"},500);
      if(existing){
        const {error}=await db.from("yakusoku_player_activity").update({last_seen_at:nowIso,last_seen_jst_date:today,updated_at:nowIso}).eq("player_id",playerId);
        if(error)return reply({ok:false,error:"db_update"},500);
      }else{
        const {error}=await db.from("yakusoku_player_activity").insert({player_id:playerId,first_seen_at:nowIso,last_seen_at:nowIso,last_seen_jst_date:today,created_at:nowIso,updated_at:nowIso});
        if(error)return reply({ok:false,error:"db_insert"},500);
      }
      return reply({ok:true});
    }

    if(action==="ranking_apology_status"||action==="ranking_apology_claim"){
      if(action==="ranking_apology_status"){
        const {data,error}=await db.from("yakusoku_ranking_apology_claims").select("player_id,reward_id,claimed_at").eq("player_id",playerId).maybeSingle();
        if(error)return reply({ok:false,error:"db_compensation_status"},500);
        if(!data)return reply({ok:true,eligible:false,claimed:false,reward_id:"ranking-apology-star-ring"});
        return reply({ok:true,eligible:true,claimed:!!data.claimed_at,reward_id:data.reward_id});
      }
      const nowIso=new Date().toISOString();
      const {data:claimed,error:claimError}=await db.from("yakusoku_ranking_apology_claims").update({claimed_at:nowIso}).eq("player_id",playerId).is("claimed_at",null).select("player_id,reward_id,claimed_at").maybeSingle();
      if(claimError)return reply({ok:false,error:"db_compensation_claim"},500);
      if(claimed)return reply({ok:true,eligible:true,claimed:true,granted:true,reward_id:claimed.reward_id});
      const {data:existing,error:readError}=await db.from("yakusoku_ranking_apology_claims").select("player_id,reward_id,claimed_at").eq("player_id",playerId).maybeSingle();
      if(readError)return reply({ok:false,error:"db_compensation_read"},500);
      if(!existing)return reply({ok:true,eligible:false,claimed:false,granted:false,reward_id:"ranking-apology-star-ring"});
      return reply({ok:true,eligible:true,claimed:!!existing.claimed_at,granted:false,reward_id:existing.reward_id});
    }

    if(action==="progression_slot_status"){
      const saveSlot=asInt(body?.save_slot,0);
      if(req.method!=="POST"||saveSlot<1||saveSlot>5)return reply({ok:false,error:"invalid_slot"},400);
      const {data,error}=await db.from("yakusoku_verified_characters")
        .select("character_id,character_name,level,exp,job_id,job_level,trust_state")
        .eq("player_id",playerId).eq("save_slot",saveSlot);
      if(error)return reply({ok:false,error:"db_slot_status"},500);
      return reply({ok:true,save_slot:saveSlot,characters:data??[]});
    }

    if(action==="progression_slot_reset"){
      const saveSlot=asInt(body?.save_slot,0);
      if(req.method!=="POST"||saveSlot<1||saveSlot>5||body?.confirm_reset!==true)return reply({ok:false,error:"invalid_slot_reset"},400);
      // An explicit start-over/delete resets only this authenticated player's
      // verified snapshot; immutable battle and security history is preserved.
      const {data,error}=await db.from("yakusoku_verified_characters")
        .delete().eq("player_id",playerId).eq("save_slot",saveSlot).select("character_id");
      if(error)return reply({ok:false,error:"db_slot_reset"},500);
      await securityEvent(authUserId,playerId,"progression_slot_reset",1,{save_slot:saveSlot,characters_reset:data?.length??0});
      return reply({ok:true,slot_reset:saveSlot,characters_reset:data?.length??0});
    }

    // Keep this version monotonic when validation rules change. The browser
    // retries quarantined (not previously accepted) battle proofs only after
    // a newer policy is deployed.
    if(action==="progression_audit_policy"){
      return reply({ok:true,policy_version:13});
    }

    if(action==="progression_audit"){
      const {data:guardAllowed,error:guardError}=await db.rpc("yakusoku_take_progression_request",{p_auth_user_id:authUserId});
      if(guardError)return reply({ok:false,error:"rate_guard_unavailable"},503);
      if(guardAllowed!==true)return reply({ok:false,error:"rate_limited",retry_after_seconds:60},429);
      const events=Array.isArray(body?.events)?body.events:[];
      if(!events.length||events.length>100)return reply({ok:false,error:"invalid_events"},400);

      const since=new Date(Date.now()-60_000).toISOString();
      const {count:recentCount,error:rateError}=await db.from("yakusoku_audit_battles").select("*",{count:"exact",head:true}).eq("player_id",playerId).gte("accepted_at",since);
      if(rateError)return reply({ok:false,error:"db_rate_check"},500);
      // Ten-battle auto-runs can legitimately exceed 15 clears/minute.
      // Preserve the per-account request limiter and all XP/chain checks.
      if((recentCount??0)>=35){
        await securityEvent(authUserId,playerId,"progression_rate_limit",4,{battles_last_60s:recentCount});
        return reply({ok:false,error:"rate_limited"},429);
      }

      const {data:verifiedRows,error:verifiedError}=await db.from("yakusoku_verified_characters").select("player_id,save_slot,character_id,level,exp,job_id,job_level,trust_state,verified_battles,last_battle_at").eq("player_id",playerId);
      if(verifiedError)return reply({ok:false,error:"db_verified_read"},500);
      const verified=new Map<string,any>();
      for(const row of verifiedRows??[])verified.set(`${row.save_slot}:${row.character_id}`,row);

      const grouped=new Map<string,any[]>();
      for(const e of events){
        const bid=String(e?.battleId??"");
        if(!UUID_RE.test(bid)||!UUID_RE.test(String(e?.eventId??""))){
          await securityEvent(authUserId,playerId,"invalid_audit_id",3,{});
          continue;
        }
        if(!grouped.has(bid))grouped.set(bid,[]);
        grouped.get(bid)!.push(e);
      }

      let acceptedBattles=0,acceptedEvents=0,rejectedBattles=0,rebaselineBattles=0;
      const acceptedBattleIds:string[]=[];
      const alreadyProcessedBattleIds:string[]=[];
      const rejectedBattleDetails:{battleId:string,reason:string}[]=[];
      const allowedTypes=new Set(["normal","boss","rare","training","event","raid","other"]);

      for(const [battleId,battleEvents] of grouped){
        if(battleEvents.length<1||battleEvents.length>4){
          rejectedBattles++;
          rejectedBattleDetails.push({battleId,reason:"invalid_party_event_count"});
          await securityEvent(authUserId,playerId,"invalid_party_event_count",3,{battle_id:battleId,event_count:battleEvents.length});continue;
        }
        const {data:existingBattle,error:existingError}=await db.from("yakusoku_audit_battles").select("battle_id").eq("battle_id",battleId).maybeSingle();
        if(existingError)return reply({ok:false,error:"db_battle_check"},500);
        if(existingBattle){alreadyProcessedBattleIds.push(battleId);continue;}

        const first=battleEvents[0];
        const saveSlot=Math.max(1,Math.min(5,asInt(first?.saveSlot,1)));
        const battleType=allowedTypes.has(String(first?.battleType))?String(first.battleType):"other";
        const regionId=String(first?.regionId??"").slice(0,120);
        const enemyIds=Array.isArray(first?.enemyIds)?first.enemyIds.slice(0,20).map((x:unknown)=>String(x).slice(0,120)):[];
        const expAwarded=Math.max(0,asInt(first?.expAwarded,0));
        let invalidReason="";
        if(expAwarded>2_000_000)invalidReason="exp_awarded_too_high";

        // A strictly scoped, one-time event recovery for accounts whose historical
        // progression chain stopped updating before the collection event began.
        // This checks a server-issued battle ticket in a service-role-only SQL RPC.
        // All per-battle EXP, level, region and kill validations below still apply.
        let collectionRebaselineAllowed=false;
        let collectionRebaselineUsed=false;
        const existingSlotRows=[...verified.values()].filter(v=>Number(v.save_slot)===saveSlot);
        const collectionStart=Date.parse("2026-11-06T00:00:00+09:00");
        if(battleType==="normal" && Date.now()<Date.parse("2026-11-18T00:00:00+09:00")
           && existingSlotRows.length>0 && existingSlotRows.every(v=>
             typeof v.last_battle_at==="string" && Date.parse(v.last_battle_at)<collectionStart)){
          const {data:eligible,error:eligibilityError}=await db.rpc(
            "yakusoku_collection_rebaseline_eligible",{
              p_auth_user_id:authUserId,p_battle_id:battleId,
              p_save_slot:saveSlot,p_region_id:regionId,p_enemy_ids:enemyIds,
              p_client_at:first?.clientAt??null
            });
          collectionRebaselineAllowed=!eligibilityError && eligible===true;
        }

        const staged:any[]=[];
        for(const e of battleEvents){
          const characterId=String(e?.characterId??"").slice(0,80);
          const characterName=String(e?.characterName??"").slice(0,40);
          const jobId=String(e?.jobId??"").slice(0,80);
          const levelBefore=asInt(e?.levelBefore,1),levelAfter=asInt(e?.levelAfter,1);
          const expBefore=Math.max(0,asInt(e?.expBefore,0)),expAfter=Math.max(0,asInt(e?.expAfter,0));
          const jobLevelBefore=asInt(e?.jobLevelBefore,1),jobLevelAfter=asInt(e?.jobLevelAfter,1);
          const eventExp=Math.max(0,asInt(e?.expAwarded,0));
          if(!characterId){invalidReason="missing_character";break;}
          if(levelBefore<1||levelAfter<1||levelAfter>500||levelAfter<levelBefore||levelAfter-levelBefore>10){invalidReason="invalid_level_delta";break;}
          const allowedJobDelta=(battleType==="boss"&&regionId==="masho")?allowedMashoJobGain(jobLevelBefore,jobId,enemyIds,Math.max(1,asInt(e?.cycle,1))):15;
          if(jobLevelBefore<1||jobLevelAfter<1||jobLevelAfter>400||jobLevelAfter<jobLevelBefore||jobLevelAfter-jobLevelBefore>allowedJobDelta){invalidReason="invalid_job_delta";break;}
          if(expBefore>1_000_000_000_000||expAfter>1_000_000_000_000){invalidReason="invalid_exp_state";break;}
          if(eventExp!==expAwarded){invalidReason="mixed_exp_award";break;}
          const key=`${saveSlot}:${characterId}`;
          const prior=verified.get(key);
          if(prior){
            if(levelBefore!==Number(prior.level)||expBefore!==Number(prior.exp)){
              if(!collectionRebaselineAllowed){invalidReason="progression_chain_mismatch";break;}
              collectionRebaselineUsed=true;
            }
            if(String(prior.job_id)===jobId&&jobLevelBefore!==Number(prior.job_level)){
              if(!collectionRebaselineAllowed){invalidReason="job_chain_mismatch";break;}
              collectionRebaselineUsed=true;
            }
          }
          staged.push({key,prior,eventId:String(e.eventId),characterId,characterName,jobId,levelBefore,levelAfter,expBefore,expAfter,jobLevelBefore,jobLevelAfter,cycle:Math.max(1,Math.min(2,asInt(e?.cycle,1))),clientAt:e?.clientAt??null});
        }

        if(!invalidReason){
          const avgLevel=Math.max(1,Math.round(staged.reduce((n,s)=>n+s.levelBefore,0)/Math.max(1,staged.length)));
          const rawLimit=maxRawBattleExp(battleType,regionId,avgLevel,enemyIds.length,enemyIds,staged[0]?.cycle??1);
          if(expAwarded>rawLimit){
            invalidReason="raw_exp_over_limit";
          }else{
            const cycle=staged[0]?.cycle??1;
            const maxGain=Math.floor(expAwarded*maxCharacterExpMultiplier(battleType,regionId,cycle))+32;
            for(const s of staged){
              const beforeScore=progressionScore(s.levelBefore,s.expBefore,s.jobId);
              const afterScore=progressionScore(s.levelAfter,s.expAfter,s.jobId);
              const gain=afterScore-beforeScore;
              if(gain<0||gain>maxGain){
                invalidReason="impossible_character_exp_gain";
                break;
              }
            }
          }
        }

        if(invalidReason){
          rejectedBattles++;
          rejectedBattleDetails.push({battleId,reason:invalidReason});
          await securityEvent(authUserId,playerId,invalidReason,invalidReason.includes("chain")||invalidReason.includes("impossible")?5:4,{battle_id:battleId,save_slot:saveSlot,exp_awarded:expAwarded});
          continue;
        }

        const auditRows=staged.map(s=>({
          event_id:s.eventId,battle_id:battleId,player_id:playerId,character_id:s.characterId,character_name:s.characterName,job_id:s.jobId,
          battle_type:battleType,region_id:regionId,enemy_ids:enemyIds,cycle:s.cycle,exp_awarded:expAwarded,
          level_before:s.levelBefore,level_after:s.levelAfter,exp_before:s.expBefore,exp_after:s.expAfter,
          job_level_before:s.jobLevelBefore,job_level_after:s.jobLevelAfter,client_at:s.clientAt
        }));
        const {error:auditError}=await db.from("yakusoku_progression_audit").upsert(auditRows,{onConflict:"event_id",ignoreDuplicates:true});
        if(auditError)return reply({ok:false,error:"db_audit"},500);

        const maxLevelBefore=Math.max(...staged.map(s=>s.levelBefore));
        const maxLevelAfter=Math.max(...staged.map(s=>s.levelAfter));
        const {error:battleInsertError}=await db.from("yakusoku_audit_battles").insert({
          battle_id:battleId,auth_user_id:authUserId,player_id:playerId,save_slot:saveSlot,battle_type:battleType,region_id:regionId,
          enemy_ids:enemyIds,event_count:staged.length,exp_awarded:expAwarded,max_level_before:maxLevelBefore,max_level_after:maxLevelAfter,
          client_at:first?.clientAt??null
        });
        if(battleInsertError&&battleInsertError.code!=="23505")return reply({ok:false,error:"db_battle_insert"},500);

        if(collectionRebaselineUsed){
          await securityEvent(authUserId,playerId,"collection_one_time_rebaseline",3,{
            battle_id:battleId,save_slot:saveSlot
          });
        }
        for(const s of staged){
          const trustState=collectionRebaselineUsed?"legacy_baseline":(s.prior?.trust_state??(s.levelBefore<=30?"verified_start":"legacy_baseline"));
          if(!s.prior&&s.levelBefore>30){
            await securityEvent(authUserId,playerId,"legacy_high_level_baseline",3,{save_slot:saveSlot,character_id:s.characterId,level:s.levelBefore});
          }
          const next={player_id:playerId,save_slot:saveSlot,character_id:s.characterId,character_name:s.characterName,level:s.levelAfter,exp:s.expAfter,job_id:s.jobId,job_level:s.jobLevelAfter,trust_state:trustState,verified_battles:Number(s.prior?.verified_battles??0)+1,last_battle_at:new Date().toISOString(),updated_at:new Date().toISOString()};
          const {error:upsertError}=await db.from("yakusoku_verified_characters").upsert(next,{onConflict:"player_id,save_slot,character_id"});
          if(upsertError)return reply({ok:false,error:"db_verified_update"},500);
          verified.set(s.key,next);
        }
        acceptedBattles++;acceptedEvents+=staged.length;
        acceptedBattleIds.push(battleId);
        if(collectionRebaselineUsed)rebaselineBattles++;
      }
      return reply({
        ok:true,ack_version:2,policy_version:13,
        accepted:acceptedEvents,accepted_battles:acceptedBattles,
        rejected_battles:rejectedBattles,rebaseline_battles:rebaselineBattles,
        accepted_battle_ids:acceptedBattleIds,
        already_processed_battle_ids:alreadyProcessedBattleIds,
        rejected_battle_details:rejectedBattleDetails
      });
    }

    return reply({ok:false,error:"invalid_action"},400);
  }catch(e){
    console.error(e);
    return reply({ok:false,error:"bad_request"},400);
  }
});
