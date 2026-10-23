import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTION_RANK_REWARDS_202611,collectionRankReward } from '../src/data/collection-event-rewards-202611.js';

const rewardMap=rank=>{
 const reward=collectionRankReward(rank);
 return Object.fromEntries(reward.items.map(({id,qty})=>[id,qty]));
};
test('the owner-specified first-place reward is exact',()=>{
 const winner=collectionRankReward(1);
 assert.equal(winner.gold,50_000_000);
 assert.deepEqual(rewardMap(1),{
  orichalcum:5,orihal:5,characterExpScroll:5,jobExpScroll:5
 });
});

test('ranks 2 onward have bounded tiers without missing or overlapping ranks',()=>{
 const checkpoints=[1,2,3,4,10,11,30,31,100,101,1000];
 for(const rank of checkpoints){
  const matches=COLLECTION_RANK_REWARDS_202611.filter(t=>t.minRank<=rank&&rank<=t.maxRank);
  assert.equal(matches.length,1,`rank ${rank} must get precisely one tier`);
  assert.equal(matches[0],collectionRankReward(rank));
 }
 assert.equal(collectionRankReward(2).gold,30_000_000);
 assert.equal(collectionRankReward(3).gold,20_000_000);
 assert.equal(collectionRankReward(4).gold,5_000_000);
 assert.equal(collectionRankReward(11).gold,2_000_000);
 assert.equal(collectionRankReward(31).gold,500_000);
 assert.equal(collectionRankReward(101).gold,100_000);
});

test('each lower tier cannot exceed a higher rank reward',()=>{
 const tiers=COLLECTION_RANK_REWARDS_202611;
 for(let index=1;index<tiers.length;index++){
  const previous=tiers[index-1],next=tiers[index];
  assert.equal(previous.maxRank+1,next.minRank);
  assert.ok(previous.gold>=next.gold);
  for(const id of ['orichalcum','orihal','characterExpScroll','jobExpScroll']){
   assert.ok((previous.items.find(x=>x.id===id)?.qty??0)>=(next.items.find(x=>x.id===id)?.qty??0),`reward ${id}`);
  }
 }
});

test('invalid ranks are never rewarded and table cannot be mutated',()=>{
 for(const bad of [null,undefined,0,-1,1.5,'1',NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
  assert.equal(collectionRankReward(bad),null,String(bad));
 }
 assert.equal(Object.isFrozen(COLLECTION_RANK_REWARDS_202611),true);
 assert.equal(Object.isFrozen(collectionRankReward(1).items),true);
 assert.equal(Object.isFrozen(collectionRankReward(1).items[0]),true);
});
