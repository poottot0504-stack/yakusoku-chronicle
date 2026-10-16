import {getItemDef,getItemCategory} from '../core/items.js';import {EQUIPMENT} from '../data/equipment.js';import {getSellableQuantity,getSellDefinition,getSellPrice,getSellWarning} from '../core/selling.js';import {elementLabel} from '../core/elements.js';
const sellCats=[['all','すべて'],['consumable','消費'],['material','素材'],['ore','鉱石'],['weapon','武器'],['armor','防具'],['ring','指輪'],['charm','チャーム'],['event','イベント']];
const shopCats=[['item','アイテム'],['weapon','武器'],['armor','防具'],['ring','指輪'],['charm','チャーム']];
function equipmentCat(d){if(d.slot==='weapon')return 'weapon';if(d.slot==='accessory')return d.accessoryType==='ring'?'ring':'charm';return 'armor';}
function shopCategory(x){
 if(x.kind!=='equipment')return 'item';
 const def=EQUIPMENT[x.equipmentId]??{};
 return equipmentCat(def);
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>`${Number(n??0).toLocaleString('ja-JP')}G`;
function shopItemDescription(x){
 if(x.kind==='equipment'){
  const d=EQUIPMENT[x.equipmentId]??{},parts=[];
  if(d.attack)parts.push(`攻撃+${d.attack}`);if(d.defense)parts.push(`防御+${d.defense}`);if(d.magic)parts.push(`魔法+${d.magic}`);if(d.speed)parts.push(`素早さ+${d.speed}`);if(d.maxHp)parts.push(`HP+${d.maxHp}`);if(d.maxMp)parts.push(`MP+${d.maxMp}`);for(const [k,v] of Object.entries(d.elementResist??{}))if(Number(v)>0)parts.push(`${elementLabel(k)}耐性+${Math.round(Number(v)*100)}%`);
  const level=d.requiredLevel>1?`必要Lv ${d.requiredLevel}。`:'';
  return `${level}${parts.join(' / ')||'装備品'}`;
 }
 return getItemDef(x.id).description||'冒険に役立つアイテム';
}
function sellRows(state){const rows=[];for(const x of state.inventory??[]){if(x.qty>0){const d=getSellDefinition('item',x.id);if(d.category!=='key')rows.push({kind:'item',id:x.id,qty:x.qty,cat:d.category,def:d,price:getSellPrice(d)});}}for(const [id,qty] of Object.entries(state.materials??{})){if(qty>0){const d=getSellDefinition('material',id);if(d.category!=='key')rows.push({kind:'material',id,qty,cat:d.category,def:d,price:getSellPrice(d)});}}const ids=[...new Set((state.equipmentInventory??[]).map(x=>x.equipmentId))];for(const id of ids){const d=getSellDefinition('equipment',id),qty=getSellableQuantity(state,'equipment',id);if(qty>0)rows.push({kind:'equipment',id,qty,cat:d.event?'event':equipmentCat(d),def:d,price:getSellPrice(d)});}return rows;}
export function shopMarkup(state,shop={name:'ショップ',stock:[]}){
 const stock=Array.isArray(shop.stock)?shop.stock:[];
 const counts=Object.fromEntries(shopCats.map(([id])=>[id,0]));
 for(const item of stock){const cat=shopCategory(item);if(Object.hasOwn(counts,cat))counts[cat]++;}
 const defaultCategory=shopCats.find(([id])=>counts[id]>0)?.[0]??'item';
 return `<section class="panel shop shop-home" data-shop-default-category="${defaultCategory}"><h2>${esc(shop.name)}</h2><p>所持金 ${money(state.gold)}</p><div class="shop-mode-tabs"><button class="active">🛒 購入</button><button data-open-sell-shop>💰 売却</button></div><div class="shop-category-tabs" role="tablist" aria-label="ショップ商品カテゴリ">${shopCats.map(([id,label])=>`<button class="market-tap ${defaultCategory===id?'active':''}" data-shop-category="${id}" data-shop-category-label="${label}" aria-pressed="${defaultCategory===id}" ${counts[id]?'':'disabled'}>${label}<small>${counts[id]}件</small></button>`).join('')}</div><div class="shop-category-summary" data-shop-category-summary></div><div class="shop-buy-list">${stock.map(x=>{const cat=shopCategory(x);const catLabel=shopCats.find(([id])=>id===cat)?.[1]??'商品';return `<button data-buy="${esc(x.id)}" data-shop-id="${esc(x.shopId??'starter')}" data-shop-category-value="${cat}"><span><small class="shop-item-category">${esc(catLabel)}</small><b>${esc(x.name??x.id)}</b><small class="shop-item-description">${esc(shopItemDescription(x))}</small></span><em>${money(x.price)}</em></button>`;}).join('')}</div></section>`;}
export function sellShopMarkup(state){const rows=sellRows(state);return `<section class="panel shop shop-sell-screen"><div class="shop-screen-head"><button data-back-shop>← 購入へ戻る</button><h2>💰 売却するアイテム</h2><p>所持金 ${money(state.gold)}</p></div><div class="sell-category-tabs">${sellCats.map(([id,n])=>`<button data-sell-category="${id}">${n}</button>`).join('')}</div><p class="notice">売りたいアイテムを選択してください。装備中の装備品と「だいじなもの」は売却できません。</p><div class="shop-sell-list">${rows.map(r=>`<button class="item-row" data-sell-item="${r.kind}:${r.id}" data-sell-category-value="${r.cat}" data-sell-max-value="${r.qty}" data-sell-price="${r.price}" data-sell-warning="${getSellWarning(r.def)}"><span class="sell-item-name"><i>${r.def.icon??'⚔️'}</i><b>${r.def.name}</b></span><small class="sell-item-meta">売却可能 ${r.qty}個<span>1個 ${money(r.price)}</span></small></button>`).join('')||'<div class="empty-card">売却できるものがありません</div>'}</div></section>`;}
