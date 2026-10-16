import { readFileSync } from 'node:fs';
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

test('shop buy rows honor the hidden attribute when categories change',()=>{
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(css,/\.shop-buy-list>\[data-shop-category-value\]\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*;?\s*\}/);
 assert.match(main,/if\(el\.dataset\.shopCategory\)return syncShopCategory\(el\.dataset\.shopCategory\)/);
 assert.match(main,/row\.hidden=!visible/);
});
