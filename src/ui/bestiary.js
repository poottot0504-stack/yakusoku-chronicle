import { NORMAL_ENEMY_LIST, STORY_BOSS_FIRST_LIST, STORY_BOSS_NGP_LIST, RARE_MONSTER_LIST } from '../data/enemies.js';
import { syncLegacyStoryBossBestiary } from '../core/bestiary.js';
import { getItemDef } from '../core/items.js';
import { HALLOWEEN_ENEMY_LIST } from '../data/events.js';
import { elementProfileLabel } from '../core/elements.js';
function entryMarkup(state,def,{allowRematch=true}={}){
 const rec=state.bestiary?.[def.id];
 if(!rec?.encounters)return '<article class="bestiary-entry"><h3>？？？</h3></article>';
 const defeated=(rec.defeats??0)>0;
 const variant=def.cycle===2?'<p class="notice">2周目・強化個体</p>':'';
 const drops=(rec.drops??[]).map(id=>getItemDef(id).name);
 const dropLine=drops.length?`<p class="bestiary-drops">ドロップ：${drops.join(' / ')}</p>`:'';const description=def.description?`<p class="notice">${def.description}</p>`:'';
 return `<article class="bestiary-entry"><h3>${def.name}</h3>${variant}${description}<p class="bestiary-element">${elementProfileLabel(def)}</p><p>${defeated?'討伐済み':'遭遇済み・未討伐'}</p>${dropLine}${defeated&&allowRematch?`<button data-rematch="${def.id}">再戦する</button>`:''}</article>`;
}
export function bestiaryMarkup(state){
 syncLegacyStoryBossBestiary(state);
 const normal=NORMAL_ENEMY_LIST.map(def=>entryMarkup(state,def)).join('');
 const firstBosses=STORY_BOSS_FIRST_LIST.map(def=>entryMarkup(state,def)).join('');
 const secondBosses=STORY_BOSS_NGP_LIST.map(def=>entryMarkup(state,def)).join('');
 const rareMonsters=RARE_MONSTER_LIST.map(def=>entryMarkup(state,def,{allowRematch:false})).join('');
 const eventMonsters=HALLOWEEN_ENEMY_LIST.map(def=>entryMarkup(state,def,{allowRematch:false})).join('');
 return `<section class="panel bestiary"><h2>魔物図鑑</h2><p class="notice">図鑑からの再戦では経験値を獲得できません。素材・アイテム・ゴールドは獲得できます。</p><div class="scroll-panel"><h3 class="bestiary-section-title">通常モンスター</h3>${normal}<h3 class="bestiary-section-title rare-bestiary-title">✨ 希少モンスター</h3><p class="notice">稀に出会えるモンスター。経験値がとにかくうまい！ 図鑑からの再戦はできません。</p>${rareMonsters}<h3 class="bestiary-section-title">👑 ストーリーボス【1周目】</h3>${firstBosses}<h3 class="bestiary-section-title">🔥 強化ストーリーボス【2周目】</h3>${secondBosses}<h3 class="bestiary-section-title event-bestiary-title">🎃 イベントモンスター</h3><p class="notice">期間限定イベントで遭遇した魔物。図鑑からの再戦はできません。</p>${eventMonsters}</div></section>`;
}
