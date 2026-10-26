import { EQUIPMENT } from '../data/equipment.js';
import { elementLabel } from '../core/elements.js';
import { RECIPES } from '../data/recipes.js?v=summoner-book-name-clean-20261020';
import { ALL_JOBS } from '../data/jobs.js';
import {equipmentJobLabel,canEquipForJob} from '../core/equipment.js';
import { canCraftPromiseChronicle } from '../core/promise-chronicle.js';
import { getEnhanceQuote,getEnhancedStats } from '../core/forge.js';
import { getRequiredJobLevel } from '../core/equipment-requirements.js';
import { getAvailableRecipes,canCraft,markRecipesSeen,getMaterialQuantity,craftingGoldCost } from '../core/crafting.js';
import { getItemDef } from '../core/items.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const matName=id=>getItemDef(id)?.name||'不明な素材';
const CAT_LABEL={weapon:'⚔️ 武器生産',armor:'🛡️ 防具生産',ring:'💍 指輪生産',charm:'🧿 チャーム生産'};
const JOB_FILTERS=[['all','すべて'],...ALL_JOBS.map(j=>[j.id,j.name])];
const EVENT_JOB_FILTERS=JOB_FILTERS;
const normalizeJob=id=>id==='magic'?'mage':ALL_JOBS.some(j=>j.id===id)?id:'all';
const selectedCharacterJob=state=>state.characters?.find(c=>c.id===state.selectedCharacterId)?.currentJob??'all';
const forgeJobFilter=(state,key)=>normalizeJob(state.ui?.[key]??selectedCharacterJob(state));
const matchesJob=(def,job)=>job==='all'||!!def&&canEquipForJob({id:def.ownerCharacterId??'forge-preview',currentJob:job},def);
const AVAIL_FILTERS=[['all','すべて'],['craftable','✓ 生産可能'],['missing','素材不足']];
const EQUIP_FILTERS=[['all','すべて'],['weapon','武器'],['armor','防具'],['ring','指輪'],['charm','チャーム']];
const ENHANCE_FILTERS=[...EQUIP_FILTERS,['event','イベント']];
const ARMOR_SLOT_FILTERS=[['all','すべて'],['shield','盾'],['head','頭'],['body','体'],['arms','腕'],['waist','腰'],['legs','脚']];
const ARMOR_SLOT_LABEL={shield:'盾',head:'頭',body:'体',arms:'腕',waist:'腰',legs:'脚'};

function statsText(def){const map=[['attack','攻撃'],['defense','防御'],['magic','魔法'],['speed','素早さ'],['maxHp','HP'],['maxMp','MP']];return map.filter(([k])=>(def?.[k]??0)>0).map(([k,n])=>`${n}+${def[k]}`).join(' / ')||'素材';}
function resistText(def={}){const text=Object.entries(def.elementResist??{}).filter(([,v])=>Number(v)>0).map(([k,v])=>`${elementLabel(k)}耐性+${Math.round(Number(v)*100)}%`).join(' / ');return text?`🛡️ ${text}`:'';}
function equipmentCategory(def){if(!def)return 'armor';if(def.slot==='weapon'||def.slot==='spellbook')return 'weapon';if(def.slot==='accessory')return def.accessoryType==='ring'?'ring':'charm';return 'armor';}
function armorSlotLabel(def){return ARMOR_SLOT_LABEL[def?.slot]??'防具';}
function armorSlotMatches(def,slot){return slot==='all'||def?.slot===slot;}
function categorySwitcher(selected){return `<div class="forge-primary-categories" aria-label="装備カテゴリ">${filterButtons(EQUIP_FILTERS.filter(([id])=>id!=='all'),selected,'forge-page')}</div>`;}
function armorSlotFilter(state,key,dataName){const selected=ARMOR_SLOT_FILTERS.some(([id])=>id===state.ui?.[key])?state.ui[key]:'all';return {selected,markup:`<div class="forge-armor-slots"><b>🛡️ 防具の部位</b>${filterButtons(ARMOR_SLOT_FILTERS,selected,dataName)}</div>`};}
function filterButtons(items,selected,dataName){return `<div class="forge-filter-row ${dataName.endsWith('job')?'forge-job-grid':''}">${items.map(([id,label])=>`<button data-${dataName}="${id}" class="${selected===id?'selected':''}">${label}</button>`).join('')}</div>`;}
// 画面上部は「カテゴリ / 生産状況」の二段階だけにし、職業の全候補は必要時に展開する。
function jobFilterDetails(job,dataName){const name=JOB_FILTERS.find(([id])=>id===job)?.[1]??'すべて';return `<details class="forge-advanced" data-forge-details><summary>⚙ 詳細絞り込み <span class="forge-filter-current">職業：${esc(name)}</span></summary><div class="forge-advanced-body"><b>装備可能な職業</b>${filterButtons(JOB_FILTERS,job,dataName)}<small>選んだ職業が装備できる品を表示します。「すべて」で職業の制限を解除できます。</small></div></details>`;}
function availabilityToolbar(selected){return `<div class="forge-availability-toolbar"><span class="forge-toolbar-caption">生産状況</span>${filterButtons(AVAIL_FILTERS,selected,'forge-availability')}</div>`;}
function sortToolbar(state){const selected=state.ui?.forgeSort??'recommended';return `<label class="forge-sort-label">並び替え <select data-forge-sort aria-label="鍛冶屋の並び替え"><option value="recommended" ${selected==='recommended'?'selected':''}>おすすめ順</option><option value="level" ${selected==='level'?'selected':''}>必要Lvが低い順</option><option value="price" ${selected==='price'?'selected':''}>生産費が安い順</option></select></label>`;}
function sortRecipes(state,recipes,now){const mode=state.ui?.forgeSort??'recommended';const current=state.characters?.find(c=>c.id===state.selectedCharacterId);const jobLevel=Number(current?.jobLevels?.[current.currentJob]??current?.jobLevel??current?.level??1);const level=r=>Number(EQUIPMENT[r.output?.equipmentId]?.requiredLevel??1);return recipes.map((r,i)=>({r,i})).sort((a,b)=>{if(mode==='price')return craftingGoldCost(a.r)-craftingGoldCost(b.r)||a.i-b.i;if(mode==='level')return level(a.r)-level(b.r)||a.i-b.i;const ca=canCraft(state,a.r.id,now).ok,cb=canCraft(state,b.r.id,now).ok;if(ca!==cb)return ca?-1:1;const da=level(a.r),db=level(b.r);const ua=da<=jobLevel,ub=db<=jobLevel;if(ua!==ub)return ua?-1:1;return (ua?db-da:da-db)||a.i-b.i;}).map(x=>x.r);}
function catalogHead(state,category,available,job,jobData,armor){return `${categorySwitcher(category)}<div class="forge-quick-tools">${availabilityToolbar(available)}${sortToolbar(state)}</div>${armor.markup}${jobFilterDetails(job,jobData)}`;}
function countMarkup(n){return `<div class="forge-results-head"><b>装備一覧</b><span>${n.toLocaleString('ja-JP')}件</span></div>`;}
function recipeCard(state,r,now=Date.now()){const check=canCraft(state,r.id,now),isNew=(state.newRecipes??[]).includes(r.id);const req=Object.entries(r.materials??{}).map(([id,n])=>{const have=getMaterialQuantity(state,id);return `${esc(matName(id))} ${have}/${n}`}).join('・');const def=r.output.kind==='equipment'?EQUIPMENT[r.output.equipmentId]:null;const jobLabel=equipmentJobLabel(def);const pieces=jobLabel?jobLabel.split('・').map(v=>v.trim()):[];const conciseJob=pieces.length>5?pieces.slice(0,4).join('・')+` ほか${pieces.length-4}職`:jobLabel;const reason=[check.eventClosed?'イベント終了':'',check.eventNotStarted?'開催前':'',check.locked&&!check.eventClosed&&!check.eventNotStarted?'未解放':'',check.missingMaterials.length?'素材不足':'',check.missingGold?'G不足':'',check.outputFull?'所持上限':''].filter(Boolean).join(' / ');return `<button data-craft="${r.id}" ${check.ok?'':'disabled'}><span><b>${isNew?'<i class="new-badge">NEW</i> ':''}${esc(r.name)}</b><small>${esc(statsText(def))}</small>${def&&resistText(def)?`<small>${esc(resistText(def))}</small>`:''}${def?`<small class="forge-kind-label">${equipmentCategory(def)==='armor'?`🛡️ ${armorSlotLabel(def)}防具`:equipmentCategory(def)==='weapon'?'⚔️ 武器':equipmentCategory(def)==='ring'?'💍 指輪':'🧿 チャーム'}</small>`:''}${jobLabel?`<small class="job-exclusive-label" title="${esc(jobLabel)}">${esc(conciseJob)}</small>`:''}${def?`<small>🔓 装備可能Lv ${def.requiredLevel??1}</small>`:''}<small>${req||'必要素材なし'}</small>${reason?`<small class="missing">${reason}</small>`:''}</span><em>${craftingGoldCost(r)}G</em></button>`;}

// 装備名ではなくインスタンスIDで照合する。同名装備を複数所持していても誤表示しない。
const EQUIPPED_SLOT_LABEL={weapon:'武器',spellbook:'魔本',shield:'盾',head:'頭',body:'体',arms:'腕',waist:'腰',legs:'足',accessory1:'指輪',accessory2:'チャーム'};
function buildEquipmentWearerMap(state){
 const equipped=new Map();
 for(const character of state.characters??[]){
  for(const [slot,ref] of Object.entries(character.equipment??{})){
   const instanceId=typeof ref==='object'?ref?.instanceId:ref;
   if(!instanceId)continue;
   if(!equipped.has(instanceId))equipped.set(instanceId,[]);
   equipped.get(instanceId).push({name:character.name||'名前未設定',slot});
  }
 }
 return equipped;
}
// 装備強化一覧だけに適用する優先順位。フィルタ済みの順序と装備データを変更しない。
export function sortForgeEnhanceInstances(instances=[],equipped=new Map()){
 const priority=inst=>{
  if(!equipped.has(inst?.instanceId))return 2;
  return 0; // 装備中は +0〜+15 のすべての段階で最優先
 };
 return instances.map((inst,index)=>({inst,index})).sort((a,b)=>
  priority(a.inst)-priority(b.inst)||a.index-b.index
 ).map(({inst})=>inst);
}

function equippedByMarkup(equipped,instanceId){
 const wearers=equipped.get(instanceId)??[];
 if(!wearers.length)return '<small class="forge-equipped-by is-unequipped">未装備</small>';
 return `<small class="forge-equipped-by is-equipped">装備中：${wearers.map(({name,slot})=>`${esc(name)}（${esc(EQUIPPED_SLOT_LABEL[slot]??slot)}）`).join('・')}</small>`;
}

function enhanceCards(state,filter='all',armorSlot='all'){const job=forgeJobFilter(state,'forgeEnhanceJob'),equipped=buildEquipmentWearerMap(state);const rows=(state.equipmentInventory??[]).filter(inst=>{const d=EQUIPMENT[inst.equipmentId];if(!d||d.arenaExclusive||!matchesJob(d,job))return false;const catOk=filter==='all'||filter==='event'&&d?.eventLimited||equipmentCategory(d)===filter;if(!catOk)return false;return filter!=='armor'||armorSlotMatches(d,armorSlot);});return sortForgeEnhanceInstances(rows,equipped).map(inst=>{const d=EQUIPMENT[inst.equipmentId],q=getEnhanceQuote(state,inst.instanceId),stats=getEnhancedStats(inst),useCharm=!!state.ui?.useForgeCharm&&(inst.enhanceLevel??0)>=7&&(inst.enhanceLevel??0)<10&&(state.inventory??[]).some(x=>x.id==='forgeCharm'&&x.qty>0);return `<button data-forge="${inst.instanceId}" data-use-charm="${useCharm}" ${q.maxed?'disabled':''}><span><b>${esc(d?.name??'不明な装備')} +${Math.min(inst.enhanceLevel??0,q.maxLevel)}</b>${equippedByMarkup(equipped,inst.instanceId)}<small>${statsText(stats)}</small>${resistText(d)?`<small>${esc(resistText(d))}</small>`:''}${equipmentJobLabel(d)?`<small class="job-exclusive-label">${esc(equipmentJobLabel(d))}</small>`:''}<small>🔓 必要職業Lv ${getRequiredJobLevel(d,inst)}${!q.maxed&&d?.eventLimited?` → 強化後 ${getRequiredJobLevel(d,q.targetLevel)}`:''}</small><small>最大 +${q.maxLevel}${d?.eventLimited?'・イベント装備':''}</small>${q.requiredMaterial?`<small class="forge-enhance-material ${q.requiredMaterial.have<q.requiredMaterial.quantity?'missing':''}">💎 ${esc(q.requiredMaterial.name)} ${q.requiredMaterial.have}/${q.requiredMaterial.quantity}${q.requiredMaterial.have<q.requiredMaterial.quantity?'（素材不足）':''}</small>`:''}${useCharm?'<small>🧿 護符使用：強化成功を保証</small>':''}${q.dailyBonusApplied&&!q.maxed?'<small>今日の旅ボーナス：成功率 +15pt</small>':''}<small>${q.maxed?'最大強化':`成功率 ${useCharm?100:Math.round(q.successRate*100)}%`}</small></span><em>${q.maxed?'最大':`${q.cost.toLocaleString('ja-JP')}G`}</em></button>`}).join('')||'<p class="empty-card">条件に合う強化装備がありません。</p>';}

function shell(state,title,body,back='home'){return `<section class="panel forge forge-renewal"><nav class="forge-back-nav" aria-label="鍛冶屋のページ移動">${back?`<button data-forge-page="${back}">← ${back==='raid'?'オリハルコン・オリハル装備':back==='production'?'装備生産':'鍛冶屋'}へ戻る</button>`:''}<button data-town="field">← フィールドへ戻る</button></nav><div class="section-title"><h2>🔨 ${esc(title)}</h2><span>${state.gold??0}G</span></div>${body}</section>`;}
function homeMarkup(state){return shell(state,'鍛冶屋',`<p class="notice">生産・強化する内容を選んでください。</p><div class="forge-menu-grid"><button data-forge-page="raid"><b>💠 オリハルコン・オリハル装備</b><small>武器・防具・指輪・チャーム / かけら精錬</small></button><button data-forge-page="refine"><b>⛏️ 素材精錬</b><small>鉱石などを加工</small></button><button data-forge-page="production"><b>🔨 装備生産</b><small>武器・防具・アクセサリー</small></button><button data-forge-page="enhance"><b>🔥 装備強化</b><small>所持装備を強化</small></button><button data-forge-page="event"><b>🎃 イベント</b><small>歴代イベント装備</small></button></div>`,null);}
function productionMarkup(state){return shell(state,'装備生産',`<p class="notice">生産する装備カテゴリを選んでください。序盤の革装備は、スライムが落とす「スライム素材」を使用します。</p><div class="forge-menu-grid production-grid">${Object.entries(CAT_LABEL).map(([id,label])=>`<button data-forge-page="${id}"><b>${label}</b><small>一覧を開く</small></button>`).join('')}</div>`,'home');}

function raidMaterialMarkup(state){return `<p class="notice">💠 オリハルコン ${getMaterialQuantity(state,'orichalcum')}個 / 🔷 オリハル ${getMaterialQuantity(state,'orihal')}個<br><small>オリハルコンのかけら ${getMaterialQuantity(state,'orichalcumShard')}個 / オリハルのかけら ${getMaterialQuantity(state,'orihalShard')}個</small></p>`;}
function raidOverviewMarkup(state){return shell(state,'オリハルコン・オリハル装備',`${raidMaterialMarkup(state)}<p class="notice">五神の試練の報酬で生産できます。カテゴリを選ぶと、素材不足の装備も含めてすべて表示します。</p><div class="forge-menu-grid production-grid">${Object.entries(CAT_LABEL).map(([id,label])=>`<button data-forge-page="raid-${id}"><b>${label}</b><small>五神の試練の装備一覧</small></button>`).join('')}<button data-forge-page="raid-refine"><b>⛏️ かけら精錬</b><small>各かけら5個 → 素材1個</small></button></div>`);}
function raidCatalogMarkup(state,category,now){
 state.ui??={};const job=forgeJobFilter(state,'forgeRaidJob');const armor=category==='armor'?armorSlotFilter(state,'forgeRaidArmorSlot','forge-raid-armor-slot'):{selected:'all',markup:''};
 let recipes=Object.values(RECIPES).filter(r=>r.eventId==='five-gods-raid'&&r.category===category&&(category==='refine'||matchesJob(EQUIPMENT[r.output?.equipmentId],job))&&(category!=='armor'||armorSlotMatches(EQUIPMENT[r.output?.equipmentId],armor.selected))).sort((a,b)=>a.displayOrder-b.displayOrder);
 recipes=sortRecipes(state,recipes,now);const body=recipes.map(r=>recipeCard(state,r,now)).join('')||'<p class="empty-card">このカテゴリのレシピがありません。</p>';markRecipesSeen(state,recipes.map(r=>r.id));const title=category==='refine'?'オリハルコン・オリハルのかけら精錬':`オリハルコン・オリハル ${CAT_LABEL[category].replace(/^[^ ]+ /,'')}`;
 return shell(state,title,`${category==='refine'?'':`${categorySwitcher(category)}${armor.markup}<div class="forge-quick-tools">${sortToolbar(state)}</div>${jobFilterDetails(job,'forge-raid-job')}`}${raidMaterialMarkup(state)}<p class="notice">素材不足のレシピも表示しています。${category==='refine'?'各かけら5個で素材1個を精錬できます。':'表示された必要素材が揃うと生産できます。装備可否は現在のジョブLvで判定されます。'}</p>${countMarkup(recipes.length)}<div class="choice-list forge-list">${body}</div>`,'raid');
}

function categoryMarkup(state,category,now){
 state.ui??={};const availability=state.ui.forgeAvailability??'all',job=forgeJobFilter(state,'forgeJob'),armor=category==='armor'?armorSlotFilter(state,'forgeArmorSlot','forge-armor-slot'):{selected:'all',markup:''};
 let recipes=getAvailableRecipes(state,now).filter(r=>r.category===category&&(!r.eventId||r.eventId==='five-gods-raid')&&(category!=='armor'||armorSlotMatches(EQUIPMENT[r.output?.equipmentId],armor.selected)));
 if(job!=='all')recipes=recipes.filter(r=>matchesJob(EQUIPMENT[r.output?.equipmentId],job));
 if(availability==='craftable')recipes=recipes.filter(r=>canCraft(state,r.id,now).ok);
 if(availability==='missing')recipes=recipes.filter(r=>canCraft(state,r.id,now).missingMaterials.length>0);
 recipes=sortRecipes(state,recipes,now);
 let body=recipes.map(r=>recipeCard(state,r,now)).join('')||'<p class="empty-card">条件に合うレシピがありません。絞り込みを変更してください。</p>';
 const promise=canCraftPromiseChronicle(state);if(category==='ring'&&(promise.key||promise.fragments>0||promise.already)){body=`<button data-craft-promise-chronicle ${promise.ok?'':'disabled'}><span><b>📖 失われた約束を復元する</b><small>約束のクロニクルのかけら ${promise.fragments}/12・最初の約束 ${promise.key?'所持':'未所持'}</small></span><em>${promise.already?'復元済み':'復元'}</em></button>`+body;}
 markRecipesSeen(state,recipes.map(r=>r.id).filter(id=>(state.newRecipes??[]).includes(id)));
 return shell(state,CAT_LABEL[category].replace(/^[^ ]+ /,''),`${catalogHead(state,category,availability,job,'forge-job',armor)}${countMarkup(recipes.length)}<div class="choice-list forge-list">${body}</div>`,'production');
}

function refineMarkup(state,now){const recipes=getAvailableRecipes(state,now).filter(r=>r.category==='refine');const seen=recipes.map(r=>r.id).filter(id=>(state.newRecipes??[]).includes(id));markRecipesSeen(state,seen);return shell(state,'素材精錬',`<p class="notice">新しい鉱石や魔物素材を入手すると、精錬レシピが増えます。</p><div class="choice-list forge-list">${recipes.map(r=>recipeCard(state,r,now)).join('')||'<p class="empty-card">精錬できる素材がありません。</p>'}</div>`,'home');}
function enhanceMarkup(state){
 state.ui??={};const filter=state.ui.forgeEnhanceCategory??'all',armor=filter==='armor'?armorSlotFilter(state,'forgeEnhanceArmorSlot','forge-enhance-armor-slot'):{selected:'all',markup:''},charms=(state.inventory??[]).filter(x=>x.id==='forgeCharm').reduce((n,x)=>n+(x.qty??0),0);
 const job=forgeJobFilter(state,'forgeEnhanceJob');return shell(state,'装備強化',`<div class="forge-quick-tools forge-enhance-categories"><span class="forge-toolbar-caption">装備カテゴリ</span>${filterButtons(ENHANCE_FILTERS,filter,'forge-enhance-category')}</div>${armor.markup}${jobFilterDetails(job,'forge-enhance-job')}<button data-toggle-forge-charm aria-pressed="${!!state.ui.useForgeCharm}" class="${state.ui.useForgeCharm?'selected':''}">🧿 強化護符 ${charms}個：${state.ui.useForgeCharm?'使用する':'使用しない'}</button><p class="notice">強化費は強化段階が高いほど大きく上昇します。護符は+8〜+10の強化に限り1個消費し、成功を100%保証します（+11〜+15は使用できません）。全装備は最大+15。+11以降は強化結晶などの素材が必要。失敗しても強化段階は下がりません。イベント装備の必要職業Lv上昇は従来どおり+5まで。</p><p class="forge-enhance-stock">💎 強化結晶 ${getMaterialQuantity(state,'enhanceCrystal')}個 / 上級強化結晶 ${getMaterialQuantity(state,'advancedEnhanceCrystal')}個 / 究極強化結晶 ${getMaterialQuantity(state,'ultimateEnhanceCrystal')}個</p><div class="choice-list forge-list">${enhanceCards(state,filter,armor.selected)}</div>`,'home');
}

function eventMarkup(state,now){
 state.ui??={};const cat=state.ui.forgeEventCategory??'all',availability=state.ui.forgeAvailability??'all',job=forgeJobFilter(state,'forgeEventJob'),armor=cat==='armor'?armorSlotFilter(state,'forgeEventArmorSlot','forge-event-armor-slot'):{selected:'all',markup:''};
 const groups=new Map();for(const r of Object.values(RECIPES).filter(r=>r.eventId)){if(!groups.has(r.eventId))groups.set(r.eventId,[]);groups.get(r.eventId).push(r);}
 let sections='';for(const [eventId,source] of groups){const sample=source[0],active=(!sample.eventStartsAt||now>=sample.eventStartsAt)&&(!sample.eventEndsAt||now<sample.eventEndsAt),ended=!!sample.eventEndsAt&&now>=sample.eventEndsAt;
 let recipes=source.filter(r=>(cat==='all'||r.category===cat)&&(cat!=='armor'||armorSlotMatches(EQUIPMENT[r.output?.equipmentId],armor.selected)));if(job!=='all')recipes=recipes.filter(r=>matchesJob(EQUIPMENT[r.output?.equipmentId],job));if(availability==='craftable')recipes=recipes.filter(r=>canCraft(state,r.id,now).ok);if(availability==='missing')recipes=recipes.filter(r=>canCraft(state,r.id,now).missingMaterials.length>0);recipes=sortRecipes(state,recipes,now);
 sections+=`<section class="forge-event-group" data-event-id="${esc(eventId)}"><div class="forge-event-heading"><h3>🎃 ${esc(sample.eventName??eventId)}</h3><span class="${active?'active':'ended'}">${active?'開催中':ended?'開催終了・生産可':'開催前'}</span></div>${countMarkup(recipes.length)}<div class="choice-list forge-list">${recipes.map(r=>recipeCard(state,r,now)).join('')||'<p class="empty-card">条件に合うイベント装備がありません。</p>'}</div></section>`;}
 if(!sections)sections='<p class="empty-card">イベント装備はまだ登録されていません。</p>';
 return shell(state,'イベント装備',`<p class="notice">イベント終了後も、集めた素材とゴールドで武器・防具・指輪・チャームを生産できます。生産には各レシピの解放条件も必要です。</p><div class="forge-primary-categories">${filterButtons(EQUIP_FILTERS,cat,'forge-event-category')}</div><div class="forge-quick-tools">${availabilityToolbar(availability)}${sortToolbar(state)}</div>${armor.markup}${jobFilterDetails(job,'forge-event-job')}${sections}`,'home');
}

export function forgeMarkup(state,page=state.forgeCategory??'home',now=Date.now()){
 const valid=['home','production','refine','weapon','armor','ring','charm','enhance','event','raid','raid-refine','raid-weapon','raid-armor','raid-ring','raid-charm'];
 if(!valid.includes(page))page='home';
 if(page==='home')return homeMarkup(state);
 if(page==='raid')return raidOverviewMarkup(state);
 if(page.startsWith('raid-'))return raidCatalogMarkup(state,page.slice(5),now);
 if(page==='production')return productionMarkup(state);
 if(page==='refine')return refineMarkup(state,now);
 if(page==='enhance')return enhanceMarkup(state);
 if(page==='event')return eventMarkup(state,now);
 return categoryMarkup(state,page,now);
}
