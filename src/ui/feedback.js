const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const FEEDBACK_TYPES={bug:'不具合・バグ',improvement:'改善・調整',feature:'新機能の提案',other:'その他のご意見'};
export const FEEDBACK_STATUSES={new:'受付済み',reviewing:'確認中',planned:'対応予定',in_progress:'修正作業中',fixed:'対応済み',declined:'見送り'};

export function feedbackFormMarkup(authorName='旅人'){
 return `<div class="feedback-box" data-no-pixel-icon>
 <h2>📮 ご意見BOX</h2>
 <p class="modal-sub">不具合の報告や改善のアイデアを開発者に届けられます。</p>
 <label class="feedback-label">プレイヤー名（自動入力）<input data-feedback-name type="text" value="${esc(String(authorName||'旅人').slice(0,40))}" readonly aria-readonly="true" maxlength="40"></label>
 <label class="feedback-label">お問い合わせ種類<select data-feedback-category>
  <option value="bug">不具合・バグ</option><option value="improvement">改善・調整</option><option value="feature">新機能の提案</option><option value="other">その他のご意見</option>
 </select></label>
 <label class="feedback-label">件名（2〜80文字）<input data-feedback-subject type="text" minlength="2" maxlength="80" placeholder="例：洞窟の報酬が受け取れない" required></label>
 <label class="feedback-label">内容（10〜1,500文字）<textarea data-feedback-message rows="7" minlength="10" maxlength="1500" placeholder="不具合の場合は、どこで・何をしたら・どうなったかを教えてください。" required></textarea></label>
 <p class="feedback-hint">プレイヤー名は主人公の名前から自動設定されます。パスワード・メールアドレスなどの個人情報は書かないでください。投稿は1時間3件、1日10件まで。送信内容は公開されません。</p>
 <p class="feedback-error" data-feedback-error role="alert"></p>
 <div class="feedback-actions"><button class="action-main" data-feedback-submit>送信する</button><button data-feedback-mine>自分の投稿履歴</button><button data-close-modal>閉じる</button></div></div>`;
}
export function feedbackSentMarkup(receipt){
 return `<div class="feedback-box" data-no-pixel-icon><h2>📬 ご意見を受け付けました！</h2><p>開発者が内容を確認します。対応内容や時期は、内容に応じて判断します。</p>${receipt?.subject?`<p>件名：<strong>${esc(receipt.subject)}</strong></p>`:''}<p class="feedback-receipt">受付番号：${esc(receipt?.id??'')}</p><div class="feedback-actions"><button class="action-main" data-feedback-mine>受付状況を見る</button><button data-feedback-open>別のご意見を送る</button><button data-close-modal>閉じる</button></div></div>`;
}
export function feedbackHistoryMarkup(items=[]){
 const entries=Array.isArray(items)?items:[];
 return `<div class="feedback-box" data-no-pixel-icon><h2>📋 自分の投稿履歴</h2><p class="modal-sub">このアカウント・セーブスロットから送信した最近20件です。内容はほかのプレイヤーには見えません。</p><div class="feedback-history">${entries.length?entries.map(item=>`<article class="feedback-history-entry"><div class="feedback-history-head"><strong>${esc(FEEDBACK_TYPES[item.category]??'ご意見')}</strong><span>${esc(FEEDBACK_STATUSES[item.status]??item.status)}</span></div><small>${esc(formatFeedbackDate(item.createdAt))}</small><div class="feedback-history-subject">${esc(item.subject||'（件名なし・旧投稿）')}</div><p>${esc(item.message)}</p></article>`).join(''):'<p>まだ投稿はありません。</p>'}</div><div class="feedback-actions"><button class="action-main" data-feedback-open>新しく投稿する</button><button data-close-modal>閉じる</button></div></div>`;
}
function formatFeedbackDate(value){const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date);}
