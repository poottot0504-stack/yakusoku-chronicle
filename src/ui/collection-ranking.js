import { COLLECTION_EVENT_202611 } from '../data/collection-event-202611.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const integer=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const fmt=value=>integer(value).toLocaleString('ja-JP');
export const COLLECTION_RANKING_PAGE_SIZE=50;

export function collectionRankingTitleButton(now=Date.now()){
 // The completed event remains viewable as an archive after Nov 16.
 if(now<COLLECTION_EVENT_202611.startsAt)return '';
 return '<button class="title-event-notice" data-collection-ranking-open aria-label="討伐の証争奪戦の全体ランキングを見る"><span><b>🏆 討伐の証争奪戦・全員公開ランキング</b><small>プレイヤー全員の順位と討伐の証の数を見る</small><em class="title-event-cta">ランキングを見る 〉</em></span></button>';
}

// PUBLIC display contract only: rank, displayName, count.
// Never render identifiers, anti-cheat investigation status, email, IP or audit evidence.
export function collectionRankingMarkup(input={},now=Date.now()){
 const phase=now<COLLECTION_EVENT_202611.startsAt?'upcoming':now<COLLECTION_EVENT_202611.endsAt?'active':'ended';
 const page=Number.isSafeInteger(input.page)&&input.page>=1?input.page:1;
 const total=integer(input.totalParticipants);
 const rows=Array.isArray(input.rows)?input.rows:[];
 const hasNext=page*COLLECTION_RANKING_PAGE_SIZE<total;
 const myRank=Number.isSafeInteger(input.myRank)&&input.myRank>=1?input.myRank:null;
 const myCount=integer(input.myCount);
 const entries=rows.slice(0,COLLECTION_RANKING_PAGE_SIZE).map(entry=>{
  const rank=integer(entry?.rank),count=integer(entry?.count);
  const displayName=String(entry?.displayName??'旅人').slice(0,40);
  if(rank<1)return '';
  return `<li class="collection-ranking-entry"><span class="collection-ranking-place">${rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':`#${fmt(rank)}`}</span><strong>${esc(displayName)}</strong><span class="collection-ranking-total">${fmt(count)}個</span></li>`;
 }).join('');
 const summary=phase==='upcoming'?'11月6日 0:00からランキングが始まります。':
   input.loading?'ランキングを取得しています…':
   input.error?'通信エラー：ランキングを取得できませんでした。':
   !rows.length?'まだランキングデータがありません。':'サーバーで検証された討伐の証の数で集計しています。';
 const own=phase==='upcoming'?'':myRank===null?'':`<p class="collection-ranking-me">あなたの順位：<b>${fmt(myRank)}位</b> ／ 討伐の証 <b>${fmt(myCount)}個</b></p>`;
 const rewardStatus=input.rewardLoading?'受取状況を確認中…':
  input.rewardError?'報酬情報を取得できませんでした。再読み込みしてください。':
  !input.rewardFinalized?'最終順位の確定・記録の確認後に報酬を受け取れます。':
  input.rewardDelivered?'✅ 報酬は受取済みです。':
  input.rewardReceipt?'未完了の報酬受取を再開できます。':
  input.rewardClaimable?'🎁 あなたのランキング報酬を受け取れます！':'報酬の受取対象ではないか、現在確認中です。';
 const rewardButton=phase==='ended'&&!input.rewardDelivered&&(input.rewardClaimable||input.rewardReceipt)?
  '<button class="action-main" data-collection-reward-claim>報酬を受け取る</button>':'';
 const rewardPanel=phase==='ended'?`<section class="collection-ranking-reward" aria-label="ランキング報酬"><h3>🎁 ランキング報酬</h3><p role="status">${esc(rewardStatus)}</p>${rewardButton}<button data-collection-reward-refresh ${input.rewardLoading?'disabled':''}>受取状況を確認</button></section>`:'';
 const controls=phase==='upcoming'?'':`<div class="collection-ranking-actions"><button data-collection-ranking-page="${page-1}" ${page===1||input.loading?'disabled':''}>前へ</button><span>${fmt(page)}ページ / 参加者 ${fmt(total)}人</span><button data-collection-ranking-page="${page+1}" ${!hasNext||input.loading?'disabled':''}>次へ</button><button data-collection-ranking-refresh ${input.loading?'disabled':''}>更新</button></div>`;
 return `<section class="collection-ranking" data-no-pixel-icon><h2>🏆 討伐の証争奪戦・公開ランキング</h2><p>11月6日 0:00 ～ 11月16日 23:59（日本時間）</p><p>通常ダンジョンのモンスター1体につき討伐の証1個。全プレイヤーが閲覧できます。</p><p role="status">${esc(summary)}</p>${own}<ol class="collection-ranking-list" aria-label="みんなの討伐の証ランキング">${entries}</ol>${controls}${rewardPanel}<p class="notice">表示は公開用のプレイヤー名・順位・証の個数のみ。不正調査情報や個人情報は表示しません。記録の確定まで順位が変わる場合があります。</p><button data-close-modal>閉じる</button></section>`;
}
