import { yakusokuAuthorizedFetch } from './supabase-auth.js';

const DEFAULT_ENDPOINT='https://nmxmrxfyriutakewqgkk.supabase.co/functions/v1/yakusoku-player-stats';
const QUEUE_KEY='yakusoku_progress_audit_queue';
const MAX_QUEUED_EVENTS=300;
const MAX_BATCH_EVENTS=40;
const MAX_BATCH_BATTLES=10;

export function captureProgressionSnapshot(state){
 const active=new Set(state.activePartyIds??[]);
 const selected=(state.characters??[]).filter(c=>active.has(c.id));
 const party=selected.length?selected:(state.characters??[]).slice(0,4);
 return party.map(c=>({characterId:c.id,name:c.name,level:c.level??1,exp:c.exp??0,jobId:c.currentJob??'',jobLevel:c.jobLevels?.[c.currentJob]??1}));
}

export function buildProgressionAuditEvents({playerId,before,after,meta={}}){
 const amap=new Map(after.map(x=>[x.characterId,x]));
 const battleId=meta.battleId??crypto.randomUUID();
 return before.map(b=>{
  const a=amap.get(b.characterId)??b;
  return {eventId:crypto.randomUUID(),battleId,playerId,characterId:b.characterId,characterName:b.name,jobId:b.jobId,battleType:meta.battleType??'normal',regionId:meta.regionId??'',enemyIds:meta.enemyIds??[],cycle:meta.cycle??1,saveSlot:meta.saveSlot??1,expAwarded:meta.expAwarded??0,levelBefore:b.level,levelAfter:a.level,expBefore:b.exp,expAfter:a.exp,jobLevelBefore:b.jobLevel,jobLevelAfter:a.jobLevel,clientAt:new Date().toISOString()};
 });
}

// Batches never split a battle's party events. Keeping requests single-flight
// prevents local replays when many battles finish while the network is slow.
export function pickProgressionAuditBatch(events=[],maxEvents=MAX_BATCH_EVENTS,maxBattles=MAX_BATCH_BATTLES){
 const batch=[];
 let i=0,groups=0;
 while(i<events.length&&groups<maxBattles){
  const event=events[i];
  if(!event?.eventId||!event?.battleId){i++;continue;}
  const group=[];
  while(i<events.length&&events[i]?.battleId===event.battleId){
   group.push(events[i]);i++;
  }
  // A partial party would fail the server's chain validation.
  if(batch.length+group.length>maxEvents)break;
  batch.push(...group);
  groups++;
 }
 return batch;
}

// authorizedFetch can be replaced by the offline test harness; production
// requests always go through the site's Supabase session helper.
export function createProgressionAuditApi(endpoint=DEFAULT_ENDPOINT,storage=globalThis.localStorage,fetchFn=globalThis.fetch,playerId='',authorizedFetch=yakusokuAuthorizedFetch){
 let inFlight=null, retryAt=0, failures=0, consecutiveRejectedBatches=0, retryTimer=null;
 const read=()=>{try{const q=JSON.parse(storage.getItem(QUEUE_KEY)||'[]');return Array.isArray(q)?q:[]}catch{return []}};
 const write=q=>{
  try{
   const trimmed=[...q];
   while(trimmed.length>MAX_QUEUED_EVENTS){
    const oldestBattle=trimmed[0]?.battleId;
    while(trimmed.length&&trimmed[0]?.battleId===oldestBattle)trimmed.shift();
   }
   storage.setItem(QUEUE_KEY,JSON.stringify(trimmed));return true;
  }catch{return false;}
 };
 const enqueue=events=>{
  const q=read(),seen=new Set(q.map(x=>x?.eventId));
  for(const e of events??[])if(e?.eventId&&e?.battleId&&!seen.has(e.eventId)){q.push(e);seen.add(e.eventId);}
  write(q);
  return read().length;
 };
 const scheduleRetry=delay=>{
  if(retryTimer||typeof setTimeout!=='function')return;
  retryTimer=setTimeout(()=>{retryTimer=null;void flush();},Math.max(250,delay));
  retryTimer?.unref?.(); // Prevent offline Node tests from waiting on an optional retry.
 };
 async function flush(){
  if(inFlight)return inFlight;
  const q=read();
  if(!q.length)return {ok:true,sent:0,remaining:0};
  if(Date.now()<retryAt)return {ok:false,deferred:true,sent:0,remaining:q.length};
  inFlight=(async()=>{
   const batch=pickProgressionAuditBatch(q);
   if(!batch.length)return {ok:false,sent:0,remaining:q.length};
   try{
    const response=await authorizedFetch(endpoint,{storage,fetchImpl:fetchFn,method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'progression_audit',player_id:playerId,events:batch})});
    if(!response?.ok){
     const e=new Error('audit transport failed');e.status=response?.status??0;
     const retryAfter=Number(response?.headers?.get?.('retry-after'));
     if(e.status===429&&Number.isFinite(retryAfter)&&retryAfter>0)e.retryAfterMs=Math.min(300000,retryAfter*1000);
     throw e;
    }
    const result=await response.json().catch(()=>null);
    if(result?.ok!==true)throw new Error('invalid progression audit acknowledgement');
    // An acknowledged but rejected battle must not be retried forever.
    const sent=new Set(batch.map(e=>e.eventId));
    const remaining=read().filter(e=>!sent.has(e.eventId));
    write(remaining);
    failures=0;retryAt=0;
    const acceptedBattles=Math.max(0,Number(result.accepted_battles??0));
    const rejectedBattles=Math.max(0,Number(result.rejected_battles??0));
    // A permanently desynchronized save should not flood the security log.
    consecutiveRejectedBatches=rejectedBattles>0&&acceptedBattles===0?consecutiveRejectedBatches+1:0;
    const cooldown=consecutiveRejectedBatches>=3?60000:1500;
    if(consecutiveRejectedBatches>=3)retryAt=Date.now()+cooldown;
    // Continue draining without overlapping requests if another battle was queued.
    if(remaining.length)scheduleRetry(cooldown);
    return {ok:true,sent:batch.length,acceptedBattles,rejectedBattles,remaining:read().length};
   }catch(error){
    failures=Math.min(failures+1,6);
    const backoff=error?.retryAfterMs??(error?.status===429?60000:Math.min(120000,2000*2**(failures-1)));
    retryAt=Date.now()+backoff;
    scheduleRetry(backoff);
    return {ok:false,sent:0,remaining:read().length,retryAfterMs:backoff};
   }
  })().finally(()=>{inFlight=null;});
  return inFlight;
 }
 async function record(events){enqueue(events);return flush();}
 return {record,send:record,flush,enqueue,pending:()=>read().length};
}
