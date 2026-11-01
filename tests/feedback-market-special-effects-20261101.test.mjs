import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {EQUIPMENT} from '../src/data/equipment.js';
import {marketBrowseMarkup,marketStoreMarkup,marketListingFormMarkup,marketDepthSpecialEffectText} from '../src/ui/market.js';
import {isMarketSellable,isValidMarketPrice} from '../src/market/market-model.js';

const special=[
 ['masho-26-eternal-tree-blessing','悠久樹の祝福','最大HP・最大MPをそれぞれ1％回復'],
 ['masho-27-infernal-eclipse-ring','獄炎の蝕戒','防御力を0.1％減少（最大10回・計1％）'],
 ['masho-28-final-claussolas','終極のクラウソラス','最大MPを1％回復（悠久樹の祝福と重複）／主人公専用']
];
const listing=(id,number)=>({
 id:'listing-'+number,itemName:EQUIPMENT[id].name,itemKind:'equipment',itemId:id,storeName:'旅の店',status:'active',
 quantityRemaining:1,unitPrice:100_000_000,expiresAt:'2099-12-31T00:00:00Z',
 itemPayload:{kind:'equipment',equipmentId:id,instance:{instanceId:'owned-'+number,equipmentId:id,enhanceLevel:0}}
});

test('all three unique 26–28F marketplace descriptions agree with real equipment battle parameters',()=>{
 for(const [id,name,needle] of special){
  assert.equal(EQUIPMENT[id].name,name);
  const text=marketDepthSpecialEffectText(id);
  assert.match(text,/^毎ターン終了時|^通常攻撃/);
  assert.ok(text.includes(needle),name+': effect is visible and accurate');
 }
 assert.equal(marketDepthSpecialEffectText('ironSword'),'');
 assert.equal(marketDepthSpecialEffectText('<img src=x onerror=evil()>'),'');
 assert.equal(marketDepthSpecialEffectText('masho-abyss-bow'),'');
 assert.equal(EQUIPMENT[special[0][0]].turnRegenRatio,.01);
 assert.equal(EQUIPMENT[special[1][0]].armorShredPerHit,.001);
 assert.equal(EQUIPMENT[special[1][0]].armorShredMaxStacks,10);
 assert.equal(EQUIPMENT[special[2][0]].turnMpRegenRatio,.01);
 assert.equal(EQUIPMENT[special[2][0]].heroOnly,true);
});

test('buyer browse listings show unique abilities, stats and real store information before buying',()=>{
 const items=special.map(([id],i)=>listing(id,i+1));
 const html=marketBrowseMarkup({items});
 for(const [,name,needle] of special){
  const section=html.split('<b>'+name+'</b>')[1]?.split('</article>')[0];
  assert.ok(section,name+' has its own product card');
  assert.ok(section.includes('market-special-effect'),name);
  assert.ok(section.includes('✨ 固有効果：'),name);
  assert.ok(section.includes(needle),name);
 }
 assert.equal((html.match(/class="market-special-effect"/g)||[]).length,3);
 assert.equal((html.match(/data-market-buy="listing-/g)||[]).length,3);
 assert.match(html,/装備可能ジョブ/);
});

test('store listings show the same effects without modifying quantities or prices',()=>{
 const html=marketStoreMarkup({profileName:'旅の店',store:{expiresAt:'2099-12-31T00:00:00Z'},listings:special.map(([id],i)=>listing(id,i+1))});
 assert.equal((html.match(/class="market-special-effect"/g)||[]).length,3);
 for(const [,name,needle] of special){assert.ok(html.includes(name));assert.ok(html.includes(needle));}
 assert.equal((html.match(/data-market-save-price="/g)||[]).length,3);
 assert.match(html,/100,000,000/);
});

test('seller item selection carries an escaped canonical special effect for the selected-item preview',()=>{
 const options=special.map(([id],i)=>({kind:'equipment',instanceId:'owned-'+i,equipmentId:id,enhanceLevel:0,name:EQUIPMENT[id].name,available:1,category:i===2?'weapon':i===1?'ring':'charm'}));
 const html=marketListingFormMarkup(options);
 for(const [,name,needle] of special){
  assert.ok(html.includes(name),name);
  assert.ok(html.includes('data-market-special-effect="'),name);
  assert.ok(html.includes(needle),name);
 }
 assert.equal((html.match(/data-market-special-effect="/g)||[]).length,3);
 const ordinary=marketListingFormMarkup([{kind:'equipment',instanceId:'sword',equipmentId:'ironSword',name:'鉄の剣',available:1,category:'weapon'}]);
 assert.match(ordinary,/data-market-special-effect=""/);
});

test('seller preview uses safe escaped text and updates when changing the selected option',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const block=source.slice(source.indexOf('function syncMarketListingForm(){'),source.indexOf('function adjustMarketListingQuantity(',source.indexOf('function syncMarketListingForm(){')));
 assert.match(block,/dataset\?\.marketSpecialEffect/);
 const summary={innerHTML:''},qty={value:'1',disabled:false,min:'',max:'',step:''},hint={textContent:''};
 const option={dataset:{available:'1',kind:'equipment',categoryLabel:'チャーム',name:'悠久樹の祝福',enhanceLevel:'0',marketSpecialEffect:marketDepthSpecialEffectText(special[0][0])}};
 const modal={
  querySelector:query=>({'[data-market-listing-item]':{},'[data-market-listing-quantity]':qty,'[data-market-listing-available]':hint,'[data-market-selected-item]':summary})[query]??null,
  querySelectorAll:()=>[]
 };
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const context={modal,selectedMarketListingOption:()=>option,esc};
 vm.runInNewContext(block+'syncMarketListingForm();',context);
 assert.match(summary.innerHTML,/固有効果/);
 assert.match(summary.innerHTML,/最大HP・最大MPをそれぞれ1％回復/);
 option.dataset.marketSpecialEffect='<img src=x onerror=evil()>';
 vm.runInNewContext('syncMarketListingForm();',context);
 assert.doesNotMatch(summary.innerHTML,/<img/);
 assert.match(summary.innerHTML,/&lt;img/);
 option.dataset.marketSpecialEffect='';
 vm.runInNewContext('syncMarketListingForm();',context);
 assert.doesNotMatch(summary.innerHTML,/固有効果/);
});

test('presentation-only change does not alter sellability or price caps',()=>{
 const data=special.map(([id],i)=>({instanceId:'instance-'+i,equipmentId:id,enhanceLevel:0}));
 const state={equipmentInventory:data,characters:[]};
 for(const [id] of special){
  const instanceId=data.find(x=>x.equipmentId===id).instanceId;
  const ok=isMarketSellable(state,{kind:'equipment',instanceId,quantity:1});
  // Dedicated or unique restrictions are not changed by the display feature.
  assert.equal(typeof ok.ok,'boolean');
  assert.equal(isValidMarketPrice(3_000_000_000,{kind:'equipment',equipmentId:id}),true);
  assert.equal(isValidMarketPrice(3_000_000_001,{kind:'equipment',equipmentId:id}),false);
 }
 assert.equal(isValidMarketPrice(3_000_000_000,{kind:'item',itemId:special[0][0]}),false);
});
