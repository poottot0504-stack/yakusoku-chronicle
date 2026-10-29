import {EQUIPMENT} from '../data/equipment.js';
import {ARENA_COIN_ID} from '../data/arena-equipment.js';
import {getItemDef,getItemCategory} from '../core/items.js';
import {SHOPS} from '../data/shops.js';
import {MARKET_MASHO_20_25_EQUIPMENT_IDS,MARKET_MASHO_20_25_MAX_PRICE} from './masho-mid-price-items.js';

export const MARKET_MIN_PRICE=1;
export const MARKET_MAX_PRICE=30_000_000;
export const MARKET_RARE_EQUIPMENT_MAX_PRICE=3_000_000_000;
export const MARKET_RARE_EQUIPMENT_IDS=Object.freeze([
 'masho-26-eternal-tree-blessing',
 'masho-27-infernal-eclipse-ring',
 'masho-28-final-claussolas'
]);
// High-value listings are allowed only for real 26–28F equipment, not materials or items.
export function marketPriceLimitForItem(item={}){
 const kind=item.kind??item.itemKind??item.itemPayload?.kind;
 const id=item.equipmentId??item.itemId??item.itemPayload?.equipmentId;
 if(kind!=='equipment')return MARKET_MAX_PRICE;
 if(MARKET_RARE_EQUIPMENT_IDS.includes(id))return MARKET_RARE_EQUIPMENT_MAX_PRICE;
 if(MARKET_MASHO_20_25_EQUIPMENT_IDS.includes(id))return MARKET_MASHO_20_25_MAX_PRICE;
 return MARKET_MAX_PRICE;
}
export const MARKET_MAX_ACTIVE_LISTINGS=10;


// Shop stock and the starter healing herb may never enter the player marketplace.
// Match by the actual item definition ID regardless of the candidate's claimed kind.
const SHOP_ITEM_IDS=new Set(['herb',...Object.values(SHOPS).flatMap(shop=>shop.items??[]).filter(x=>x.kind!=='equipment'&&!x.equipmentId).map(x=>x.id)]);
const SHOP_EQUIPMENT_IDS=new Set(Object.values(SHOPS).flatMap(shop=>shop.items??[]).filter(x=>x.kind==='equipment'||x.equipmentId).map(x=>x.equipmentId??x.id));

// The free market is available to every save from the beginning of the game.
// Keep the existing unlock state field for compatibility with older saves.
export function canUnlockMarket(_state){return true;}
export function isMarketUnlocked(state){return Boolean(state.market?.unlocked)||canUnlockMarket(state);}
export function unlockMarketIfEligible(state){const market=ensureMarketState(state);if(!market.unlocked&&canUnlockMarket(state))market.unlocked=true;return Boolean(market.unlocked);}

function isShopSoldCandidate(candidate={}){
 const id=candidate.kind==='equipment'?(candidate.equipmentId??candidate.id):candidate.id;
 return SHOP_ITEM_IDS.has(id)||SHOP_EQUIPMENT_IDS.has(id);
}

export function isValidMarketPrice(value,item={}){
 const n=Number(value);
 return Number.isSafeInteger(n)&&n>=MARKET_MIN_PRICE&&n<=marketPriceLimitForItem(item);
}

function equipmentDef(candidate){
 const id=candidate?.equipmentId??candidate?.id;
 return EQUIPMENT[id]??null;
}

export function marketCategoryOf(candidate={}){
 if(candidate.kind==='equipment'){
  const def=equipmentDef(candidate);
  if(def?.slot==='weapon')return 'weapon';
  if(def?.slot==='accessory')return def.accessoryType==='charm'?'charm':'ring';
  return 'armor';
 }
 if(candidate.kind==='material')return 'material';
 return 'item';
}

export function isEquippedInstance(state,instanceId){
 if(!instanceId)return false;
 return (state.characters??[]).some(c=>Object.values(c.equipment??{}).some(ref=>(typeof ref==='object'?ref?.instanceId:ref)===instanceId));
}

function quantityOf(state,candidate){
 const qty=Math.max(1,Number(candidate?.quantity??1));
 if(candidate.kind==='equipment')return (state.equipmentInventory??[]).some(x=>x.instanceId===candidate.instanceId)?1:0;
 if(candidate.kind==='material')return Math.max(0,Number(state.materials?.[candidate.id]??0));
 return (state.inventory??[]).filter(x=>x.id===candidate.id).reduce((n,x)=>n+Math.max(0,Number(x.qty??0)),0);
}

function protectedEquipment(def,id){
 return !def||def.dedicatedLegendary===true||Boolean(def.ownerCharacterId)||id==='promise-memory';
}

export function isArenaCoinCandidate(candidate={}){
 const id=String(candidate?.id??candidate?.equipmentId??candidate?.itemId??'');
 return candidate?.kind==='arenaCoin'||candidate?.kind==='arena-coin'||
  [ARENA_COIN_ID,'arenaCoin','arena_coins','arenaCoins'].includes(id);
}

function protectedItem(id){
 const def=getItemDef(id);
 return Boolean(def.keyItem)||getItemCategory(id)==='key';
}

export function isMarketSellable(state,candidate={}){
 if(isArenaCoinCandidate(candidate))return {ok:false,reason:'闘技コインはフリーマーケットで売買できません'};
 const quantity=Number(candidate.quantity??1);
 if(!Number.isInteger(quantity)||quantity<1)return {ok:false,reason:'数量が不正です'};
 if(candidate.kind==='equipment'){
  const inst=(state.equipmentInventory??[]).find(x=>x.instanceId===candidate.instanceId);
  if(!inst)return {ok:false,reason:'装備が見つかりません'};
  if(isEquippedInstance(state,inst.instanceId))return {ok:false,reason:'装備中の装備は出品できません'};
   if(inst.locked===true)return {ok:false,reason:'ロック中の装備は出品できません'};
  if(isShopSoldCandidate({kind:'equipment',equipmentId:inst.equipmentId}))return {ok:false,reason:'ショップで購入できる装備は出品できません'};
  if(protectedEquipment(EQUIPMENT[inst.equipmentId],inst.equipmentId))return {ok:false,reason:'この固有装備は出品できません'};
  if(quantity!==1)return {ok:false,reason:'装備品は1点ずつ出品してください'};
  return {ok:true,available:1};
 }
 if(!['item','material'].includes(candidate.kind))return {ok:false,reason:'出品種別が不正です'};
 if(isShopSoldCandidate(candidate))return {ok:false,reason:'ショップ商品と薬草は出品できません'};
 if(protectedItem(candidate.id))return {ok:false,reason:'だいじなものは出品できません'};
 const available=quantityOf(state,candidate);
 if(quantity>available)return {ok:false,reason:'所持数を超えています'};
 return {ok:true,available};
}

export function serializeMarketItem(state,candidate={}){
 const check=isMarketSellable(state,candidate);
 if(!check.ok)throw new Error(check.reason);
 const quantity=Number(candidate.quantity??1);
 if(candidate.kind==='equipment'){
  const inst=(state.equipmentInventory??[]).find(x=>x.instanceId===candidate.instanceId);
  const def=EQUIPMENT[inst.equipmentId];
  const level=Math.max(0,Number(inst.enhanceLevel??0)),baseName=def?.name??inst.equipmentId;
  return {kind:'equipment',equipmentId:inst.equipmentId,name:level>0?`${baseName}＋${level}`:baseName,category:marketCategoryOf({kind:'equipment',equipmentId:inst.equipmentId}),quantity:1,instance:{...inst}};
 }
 const def=getItemDef(candidate.id);
 return {kind:candidate.kind,id:candidate.id,name:def.name??candidate.id,category:marketCategoryOf(candidate),quantity};
}

function ensureMarketState(state){
 state.market??={};
 state.market.processedPurchaseIds=Array.isArray(state.market.processedPurchaseIds)?state.market.processedPurchaseIds:[];
 state.market.processedSaleBatchIds=Array.isArray(state.market.processedSaleBatchIds)?state.market.processedSaleBatchIds:[];
 state.market.processedReturnIds=Array.isArray(state.market.processedReturnIds)?state.market.processedReturnIds:[];
 state.market.everUsed=Boolean(state.market.everUsed);
 state.market.unlocked=Boolean(state.market.unlocked);
 return state.market;
}
function remember(list,id){if(list.includes(id))return false;list.push(id);if(list.length>500)list.splice(0,list.length-500);return true;}
function addPayload(state,payload,quantity=1){
 if(isArenaCoinCandidate(payload))throw new Error('闘技コインはフリーマーケットで売買できません');
 if(payload.kind==='equipment'){
  state.equipmentInventory??=[];
  const source={...(payload.instance??{}),equipmentId:payload.equipmentId??payload.instance?.equipmentId};
  for(let i=0;i<quantity;i++){
   const inst={...source};
   if(i>0||state.equipmentInventory.some(x=>x.instanceId===inst.instanceId))inst.instanceId=`market-${crypto.randomUUID?.()??Math.random().toString(36).slice(2)}`;
   state.equipmentInventory.push(inst);
  }
  return;
 }
 if(payload.kind==='material'){
  state.materials??={};state.materials[payload.id]=(state.materials[payload.id]??0)+quantity;return;
 }
 state.inventory??=[];let stack=state.inventory.find(x=>x.id===payload.id);if(stack)stack.qty=(stack.qty??0)+quantity;else state.inventory.push({id:payload.id,qty:quantity});
}

export function applyMarketPurchase(state,receipt={}){
 if(isArenaCoinCandidate(receipt.itemPayload))throw new Error('闘技コインはフリーマーケットで売買できません');
 const market=ensureMarketState(state);if(!remember(market.processedPurchaseIds,receipt.id))return false;
 const total=Math.max(0,Number(receipt.totalPrice??0));
 if((state.gold??0)<total){market.processedPurchaseIds.pop();throw new Error('ゴールドが足りません');}
 state.gold=(state.gold??0)-total;addPayload(state,receipt.itemPayload,Math.max(1,Number(receipt.quantity??1)));market.everUsed=true;return true;
}
export function applyMarketReturn(state,ret={}){
 if(isArenaCoinCandidate(ret.itemPayload))throw new Error('闘技コインはフリーマーケットで売買できません');
 const market=ensureMarketState(state);if(!remember(market.processedReturnIds,ret.id))return false;
 addPayload(state,ret.itemPayload,Math.max(1,Number(ret.quantity??1)));market.everUsed=true;return true;
}
export function applyMarketProceeds(state,batch={}){
 const market=ensureMarketState(state);if(!remember(market.processedSaleBatchIds,batch.id))return false;
 state.gold=(state.gold??0)+Math.max(0,Number(batch.totalGold??0));market.everUsed=true;return true;
}

export function ensureMarketLocalState(state){return ensureMarketState(state);}

export function listMarketCandidates(state){
 const out=[];
 for(const x of state.inventory??[]){
  const available=Math.max(0,Number(x.qty??0));if(available<=0)continue;
  const c={kind:'item',id:x.id,quantity:1};if(!isMarketSellable(state,c).ok)continue;
  const d=getItemDef(x.id);out.push({kind:'item',id:x.id,name:d.name??x.id,available,category:'item'});
 }
 for(const [id,rawQty] of Object.entries(state.materials??{})){
  const available=Math.max(0,Number(rawQty??0));if(available<=0)continue;
  const c={kind:'material',id,quantity:1};if(!isMarketSellable(state,c).ok)continue;
  const d=getItemDef(id);out.push({kind:'material',id,name:d.name??id,available,category:'material'});
 }
 for(const inst of state.equipmentInventory??[]){
  const c={kind:'equipment',instanceId:inst.instanceId,quantity:1};if(!isMarketSellable(state,c).ok)continue;
  const d=EQUIPMENT[inst.equipmentId]??{};out.push({kind:'equipment',instanceId:inst.instanceId,equipmentId:inst.equipmentId,name:d.name??inst.equipmentId,available:1,category:marketCategoryOf({kind:'equipment',equipmentId:inst.equipmentId}),enhanceLevel:Number(inst.enhanceLevel??0)});
 }
 return out;
}

export function removeMarketItem(state,candidate={}){
 const check=isMarketSellable(state,candidate);if(!check.ok)throw new Error(check.reason);
 const qty=Math.max(1,Number(candidate.quantity??1));
 if(candidate.kind==='equipment'){
  const i=(state.equipmentInventory??[]).findIndex(x=>x.instanceId===candidate.instanceId);if(i<0)throw new Error('装備が見つかりません');state.equipmentInventory.splice(i,1);return true;
 }
 if(candidate.kind==='material'){
  state.materials??={};state.materials[candidate.id]=Math.max(0,Number(state.materials[candidate.id]??0)-qty);return true;
 }
 let remaining=qty;
 for(const stack of state.inventory??[]){if(stack.id!==candidate.id||remaining<=0)continue;const take=Math.min(remaining,Math.max(0,Number(stack.qty??0)));stack.qty-=take;remaining-=take;}
 state.inventory=(state.inventory??[]).filter(x=>(x.qty??0)>0);
 if(remaining>0)throw new Error('所持数を超えています');
 return true;
}
