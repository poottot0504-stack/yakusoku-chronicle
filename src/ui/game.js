import { partyMarkup } from './party.js';
import { statusMarkup } from './status.js';
export function gameMarkup(state){
 const id=state.selectedCharacterId??state.characters?.[0]?.id;
 return `<header class="topbar"><h1>約束のクロニクル</h1><span>${state.world?.timePhase??'morning'} / ${state.world?.weather??'clear'}</span></header><div class="scroll-panel game-scroll">${partyMarkup(state)}${id?statusMarkup(state,id):''}</div><nav class="bottom-actions"><button data-nav="party">仲間</button><button data-nav="status">ステータス</button><button data-nav="jobs">転職</button><button data-nav="equipment">装備</button><button data-nav="bestiary">図鑑</button><button data-nav="quests">クエスト</button><button data-nav="achievements">実績</button><button data-nav="menu">メニュー</button></nav>`;
}
