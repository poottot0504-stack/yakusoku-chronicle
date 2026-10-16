import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOPS } from '../src/data/shops.js';
import { createEquipmentInstance } from '../src/data/equipment.js';
import { isMarketSellable, listMarketCandidates, serializeMarketItem } from '../src/market/market-model.js';
import {marketListingFormMarkup} from '../src/ui/market.js';
import { createMarketApi } from '../src/market/market-api.js';

function state(){ return {inventory:[{id:'herb',qty:1600},{id:'potion',qty:3},{id:'characterExpScroll',qty:2}],materials:{moonHerb:5,advancedEnhanceCrystal:3},equipmentInventory:[],characters:[]}; }
test('herb is forbidden even though starter shop stock does not list it',()=>{
 const s=state();
 assert.equal(isMarketSellable(s,{kind:'item',id:'herb',quantity:1}).ok,false);
 assert.equal(isMarketSellable(s,{kind:'material',id:'herb',quantity:1}).ok,false);
 assert.throws(()=>serializeMarketItem(s,{kind:'item',id:'herb',quantity:1}),/出品できません/);
 const candidates=listMarketCandidates(s);
 assert.ok(!candidates.some(x=>x.id==='herb'));
 assert.ok(!candidates.some(x=>x.id==='potion'));
 assert.ok(!candidates.some(x=>x.id==='moonHerb'));
 assert.ok(candidates.some(x=>x.id==='characterExpScroll'));
 assert.ok(candidates.some(x=>x.id==='advancedEnhanceCrystal'));
});
test('all purchasable shop consumables and equipment are rejected (including mixed categories)',()=>{
 const s=state();
 for(const item of Object.values(SHOPS).flatMap(shop=>shop.items)){
  if(item.kind==='equipment'){
   const instance=createEquipmentInstance(item.equipmentId);
   s.equipmentInventory.push(instance);
   assert.equal(isMarketSellable(s,{kind:'equipment',instanceId:instance.instanceId,quantity:1}).ok,false,item.id);
   assert.ok(!listMarketCandidates(s).some(x=>x.instanceId===instance.instanceId),item.id);
  } else {
   s.inventory.push({id:item.id,qty:1});
   assert.equal(isMarketSellable(s,{kind:'item',id:item.id,quantity:1}).ok,false,item.id);
   s.materials[item.id]=1;
   assert.equal(isMarketSellable(s,{kind:'material',id:item.id,quantity:1}).ok,false,item.id);
  }
 }
 assert.match(marketListingFormMarkup([]),/ショップ販売品・薬草は出品できません/);
});

test('server rejection of shop items is explained in Japanese on old-client error path',async()=>{
 const auth={getSession:async()=>({data:{session:{access_token:'test-session'}}})};
 const api=createMarketApi({supabaseAuth:auth,fetchImpl:async()=>({ok:false,json:async()=>({ok:false,error:'SHOP_ITEM_FORBIDDEN',code:'SHOP_ITEM_FORBIDDEN'})})});
 await assert.rejects(api.createListing(1,{itemId:'herb'}),/ショップ商品と薬草はフリーマーケットに出品できません/);
});
