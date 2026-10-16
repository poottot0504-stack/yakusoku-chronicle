import { JOBS } from '../data/jobs.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

export function characterSwitcherMarkup(state, selectedCharacterId){
  const characters=state.characters??[];
  if(!characters.length)return '';
  return `<section class="character-switcher" aria-label="キャラクター切替"><div class="character-switcher-title"><strong>👤 キャラクター</strong><span>横にスライドして選択</span></div><div class="character-switcher-list">${characters.map(c=>`<button data-character-id="${esc(c.id)}" class="character-switcher-button ${c.id===selectedCharacterId?'selected':''}" aria-pressed="${c.id===selectedCharacterId?'true':'false'}"><span class="character-switcher-avatar">${esc(c.name.slice(0,1))}</span><span class="character-switcher-text"><b>${esc(c.name)}</b><small>Lv${c.level} / ${esc(JOBS[c.currentJob]?.name??c.currentJob)}</small></span></button>`).join('')}</div></section>`;
}
