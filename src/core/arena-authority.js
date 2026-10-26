// Reconcile an untrusted browser save with an AUTHENTICATED server profile.
// Local arena wallet/items can never be used as the authoritative source.
import {ARENA_EQUIPMENT} from '../data/arena-equipment.js';
import {EQUIPMENT} from '../data/equipment.js';
import {canEquip} from './equipment.js';
import {normalizeArenaProgress} from './arena.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const arenaInventoryId=id=>'arena-'+id;

const ARENA_UUID=/^arena-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validEquipSlot(character,slot,def){
 if(!def)return false;
 if(def.slot==='accessory')return slot===(def.accessoryType==='charm'?'accessory2':'accessory1');
 if(def.slot==='shield'&&slot==='weapon')
  return character.currentJob==='shielder'||character.currentJob==='greatShielder';
 return def.slot===slot;
}
function equipRefId(ref){return typeof ref==='object'&&ref!==null?ref.instanceId:ref;}
function mayWear(state,character,slot,inst){
 const def=EQUIPMENT[inst.equipmentId];
 return validEquipSlot(character,slot,def)&&canEquip(character,def,state,inst);
}

export function applyAuthoritativeArenaProfile(state,profile){
 if(!profile||!Number.isSafeInteger(profile.coins)||profile.coins<0||profile.coins>999999||
    !Array.isArray(profile.gear)||profile.gear.length>1000){
  throw new Error('闘技大会のサーバーデータが不正です');
 }
 // Validate the entire profile *before* touching the user's existing save.
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
 const progress=normalizeArenaProgress(state);
 const placements=progress.equippedRestore;
 state.equipmentInventory??=[];
 const originalArenaIds=new Set(state.equipmentInventory.filter(x=>ARENA_EQUIPMENT[x.equipmentId]).map(x=>x.instanceId));
 const originalOther=state.equipmentInventory.filter(x=>!ARENA_EQUIPMENT[x.equipmentId]);
 state.equipmentInventory=[...originalOther,...newGear.values()];
 const used=new Set();
 // Keep valid already-equipped instances. Invalid, duplicated, incompatible or
 // no-longer-owned references are removed instead of silently granting stats.
 for(const c of state.characters??[]){
  for(const [slot,ref] of Object.entries(c.equipment??{})){
   const id=equipRefId(ref);
   if(!id)continue;
   if(!originalArenaIds.has(id)&&!ARENA_UUID.test(String(id)))continue;
   const instance=newGear.get(id);
   if(!instance||used.has(id)||!mayWear(state,c,slot,instance)){
    c.equipment[slot]=null;
   }else{
    c.equipment[slot]=id;
    used.add(id);
   }
  }
 }
 // The recorded slot is only a *request* to re-equip. The server's inventory
 // and the current character job/level/slot still must authorize the item.
 for(const c of state.characters??[]){
  for(const [slot,id] of Object.entries(placements[c.id]??{})){
   if(c.equipment?.[slot]||used.has(id))continue;
   const instance=newGear.get(id);
   if(instance&&mayWear(state,c,slot,instance)){
    c.equipment??={};
    c.equipment[slot]=id;
    used.add(id);
   }
  }
 }
 progress.equippedRestore={};
 progress.needsServerSync=false;
 progress.coins=profile.coins;
 return {coins:progress.coins,gearCount:newGear.size};
}

export function suspendUnverifiedArenaAssets(state){
 if(!state||typeof state!=='object')return;
 const progress=normalizeArenaProgress(state);
 const all=state.equipmentInventory??[];
 const arenaItems=all.filter(x=>ARENA_EQUIPMENT[x.equipmentId]);
 const oldIds=new Set(arenaItems.map(x=>x.instanceId));
 const placements=progress.equippedRestore;
 state.equipmentInventory=all.filter(x=>!ARENA_EQUIPMENT[x.equipmentId]);
 for(const c of state.characters??[]){
  for(const [slot,ref] of Object.entries(c.equipment??{})){
   const id=equipRefId(ref);
   if(!oldIds.has(id)&&!ARENA_UUID.test(String(id??'')))continue;
   if(ARENA_UUID.test(String(id))&&oldIds.has(id)){
    placements[c.id]??={};
    placements[c.id][slot]=id;
   }
   c.equipment[slot]=null;
  }
 }
 // The local copy is untrusted until revalidated. Mark the save for an
 // asynchronous profile fetch so owned gear can reappear in normal adventure.
 progress.needsServerSync ||= arenaItems.length>0||progress.coins>0||
  Object.keys(placements).length>0;
 progress.coins=0;
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
