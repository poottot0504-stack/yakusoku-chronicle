import { SHOPS } from '../data/shops.js';
import { EQUIPMENT, createEquipmentInstance } from '../data/equipment.js';
import { sell } from './selling.js';
function seeded(seed){let x=(seed??1)>>>0;return ()=>((x=(1664525*x+1013904223)>>>0)/2**32);}
export function getShopInventory(state,shopId,{seed=1}={}){
 const shop=SHOPS[shopId];if(!shop)throw new Error('店がありません');
 state.shopState??={};const day=state.world?.day??1;
 const random=seeded(seed),items=shop.type==='special'?shop.items.filter(()=>random()>.25).map(x=>({...x,stock:x.stock===Infinity?Infinity:1})):shop.items;
 return items.map(item=>{
  if(item.stock===Infinity)return {...item};
  const key=`${shopId}:${item.id}`,rec=state.shopState[key];
  if(!rec||rec.day!==day)state.shopState[key]={day,stock:item.stock};
  return {...item,stock:state.shopState[key].stock};
 });
}
export function buyItem(state,shopId,itemId,qty=1){
 qty=Number(qty);if(!Number.isInteger(qty)||qty<1||qty>999)throw new Error('一度に購入できる個数は1〜999個です');
 const item=getShopInventory(state,shopId).find(x=>x.id===itemId);
 if(!item)throw new Error('商品がありません');
 if(item.kind==='equipment'&&qty!==1)throw new Error('装備品は1回に1個のみ購入できます');
 if(item.stock!==Infinity&&item.stock<qty)throw new Error('在庫が足りません');
 const cost=item.price*qty;if(!Number.isFinite(cost)||cost<0)throw new Error('商品の価格が不正です');
 if((state.gold??0)<cost)throw new Error('ゴールドが足りません');
 if(item.requiredTrueEnding&&!state.story?.trueEndingSeen)throw new Error('真ED後に購入できます');
 if(item.kind==='equipment'&&!EQUIPMENT[item.equipmentId])throw new Error('装備がありません');
 // Allocate before charging, so a failed instance allocation cannot take gold.
 const equipment=item.kind==='equipment'?Array.from({length:qty},()=>createEquipmentInstance(item.equipmentId)):null;
 state.gold=(state.gold??0)-cost;
 if(equipment){state.equipmentInventory??=[];state.equipmentInventory.push(...equipment);}
 else{
  state.inventory??=[];const slot=state.inventory.find(x=>x.id===itemId);
  if(slot)slot.qty=(slot.qty??0)+qty;else state.inventory.push({id:itemId,qty,price:item.price});
 }
 if(item.stock!==Infinity)state.shopState[`${shopId}:${itemId}`].stock-=qty;
 return item;
}
export function sellItem(state,item){
 if(item?.protected)throw new Error('このアイテムは売却できません');
 return sell(state,{kind:item?.kind??(item?.equipmentId?'equipment':'item'),id:item?.equipmentId??item?.id,quantity:item?.qty??1}).total;
}
