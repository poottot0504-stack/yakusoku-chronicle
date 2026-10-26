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
