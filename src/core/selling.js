import {getItemDef,getItemCategory} from './items.js';
import {EQUIPMENT} from '../data/equipment.js';
import {SHOPS} from '../data/shops.js';

export function getSellPrice(def={}){if(def.keyItem||def.category==='key')return 0;if(Number.isFinite(def.sellPrice))return Math.max(0,Math.floor(def.sellPrice));if(Number.isFinite(def.price))return Math.max(1,Math.floor(def.price*.5));return Math.max(1,Number(def.defaultSellPrice??10));}
export function getSellWarning(def={}){if(def.event||def.eventLimited||def.category==='event')return '⚠️ イベント限定品です。本当に売却しますか？';if(['rare','epic','legendary'].includes(def.rarity)||def.unique)return '⚠️ 貴重なアイテムです。本当に売却しますか？';return '';}
function equippedIds(state){const ids=new Set();for(const c of state.characters??[])for(const v of Object.values(c.equipment??{})){const id=typeof v==='object'?v?.instanceId:v;if(id)ids.add(id);}return ids;}
export function getSellableQuantity(state,kind,id){if(kind==='equipment'){const equipped=equippedIds(state);return (state.equipmentInventory??[]).filter(x=>x.equipmentId===id&&!equipped.has(x.instanceId)).length;}if(kind==='material')return Math.max(0,Number(state.materials?.[id]??0));return (state.inventory??[]).filter(x=>x.id===id).reduce((n,x)=>n+Math.max(0,Number(x.qty)||0),0);}
export function getSellDefinition(kind,id){
 const def=kind==='equipment'?EQUIPMENT[id]:getItemDef(id);
 const category=kind==='equipment'?'equipment':getItemCategory(id);
 const product=Object.values(SHOPS).flatMap(shop=>shop.items??[]).find(x=>kind==='equipment'?x.equipmentId===id:x.id===id);
 const price=Number.isFinite(def?.price)?def.price:product?.price;
 return {...def,price,category,event:!!(category==='event'||def?.event||def?.eventLimited),keyItem:!!(category==='key'||def?.keyItem)};
}
export function sell(state,{kind,id,quantity}){
 const qty=Number(quantity);
 if(!['equipment','material','item'].includes(kind)||!Number.isInteger(qty)||qty<1)throw new Error('売却個数を1個以上選んでください');
 const def=getSellDefinition(kind,id);
 if(def.category==='key'||def.keyItem)throw new Error('だいじなものは売却できません');
 if(qty>getSellableQuantity(state,kind,id))throw new Error('売却できる所持数を超えています');
 const price=getSellPrice(def);
 if(price<=0)throw new Error('このアイテムは売却できません');
 if(kind==='equipment'){
  const equipped=equippedIds(state);let remaining=qty;
  state.equipmentInventory=(state.equipmentInventory??[]).filter(x=>{if(remaining>0&&x.equipmentId===id&&!equipped.has(x.instanceId)){remaining--;return false;}return true;});
 }else if(kind==='material')state.materials[id]-=qty;
 else{
  let remaining=qty;
  for(const x of state.inventory??[]){if(x.id!==id||x.qty<=0)continue;const take=Math.min(remaining,x.qty);x.qty-=take;remaining-=take;if(!remaining)break;}
  state.inventory=(state.inventory??[]).filter(x=>(x.qty??0)>0);
 }
 const total=price*qty;state.gold=(state.gold??0)+total;state.pendingAutosaveReason='sell';
 return {id,quantity:qty,unitPrice:price,total,remaining:getSellableQuantity(state,kind,id)};
}
