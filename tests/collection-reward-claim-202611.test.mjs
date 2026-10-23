import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTION_EVENT_202611 as EVENT } from '../src/data/collection-event-202611.js';
import { collectionRankReward } from '../src/data/collection-event-rewards-202611.js';
import { grantCollectionReward,collectionRewardDelivered } from '../src/core/collection-reward-claim.js';
import { createCollectionRewardApi } from '../src/online/collection-reward-api.js';
const fresh=()=>({gold:100,materials:{},inventory:[],collectionRewardReceipts:{}});
const receipt=(rank,slot=1)=>({id:'signed-receipt-1',rank,saveSlot:slot,gold:collectionRankReward(rank).gold,items:collectionRankReward(rank).items.map(x=>({...x}))});
test('first place receives exactly 50M G, 5 orichalcum, 5 orihal and each book x5',()=>{
 const s=fresh(),r=receipt(1);
 assert.equal(grantCollectionReward(s,r,1),true);
 assert.equal(s.gold,50_000_100);
 assert.equal(s.materials.orichalcum,5);
 assert.equal(s.materials.orihal,5);
 assert.equal(s.inventory.find(x=>x.id==='characterExpScroll').qty,5);
 assert.equal(s.inventory.find(x=>x.id==='jobExpScroll').qty,5);
 assert.equal(s.collectionRewardReceipts[EVENT.id],r.id);
 assert.equal(grantCollectionReward(s,r,1),false);
 assert.equal(s.gold,50_000_100);
 assert.equal(collectionRewardDelivered(s,r),true);
});
test('server receipt must match predetermined rank and slot; no client-provided rewards',()=>{
 const s=fresh();
 assert.throws(()=>grantCollectionReward(s,{...receipt(1),gold:1_000_000_000},1),/一致/);
 assert.throws(()=>grantCollectionReward(s,receipt(1,2),1),/SLOT/);
 assert.throws(()=>grantCollectionReward(s,{...receipt(1),items:[]},1),/一致/);
 assert.equal(s.gold,100);
 assert.deepEqual(s.materials,{});
});
test('cap failure does not mark the reward as delivered or lose any items',()=>{
 const s=fresh();s.materials.orichalcum=9998;
 assert.throws(()=>grantCollectionReward(s,receipt(1),1),/所持上限/);
 assert.equal(s.materials.orichalcum,9998);
 assert.equal(s.gold,100);
 assert.deepEqual(s.collectionRewardReceipts,{});
});
test('claim transport only sends selected slot and requires server success',async()=>{
 let request;const api=createCollectionRewardApi({storage:null,authorizedFetch:async(url,options)=>{
  request={url,options};return {ok:true,json:async()=>receipt(1,3)};
 }});
 const value=await api.claim(3);
 assert.equal(value.saveSlot,3);
 assert.match(request.url,/yakusoku_collection_claim$/);
 assert.deepEqual(JSON.parse(request.options.body),{p_save_slot:3});
});
