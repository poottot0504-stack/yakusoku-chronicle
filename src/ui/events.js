import { HALLOWEEN_EVENT, TRAINING_FESTIVAL, TWIN_STAR_FESTIVAL } from '../data/events.js';
import { getHalloweenStatus, getTrainingFestivalStatus, getTwinStarFestivalStatus } from '../core/events.js';
import { raidAnnouncementMarkup } from './raid.js';
import { ECLIPSE_EVENT } from '../data/eclipse-2026.js';
import { getEclipseEventStatus } from '../core/events.js';

export function getTrueEndingSequence(){return ['真ラスボスを倒した。','長い旅の果て、約束は果たされた。','なんだ…夢か…もう一回寝よう…'];}

// Title promotion for the two special jobs released on 2026-10-20 (JST).
// Archer and Sniper release restrictions are still independently managed in core/job-release.js.
export const DRAGOON_SUMMONER_TITLE_AT = Date.parse('2026-10-19T15:00:00Z');
export function jobReleaseNoticeMarkup(now=Date.now()){
 if(Number(now)<DRAGOON_SUMMONER_TITLE_AT)return '';
 return `<button class="title-event-notice job-release-notice is-active" data-job-release-notice aria-label="新ジョブ追加！ 竜騎士＆召喚士 解放！"><span><b>新ジョブ追加！</b><small>竜騎士＆召喚士 解放！</small></span></button>`;
}
export function jobReleaseDetailsMarkup(){
 return `<div class="event-details job-release-details"><h2>🐉🔮 新ジョブ追加！ 竜騎士＆召喚士</h2><p class="event-period">2026年10月20日より解放！</p><h3>🐉 竜騎士</h3><p>槍を操る攻撃・素早さ重視の特殊ジョブ。「竜牙突き」「雷竜の急降下」「竜王の咆哮」などの特技を習得。固有パッシブ「竜槍の極意」で攻撃力を高めます。</p><p><b>転職条件：パラディンのジョブLv30以上</b></p><h3>🔮 召喚士</h3><p>幻獣の力で多彩な属性魔法を使う特殊ジョブ。イフリート、シヴァ、ラムウ、フェニックス、バハムートなどを召喚。固有パッシブ「幻獣との盟約」で魔法力を高めます。</p><p><b>転職条件：黒魔術師のジョブLv30以上</b></p><p>それぞれの専用武器・防具・指輪・チャームは鍛冶屋で生産できます。</p></div>`;
}

// The announcement is a title-only promotion; it does not unlock event battles.
export function eclipseEventNoticeMarkup(now=Date.now()){
 const status=getEclipseEventStatus(now);
 if(!status.announced)return '';
 return `<button class="title-event-notice eclipse-event-notice ${status.active?'is-active':''}" data-eclipse-event-notice aria-label="星蝕の異界門・ハロウィン特別編の開催案内と詳細を表示"><img class="event-notice-banner" src="${ECLIPSE_EVENT.banner}" alt="星蝕の異界門 ハロウィン特別編 10月31日0時から11月1日23時59分"><span><b>${status.active?'🌌 星蝕の異界門 開催期間中！':'📢 10月31日より新イベント開催！'}</b><small>10/31 0:00 ～ 11/1 23:59（日本時間）</small><em class="title-event-cta">イベント詳細を見る 〉</em></span></button>`;
}

export function eclipseEventDetailsMarkup(now=Date.now()){
 const active=getEclipseEventStatus(now).active;
 return `<div class="event-details eclipse-event-details"><img class="event-detail-banner" src="${ECLIPSE_EVENT.banner}" alt="星蝕の異界門 ハロウィン特別編の開催案内"><h2>🌌 星蝕の異界門 ～ハロウィン特別編～</h2><p class="event-period">開催期間：2026年10月31日 0:00 ～ 11月1日 23:59（日本時間）</p><div class="event-benefits"><p><b>⚔️ 新たな異界のモンスターが登場予定！</b></p><p>🌘 星蝕の欠片・異界の魔石・亡霊の霊布・虚星の結晶・ノクスの心核の5つの限定素材を集めよう。</p><p>🎁 新たな武器16系統・防具6部位・指輪・チャーム。ランクⅠ・Ⅱの<b>限定装備48種類</b>が登場！</p><p>✨ 星蝕装備はすべて<b>ⅠはジョブLv1、ⅡはジョブLv50から装備可能</b>。強化しても必要ジョブLvは上がりません。職業ごとの武器制限は通常どおりです。</p><p>🔨 集めた素材は鍛冶屋のイベント装備で利用可能。<b>イベント終了後も生産できます。</b></p></div><p class="notice">${active?'🌌 イベント開催中！冒険画面から全3戦に挑戦できます。各戦で素材獲得、3戦目のノクス討伐で「ノクスの心核」を確定入手！':'📢 10月28日0時からの事前告知です。イベント開始は10月31日0時（日本時間）。開催期間前には挑戦できません。'}</p></div>`;
}

export function titleEventNoticeMarkup(now=Date.now()){
 const halloweenStatus=getHalloweenStatus(now),trainingStatus=getTrainingFestivalStatus(now);
 let notices='',trainingNotice='';
 if(halloweenStatus.announced){const active=halloweenStatus.active;notices+=`<button class="title-event-notice ${active?'is-active':''}" data-event-notice><img class="event-notice-banner" src="${HALLOWEEN_EVENT.banner}" alt="ハロウィンイベント 幻月祭"><span><b>${active?'🔥 イベント期間中！！':'📢 イベント実施のお知らせ'}</b><small>${active?'10/5 23:59まで開催中！':'10月3日より期間限定イベント開催！'}</small><em class="title-event-cta">詳細を見る 〉</em></span></button>`;}
 if(trainingStatus.announced){const active=trainingStatus.active;trainingNotice+=`<button class="title-event-notice training-festival-notice ${active?'is-active':''}" data-training-event-notice><img class="event-notice-banner" src="${TRAINING_FESTIVAL.banner}" alt="英雄の修練祭 ジョブ経験値2倍"><span><b>${active?'🔥 英雄の修練祭 開催中！':'📢 10月10日より開催！'}</b><small>${active?'ジョブ経験値2倍！ 10/12 23:59まで':'ジョブ経験値2倍イベント「英雄の修練祭」開催！'}</small><em class="title-event-cta">詳細を見る 〉</em></span></button>`;}
 return eclipseEventNoticeMarkup(now)+trainingNotice+twinStarFestivalNoticeMarkup(now)+raidAnnouncementMarkup(now)+notices+jobReleaseNoticeMarkup(now);
}
export function halloweenEventDetailsMarkup(){return `<div class="event-details"><img class="event-detail-banner" src="${HALLOWEEN_EVENT.banner}" alt="ハロウィンイベント 幻月祭"><h2>🎃 幻月祭 ～パンプキンキングの夜～</h2><p class="event-period">開催期間：2026年10月3日 0:00 ～ 10月5日 23:59（JST）</p><div class="event-benefits"><p>⭐ <b>キャラクター経験値2倍</b></p><p>🎁 <b>イベント期間中はアイテムドロップ率1.5倍</b></p><p>⚔️ 全3連戦。<b>戦闘メンバーの最高Lv30以上：敵Lvは最高Lv＋3／＋4／＋5（全3戦）、HP・MP・攻撃・防御・魔法・素早さ2倍。最高Lv30未満は通常設定。</b></p><p>🔁 期間中は何度でも挑戦可能</p><p>🎃 限定素材からハロウィン装備 I / II / III を生産可能</p></div><p class="notice">イベント終了後も、入手済み素材と解放済みハロウィン装備レシピは残ります。</p></div>`;}
export function trainingFestivalDetailsMarkup(){
 return `<div class="event-details training-festival-details"><img class="event-detail-banner" src="${TRAINING_FESTIVAL.banner}" alt="英雄の修練祭 ジョブ経験値2倍"><h2>⚔️ 英雄の修練祭</h2><p class="event-period">開催期間：2026年10月10日 0:00 ～ 10月12日 23:59（JST）</p><div class="event-benefits"><p>🔥 <b>ジョブ経験値2倍</b></p><p>⚔️ <b>3連戦！</b></p><p>🎁 <b>ドロップ率${TRAINING_FESTIVAL.dropRateMultiplier}倍！</b></p><p>🌿 <b>回復アイテムのドロップなし！</b></p><p>⚖️ バランス調整済み：戦闘メンバーの最高Lv30以上では、敵Lvは最高Lv／＋1／＋2。HP・MPは1.2倍、攻撃・防御・魔法・素早さは1.15倍。最高Lv30未満はさらに弱めの設定。</p><p>🔁 期間中は何度でも挑戦可能</p></div><p class="notice">イベントクエストは10月10日 0:00（日本時間）に解放されます。開催前は参加できません。</p></div>`;
}
export function eventQuestMarkup(state,now=Date.now()){
 if(getEclipseEventStatus(now).active)return `<section class="panel halloween-event-panel eclipse-event-panel"><button class="event-banner-button" data-eclipse-event-notice aria-label="星蝕の異界門のイベント詳細"><img src="${ECLIPSE_EVENT.banner}" alt="星蝕の異界門・ハロウィン特別編"></button><div class="section-title"><h3>🌌 星蝕の異界門</h3><span>11/1 23:59まで</span></div><div class="event-quest-copy"><strong>全3連戦！ 最終ボス「星蝕の支配者・ノクス」</strong><p>星蝕の欠片、異界の魔石、亡霊の霊布、虚星の結晶などを集めて限定装備を生産！</p><div class="event-tags"><span>⚔️ 3連戦</span><span>🎁 各戦で素材確定</span><span>🌑 ノクスの心核 1個確定</span><span>🔁 何度でも挑戦可能</span></div></div><button class="action-main event-start-button" data-eclipse-event-start>🌌 異界門に挑戦する</button></section>`;
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
