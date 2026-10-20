import { getMashoSetCount } from '../core/masho-set.js';
import { equipmentCandidateVisible } from './equipment-search.js';
import {getSellDefinition,getSellPrice} from '../core/selling.js';
import { EQUIPMENT } from '../data/equipment.js';
import { canEquip, canEquipForJob, equipmentJobLabel } from '../core/equipment.js';
import { getEnhancedStats } from '../core/forge.js';
import { getRequiredJobLevel } from '../core/equipment-requirements.js';
import { getEquipmentElementResist } from '../core/combat-stats.js';
import { elementLabel } from '../core/elements.js';

const LABEL={weapon:'武器',spellbook:'魔本（召喚士専用）',shield:'盾',head:'頭',body:'体',arms:'腕',waist:'腰',legs:'脚',accessory1:'指輪',accessory2:'チャーム'};
const CATEGORIES=[['all','すべて'],['unequipped','未装備'],['weapon','武器'],['armor','防具'],['ring','指輪'],['charm','チャーム']];
const STAT_LABEL={attack:'攻撃',defense:'防御',magic:'魔法',speed:'素早さ',maxHp:'HP',maxMp:'MP'};
const RESIST_KEYS=['fire','water','thunder','ice','light','dark'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const defFor=(state,ref)=>{const id=typeof ref==='object'?ref?.instanceId:ref;const inst=state.equipmentInventory?.find(x=>x.instanceId===id)??(typeof ref==='object'?ref:null);return inst?{inst,def:EQUIPMENT[inst.equipmentId]}:null;};
function wearerMap(state){
  const map=new Map();
  for(const c of state.characters??[])for(const [slot,ref] of Object.entries(c.equipment??{})){
    const id=typeof ref==='object'?ref?.instanceId:ref;if(id)map.set(id,{character:c,slot});
  }
  return map;
}
export function equipmentCategoryFor(def={}){
  if(def.slot==='weapon'||def.slot==='spellbook')return 'weapon';
  if(def.slot==='accessory')return def.accessoryType==='charm'?'charm':'ring';
  return 'armor';
}
function slotCategory(slot){
  if(slot==='weapon'||slot==='spellbook')return 'weapon';
  if(slot==='accessory1')return 'ring';
  if(slot==='accessory2')return 'charm';
  return 'armor';
}
function targetSlot(def){return def.slot==='accessory'?(def.accessoryType==='charm'?'accessory2':'accessory1'):def.slot;}
function enhancedStats(inst){return getEnhancedStats(inst);}
function signed(n){const v=Number(n)||0;return v>0?`+${v}`:`${v}`;}
function candidateStats(inst){
  const stats=enhancedStats(inst);
  return Object.entries(STAT_LABEL).filter(([k])=>(stats[k]??0)!==0).map(([k,l])=>`${l} ${signed(stats[k])}`).join(' / ')||'能力補正なし';
}
function resistanceText(def={}){return RESIST_KEYS.filter(k=>Number(def.elementResist?.[k]??0)>0).map(k=>`${elementLabel(k)}耐性 +${Math.round(Number(def.elementResist[k])*100)}%`).join(' / ');}
function resistanceMarkup(def={}){const text=resistanceText(def);return text?`<small class="equipment-resistance">🛡️ ${esc(text)}</small>`:'';}
function currentForSlot(state,c,def){return defFor(state,c.equipment?.[targetSlot(def)]);}
function comparisonMarkup(state,c,inst,def){
  const current=currentForSlot(state,c,def),next=enhancedStats(inst),prev=current?enhancedStats(current.inst):{attack:0,defense:0,magic:0,speed:0,maxHp:0,maxMp:0};
  const statRows=Object.entries(STAT_LABEL).map(([k,l])=>({label:l,before:Number(prev[k]??0),after:Number(next[k]??0)})).filter(x=>x.before!==x.after);
  const resistRows=RESIST_KEYS.map(k=>({label:`${elementLabel(k)}耐性`,before:Math.round(Number(current?.def?.elementResist?.[k]??0)*100),after:Math.round(Number(def.elementResist?.[k]??0)*100)})).filter(x=>x.before!==x.after);
  const rows=[...statRows,...resistRows];
  const currentName=current?`${current.def?.name??'装備'} +${Number(current.inst?.enhanceLevel??0)}`:'なし';
  if(!rows.length)return `<div class="equipment-compare neutral"><small>現在：${esc(currentName)}</small><b>＝ 能力値の変化なし</b></div>`;
  return `<div class="equipment-compare"><small>現在：${esc(currentName)}</small><div>${rows.map(x=>{const d=x.after-x.before,cls=d>0?'up':'down';return `<span class="${cls}">${esc(x.label)} ${x.before} → ${x.after} <b>(${d>0?'+':''}${d})</b></span>`;}).join('')}</div></div>`;
}
function ownerId(inst){return EQUIPMENT[inst?.equipmentId]?.ownerCharacterId??inst?.ownerCharacterId??inst?.dedicatedOwnerId;}
function groupKey(inst){return `${inst.equipmentId}::${Number(inst.enhanceLevel??0)}::${inst.trueEvolved?'1':'0'}`;}
function makeGroups(rows,wearers){
  const map=new Map();
  for(const row of rows){
    const key=groupKey(row.inst);let g=map.get(key);
    if(!g){g={key,def:row.def,equipmentId:row.inst.equipmentId,instances:[]};map.set(key,g);}
    g.instances.push(row.inst);
  }
  return [...map.values()].map(g=>{
    const equipped=g.instances.map(inst=>({inst,wear:wearers.get(inst.instanceId)})).filter(x=>x.wear);
    const unequipped=g.instances.filter(inst=>!wearers.has(inst.instanceId));
    return {...g,equipped,unequipped};
  });
}
function conditionInfo(c,def,state,inst){
  const jobOk=canEquipForJob(c,def,state),jobLv=Number(c.jobLevels?.[c.currentJob]??1),required=getRequiredJobLevel(def,inst),ok=canEquip(c,def,state,inst);
  if(!jobOk)return {ok:false,jobOk:false,reason:'現在の職業では装備できません'};
  if(jobLv<required)return {ok:false,jobOk:true,reason:`職業Lv不足　現在 ${jobLv} / 必要 ${required}`};
  if(!ok)return {ok:false,jobOk:true,reason:'現在の装備条件では装備できません'};
  return {ok:true,jobOk:true,reason:`装備可能　必要職業Lv ${required}`};
}
function candidateGroupMarkup(state,c,g,wearers,selected,query=''){
  const def=g.def,cat=equipmentCategoryFor(def),hasUnequipped=g.unequipped.length>0,hidden=!equipmentCandidateVisible({category:selected,itemCategory:cat,unequipped:hasUnequipped,name:def.name,query});
  const selectedWorn=g.equipped.find(x=>x.wear?.character?.id===c.id);
  const representative=g.unequipped[0]??selectedWorn?.inst??g.instances[0];
  const cond=conditionInfo(c,def,state,representative);
  const transfer=!g.unequipped.length&&!selectedWorn&&g.equipped.length>0;
  const isCurrent=!!selectedWorn&&!g.unequipped.length;
  const wearerNames=[...new Set(g.equipped.map(x=>x.wear?.character?.name).filter(Boolean))];
  const ownerText=wearerNames.length?`👤 ${wearerNames.map(esc).join('・')} 装備中`:'🧳 全て未装備';
  const freeText=g.unequipped.length?`未装備 ${g.unequipped.length}個`:'';
  const actionLabel=isCurrent?'装備中':transfer?'付替':cond.ok?'装備':'条件未達';
  const disabled=!cond.ok||isCurrent;
  const jobLabel=equipmentJobLabel(def);
  const details=[resistanceText(def),jobLabel].filter(Boolean);
  const price=getSellPrice(getSellDefinition('equipment',def.id));
  const copyActions=g.instances.map((inst,index)=>{const wearing=wearers.get(inst.instanceId),locked=inst.locked===true;return `<div class="equipment-instance-row"><small>${g.instances.length>1?`個体${index+1}　`:''}+${Number(inst.enhanceLevel??0)}　${wearing?`${esc(wearing.character.name)}装備中`:'未装備'}${locked?'　🔒ロック中':''}</small><div><button type="button" data-equip-sell-ask="${esc(inst.instanceId)}" ${wearing||locked||price<=0?'disabled':''}>売却 ${price.toLocaleString('ja-JP')}G</button><button type="button" data-equip-lock="${esc(inst.instanceId)}">${locked?'🔓 ロック解除':'🔒 ロック'}</button></div></div>`;}).join('');
  return `<article class="equipment-group-card ${cond.ok?'can-equip':'cannot-equip'}" data-equipment-category-value="${cat}" data-equipment-unequipped="${hasUnequipped?'1':'0'}" data-equipment-search-name="${esc(def.name)}" ${hidden?'hidden':''}>
    <div class="equipment-group-head"><div><b>${esc(def.name)} +${Number(representative.enhanceLevel??0)}</b>${g.instances.length>1?`<strong class="equipment-stack-count">×${g.instances.length}</strong>`:''}</div><span class="equipment-condition ${cond.ok?'ok':'ng'}">${esc(cond.reason)}</span></div>
    <div class="equipment-primary-stats">${esc(candidateStats(representative))}</div>
    <div class="equipment-owner-line"><span>${ownerText}</span>${freeText?`<span>🧳 ${esc(freeText)}</span>`:''}</div>
    ${comparisonMarkup(state,c,representative,def)}
    <div class="equipment-group-actions">
      <details class="equipment-details" data-equipment-details-key="${esc(g.key)}"><summary>詳細・売却・ロック</summary><div>${details.length?details.map(x=>`<p>${esc(x)}</p>`).join(''):'<p>追加情報はありません。</p>'}</div><div class="equipment-instance-list">${copyActions}</div></details>
      <button data-equip="${esc(representative.instanceId)}" data-slot="${targetSlot(def)}" ${disabled?'disabled':''}>${actionLabel}</button>
    </div>
  </article>`;
}

export function itemTargetMarkup(state,item={}){const chars=(state.characters??[]).filter(c=>item.canTargetKo||(c.hp??0)>0);return `<section class="target-list">${chars.map(c=>`<button data-target="${c.id}">${esc(c.name)}</button>`).join('')}</section>`;}

export function equipmentMarkup(state,characterId,searchQuery=''){
  const c=(state.characters??[]).find(x=>x.id===characterId);if(!c)return '<p>キャラクターが見つかりません</p>';
  const slots=['weapon',...(c.currentJob==='summoner'?['spellbook']:[]),'shield','head','body','arms','waist','legs','accessory1','accessory2'];
  const wearers=wearerMap(state);
  const rows=(state.equipmentInventory??[]).map(inst=>({inst,def:EQUIPMENT[inst.equipmentId]})).filter(x=>x.def&&(!ownerId(x.inst)||ownerId(x.inst)===c.id));
  const selected=CATEGORIES.some(([id])=>id===state.ui?.equipmentCategory)?state.ui.equipmentCategory:'all';
  const groups=makeGroups(rows,wearers).sort((a,b)=>{
    const ca=conditionInfo(c,a.def,state,a.instances[0]),cb=conditionInfo(c,b.def,state,b.instances[0]),pa=ca.ok?0:ca.jobOk?1:2,pb=cb.ok?0:cb.jobOk?1:2;
    if(pa!==pb)return pa-pb;
    const order={weapon:0,armor:1,ring:2,charm:3},catA=order[equipmentCategoryFor(a.def)]??9,catB=order[equipmentCategoryFor(b.def)]??9;
    if(catA!==catB)return catA-catB;
    const lvA=getRequiredJobLevel(a.def,a.instances[0]),lvB=getRequiredJobLevel(b.def,b.instances[0]);if(lvA!==lvB)return lvA-lvB;
    return String(a.def.name).localeCompare(String(b.def.name),'ja');
  });
  const counts={all:groups.length,unequipped:0,weapon:0,armor:0,ring:0,charm:0};
  for(const g of groups){counts[equipmentCategoryFor(g.def)]++;if(g.unequipped.length>0)counts.unequipped++;}
  const tabs=`<div class="equipment-category-tabs">${CATEGORIES.map(([id,label])=>`<button class="equipment-category-tab ${selected===id?'active':''}" data-equipment-category="${id}">${label}<em>${counts[id]}</em></button>`).join('')}</div>`;
  const current=slots.map(slot=>{
    const cat=slotCategory(slot),x=defFor(state,c.equipment?.[slot]),hidden=selected==='unequipped'||selected!=='all'&&selected!==cat;
    return `<div class="equipment-slot" data-equipment-current-category="${cat}" ${hidden?'hidden':''}><span class="equipment-slot-icon" title="${LABEL[slot]}">${slot==='spellbook'?'<span class="equipment-spellbook-icon" aria-hidden="true">📖</span>':`<span class="equipment-pixel-crop equipment-pixel-${slot}"><img src="./assets/equipment-slots/pixel-equipment-sheet.png" alt="${LABEL[slot]}" width="1254" height="1254"></span>`}</span><span class="equipment-slot-label">${LABEL[slot]}</span><strong>${esc(x?.def?.name??'なし')}${x?.inst?` +${Number(x.inst.enhanceLevel??0)}`:''}</strong>${x?.inst?`<small>${esc(candidateStats(x.inst))} / 必要職業Lv ${getRequiredJobLevel(x.def,x.inst)}</small>`:''}</div>`;
  }).join('');
  const candidateCards=groups.map(g=>candidateGroupMarkup(state,c,g,wearers,selected,searchQuery)).join('');
  const totalResist=getEquipmentElementResist(state,c),totalResistText=RESIST_KEYS.map(k=>`${elementLabel(k)} ${Math.round(totalResist[k]*100)}%`).join(' / ');
  const equippedCount=slots.filter(slot=>!!c.equipment?.[slot]).length,totalCopies=rows.length;
  const visibleGroups=groups.filter(g=>equipmentCandidateVisible({category:selected,itemCategory:equipmentCategoryFor(g.def),unequipped:g.unequipped.length>0,name:g.def.name,query:searchQuery})).length;
  const emptyMessage=String(searchQuery).trim()?'検索に一致する装備がありません。':selected==='unequipped'?'未装備のアイテムがありません。':'このカテゴリに装備できるアイテムがありません。';
  return `<section class="panel equipment equipment-screen"><div class="section-title"><h2>⚔️ 装備</h2><span>${esc(c.name)}</span></div>${tabs}<div class="equipment-overview"><b>${esc(c.name)}の装備</b><span>${equippedCount}/${slots.length}部位</span>${c.currentJob==='summoner'?'<small class="equipment-summoner-book-note">📖 通常武器と魔本を同時に装備可能</small>':''}<span>所持 ${groups.length}種 / ${totalCopies}個</span><button data-recommend-equipment class="equipment-recommend-button">✨ おすすめ装備</button><button type="button" data-unequip-all class="equipment-unequip-all" ${equippedCount?'':'disabled'}>すべて外す</button></div><p class="equipment-recommend-note">おすすめ装備は現在の職業・職業Lv・能力傾向から自動選択します。他の仲間が装備中の品は取りません。</p><p class="notice equipment-resistance-total"><b>🛡️ 装備属性耐性</b><br>${totalResistText}<br><small>属性ダメージを軽減します（各属性 最大75%）。</small></p><p class="notice">魔障シリーズ ${getMashoSetCount(state,c)}/9部位${getMashoSetCount(state,c)===9?'：セット効果発動！ 全能力＋10':'：9部位で攻撃・防御・魔法・素早さ・最大HP・最大MP＋10'}</p><div class="equipped-slots">${current}</div></section><section class="panel equipment-candidates"><div class="equipment-list-head"><div><h2>${selected==='unequipped'?'未装備一覧':'装備候補'}</h2><small aria-live="polite">${visibleGroups}種を表示</small></div><button data-open-sell-shop class="equipment-organize-button">💰 整理・売却</button></div>${selected==='unequipped'?'<p class="notice">未装備の在庫が1個以上ある種類だけを表示。装備中の仲間も同じカードで確認できます。</p>':'<p class="notice">同じ装備はまとめて表示。装備中の仲間と、現在装備との能力差がすぐ確認できます。</p>'}<div class="equipment-search"><label for="equipment-search-input">🔎 装備名で検索</label><div class="equipment-search-controls"><input id="equipment-search-input" data-equipment-search type="search" value="${esc(searchQuery)}" placeholder="装備名を入力（例：魔障）" maxlength="100" autocomplete="off" aria-label="装備名で検索"><button type="button" data-equipment-search-clear ${String(searchQuery).trim()?'':'hidden'}>クリア</button></div></div><div class="equipment-group-list">${candidateCards||'<p class="notice">装備アイテムがありません。</p>'}</div><p class="notice equipment-category-empty" ${visibleGroups>0?'hidden':''}>${emptyMessage}</p></section>`;
}
