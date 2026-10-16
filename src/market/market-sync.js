import {applyMarketPurchase,applyMarketProceeds,applyMarketReturn} from './market-model.js';

const amount=n=>Number(n??0).toLocaleString('ja-JP');
const validSlot=slot=>{const n=Number(slot);if(!Number.isInteger(n)||n<1||n>5)throw new Error('セーブスロットは1〜5です');return n;};

function cloneValue(value){
 if(value==null)return value;
 if(typeof structuredClone==='function')return structuredClone(value);
 return JSON.parse(JSON.stringify(value));
}
function marketMutationSnapshot(state){
 return {gold:state.gold,inventory:cloneValue(state.inventory),materials:cloneValue(state.materials),equipmentInventory:cloneValue(state.equipmentInventory),market:cloneValue(state.market)};
}
function restoreMarketMutation(state,snapshot){
 state.gold=snapshot.gold;state.inventory=snapshot.inventory;state.materials=snapshot.materials;state.equipmentInventory=snapshot.equipmentInventory;state.market=snapshot.market;
}
async function applyAndPersist(state,apply,save){
 const snapshot=marketMutationSnapshot(state),changed=apply();
 if(!changed)return false;
 try{await save();return true;}catch(error){restoreMarketMutation(state,snapshot);throw error;}
}

export async function persistMarketReturn({state,ret,save}={}){return applyAndPersist(state,()=>applyMarketReturn(state,ret),save);}

export function formatMarketSaleNotifications(batch){
 if(!batch)return [];
 const rows=(batch.sales??[]).map(s=>`${s.buyerName??'誰か'}が「${s.itemName??'商品'}${Number(s.quantity??1)>1?` ×${Number(s.quantity)}`:''}」を${amount(s.totalPrice)}Gで購入しました！`);
 rows.push(`売上合計 ${amount(batch.totalGold)}G を受け取りました！`);
 return rows;
}

export async function purchaseMarketListing({api,state,slot,listing,quantity=1,save,requestId}={}){
 slot=validSlot(slot);quantity=Number(quantity);
 if(!Number.isInteger(quantity)||quantity<1||quantity>Number(listing?.quantityRemaining??0))throw new Error('購入個数が不正です');
 const unitPrice=Number(listing?.unitPrice??0),expected=unitPrice*quantity;
 if(!Number.isInteger(unitPrice)||unitPrice<1)throw new Error('価格が不正です');
 if(Number(state?.gold??0)<expected)throw new Error('ゴールドが足りません');
 const receipt=await api.purchase(slot,listing.id,quantity,requestId,unitPrice);
 await applyAndPersist(state,()=>applyMarketPurchase(state,receipt),save);
 await api.ackPurchase(slot,receipt.id);
 return receipt;
}

export async function syncPendingMarketTransactions({api,state,slot,save}={}){
 slot=validSlot(slot);const purchases=[],returns=[];
 const pending=await api.pendingPurchases(slot)??[];
 for(const receipt of pending){await applyAndPersist(state,()=>applyMarketPurchase(state,receipt),save);await api.ackPurchase(slot,receipt.id);purchases.push(receipt);}
 const batch=await api.saleBatch(slot);
 if(batch){await applyAndPersist(state,()=>applyMarketProceeds(state,batch),save);await api.ackSaleBatch(slot,batch.id);}
 const pendingReturns=await api.pendingReturns(slot)??[];
 for(const ret of pendingReturns){await persistMarketReturn({state,ret,save});await api.ackReturn(slot,ret.id);returns.push(ret);}
 return {purchases,saleBatch:batch??null,returns};
}
