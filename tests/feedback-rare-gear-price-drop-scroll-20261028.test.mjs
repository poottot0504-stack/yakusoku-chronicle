import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {isValidMarketPrice,marketPriceLimitForItem,MARKET_MAX_PRICE,MARKET_RARE_EQUIPMENT_MAX_PRICE,MARKET_RARE_EQUIPMENT_IDS} from '../src/market/market-model.js';
import {marketListingFormMarkup,marketStoreMarkup} from '../src/ui/market.js';
import {marketPriceDigits,formatMarketPrice,parseMarketPrice} from '../src/market/price-format.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/main.js');

test('normal market price remains max 30 million; 26–28F rare equipment permits max 3 billion',()=>{
 assert.equal(MARKET_MAX_PRICE,30_000_000);
 assert.equal(MARKET_RARE_EQUIPMENT_MAX_PRICE,3_000_000_000);
 assert.equal(MARKET_RARE_EQUIPMENT_IDS.length,3);
 assert.equal(isValidMarketPrice(30_000_000),true);
 assert.equal(isValidMarketPrice(30_000_001),false);
 for(const equipmentId of MARKET_RARE_EQUIPMENT_IDS){
  const item={kind:'equipment',equipmentId};
  assert.equal(marketPriceLimitForItem(item),3_000_000_000);
  assert.equal(isValidMarketPrice(2_500_000_000,item),true);
  assert.equal(isValidMarketPrice(3_000_000_000,item),true);
  assert.equal(isValidMarketPrice(3_000_000_001,item),false);
  assert.equal(isValidMarketPrice(0,item),false);
  assert.equal(isValidMarketPrice(1.5,item),false);
  assert.equal(marketPriceLimitForItem({kind:'material',equipmentId}),30_000_000);
  assert.equal(isValidMarketPrice(3_000_000_000,{kind:'material',equipmentId}),false);
 }
 assert.equal(marketPriceLimitForItem({kind:'equipment',equipmentId:'masho-25-sword'}),30_000_000);
 assert.equal(isValidMarketPrice(Number.MAX_SAFE_INTEGER,{kind:'equipment',equipmentId:MARKET_RARE_EQUIPMENT_IDS[0]}),false);
 assert.equal(formatMarketPrice(3_000_000_000),'3,000,000,000');
 assert.equal(parseMarketPrice('3,000,000,000'),3_000_000_000);
});

test('listing form and seller price edit identify exact item for server-safe price limit',()=>{
 const html=marketListingFormMarkup([
  {kind:'equipment',instanceId:'rare-inst',equipmentId:MARKET_RARE_EQUIPMENT_IDS[0],category:'charm',name:'悠久樹の祝福',available:1},
  {kind:'equipment',instanceId:'standard-inst',equipmentId:'ironSword',category:'weapon',name:'鉄の剣',available:1},
  {kind:'material',id:'copperOre',category:'material',name:'銅鉱石',available:1}
 ]);
 assert.match(html,/30,000,000G/);
 assert.match(html,/3,000,000,000G/);
 assert.match(html,/data-market-max-price="3000000000"/);
 assert.match(html,/data-market-max-price="30000000"/);
 const store=marketStoreMarkup({profileName:'星の店',store:{expiresAt:Date.now()+86400000},listings:[
  {id:'rare',status:'active',itemName:'悠久樹の祝福',itemPayload:{kind:'equipment',equipmentId:MARKET_RARE_EQUIPMENT_IDS[0]},quantityRemaining:1,unitPrice:2_500_000_000},
  {id:'normal',status:'active',itemName:'銅鉱石',itemPayload:{kind:'material',id:'copperOre'},quantityRemaining:1,unitPrice:15_000_000}
 ]});
 assert.match(store,/data-market-price="rare" data-market-max-price="3000000000" data-market-item-kind="equipment"/);
 assert.match(store,/data-market-price="normal" data-market-max-price="30000000" data-market-item-kind="material"/);
 assert.match(store,/2,500,000,000/);
 assert.match(main,/isValidMarketPrice\(unitPrice,priceItem\)/);
 assert.match(main,/isValidMarketPrice\(price,\{kind:input\?\.dataset\?\.marketItemKind/);
});

test('server price migration preserves authentic item requirements and transaction authorization',()=>{
 const sql=read('maintenance/market-rare-gear-price-20261028.sql');
 assert.match(sql,/begin;/i);
 assert.match(sql,/commit;/i);
 assert.match(sql,/alter table public\.market_listings add constraint market_listings_unit_price_check/i);
 assert.match(sql,/item_kind='equipment' and item_id in \(/);
 assert.match(sql,/quantity_initial=1 and unit_price between 1 and 3000000000/);
 assert.match(sql,/public\.market_create_listing\(/);
 assert.match(sql,/public\.market_update_price\(/);
 assert.match(sql,/public\.market_purchase\(/);
 assert.match(sql,/p_expected_unit_price not between 1 and 3000000000/);
 assert.match(sql,/seller_id=uid and save_slot=p_save_slot/);
 assert.match(sql,/listing_rec\.unit_price<>p_expected_unit_price/);
 assert.match(sql,/p_unit_price not between 1 and \(case when p_item_kind='equipment'/);
 assert.match(sql,/p_unit_price not between 1 and \(case when v_kind='equipment'/);
 assert.match(sql,/revoke execute on function public\.market_create_listing/);
 assert.match(sql,/grant execute on function public\.market_create_listing.*authenticated,service_role/);
 assert.doesNotMatch(sql,/drop table|truncate table|delete from public\.market_/i);
});

test('Edge marketplace validation agrees with DB limits, keeps authentication and exact-price purchase check',()=>{
 const edge=read('maintenance/market-rare-gear-edge-20261028/index.ts');
 assert.match(edge,/MARKET_DEFAULT_MAX_PRICE=30_000_000/);
 assert.match(edge,/MARKET_RARE_MAX_PRICE=3_000_000_000/);
 assert.match(edge,/MARKET_RARE_IDS=new Set/);
 assert.match(edge,/body\?\.itemPayload\?\.equipmentId===body\.itemId/);
 assert.match(edge,/price>listingMaxPrice\(body\)/);
 assert.match(edge,/price>MARKET_RARE_MAX_PRICE/);
 assert.match(edge,/expectedUnitPrice>MARKET_RARE_MAX_PRICE/);
 assert.match(edge,/supabase\.auth\.getUser\(token\)/);
 assert.match(edge,/p_expected_unit_price:expectedUnitPrice/);
 assert.doesNotMatch(edge,/service_role|SUPABASE_SERVICE_ROLE_KEY/);
});

test('only the 10-fight cumulative drops become an independently scrollable touch region',()=>{
 const start=main.indexOf('function panelForView(){'),end=main.indexOf(';if(view===\'masho\')return',start);
 assert.ok(start>=0&&end>start);
 const body=main.slice(start+'function panelForView(){'.length,end);
 function show(message){const sandbox={state:{adventure:{message}},view:'exploreResult',
   esc:s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))};
 vm.createContext(sandbox);
 return vm.runInContext(`(function(){${body};return null;})()`,sandbox);
 }
 const html=show('⚔️ ワールドマップ10連戦：10/10戦 クリア！\n獲得ゴールド：123G\n・勇者：キャラ経験値 500\n🎁 連戦全体のドロップ合計：\n・銅鉱石 ×10\n・ミスリル ×3');
 assert.equal((html.match(/exploration-drop-scroll/g)||[]).length,1);
 assert.match(html,/aria-label="10連戦のドロップ合計" tabindex="0"/);
 assert.ok(html.indexOf('獲得ゴールド')<html.indexOf('exploration-drop-scroll'));
 assert.ok(html.indexOf('exploration-drop-scroll')<html.indexOf('data-explore-continue'));
 assert.match(html,/銅鉱石 ×10/);
 assert.match(html,/ミスリル ×3/);
 assert.match(html,/data-explore-run10/);
 const normal=show('勝利！ 素材 <script>bad</script> を獲得');
 assert.doesNotMatch(normal,/exploration-drop-scroll/);
 assert.match(normal,/&lt;script&gt;bad&lt;\/script&gt;/);
 const css=read('styles/main.css');
 assert.match(css,/\.exploration-result \.exploration-drop-scroll\{/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/max-height:min\(36vh,230px\)/);
});
