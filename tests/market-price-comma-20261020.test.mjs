import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatMarketPrice,parseMarketPrice,marketPriceCursor,formatMarketPriceField} from '../src/market/price-format.js';
import {marketListingFormMarkup,marketStoreMarkup} from '../src/ui/market.js';
import {isValidMarketPrice,MARKET_MAX_PRICE} from '../src/market/market-model.js';

test('free-market listing price inserts commas and parses as the original integer',()=>{
 for(const [raw,display,numeric] of [['1','1',1],['1000','1,000',1000],['10000','10,000',10000],['100000','100,000',100000],['30000000','30,000,000',30000000],['１２３４５６','123,456',123456],['1,234,567','1,234,567',1234567],['','',0]]){
  assert.equal(formatMarketPrice(raw),display);
  assert.equal(parseMarketPrice(display),numeric);
 }
 assert.equal(MARKET_MAX_PRICE,30000000);
 assert.ok(isValidMarketPrice(parseMarketPrice('30,000,000')));
 assert.equal(isValidMarketPrice(parseMarketPrice('30,000,001')),false);
 assert.equal(isValidMarketPrice(parseMarketPrice('0')),false);
});

test('grouping preserves the text cursor even when typing in the middle',()=>{
 const input={value:'1234',selectionStart:2,setSelectionRange(a,b){this.cursor=[a,b];}};
 formatMarketPriceField(input);
 assert.equal(input.value,'1,234');
 assert.deepEqual(input.cursor,[3,3]);
 assert.equal(marketPriceCursor('1234',4),5);
 const paste={value:'１２３４５６７',selectionStart:7,setSelectionRange(a,b){this.cursor=[a,b];}};
 formatMarketPriceField(paste);
 assert.equal(paste.value,'1,234,567');
 assert.deepEqual(paste.cursor,[9,9]);
});

test('creating and repricing own listings use comma-capable text fields',()=>{
 const form=marketListingFormMarkup([{id:'x',kind:'material',name:'素材',available:1,category:'material'}]);
 assert.match(form,/data-market-listing-price type="text" inputmode="numeric"/);
 const shop=marketStoreMarkup({profileName:'店',store:{},listings:[{id:'listing-1',itemName:'素材',unitPrice:1234567,status:'active',quantityRemaining:1}]});
 assert.match(shop,/data-market-price="listing-1" type="text" inputmode="numeric"/);
 assert.match(shop,/value="1,234,567"/);
 assert.doesNotMatch(shop,/data-market-price="listing-1" type="number"/);
});

test('submit and update both parse prices, and formatter handles both via delegated input listener',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/unitPrice=parseMarketPrice\(modal\.querySelector\('\[data-market-listing-price\]'\)\?\.value\)/);
 assert.match(main,/price=parseMarketPrice\(input\?\.value\)/);
 assert.match(main,/matches\?\.\('\[data-market-listing-price\],\[data-market-price\]'\)/);
 assert.match(main,/formatMarketPriceField\(field\)/);
 assert.match(html,/market-price-comma-20261020/);
});
