import { HUNT_FESTIVAL } from '../data/hunt-festival.js';
const KEY='yakusoku.hunt.battles.202610.v1';
// Retain several hours of valid offline battles while the server throttles replays.
const MAX_PENDING=3000;
const allowed=new Set(['normal','boss','rare','training','event','other']);
export function isFestivalBattle(meta,now=Date.now()){
 return Number.isFinite(now)&&now>=HUNT_FESTIVAL.start&&now<HUNT_FESTIVAL.end&&!meta?.rematch&&!meta?.isRaid;
}
export function createFestivalKillRecorder(recordBattle,storage=globalThis.localStorage){
 let inFlight=null;
 const read=()=>{try{const result=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(result)?result:[]}catch{return [];}};
 const save=q=>{try{storage.setItem(KEY,JSON.stringify(q.slice(-MAX_PENDING)));return true}catch{return false}};
 const pending=()=>read().length;
 const enqueue=battle=>{
  if(!battle?.battleId||!Array.isArray(battle.enemyIds)||!battle.enemyIds.length||battle.enemyIds.length>5||!allowed.has(battle.battleType))return false;
  const ms=Date.parse(battle.clientAt);if(!isFestivalBattle({},ms))return false;
  const queue=read();if(!queue.some(x=>x.battleId===battle.battleId))queue.push(battle);
  return save(queue);
 };
 const flush=()=>{
  if(inFlight)return inFlight;
  inFlight=(async()=>{
   let sent=0;
   for(let i=0;i<25;i++){
    const next=read()[0];if(!next)break;
    try{
     const r=await recordBattle(next);
     if(r?.ok!==true)break;
     save(read().filter(x=>x.battleId!==next.battleId));sent++;
    }catch{break;}
   }
   return {sent,remaining:pending()};
  })().finally(()=>{inFlight=null;});
  return inFlight;
 };
 const record=battle=>{if(!enqueue(battle))return Promise.resolve({sent:0,remaining:pending()});return flush();};
 return {record,enqueue,flush,pending};
}
