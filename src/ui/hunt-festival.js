import { HUNT_FESTIVAL,FESTIVAL_WEAPONS,HUNT_FESTIVAL_BONUSES } from '../data/hunt-festival.js';
import { festivalPhase } from '../core/hunt-festival.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=n=>Number(n??0).toLocaleString('ja-JP');
export const festivalView={data:null,error:false,loading:false,debug:false,delivered:false,bonusDelivered:{},pending:0};

function milestoneAction(input,data,total,goal,known){
 const receipt=goal===HUNT_FESTIVAL.goal?data.receipt:data.bonusReceipts?.[String(goal)];
 const delivered=goal===HUNT_FESTIVAL.goal?input.delivered:input.bonusDelivered?.[goal];
 if(delivered)return '<span class="hunt-milestone-received">✓ 受取済み</span>';
 if(receipt)return goal===HUNT_FESTIVAL.goal
  ?'<button class="action-main" data-hunt-reward>受取を再開する</button>'
  :`<button class="action-main" data-hunt-bonus="${goal}">受取を再開する</button>`;
 if(!known||total<goal)return '<span class="hunt-milestone-locked">未達成</span>';
 if(!data.eligible)return '<span class="hunt-milestone-locked">討伐参加が必要</span>';
 if(goal!==HUNT_FESTIVAL.goal&&!input.delivered)return '<span class="hunt-milestone-locked">先に2,500体報酬を受け取ってください</span>';
 return goal===HUNT_FESTIVAL.goal
  ?'<button class="action-main" data-hunt-reward>報酬を受け取る</button>'
  :`<button class="action-main" data-hunt-bonus="${goal}">追加報酬を受け取る</button>`;
}
export function festivalMarkup(input=festivalView,now=Date.now()){
 if(now<HUNT_FESTIVAL.announce)return '';
 const data=input.data??input,total=Math.max(0,Number(data.total)||0),goal=HUNT_FESTIVAL.maxGoal;
 const phase=data.phase??festivalPhase(now);
 const known=Number.isFinite(data.total)||phase==='upcoming';
 const nextGoal=HUNT_FESTIVAL.milestones.find(g=>total<g);
 // The bar follows the next of five cumulative milestones through 100,000.
 // The progress bar follows the current milestone, not the completed first tier.
 const progressGoal=nextGoal??goal;
 const percent=Math.min(100,Math.floor(total/progressGoal*1000)/10);
 const stageIndex=nextGoal?HUNT_FESTIVAL.milestones.indexOf(nextGoal):HUNT_FESTIVAL.milestones.length;
 const stageMessage=phase==='ended'?'討伐期間終了':!known?'討伐記録を確認中':!nextGoal?'🎉 全5段階達成！':total>=HUNT_FESTIVAL.goal?`✅ 第${stageIndex}段階達成！ イベント継続中、次は${fmt(nextGoal)}体へ！`:`🎯 第1目標 ${fmt(nextGoal)}体に挑戦中！`;
 const nextReward=nextGoal===5000?'次の報酬：100万G ＋ オリハル2個':nextGoal===10000?'次の報酬：500万G ＋ オリハルコン2個':nextGoal===50000?'次の報酬：1,000万G ＋ オリハルコン5個 ＋ 強化結晶5個':nextGoal===100000?'次の報酬：3,000万G ＋ オリハルコン10個 ＋ 強化結晶10個':nextGoal===2500?'最初の報酬：共闘装備9部位一式':'全5段階の報酬が解放されています';
 const status=input.error?'討伐数を取得できません。通信回復後に更新されます。':phase==='upcoming'?'まずは2,500体！ 達成ごとに報酬を獲得できます。':!known?'みんなの討伐数を確認しています…':!nextGoal?'全5段階の目標達成！ ご参加ありがとうございます！':phase==='ended'?'ご参加ありがとうございました。':`次の目標 ${fmt(nextGoal)}体まであと ${fmt(Math.max(0,nextGoal-total))}体！ イベントは10月19日23:59まで開催中です。`;
 const milestones=HUNT_FESTIVAL.milestones.map(stage=>{
  const label=stage===2500?'共闘装備9部位一式':HUNT_FESTIVAL_BONUSES[stage].label;
  const achieved=known&&total>=stage;
  return `<div class="hunt-milestone ${achieved?'achieved':''}"><div class="hunt-milestone-copy"><strong>${fmt(stage)}体 ${achieved?'✓':''}</strong><small>${esc(label)}</small></div><div class="hunt-milestone-action">${milestoneAction(input,data,total,stage,known)}</div></div>`;
 }).join('');
 return `<section class="panel hunt-festival" id="hunt-festival"><div class="hunt-content"><div class="section-title"><h3>クロニクル大討伐祭</h3><span>${input.debug?'デバッグ：':''}${phase==='upcoming'?'開催予告':phase==='active'?'開催中':'討伐期間終了'}</span></div><p class="hunt-period">10月16日 0:00 ～ 10月19日 23:59（日本時間）</p><div class="hunt-raid-help"><b>⚔️ レイドボスは通常探索でランダム出現しません</b><span>毎日 18:00〜20:00・21:00〜24:00（日本時間）、フィールド画面の「レイドボスに挑戦」から参加できます（キャラクターLv10以上）。討伐済みの回は次の開催を待ってください。</span><small>大討伐祭は通常モンスターの討伐でも加算されます。レイドボスを探し続ける必要はありません。</small><button type="button" data-hunt-raid-guide>レイドの参加場所・ルールを見る</button></div><div class="hunt-stage-banner" aria-live="polite"><strong>${esc(stageMessage)}</strong><small>${esc(nextReward)}</small></div><div class="hunt-count"><strong>${known?fmt(total):'—'} <small>/ ${fmt(progressGoal)}体</small></strong><b>${known?percent+'%':'確認中'}</b></div><div class="hunt-track" role="progressbar" aria-label="全プレイヤーの合計討伐数・現在の目標" aria-valuemin="0" aria-valuemax="${progressGoal}" ${known?`aria-valuenow="${Math.min(progressGoal,total)}"`:''}><i style="width:${known?percent:0}%"></i></div><p class="hunt-status">${status}</p><p class="hunt-all-goals">🏆 第1目標 2,500体 → 第2目標 5,000体 → 第3目標 10,000体 → 第4目標 50,000体 → 最終目標 100,000体</p><div class="hunt-milestones" aria-label="累計討伐数の5段階達成報酬">${milestones}</div>${Number(input.pending)>0?`<p class="hunt-sync-pending">📡 未送信の討伐記録：${Math.floor(Number(input.pending))}件。通信回復後の更新で再送信します。</p>`:''}<div class="hunt-actions">${phase==='active'?'<button class="action-main" data-action="explore">討伐に出発</button>':''}<button data-hunt-details>報酬・参加方法</button><button data-hunt-refresh ${input.loading?'disabled':''}>更新</button></div>${input.debug?'<div class="hunt-debug"><button data-hunt-debug="upcoming">開催前</button><button data-hunt-debug="active">開催中</button><button data-hunt-debug="add">＋100体</button><button data-hunt-debug="achieved">目標達成</button><button data-hunt-debug="ended">終了後</button></div>':''}</div></section>`;
}
export function festivalDetailsMarkup(){
 return `<h2>クロニクル大討伐祭</h2><p>10月16日0:00〜10月19日23:59（日本時間）</p><p>「討伐に出発」から現在の地域を探索できます。全プレイヤーで合計<strong>2,500体・5,000体・10,000体・50,000体・100,000体</strong>の5段階目標を達成して報酬を獲得！ 期間中の通常戦闘・ボス・レイドが対象です。レイドボスは1体の討伐につき全体で1体として数えます。</p><h3>⚔️ レイドボスの出現場所と時間</h3><p><strong>レイドボスは通常の「探索する」では出現しません。</strong>毎日18:00〜20:00と21:00〜24:00（日本時間）の開催中に、<strong>フィールド画面上部の「レイドボスに挑戦」</strong>を押して参加してください。参加条件はキャラクターLv10以上です。討伐済みの場合、その開催回は終了し次の開催を待ちます。</p><p>大討伐祭への参加はレイド必須ではありません。通常の敵を倒すだけでもみんなの討伐数に加算されます。</p><p>討伐記録はサーバーに届いた順に反映されます。通信できない場合は端末内に一時保存し、次回の更新時に再送信します。反映まで時間がかかる場合があります。逃走した敵や敗北・図鑑再戦は対象外です。</p><h3>第1目標：2,500体達成</h3><p><strong>共闘装備9部位一式</strong>。選べる武器＋盾欄の護符・頭・体・腕・腰・足・指輪・チャーム。武器の主能力＋50、体の防御＋50など。ジョブLv1から装備可能です。</p><h3>第2目標：5,000体達成</h3><p><strong>💰 1,000,000G ＋ 🔷 オリハル2個</strong>。オリハルは鍛冶屋でレイド装備の生産に使用できます。</p><h3>第3目標：10,000体達成</h3><p><strong>💰 5,000,000G ＋ 💠 オリハルコン2個</strong>。オリハルコンは鍛冶屋でレイド装備の生産に使用できます。</p><h3>第4目標：50,000体達成</h3><p><strong>💰 10,000,000G ＋ 💠 オリハルコン5個 ＋ 💎 強化結晶5個</strong>。</p><h3>最終目標：100,000体達成</h3><p><strong>💰 30,000,000G ＋ 💠 オリハルコン10個 ＋ 💎 強化結晶10個</strong>。</p><p>期間中に1体以上の討伐に参加したプレイヤーが対象です。報酬は各段階につき1アカウント1回、同じセーブスロットへ付与します。追加報酬は最初に2,500体報酬を受け取ってから獲得できます。2,500体を達成してもイベントは終了せず、5,000体・10,000体・50,000体・100,000体の報酬に向けて討伐数が加算され続けます。達成済みの報酬はイベント終了後も受け取れます。</p>`;
}
export function festivalRewardMarkup(receipt){return `<h2>大討伐祭・2,500体達成報酬</h2><p>武器を1種類選んでください。防具・指輪・チャームも一緒に受け取れます。</p><p>受取後は武器とセーブスロットを変更できません。5,000体・10,000体・50,000体・100,000体の追加報酬も同じスロットに付与されます。</p>${receipt?`<p>SLOT ${Number(receipt.saveSlot)}：共闘の${esc(FESTIVAL_WEAPONS[receipt.weapon])}</p><button data-hunt-claim="${esc(receipt.weapon)}">受取を再開する</button>`:`<div class="hunt-weapons">${Object.entries(FESTIVAL_WEAPONS).map(([id,label])=>`<button data-hunt-claim="${id}">共闘の${label}</button>`).join('')}</div>`}`;}
export function festivalTitleMarkup(now=Date.now()){
 if(now<HUNT_FESTIVAL.announce||now>=HUNT_FESTIVAL.end)return '';
 return `<button class="title-event-notice hunt-title-notice" data-hunt-title-details aria-label="クロニクル大討伐祭のお知らせ"><img class="event-notice-banner" src="assets/events/chronicle-hunt-title-202610.webp" alt="黒魔道士と白魔道士のクロニクル大討伐祭バナー"><span><b>${now<HUNT_FESTIVAL.start?'📢 イベント実施のお知らせ':'🔥 クロニクル大討伐祭 開催中！'}</b><small>${now<HUNT_FESTIVAL.start?'10月16日より期間限定イベント開催！':'2,500体から最大100,000体まで、全5段階報酬！ 10/19 23:59まで'}</small><em class="title-event-cta">詳細を見る 〉</em></span></button>`;
}
