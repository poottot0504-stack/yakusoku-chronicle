import {getEnhancedStats} from '../core/forge.js';
import {EQUIPMENT} from '../data/equipment.js';
import {ALL_JOBS} from '../data/jobs.js';
import {elementLabel} from '../core/elements.js';
import {MARKET_MAX_PRICE} from '../market/market-model.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>`${Number(n??0).toLocaleString('ja-JP')}G`;
const CATEGORIES=[['all','すべて'],['weapon','武器'],['armor','防具'],['ring','指輪'],['charm','チャーム'],['material','素材'],['item','アイテム']];
const SORTS=[['newest','新着順'],['priceAsc','価格の安い順'],['priceDesc','価格の高い順'],['expiring','残り時間順']];
const LISTING_CATEGORIES=[['material','素材'],['item','アイテム'],['weapon','武器'],['armor','防具'],['ring','指輪'],['charm','チャーム']];

function remainingLabel(expiresAt,now=Date.now()){
 const ms=Math.max(0,new Date(expiresAt??0).getTime()-now);
 const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000);
 return ms<=0?'営業終了':d>0?`残り${d}日${h}時間`:`残り${h}時間`;
}
function equipmentPayload(item={}){
 return item.itemPayload??item.item_payload??null;
}
function equipmentDefinition(item={}){
 const payload=equipmentPayload(item);
 if(payload?.kind!=='equipment')return null;
 const inst=payload.instance??{};
 const id=payload.equipmentId??payload.equipment_id??inst.equipmentId??inst.equipment_id??item.itemId??item.item_id;
 return EQUIPMENT[id]??null;
}
function canJobUseEquipment(job,item){
 if(!job||!item)return false;
 if(item.allowedJobs&&!item.allowedJobs.includes(job.id))return false;
 if(item.armorGroup&&!job.equipmentGroups?.includes(item.armorGroup))return false;
 if(item.slot==='weapon')return Boolean(job.weaponTypes?.includes(item.weaponType));
 if(item.slot==='shield'){
  if(job.shield==='none')return false;
  if(job.shield==='small'&&item.shieldSize!=='small')return false;
  return true;
 }
 return true;
}
function equipmentJobText(item={}){
 const def=equipmentDefinition(item);
 if(!def)return '';
 const jobs=ALL_JOBS.filter(job=>canJobUseEquipment(job,def));
 if(!jobs.length)return '装備可能ジョブ：なし';
 if(jobs.length===ALL_JOBS.length)return '装備可能ジョブ：全ジョブ';
 return `装備可能ジョブ：${jobs.map(job=>job.name).join('・')}`;
}
function equipmentListingMeta(item={}){
 const payload=equipmentPayload(item);
 const inst=payload?.instance;
 if(payload?.kind!=='equipment'||!inst)return '';
 const level=Math.max(0,Number(inst.enhanceLevel??0)),stats=getEnhancedStats(inst);
 const labels=[['attack','攻撃'],['defense','防御'],['magic','魔法'],['speed','速さ'],['maxHp','HP'],['maxMp','MP']];
 const statText=labels.filter(([key])=>Number(stats[key]??0)>0).map(([key,label])=>`${label}+${Number(stats[key])}`).join(' / ');
 const def=equipmentDefinition(item),resistText=Object.entries(def?.elementResist??{}).filter(([,v])=>Number(v)>0).map(([k,v])=>`${elementLabel(k)}耐性+${Math.round(Number(v)*100)}%`).join(' / ');
 const jobText=equipmentJobText(item);
 return `<small>${level>0?`強化＋${level}`:'未強化'}${statText?` ・ ${statText}`:''}</small>${resistText?`<small>🛡️ ${esc(resistText)}</small>`:''}${jobText?`<small class="market-job-label">${esc(jobText)}</small>`:''}`;
}

export function marketBrowseMarkup(browse={},now=Date.now()){
 const items=Array.isArray(browse.items)?browse.items:[];
 return `<div class="market-browse-list">${items.map(x=>{
  const sold=x.status!=='active'||Number(x.quantityRemaining??0)<=0;
  const disabled=sold||x.isOwn===true;
  return `<article class="market-listing ${sold?'market-sold':''}">
   <div class="market-listing-main"><b>${esc(x.itemName??'商品')}</b>${equipmentListingMeta(x)}<small>${esc(x.storeName??'旅人の店')} ・ ${remainingLabel(x.expiresAt,now)}</small><span>1個 ${money(x.unitPrice)} / ${sold?'売り切れ':`残り${Number(x.quantityRemaining??0)}`}</span></div>
   <div class="market-listing-actions">${sold?'<span class="market-sold-label">売り切れ</span>':x.isOwn?`<span class="market-own-label">自分の商品</span><button class="market-tap" data-market-buy="${esc(x.id)}" disabled>購入不可</button>`:`<input class="market-qty" data-market-buy-qty="${esc(x.id)}" type="number" min="1" max="${Number(x.quantityRemaining??1)}" value="1" aria-label="購入個数"><button class="market-tap" data-market-buy="${esc(x.id)}" ${disabled?'disabled':''}>購入</button>`}</div>
  </article>`;
 }).join('')||'<div class="empty-card">条件に合う商品はありません</div>'}</div>`;
}

export function marketStoreMarkup(data={}){
 const listings=Array.isArray(data.listings)?data.listings:[],sold=Array.isArray(data.sold)?data.sold:[];
 const active=listings.filter(x=>x.status==='active'&&Number(x.quantityRemaining??0)>0);
 const name=data.profileName||'未設定';
 return `<section class="market-store-panel">
  <div class="market-store-head"><div><h3>${esc(name)}の店</h3><small>${data.store?remainingLabel(data.store.expiresAt,data.now):'まだ出店していません'}</small></div><b>${active.length}/10枠</b></div>
  <p class="notice">店名はランダムに決まります。変更はできません。</p>
  ${data.store?'':`<button class="market-tap action-main" data-market-open-store ${data.profileName?'':'disabled'}>7日間出店する</button>`}
  ${data.store&&active.length<10?'<button class="market-tap" data-market-open-listing>＋ 商品を出品する</button>':''}
  <div class="market-own-listings">${active.map(x=>`<article class="market-own-row"><div><b>${esc(x.itemName)}</b>${equipmentListingMeta(x)}<small>残り${Number(x.quantityRemaining??0)} / 1個 ${money(x.unitPrice)}</small></div><div><input data-market-price="${esc(x.id)}" type="number" min="1" max="${MARKET_MAX_PRICE}" value="${Number(x.unitPrice??1)}"><button class="market-tap" data-market-save-price="${esc(x.id)}">価格変更</button><button class="market-tap" data-market-cancel="${esc(x.id)}">出品取消</button></div></article>`).join('')||'<div class="empty-card">出品中の商品はありません</div>'}</div>
  <h3>売買履歴</h3><div class="market-sold-history">${sold.map(x=>`<article class="market-sold"><b>${esc(x.itemName)}</b><small>${esc(x.buyerName)}が ${Number(x.quantity??1)}個 / ${money(x.totalPrice)}で購入</small><button disabled>売却済み</button></article>`).join('')||'<div class="empty-card">まだ売れた商品はありません</div>'}</div>
 </section>`;
}

function marketHistoryTime(value){
 const d=new Date(value??0);
 if(!Number.isFinite(d.getTime()))return '日時不明';
 return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
}

export function marketHistoryMarkup(data={},focus='buy'){
 const purchased=Array.isArray(data.purchases)?data.purchases:[];
 const sold=Array.isArray(data.sales)?data.sales:[];
 const purchases=focus!=='sell',rows=purchases?purchased:sold;
 return `<section class="market-history-panel"><p class="market-listing-hint">取引の記録はセーブスロットごとに管理されます。購入・販売それぞれ最新100件まで確認できます。販売手数料は0Gです。</p>
  <div class="market-history-filters"><button class="market-tap ${purchases?'active':''}" data-market-history-focus="buy" aria-pressed="${purchases}">購入履歴（${purchased.length}件）</button><button class="market-tap ${!purchases?'active':''}" data-market-history-focus="sell" aria-pressed="${!purchases}">販売履歴（${sold.length}件）</button></div>
  <div class="market-history-items">${rows.map(x=>{
   const claimed=purchases?Boolean(x.receivedAt):Boolean(x.claimedAt);
   return `<article class="market-history-card"><div class="market-history-head"><b>${esc(x.itemName??'商品名不明')}</b><small>${esc(marketHistoryTime(x.createdAt))}</small></div>
    <div class="market-history-details"><small>${purchases?'販売店':'購入者'}：${esc(x.counterpartyName??'旅人')}</small><span>数量 ${Number(x.quantity??1).toLocaleString('ja-JP')}個 ・ 単価 ${money(x.unitPrice)}</span><strong>合計 ${money(x.totalPrice)}</strong></div>
    <div class="market-history-bottom"><span class="market-history-status ${claimed?'completed':'pending'}">${purchases?(claimed?'商品受取済み':'商品未受取'):(claimed?'売上受取済み':'売上未受取')}</span><small>取引ID：${esc(x.id??'')}</small></div></article>`;
  }).join('')||`<div class="empty-card">${purchases?'購入履歴':'販売履歴'}はまだありません</div>`}</div>
 </section>`;
}

export function marketMarkup(state,marketState={}){
 const tab=['browse','store','history'].includes(marketState.tab)?marketState.tab:'browse';
 const browse=marketState.browse??{items:[],search:'',category:'all',sort:'newest',inStockOnly:true};
 return `<section class="market-screen" data-no-pixel-icon>
  <button class="market-back market-tap" data-market-back>← 街へ戻る</button>
  <div class="panel market-shell"><div class="section-title"><h2 class="market-screen-title">フリーマーケット</h2><span>所持金 ${money(state?.gold)}</span></div>
  <div class="market-tabs"><button class="market-tap ${tab==='browse'?'active':''}" data-market-tab="browse">商品を探す</button><button class="market-tap ${tab==='store'?'active':''}" data-market-tab="store">自分の店</button><button class="market-tap ${tab==='history'?'active':''}" data-market-tab="history">取引履歴</button></div>
  ${tab==='browse'?`<div class="market-controls"><input data-market-search value="${esc(browse.search??'')}" placeholder="商品名で検索"><div class="market-category-tabs">${CATEGORIES.map(([id,label])=>`<button class="market-tap ${browse.category===id?'active':''}" data-market-category="${id}">${label}</button>`).join('')}</div><div class="market-sort-row"><select data-market-sort>${SORTS.map(([id,label])=>`<option value="${id}" ${browse.sort===id?'selected':''}>${label}</option>`).join('')}</select><label><input type="checkbox" data-market-in-stock ${browse.inStockOnly!==false?'checked':''}> 在庫ありのみ</label></div></div>${marketBrowseMarkup(browse)}`:tab==='history'?marketHistoryMarkup(marketState.history??{},marketState.historyFocus):marketStoreMarkup(marketState.store??{profileName:marketState.profileName??'',store:null,listings:[],sold:[]})}
  ${marketState.loading?'<p class="market-status">読み込み中…</p>':''}${marketState.error?`<p class="market-error">${esc(marketState.error)}</p>`:''}</div>
 </section>`;
}

export function marketListingFormMarkup(candidates=[]){
 const rows=Array.isArray(candidates)?candidates:[];
 const counts=Object.fromEntries(LISTING_CATEGORIES.map(([id])=>[id,0]));
 for(const row of rows){
  const cat=String(row.category??'');
  if(Object.hasOwn(counts,cat))counts[cat]++;
 }
 const defaultCategory=LISTING_CATEGORIES.find(([id])=>counts[id]>0)?.[0]??'all';
 return `<section class="market-listing-form" data-no-pixel-icon data-market-default-category="${defaultCategory}"><h2>商品を出品</h2><p class="notice">価格は1個あたり1G〜30,000,000G。装備品は1点ずつ出品します。ショップ販売品・薬草は出品できません。</p>${rows.length?`<div class="market-listing-type-tabs" role="tablist" aria-label="出品カテゴリ">${LISTING_CATEGORIES.map(([id,label])=>`<button type="button" class="market-tap market-filter-chip ${defaultCategory===id?'active':''}" data-market-listing-category="${id}" data-category-label="${label}" aria-pressed="${defaultCategory===id}" ${counts[id]?'':'disabled'}>${label}<small>${counts[id]}件</small></button>`).join('')}</div><div class="market-category-summary" data-market-listing-category-summary></div>`:''}<div class="market-listing-grid"><label class="market-form-field"><span>商品：</span><select data-market-listing-item>${rows.map(x=>{const key=x.kind==='equipment'?`equipment:${x.instanceId}`:`${x.kind}:${x.id}`;const plus=x.kind==='equipment'&&Number(x.enhanceLevel??0)>0?` ＋${Number(x.enhanceLevel)}`:'';const itemId=x.kind==='equipment'?(x.equipmentId??x.id):x.id;const count=Number(x.available??1),unit=x.kind==='equipment'?'点':'個',categoryLabel=LISTING_CATEGORIES.find(([id])=>id===x.category)?.[1]??'商品';return `<option value="${esc(key)}" data-available="${count}" data-kind="${esc(x.kind)}" data-item-id="${esc(itemId)}" data-category="${esc(x.category??'all')}" data-category-label="${esc(categoryLabel)}" data-name="${esc(x.name)}" data-enhance-level="${Number(x.enhanceLevel??0)}">${esc(x.name)}${plus}</option>`;}).join('')}</select></label><div class="market-selected-item" data-market-selected-item></div><label class="market-form-field"><span>個数：</span><div class="market-quantity-picker"><button type="button" class="market-tap" data-market-qty-adjust="-1">−1</button><input data-market-listing-quantity type="number" min="1" value="1" inputmode="numeric"><button type="button" class="market-tap" data-market-qty-adjust="1">＋1</button><button type="button" class="market-tap market-max-button" data-market-qty-adjust="max">MAX</button></div></label><label class="market-form-field"><span>1つの値段：</span><input data-market-listing-price type="number" min="1" max="${MARKET_MAX_PRICE}" value="1" inputmode="numeric"></label></div><div class="market-price-guide" data-market-price-guide><b>相場：</b><span>商品を選択すると確認できます</span></div><p class="market-listing-hint" data-market-listing-available>${rows.length?'所持数に応じて出品個数を決められます。':''}</p><button class="market-tap action-main market-listing-submit" data-market-submit-listing ${rows.length?'':'disabled'}>出品する</button></section>`;
}
