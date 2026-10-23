import { COLLECTION_EVENT_202611 as EVENT } from '../data/collection-event-202611.js';
import { collectionRankReward } from '../data/collection-event-rewards-202611.js';
import { materialCapacity, addMaterial } from './material-cap.js';

const MATERIAL_IDS=new Set(['orichalcum','orihal']);
const ITEM_IDS=new Set(['characterExpScroll','jobExpScroll']);

export function collectionRewardDelivered(state,receipt){
 return !!receipt?.id&&state?.collectionRewardReceipts?.[EVENT.id]===receipt.id;
}

export function grantCollectionReward(state,receipt,saveSlot){
 if(!receipt?.id||typeof receipt.id!=='string')throw new Error('報酬情報を確認できません');
 if(!Number.isSafeInteger(receipt.rank)||receipt.rank<1)throw new Error('確定順位が不正です');
 if(Number(receipt.saveSlot)!==Number(saveSlot)||!Number.isInteger(Number(saveSlot))||Number(saveSlot)<1||Number(saveSlot)>5)
  throw new Error(`報酬はSLOT ${receipt.saveSlot}で受け取ってください`);
 state.collectionRewardReceipts??={};
 if(collectionRewardDelivered(state,receipt))return false;
 if(state.collectionRewardReceipts[EVENT.id])throw new Error('別の報酬を受取済みです');
 const expected=collectionRankReward(receipt.rank);
 if(!expected)throw new Error('この順位に報酬はありません');
 // Reject tampering or incompatible versions before modifying the save.
 if(Number(receipt.gold)!==expected.gold||!Array.isArray(receipt.items)||
    JSON.stringify([...receipt.items].sort((a,b)=>String(a.id).localeCompare(String(b.id))))!==
    JSON.stringify([...expected.items].sort((a,b)=>String(a.id).localeCompare(String(b.id)))))
  throw new Error('報酬内容がゲームの設定と一致しません');
 const currentGold=Number(state.gold??0);
 if(!Number.isSafeInteger(currentGold)||currentGold<0||currentGold>Number.MAX_SAFE_INTEGER-expected.gold)
  throw new Error('所持ゴールドが上限に達しています');
 for(const item of expected.items){
  if(MATERIAL_IDS.has(item.id)&&materialCapacity(state,item.id)<item.qty)
   throw new Error('素材の所持上限に達しています。所持品を整理して再度受け取ってください');
  if(!MATERIAL_IDS.has(item.id)&&!ITEM_IDS.has(item.id))throw new Error('不明な報酬アイテムです');
 }
 const oldGold=currentGold,oldMaterials={...(state.materials??{})},oldInventory=structuredClone(state.inventory??[]),oldReceipts={...state.collectionRewardReceipts};
 try{
  for(const item of expected.items){
   if(MATERIAL_IDS.has(item.id)){
    if(addMaterial(state,item.id,item.qty)!==item.qty)throw new Error('素材を受け取れませんでした');
   }else{
    state.inventory??=[];
    const stack=state.inventory.find(x=>x?.id===item.id);
    if(stack){
     if(!Number.isSafeInteger(stack.qty)||stack.qty<0||stack.qty>Number.MAX_SAFE_INTEGER-item.qty)throw new Error('アイテム数が不正です');
     stack.qty+=item.qty;
    }else state.inventory.push({id:item.id,qty:item.qty});
   }
  }
  state.gold=currentGold+expected.gold;
  state.collectionRewardReceipts[EVENT.id]=receipt.id;
 }catch(error){
  state.gold=oldGold;state.materials=oldMaterials;state.inventory=oldInventory;state.collectionRewardReceipts=oldReceipts;throw error;
 }
 return true;
}
