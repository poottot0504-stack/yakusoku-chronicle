import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_COIN_ID } from '../src/data/arena-equipment.js';
import { createDefaultState } from '../src/core/save-schema.js';
import { isArenaCoinCandidate,isMarketSellable,serializeMarketItem,listMarketCandidates,removeMarketItem,applyMarketPurchase,applyMarketReturn } from '../src/market/market-model.js';

test('arena coins exist only as quest-wallet balance, not as market listing stock',()=>{
 const s=createDefaultState();
 s.arena.coins=123;
 s.inventory=[{id:ARENA_COIN_ID,qty:123}];
 s.materials[ARENA_COIN_ID]=123;
 assert.ok(!listMarketCandidates(s).some(x=>x.id===ARENA_COIN_ID));
 assert.ok(!('coins' in s.materials));
 assert.equal(s.arena.coins,123);
 for(const kind of ['item','material','arenaCoin','arena-coin']){
  const candidate={kind,id:ARENA_COIN_ID,quantity:1};
  assert.equal(isArenaCoinCandidate(candidate),true);
  assert.match(isMarketSellable(s,candidate).reason,/フリーマーケット/);
  assert.throws(()=>serializeMarketItem(s,candidate),/フリーマーケット/);
  assert.throws(()=>removeMarketItem(s,candidate),/フリーマーケット/);
 }
 assert.equal(s.arena.coins,123);
});

test('fake market purchase/return payloads cannot trade or grant arena coins',()=>{
 const s=createDefaultState();s.arena.coins=55;s.gold=10000;
 for(const kind of ['item','material']){
  const payload={kind,id:ARENA_COIN_ID,quantity:200};
  assert.throws(()=>applyMarketPurchase(s,{id:'fake-sale-'+kind,itemPayload:payload,totalPrice:500,quantity:200}),/闘技コイン/);
  assert.throws(()=>applyMarketReturn(s,{id:'fake-return-'+kind,itemPayload:payload,quantity:200}),/闘技コイン/);
 }
 assert.equal(s.gold,10000);
 assert.equal(s.arena.coins,55);
 assert.equal(s.inventory.length,0);
 assert.deepEqual(s.materials,{});
});
