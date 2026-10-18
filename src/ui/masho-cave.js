import { hasFirstClear } from '../core/progression-caps.js';
import { getMashoFloors, MASHO_MAX_FLOOR } from '../core/masho-cave.js';
import { EQUIPMENT } from '../data/equipment.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const n=v=>Number(v??0).toLocaleString('ja-JP');
export function mashoEntranceMarkup(state){return hasFirstClear(state)?`<section class="panel masho-entrance"><div><small>一周目クリア後の常設コンテンツ</small><h3>魔障の洞窟</h3><p>全${MASHO_MAX_FLOOR}階層<br>高経験値・高ゴールド／魔障装備を探す旅へ<br>※ 今日の旅ボーナス対象外</p></div><button class="action-main" data-masho-open>洞窟へ</button></section>`:'';}
export function mashoCaveMarkup(state,now=Date.now()){
 if(!hasFirstClear(state))return '<section class="panel"><h2>魔障の洞窟</h2><p>一周目をクリアすると解放されます。</p><button data-masho-back>冒険へ戻る</button></section>';
 const floors=getMashoFloors(state),last=state.mashoCave?.lastReward;
 return `<section class="masho-view"><button class="wide-button" data-masho-back>← 冒険へ戻る</button><header class="panel masho-hero"><small>END CONTENTS</small><h2>魔障の洞窟</h2><p>魔障が映し出す、かつての強敵たち。</p><b>${state.mashoCave.highestCleared} / ${MASHO_MAX_FLOOR}階層 制覇</b><p>キャラクター上限Lv500 ／ ジョブ上限Lv400</p><p class="notice">※ 魔障の洞窟では「今日の旅ボーナス」は適用されません。</p></header>
 ${last?`<section class="panel masho-result" role="status"><h3>第${last.floor}階層 クリア！</h3><strong>${last.equipment?`装備獲得：${esc(EQUIPMENT[last.equipment.equipmentId]?.name)}`:last.promiseOre||last.enhanceMaterial?'報酬アイテムを獲得！':'装備・素材ドロップなし'}</strong>${last.promiseOre?`<p>✦ 約束鉱 ×${last.promiseOre} を獲得</p>`:''}${last.enhanceMaterial?`<p class="masho-enhance-drop">💎 ${esc(last.enhanceMaterial.name)} ×${Number(last.enhanceMaterial.qty)||1} を獲得！</p>`:''}${last.levelUps?.length?`<div class="masho-levelups"><h4>レベルアップ</h4><ul>${last.levelUps.map(line=>`<li>${esc(line)}</li>`).join('')}</ul></div>`:''}<div class="masho-result-actions"><button data-masho-floor="${last.floor}">同じ階層を周回</button>${last.floor<MASHO_MAX_FLOOR?`<button data-masho-floor="${last.floor+1}">第${last.floor+1}階層へ</button>`:'<b>全階層クリア！</b>'}</div></section>`:''}

 <div class="masho-floors">${floors.map(f=>{return `<article class="panel masho-floor ${f.tier>=3?'masho-deep':''} ${f.available?'':'masho-locked'}"><div class="section-title"><h3>第${f.floor}階層</h3></div><small>${f.cleared?'✓ クリア済み・周回可能':f.available?'挑戦可能':'未解放'}</small><p>${f.bosses.map(b=>esc(b.name)).join(' ／ ')}</p><p>${f.tier===4?'希少武器':(f.tier===3?'深魔障':f.tier===2?'魔障Ⅱ':'魔障Ⅰ')+'装備'}</p><button class="wide-button" data-masho-floor="${f.floor}" ${f.available?'':'disabled'}>${f.cleared?'周回する':f.available?'挑戦する':'前の階層をクリアで解放'}</button></article>`;}).join('')}</div>
 </section>`;
}
