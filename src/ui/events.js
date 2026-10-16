import { HALLOWEEN_EVENT, TRAINING_FESTIVAL, TWIN_STAR_FESTIVAL } from '../data/events.js';
import { getHalloweenStatus, getTrainingFestivalStatus, getTwinStarFestivalStatus } from '../core/events.js';
import { getJobReleaseStatus } from '../core/job-release.js';
import { raidAnnouncementMarkup } from './raid.js';

export function getTrueEndingSequence(){return ['真ラスボスを倒した。','長い旅の果て、約束は果たされた。','なんだ…夢か…もう一回寝よう…'];}

export function jobReleaseNoticeMarkup(now=Date.now()){
 const status=getJobReleaseStatus(now);if(!status.announced)return '';
 return `<button class="title-event-notice job-release-notice ${status.released?'is-active':''}" data-job-release-notice><span><b>${status.released?'新ジョブ実装！':'新ジョブ追加予告！'}</b><small>${status.released?'アーチャー＆スナイパー解放！':'10月13日 新ジョブ解放！'}</small></span></button>`;
}
export function jobReleaseDetailsMarkup(now=Date.now()){
 const released=getJobReleaseStatus(now).released;
 return `<div class="event-details job-release-details"><h2>${released?'新ジョブ実装！':'新ジョブ追加予告！'}</h2><p class="event-period">${released?'2026年10月13日 0:00より解放！':'実装日：2026年10月13日 0:00'}</p><h3>新ジョブ　アーチャーを追加！</h3><p>素早さを活かした連続攻撃が得意な遠距離物理アタッカー。「二連射」「三連射」「神速連射」などの連続攻撃に加え、「五月雨撃ち」「アローレイン」で複数の敵にも対応。「鷹の眼」で攻撃力と会心率を高め、強烈な一撃を狙えます。</p><h3>さらに、上位職のスナイパーも追加！</h3><p>アーチャーをさらに単体火力・会心攻撃に特化させた上位職。「アーマーピアス」「バイタルブレイク」で敵の防御を崩し、「ホークアイ」で自身を強化。最終特技「ラスト・バレット」は強力な会心攻撃を狙える最大の一撃です。</p><p><b>転職条件：アーチャー Job Lv30以上</b></p><p>新武器「弓」と、アーチャー・スナイパー向けの武器・防具・指輪・チャームも追加します。</p></div>`;
}


export function titleEventNoticeMarkup(now=Date.now()){
 const halloweenStatus=getHalloweenStatus(now),trainingStatus=getTrainingFestivalStatus(now);
 let notices='',trainingNotice='';
 if(halloweenStatus.announced){const active=halloweenStatus.active;notices+=`<button class="title-event-notice ${active?'is-active':''}" data-event-notice><img class="event-notice-banner" src="${HALLOWEEN_EVENT.banner}" alt="ハロウィンイベント 幻月祭"><span><b>${active?'🔥 イベント期間中！！':'📢 イベント実施のお知らせ'}</b><small>${active?'10/5 23:59まで開催中！':'10月3日より期間限定イベント開催！'}</small><em class="title-event-cta">詳細を見る 〉</em></span></button>`;}
 if(trainingStatus.announced){const active=trainingStatus.active;trainingNotice+=`<button class="title-event-notice training-festival-notice ${active?'is-active':''}" data-training-event-notice><img class="event-notice-banner" src="${TRAINING_FESTIVAL.banner}" alt="英雄の修練祭 ジョブ経験値2倍"><span><b>${active?'🔥 英雄の修練祭 開催中！':'📢 10月10日より開催！'}</b><small>${active?'ジョブ経験値2倍！ 10/12 23:59まで':'ジョブ経験値2倍イベント「英雄の修練祭」開催！'}</small><em class="title-event-cta">詳細を見る 〉</em></span></button>`;}
 return trainingNotice+twinStarFestivalNoticeMarkup(now)+raidAnnouncementMarkup(now)+notices+jobReleaseNoticeMarkup(now);
}
export function halloweenEventDetailsMarkup(){return `<div class="event-details"><img class="event-detail-banner" src="${HALLOWEEN_EVENT.banner}" alt="ハロウィンイベント 幻月祭"><h2>🎃 幻月祭 ～パンプキンキングの夜～</h2><p class="event-period">開催期間：2026年10月3日 0:00 ～ 10月5日 23:59（JST）</p><div class="event-benefits"><p>⭐ <b>キャラクター経験値2倍</b></p><p>🎁 <b>イベント期間中はアイテムドロップ率1.5倍</b></p><p>⚔️ 全3連戦。<b>戦闘メンバーの最高Lv30以上：敵Lvは最高Lv＋3／＋4／＋5（全3戦）、HP・MP・攻撃・防御・魔法・素早さ2倍。最高Lv30未満は通常設定。</b></p><p>🔁 期間中は何度でも挑戦可能</p><p>🎃 限定素材からハロウィン装備 I / II / III を生産可能</p></div><p class="notice">イベント終了後も、入手済み素材と解放済みハロウィン装備レシピは残ります。</p></div>`;}
export function trainingFestivalDetailsMarkup(){
 return `<div class="event-details training-festival-details"><img class="event-detail-banner" src="${TRAINING_FESTIVAL.banner}" alt="英雄の修練祭 ジョブ経験値2倍"><h2>⚔️ 英雄の修練祭</h2><p class="event-period">開催期間：2026年10月10日 0:00 ～ 10月12日 23:59（JST）</p><div class="event-benefits"><p>🔥 <b>ジョブ経験値2倍</b></p><p>⚔️ <b>3連戦！</b></p><p>🎁 <b>ドロップ率${TRAINING_FESTIVAL.dropRateMultiplier}倍！</b></p><p>🌿 <b>回復アイテムのドロップなし！</b></p><p>⚖️ バランス調整済み：戦闘メンバーの最高Lv30以上では、敵Lvは最高Lv／＋1／＋2。HP・MPは1.2倍、攻撃・防御・魔法・素早さは1.15倍。最高Lv30未満はさらに弱めの設定。</p><p>🔁 期間中は何度でも挑戦可能</p></div><p class="notice">イベントクエストは10月10日 0:00（日本時間）に解放されます。開催前は参加できません。</p></div>`;
}
export function eventQuestMarkup(state,now=Date.now()){
 if(getTwinStarFestivalStatus(now).active)return `<section class="panel halloween-event-panel"><button class="event-banner-button" data-twin-star-event-notice aria-label="双星の成長祭の詳細"><img src="${TWIN_STAR_FESTIVAL.banner}" alt="双星の成長祭 キャラ経験値・ジョブ経験値2倍"></button><div class="section-title"><h3>双星の成長祭</h3><span>10/26 23:59まで</span></div><div class="event-quest-copy"><strong>キャラ経験値・ジョブ経験値がそれぞれ2倍！</strong><p>全3連戦。期間中は何度でも挑戦できます。</p></div><button class="action-main event-start-button" data-twin-star-festival-start>双星の成長祭に挑戦</button></section>`;

 if(getTrainingFestivalStatus(now).active)return `<section class="panel halloween-event-panel"><button class="event-banner-button" data-training-event-notice aria-label="英雄の修練祭"><img src="${TRAINING_FESTIVAL.banner}" alt="英雄の修練祭 ジョブ経験値2倍"></button><div class="section-title"><h3>⚔️ 英雄の修練祭</h3><span>10/12 23:59まで</span></div><div class="event-quest-copy"><strong>⚔️ ジョブ経験値2倍イベント</strong><div class="event-tags"><span>⚔️ ジョブ経験値2倍</span><span>🎁 ドロップ率${TRAINING_FESTIVAL.dropRateMultiplier}倍</span><span>🌿 回復アイテムのドロップなし</span><span>🔁 周回可能</span></div></div><button class="action-main event-start-button" data-training-festival-start>⚔️ 修練祭に挑戦</button></section>`;
 if(!getHalloweenStatus(now).active)return '';
 return `<section class="panel halloween-event-panel"><button class="event-banner-button" data-event-notice aria-label="イベント詳細を見る"><img src="${HALLOWEEN_EVENT.banner}" alt="ハロウィンイベント 幻月祭"></button><div class="section-title"><h3>🎃 期間限定イベントクエスト</h3><span>10/5 23:59まで</span></div><div class="event-quest-copy"><strong>幻月祭・パンプキンキング討伐</strong><p>全3連戦。最終ボスLvはパーティー平均Lv+5です。</p><div class="event-tags"><span>⭐ キャラクター経験値2倍</span><span>🎁 ドロップ率1.5倍</span><span>🔁 周回可能</span></div></div><button class="action-main event-start-button" data-halloween-start>🎃 イベントクエストに挑戦</button></section>`;
}

export function twinStarFestivalNoticeMarkup(now=Date.now()){
 const status=getTwinStarFestivalStatus(now);if(!status.announced)return '';
 return `<button class="title-event-notice training-festival-notice ${status.active?'is-active':''}" data-twin-star-event-notice><img class="event-notice-banner" src="${TWIN_STAR_FESTIVAL.banner}" alt="双星の成長祭 キャラ経験値・ジョブ経験値2倍"><span><b>${status.active?'双星の成長祭 開催中！':'10月23日より「双星の成長祭」開催！'}</b><small>キャラ経験値2倍 ＆ ジョブ経験値2倍！</small><small>10/23 0:00 ～ 10/26 23:59（日本時間）</small><em class="title-event-cta">詳細を見る 〉</em></span></button>`;
}
export function twinStarFestivalDetailsMarkup(){
 return `<div class="event-details training-festival-details"><img class="event-detail-banner" src="${TWIN_STAR_FESTIVAL.banner}" alt="双星の成長祭"><h2>双星の成長祭</h2><p class="event-period">開催期間：2026年10月23日 0:00 ～ 10月26日 23:59（JST）</p><div class="event-benefits"><p><b>キャラクター経験値2倍 ＆ ジョブ経験値2倍</b></p><p>専用クエストの全3戦で、それぞれの経験値が2倍になります。</p><p>修練祭の達人たちに挑む全3連戦。戦闘メンバーの最高Lv30以上：敵Lvは最高Lv＋3／＋4／＋5（全3戦）、HP・MP・攻撃・防御・魔法・素早さ2倍。最高Lv30未満は通常設定。</p><p>期間中は何度でも挑戦可能。冒険画面から参加できます。</p></div><p class="notice">クエストは10月23日 0:00（日本時間）に解放されます。通常戦闘・レイドの経験値は変更されません。</p></div>`;
}
