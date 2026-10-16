import test from 'node:test';
import assert from 'node:assert/strict';
import { shopMarkup } from '../src/ui/shop.js';

test('shop buy screen separates items and equipment into category tabs',()=>{
 const html=shopMarkup({gold:1234},{name:'🛒 ショップ',stock:[
  {id:'potion',kind:'item',name:'ポーション',price:100,shopId:'starter'},
  {id:'ironSword',kind:'equipment',equipmentId:'ironSword',name:'鉄の剣',price:200,shopId:'starter'},
  {id:'leatherHead',kind:'equipment',equipmentId:'leatherHead',name:'革の帽子',price:150,shopId:'starter'},
  {id:'copper-attack-ring',kind:'equipment',equipmentId:'copper-attack-ring',name:'銅の攻撃指輪',price:220,shopId:'starter'},
  {id:'travelerCharm',kind:'equipment',equipmentId:'travelerCharm',name:'旅人のチャーム',price:240,shopId:'starter'}
 ]});
 assert.match(html,/data-shop-default-category="item"/);
 assert.match(html,/アイテム<small>1件<\/small>/);
 assert.match(html,/武器<small>1件<\/small>/);
 assert.match(html,/防具<small>1件<\/small>/);
 assert.match(html,/指輪<small>1件<\/small>/);
 assert.match(html,/チャーム<small>1件<\/small>/);
 assert.match(html,/data-shop-category-value="item"/);
 assert.match(html,/data-shop-category-value="weapon"/);
 assert.match(html,/data-shop-category-value="armor"/);
 assert.match(html,/data-shop-category-value="ring"/);
 assert.match(html,/data-shop-category-value="charm"/);
 assert.match(html,/class="shop-item-category">アイテム<\/small>|class="shop-item-category">アイテム<\/small>/);
});
