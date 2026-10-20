import test from 'node:test';
import assert from 'node:assert/strict';
import {MARKET_MAX_PRICE,isValidMarketPrice,applyMarketProceeds} from '../src/market/market-model.js';
import {marketHistoryMarkup,marketListingFormMarkup,marketMarkup} from '../src/ui/market.js';
import {createMarketApi} from '../src/market/market-api.js';

test('market pricing accepts up to 30 million gold only',()=>{
 assert.equal(MARKET_MAX_PRICE,30_000_000);
 assert.equal(isValidMarketPrice(1),true);
 assert.equal(isValidMarketPrice(30_000_000),true);
 assert.equal(isValidMarketPrice(30_000_001),false);
 assert.equal(isValidMarketPrice(0),false);
 assert.equal(isValidMarketPrice(1.5),false);
 assert.match(marketListingFormMarkup([]),/30,000,000G/);
 assert.match(marketListingFormMarkup([]),/data-market-listing-price type="text" inputmode="numeric"/);
 // Text inputs are required for comma grouping; the unchanged integer validator enforces the 30M cap.
});

test('player market history shows distinct buy and sell entries and receipt status',()=>{
 const purchase={id:'abc-0001',itemName:'銀の指輪',counterpartyName:'月の店',quantity:1,unitPrice:12_000_000,totalPrice:12_000_000,createdAt:'2026-10-15T02:00:00Z',receivedAt:'2026-10-15T02:01:00Z'};
 const sale={id:'abc-0002',itemName:'黒の書',counterpartyName:'旅人',quantity:2,unitPrice:3_500_000,totalPrice:7_000_000,createdAt:'2026-10-15T03:00:00Z',claimedAt:null};
 const buy=marketHistoryMarkup({purchases:[purchase],sales:[sale]},'buy');
 assert.match(buy,/月の店/);
 assert.match(buy,/12,000,000G/);
 assert.match(buy,/商品受取済み/);
 assert.match(buy,/abc-0001/);
 assert.doesNotMatch(buy,/abc-0002/);
 const sell=marketHistoryMarkup({purchases:[purchase],sales:[sale]},'sell');
 assert.match(sell,/7,000,000G/);
 assert.match(sell,/売上未受取/);
 assert.match(sell,/abc-0002/);
 assert.doesNotMatch(sell,/abc-0001/);
 const screen=marketMarkup({gold:50_000_000},{tab:'history',historyFocus:'buy',history:{purchases:[purchase],sales:[sale]}});
 assert.match(screen,/data-market-tab="history"/);
 assert.match(screen,/取引履歴/);
 assert.match(screen,/所持金 50,000,000G/);
 assert.match(screen,/販売手数料は0G/);
});

test('history escapes untrusted usernames and item names',()=>{
 const html=marketHistoryMarkup({purchases:[{id:'a',itemName:'<script>alert(1)</script>',counterpartyName:'<img src=x onerror=bad()>',quantity:1,unitPrice:1,totalPrice:1,createdAt:'2026-10-15T00:00:00Z'}]},'buy');
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&lt;img/);
});

test('sale proceeds remain 100% with zero fees',()=>{
 const state={gold:12345};
 assert.equal(applyMarketProceeds(state,{id:'b-123',totalGold:30_000_000}),true);
 assert.equal(state.gold,30_012_345);
 assert.equal(applyMarketProceeds(state,{id:'b-123',totalGold:30_000_000}),false);
 assert.equal(state.gold,30_012_345);
});

test('history API uses logged-in JWT and per-slot request without exposing other identifiers',async()=>{
 let called=0;
 const fetchImpl=async(url,opts)=>{
  called++;
  assert.match(url,/yakusoku-market/);
  assert.equal(opts.headers.authorization,'Bearer test-access');
  assert.deepEqual(JSON.parse(opts.body),{action:'history',saveSlot:2,limit:100});
  return {ok:true,json:async()=>({ok:true,data:{purchases:[],sales:[]}})};
 };
 const auth={getSession:async()=>({data:{session:{access_token:'test-access'}}})};
 const api=createMarketApi({fetchImpl,supabaseAuth:auth});
 assert.deepEqual(await api.history(2),{purchases:[],sales:[]});
 assert.equal(called,1);
});


test('listing form separates categories and shortens option labels for mobile readability',()=>{
 const html=marketListingFormMarkup([
  {kind:'material',id:'orichalcum',name:'オリハルコン',available:2,category:'material'},
  {kind:'item',id:'goldScroll',name:'ゴールド2倍の書',available:2,category:'item'},
  {kind:'equipment',instanceId:'eq-1',equipmentId:'ironSword',name:'アイアンソード',available:1,category:'weapon',enhanceLevel:3}
 ]);
 assert.match(html,/data-market-listing-category="material"/);
 assert.match(html,/素材<small>1件<\/small>/);
 assert.match(html,/data-market-default-category="material"/);
 assert.match(html,/data-category-label="武器"/);
 assert.doesNotMatch(html,/オリハルコン ｜ 所持 2個/);
 assert.match(html,/>オリハルコン<\/option>/);
 assert.match(html,/>アイアンソード ＋3<\/option>/);
});
