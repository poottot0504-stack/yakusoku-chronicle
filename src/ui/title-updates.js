import { TITLE_UPDATES } from '../data/title-updates.js';

function escapeMarkup(value){
 return String(value??'').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

/** タイトルの表示は簡潔に。詳細はタップした人だけが開ける。 */
export function titleUpdatesMarkup(open=false,page=1){
 const index=Math.max(0,Math.min(TITLE_UPDATES.length-1,Math.trunc(Number(page)||1)-1));
 const update=TITLE_UPDATES[index];
 if(!update)return '';
 const dateLabel=update.date.replaceAll('-','.');
 const shortItems=update.highlights.map(item=>`<li>${escapeMarkup(item)}</li>`).join('');
 const detailItems=update.details.map(item=>`<li>${escapeMarkup(item)}</li>`).join('');
 return `<section class="title-update-panel" aria-labelledby="title-update-heading" data-no-pixel-icon>
  <div class="title-update-topline"><span class="title-update-label">UPDATE</span><time datetime="${escapeMarkup(update.date)}">${escapeMarkup(dateLabel)}</time></div>
  <h2 id="title-update-heading">📜 アップデート情報 <small class="title-update-page-tag">${index===0?'最新':'以前の更新'}</small></h2>
  <p class="title-update-headline">${escapeMarkup(update.headline)}</p>
  <ul class="title-update-highlights">${shortItems}</ul>
  <details class="title-update-details" data-title-update-details ${open?'open':''}>
   <summary>詳しい更新内容を${open?'閉じる':'見る'}<span class="title-update-chevron" aria-hidden="true">⌄</span></summary>
   <div class="title-update-expanded"><ul>${detailItems}</ul><p class="title-update-footnote">${escapeMarkup(update.note)}</p></div>
  </details>
  <nav class="title-update-pages" aria-label="アップデート情報のページ">
   <span>ページ ${index+1} / ${TITLE_UPDATES.length}</span>
   <div class="title-update-page-buttons">${TITLE_UPDATES.map((_,i)=>`<button type="button" data-title-update-page="${i+1}" aria-label="${i+1}ページ目" aria-current="${i===index?'page':'false'}" ${i===index?'class="active"':''}>${i+1}</button>`).join('')}</div>
  </nav>
 </section>`;
}
