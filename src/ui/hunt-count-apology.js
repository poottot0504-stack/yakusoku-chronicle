import {canReceiveHuntCountApology,isHuntCountApologyDelivered} from '../core/hunt-count-apology.js';

export function huntCountApologyNpcMarkup(state,status,slot){
 if(!status?.eligible)return '';
 if(status.claimed && (Number(status.saveSlot)!==Number(slot) || isHuntCountApologyDelivered(state,status)))return '';
 return `<section class="panel npc-section hunt-count-apology-npc" data-no-pixel-icon><div class="section-title"><h3>📮 イベントのお詫び</h3><span>全プレイヤー対象</span></div><div class="npc-grid"><button class="npc-card" data-hunt-count-apology-npc><span>🎁</span><strong>お詫びの案内人</strong><small>クロニクル運営局</small><em>💎 強化結晶5個のお届け物</em></button></div></section>`;
}

export function huntCountApologyLoadingMarkup(){
 return '<section class="npc-dialogue hunt-count-apology-dialogue" data-no-pixel-icon><h2>🎁 お詫びの案内人</h2><p>受け取り状況を確認しています……</p></section>';
}

export function huntCountApologyDialogueMarkup(state,status,slot){
 if(!status?.eligible)return '<section class="npc-dialogue" data-no-pixel-icon><h2>🎁 お詫びの案内人</h2><p>運営サーバーとの通信に失敗しました。</p><button data-hunt-count-apology-npc>もう一度確認する</button></section>';
 if(status.claimed && Number(status.saveSlot)!==Number(slot))return '<section class="npc-dialogue"><h2>🎁 お詫びの案内人</h2><p>お詫び品は別のセーブデータで受け取り済みです。</p></section>';
 if(status.claimed && isHuntCountApologyDelivered(state,status))return '<section class="npc-dialogue"><h2>🎁 お詫びの案内人</h2><p>強化結晶5個はすでにお渡ししました。</p></section>';
 const capacity=canReceiveHuntCountApology(state);
 return `<section class="npc-dialogue hunt-count-apology-dialogue" data-no-pixel-icon>
  <h2>🎁 お詫びの案内人</h2>
  <p>「クロニクル大討伐祭で、討伐数が正しくカウントされない不具合が発生しておりました。ご迷惑をおかけし、申し訳ございません。」</p>
  <p>「お詫びとして、すべての冒険者の皆様にこちらの品をお贈りします。」</p>
  <article class="npc-quest"><h3>💎 強化結晶 ×5個</h3><p>装備の強化に使える鍛冶素材です。</p><p class="notice">1アカウントにつき1回だけ受け取れます。受け取ると案内人は街から姿を消します。</p>
  ${capacity?'<button class="action-main" data-hunt-count-apology-claim>強化結晶5個を受け取る</button>':'<p class="notice">⚠ 強化結晶の所持数が多いため、5個分の空きを作ってから受け取ってください。</p><button data-hunt-count-apology-npc>受取状況を再確認</button>'}
  </article></section>`;
}
