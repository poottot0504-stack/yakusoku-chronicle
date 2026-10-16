export function rankingApologyNpcCardMarkup(state={}){
  if(state?.rankingApologyEligible!==true||state?.rankingApologyReceived)return '';
  return `<section class="panel npc-section ranking-apology-npc"><div class="section-title"><h3>🎁 運営からのお知らせ</h3><span>お詫び配布</span></div><div class="npc-grid"><button class="npc-card" data-ranking-apology-npc><span>📨</span><strong>運営からの使者</strong><small>クロニクル運営局</small><em>🎁 お届け物があります</em></button></div></section>`;
}

export function rankingApologyLoadingMarkup(){
  return `<section class="npc-dialogue ranking-apology-dialogue"><h2>📨 運営からの使者</h2><p>配布対象を確認しています……</p></section>`;
}

export function rankingApologyConversationMarkup(status={}){
  if(status.error)return `<section class="npc-dialogue ranking-apology-dialogue"><h2>📨 運営からの使者</h2><p>「申し訳ありません。運営局との通信がうまくいかないようです。」</p><p class="notice">時間をおいて、もう一度お試しください。</p><button data-ranking-apology-npc>もう一度確認する</button></section>`;
  if(!status.eligible)return `<section class="npc-dialogue ranking-apology-dialogue"><h2>📨 運営からの使者</h2><p>「ランキング機能廃止に伴うお詫び品をお届けしています。」</p><p class="notice">今回の配布対象は、お知らせ時点ですでに約束のクロニクルを遊んでいた冒険者です。</p><p>「申し訳ありませんが、今回はお渡しできる品がありません。」</p></section>`;
  if(status.claimed)return `<section class="npc-dialogue ranking-apology-dialogue"><h2>📨 運営からの使者</h2><p>「ランキング機能廃止のお詫びとしてお預かりしていた品ですね。」</p><p class="notice">✅ 星晶の指輪はすでにお渡ししています。</p><p>「これからも、約束のクロニクルをよろしくお願いいたします。」</p></section>`;
  return `<section class="npc-dialogue ranking-apology-dialogue"><h2>📨 運営からの使者</h2><p>「ランキング機能廃止のお詫びとして、本来ランキング1位の報酬として予定していた品を、対象の冒険者の皆様へお贈りします。」</p><article class="npc-quest"><h3>💍 星晶の指輪</h3><p>星晶の輝きを宿した特別な指輪。</p><p><b>効果：</b>攻撃・防御・魔法・素早さ +10</p><p class="notice">1プレイヤーにつき1回だけ受け取れます。</p><button class="action-main" data-ranking-apology-claim>星晶の指輪を受け取る</button></article></section>`;
}
