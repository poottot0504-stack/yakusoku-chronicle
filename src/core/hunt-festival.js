import { HUNT_FESTIVAL,FESTIVAL_WEAPONS,HUNT_FESTIVAL_BONUSES } from '../data/hunt-festival.js';
import { MATERIAL_STACK_LIMIT } from './material-cap.js';
export function festivalPhase(now=Date.now()){return now<HUNT_FESTIVAL.start?'upcoming':now<HUNT_FESTIVAL.end?'active':'ended';}
export function nextFestivalBoundary(now=Date.now()){return [HUNT_FESTIVAL.announce,HUNT_FESTIVAL.start,HUNT_FESTIVAL.end].find(x=>x>now)??Infinity;}
export function grantFestivalReward(state,receipt,slot){
 if(!receipt?.id||!Object.hasOwn(FESTIVAL_WEAPONS,receipt.weapon))throw new Error('報酬情報を確認できません');
 if(Number(receipt.saveSlot)!==Number(slot))throw new Error(`報酬はSLOT ${receipt.saveSlot}で受け取ってください`);
 state.festivalReceipts??={};
 if(state.festivalReceipts[HUNT_FESTIVAL.id]===receipt.id)return false;
 state.equipmentInventory??=[];
 const ids=['weapon-'+receipt.weapon,'shield','head','body','arms','waist','legs','ring','charm'];
 for(const part of ids){const instanceId=`festival-${receipt.id}-${part}`;if(!state.equipmentInventory.some(x=>x.instanceId===instanceId))state.equipmentInventory.push({instanceId,equipmentId:'hunt2026-'+part,enhanceLevel:0,trueEvolved:false});}
 state.festivalReceipts[HUNT_FESTIVAL.id]=receipt.id;
 return true;
}

// Server issues a distinct, account-scoped receipt for each bonus milestone.
// The matching save receipt keeps retries and cloud-save reloads idempotent.
export function grantFestivalBonus(state,receipt,slot){
 const goal=Number(receipt?.milestone);
 const reward=HUNT_FESTIVAL_BONUSES[goal];
 if(!reward||!receipt?.id||typeof receipt.id!=='string')throw new Error('追加報酬の受取情報を確認できません');
 if(Number(receipt.saveSlot)!==Number(slot))throw new Error(`追加報酬はSLOT ${receipt.saveSlot}で受け取ってください`);
 state.festivalReceipts??={};
 const receiptKey=`${HUNT_FESTIVAL.id}:${goal}`;
 if(state.festivalReceipts[receiptKey]===receipt.id)return false;
 if(state.festivalReceipts[receiptKey])throw new Error('この追加報酬は受取済みです');
 // Validate gold and material capacity before changing any state.
 // The receipt ID makes the entire reward idempotent across save reloads.
 const gold=Number(state.gold??0);
 const goldReward=Number(reward.gold??0);
 if(!Number.isSafeInteger(gold)||gold<0||!Number.isSafeInteger(goldReward)||goldReward<0||gold>Number.MAX_SAFE_INTEGER-goldReward)
  throw new Error('所持金の上限を超えるため受け取れません');
 // Orichalcum and Orihal are forging materials, kept in state.materials.
 // Count legacy inventory stacks too, to respect the shared 9,999-material cap.
 for(const material of reward.materials){
  const stored=Number(state.materials?.[material.id]??0);
  const legacy=(state.inventory??[]).filter(x=>x.id===material.id).reduce((n,x)=>n+Number(x.qty??0),0);
  if(!Number.isSafeInteger(stored)||stored<0||!Number.isSafeInteger(legacy)||legacy<0||stored+legacy+material.qty>MATERIAL_STACK_LIMIT)
   throw new Error('素材の所持上限（9,999個）を超えるため受け取れません');
 }
 state.materials??={};
 for(const material of reward.materials){
  state.materials[material.id]=Number(state.materials[material.id]??0)+material.qty;
 }
 state.gold=gold+goldReward;
 state.festivalReceipts[receiptKey]=receipt.id;
 return true;
}
