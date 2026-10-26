// Reconcile an untrusted browser save with an AUTHENTICATED server profile.
// Local arena wallet/items can never be used as the authoritative source.
import {ARENA_EQUIPMENT} from '../data/arena-equipment.js';
import {normalizeArenaProgress} from './arena.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const arenaInventoryId=id=>'arena-'+id;

export function applyAuthoritativeArenaProfile(state,profile){
 if(!profile||!Number.isSafeInteger(profile.coins)||profile.coins<0||profile.coins>999999||!Array.isArray(profile.gear)||profile.gear.length>1000){
  throw new Error('闘技大会のサーバーデータが不正です');
 }
 const newGear=new Map();
 for(const row of profile.gear){
  if(!uuid.test(String(row?.id??''))||!Object.hasOwn(ARENA_EQUIPMENT,row?.equipmentId)||
     !Number.isInteger(row.enhanceLevel)||row.enhanceLevel<0||row.enhanceLevel>10)
   throw new Error('闘技大会の装備データが不正です');
  const instanceId=arenaInventoryId(row.id);
  if(newGear.has(instanceId))throw new Error('闘技大会の装備データが重複しています');
  newGear.set(instanceId,{instanceId,equipmentId:row.equipmentId,enhanceLevel:row.enhanceLevel,
    arenaServerOwned:true,trueEvolved:false});
 }
 state.equipmentInventory??=[];
 const originalArenaIds=new Set(state.equipmentInventory.filter(x=>ARENA_EQUIPMENT[x.equipmentId]).map(x=>x.instanceId));
 const originalOther=state.equipmentInventory.filter(x=>!ARENA_EQUIPMENT[x.equipmentId]);
 state.equipmentInventory=[...originalOther,...newGear.values()];
 // Remove stale or forged equipped arena gear when no longer in server ledger.
 for(const c of state.characters??[]){
  for(const [slot,ref] of Object.entries(c.equipment??{})){
   const refId=typeof ref==='object'?ref?.instanceId:ref;
   if(originalArenaIds.has(refId)&&!newGear.has(refId))c.equipment[slot]=null;
  }
 }
 const arena=normalizeArenaProgress(state);
 arena.coins=profile.coins;
 return {coins:arena.coins,gearCount:newGear.size};
}

export function suspendUnverifiedArenaAssets(state){
 if(!state||typeof state!=='object')return;
 const oldIds=new Set((state.equipmentInventory??[]).filter(x=>ARENA_EQUIPMENT[x.equipmentId]).map(x=>x.instanceId));
 state.equipmentInventory=(state.equipmentInventory??[]).filter(x=>!ARENA_EQUIPMENT[x.equipmentId]);
 for(const c of state.characters??[])for(const [slot,ref] of Object.entries(c.equipment??{})){
  const id=typeof ref==='object'?ref?.instanceId:ref;
  if(oldIds.has(id))c.equipment[slot]=null;
 }
 normalizeArenaProgress(state).coins=0;
}

/** Cache a validated server receipt once. Never award coins from this local record. */
export function recordArenaServerReceipt(state,result){
 if(!result||!uuid.test(String(result.matchId??''))||!['arena30','arena50','arena70'].includes(result.questId)||
    !Number.isInteger(result.turns)||result.turns<1||result.turns>100||
    typeof result.victory!=='boolean'||!Number.isInteger(result.coins)||
    result.coins<0||result.coins>5)throw new Error('闘技大会のサーバー結果が不正です');
 const grade=result.victory?result.turns<=3?'S':result.turns<=6?'A':result.turns<=10?'B':'C':null;
 const coinByGrade={S:5,A:3,B:2,C:1};
 if(result.grade!==grade||result.coins!==(grade?coinByGrade[grade]:0))
  throw new Error('闘技大会の報酬結果が不一致です');
 const arena=normalizeArenaProgress(state);
 if(arena.settledMatchIds.includes(result.matchId))return false;
 const record=arena.records[result.questId];
 record.attempts=Math.min(999999,record.attempts+1);
 if(result.victory){
  record.wins=Math.min(999999,record.wins+1);
  const best=arena.best[result.questId];
  if(!best||result.turns<best)arena.best[result.questId]=result.turns;
 }
 arena.lastResult={questId:result.questId,turns:result.turns,grade:result.grade,
  coins:result.coins,victory:result.victory};
 arena.settledMatchIds=[...arena.settledMatchIds,result.matchId].slice(-100);
 return true;
}
