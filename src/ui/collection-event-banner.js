import { COLLECTION_EVENT_202611 as EVENT } from '../data/collection-event-202611.js';

// Announce on Nov 4 at 00:00 JST; cease promoting after the event closes.
export function collectionBannerPhase(now=Date.now()){
 const t=Number(now);
 if(t<EVENT.announceAt)return 'hidden';
 if(t<EVENT.startsAt)return 'announcement';
 if(t<EVENT.endsAt)return 'active';
 return 'ended';
}
export function nextCollectionBannerBoundary(now=Date.now()){
 return [EVENT.announceAt,EVENT.startsAt,EVENT.endsAt].find(t=>t>now)??Infinity;
}
export function collectionEventBannerMarkup(now=Date.now()){
 const phase=collectionBannerPhase(now);
 if(phase==='hidden'||phase==='ended')return '';
 const headline=phase==='announcement'?'📢 11月6日開幕！ 討伐の証争奪戦':'🏆 討伐の証争奪戦 開催中！';
 return `<button type="button" class="title-event-notice collection-event-title-banner" data-collection-event-details aria-label="討伐の証争奪戦のイベント告知を見る"><img class="collection-event-banner-img" src="${EVENT.banner}" alt="約束のクロニクル ランキングイベント 討伐の証争奪戦 11月6日〜11月16日"><span class="collection-event-banner-label"><b>${headline}</b><small>通常モンスター1体につき討伐の証1個・全員公開ランキング</small><em class="title-event-cta">イベント詳細を見る 〉</em></span></button>`;
}
export function collectionEventDetailsMarkup(){
 return `<section class="collection-event-details" data-no-pixel-icon><img class="collection-event-details-img" src="${EVENT.banner}" alt="討伐の証争奪戦・11月6日〜11月16日"><h2>🏆 討伐の証争奪戦</h2><p>2026年11月6日0:00〜11月16日23:59（日本時間）</p><p>通常ダンジョンのモンスターを倒すと、1体につき必ず<strong>討伐の証1個</strong>を獲得！サーバーで確認された獲得数を競います。</p><p>ランキングは全員公開。イベント終了後の集計・確認が完了したら、順位に応じた報酬を<strong>「報酬を受け取る」</strong>ボタンから受け取れます。報酬は1アカウント1回です。</p><p>1位：オリハルコン5個・オリハル5個・5,000万G・キャラ経験値2倍の書5個・ジョブ経験値2倍の書5個。</p><div class="hunt-actions"><button data-collection-ranking-open>🏆 みんなのランキング</button><button data-close-modal>閉じる</button></div></section>`;
}
