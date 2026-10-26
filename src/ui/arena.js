import { ARENA_QUESTS,ARENA_RANKS } from '../data/arena-quests.js';
import { ARENA_EQUIPMENT,ARENA_CRAFT_COSTS } from '../data/arena-equipment.js';
import { normalizeArenaProgress,arenaRank,arenaCraftQuote,arenaEnhanceQuote } from '../core/arena.js';
import { EQUIPMENT } from '../data/equipment.js';
import { JOBS } from '../data/jobs.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const n=value=>Number(value??0).toLocaleString('ja-JP');
const gradeDisplay=g=>g==='S'?'🏆 S':g==='A'?'🥇 A':g==='B'?'🥈 B':g==='C'?'🥉 C':'未クリア';
const RANK_TABLE=`<table class="arena-rank-table"><thead><tr><th>評価</th><th>クリアターン</th><th>コイン</th></tr></thead><tbody>${ARENA_RANKS.map(x=>`<tr><td><b>${x.grade}</b></td><td>${x.maxTurns===3?'1〜3':x.maxTurns===6?'4〜6':x.maxTurns===10?'7〜10':'11〜100'}ターン</td><td>${x.coins}枚</td></tr>`).join('')}</tbody></table>`;
export function arenaMarkup(state){
 const progress=normalizeArenaProgress(state);
 const last=progress.lastResult;
 const result=last?`<section class="panel arena-last-result" role="status"><h3>${last.victory?'🏆 闘技大会クリア！':'⚔️ 闘技大会に挑戦'}</h3><p>${esc(ARENA_QUESTS[last.questId]?.name??'クエスト')} / <b>${last.grade?gradeDisplay(last.grade):'失敗'}</b> / ${n(last.turns)}ターン / 獲得コイン ${last.coins}枚</p></section>`:'';
 const cards=Object.values(ARENA_QUESTS).map(q=>{
  const best=progress.best[q.id],r=best?arenaRank(best):null;
  return `<article class="panel arena-quest">
    <div class="section-title"><h3>${esc(q.name)}</h3><b>固定Lv${q.level}</b></div>
    <p>${esc(q.description)}</p>
    <p>🏅 自己ベスト：${best?`${best}ターン / ${r.grade}`:'記録なし'}</p>
    <details><summary>固定パーティ・ジョブ・装備・特技</summary>
      <ul>${q.roster.map(c=>`<li><b>${esc(c.slot)} / ${esc(JOBS[c.job]?.name??c.job)}</b>　${esc(EQUIPMENT[c.weapon]?.name??c.weapon)}<br><small>特技：${esc(c.skills.map(s=>s.name).join('・'))}</small></li>`).join('')}</ul>
      <p>プレイヤーのレベル・装備・固有スキル・永久強化は一切持ち込めません。</p>
    </details>
    <button class="wide-button action-main" data-arena-start="${q.id}">Lv${q.level}に挑戦する</button>
  </article>`;
 }).join('');
 const inventory=(state.equipmentInventory??[]).filter(x=>ARENA_EQUIPMENT[x.equipmentId]);
 const shop=Object.entries(ARENA_CRAFT_COSTS).map(([id,cost])=>{
  const gear=ARENA_EQUIPMENT[id],quote=arenaCraftQuote(state,id);
  return `<article class="arena-shop-item"><b>${esc(gear.name)}</b><small>必要Lv${gear.requiredLevel} / ${esc(gear.description)}</small><button data-arena-craft="${id}" ${quote.canCraft?'':'disabled'}>生産：${cost}枚</button></article>`;
 }).join('');
 const upgrades=inventory.map(inst=>{
  const def=ARENA_EQUIPMENT[inst.equipmentId],q=arenaEnhanceQuote(state,inst.instanceId);
  return `<article class="arena-shop-item"><b>${esc(def.name)} +${q.level}</b><small>自分の所持装備：${esc(inst.instanceId)}</small><button data-arena-enhance="${esc(inst.instanceId)}" ${q.canEnhance?'':'disabled'}>${q.maxed?'最大強化済み':`＋${q.next}へ強化：${q.cost}枚`}</button></article>`;
 }).join('');
 return `<section class="arena-view" data-no-pixel-icon>
   <button class="wide-button" data-arena-back>← 冒険へ戻る</button>
   <header class="panel arena-hero"><h2>🏟️ 闘技大会</h2><p>決められた強さ・編成・装備で挑む、腕試しの戦場。</p>
    <strong>🪙 闘技コイン ${n(progress.coins)}枚</strong>
    <small>経験値・ゴールド・持ち込み装備は無効 / 手動操作のみ / 100ターンまで</small></header>
   ${result}
   <section class="panel"><h3>🏆 ランク報酬</h3>${RANK_TABLE}<small>毎回のクリアで獲得。全滅・100ターン以内に倒せない場合は0枚。1戦につき報酬は1回だけ。</small></section>
   <div class="arena-quest-grid">${cards}</div>
   <section class="panel"><h3>🛠️ 闘技コイン工房</h3><p>通常の鍛冶素材・ゴールドでは生産・強化できません。装備は通常冒険で使用できます。</p>
    <div class="arena-shop-grid">${shop}</div>
    <h4>所持している闘技装備の強化</h4>
    <div class="arena-shop-grid">${upgrades||'<p>闘技装備はまだありません。</p>'}</div>
   </section>
 </section>`;
}
