import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState} from '../src/core/adventure.js';
import {getVisibleQuestDefinitions} from '../src/core/quests.js';
import {questsMarkup} from '../src/ui/quests.js';
import {townMarkup} from '../src/ui/adventure.js';

const id='guild-side-025';
function lateChapterState(status='accepted'){
 const state=ensureAdventureState(createNewGame(createDefaultRoster()));
 state.quests??={};
 for(let n=1;n<25;n++)state.quests[`guild-side-${String(n).padStart(3,'0')}`]={status:'completed',progress:1,rewardClaimed:true};
 if(status)state.quests[id]={status,progress:status==='ready'?1:0};
 state.adventure.regionId='abyss';
 state.world.timePhase='day';
 state.world.weather='clear';
 state.story.rareGate=false;
 state.inventory=(state.inventory??[]).filter(item=>item.id!=='moonToken');
 return state;
}

test('quest 025 can be challenged directly from the journal after leaving the original region',()=>{
 const state=lateChapterState();
 const defs=getVisibleQuestDefinitions(state);
 assert.ok(defs.some(q=>q.id===id));
 const html=questsMarkup(state,defs);
 assert.match(html,/冒険者ギルド依頼 025/);
 assert.match(html,/data-npc-guild-hunt="guild-side-025" data-npc-id="guildMaster"/);
 assert.match(html,/嵐歌のセイレーンに挑戦する/);
 assert.match(html,/ストーリー進行・天候に関係なく/);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/if\(el\.dataset\.npcGuildHunt\)/);
 assert.match(main,/makeGuildHuntEnemy\(state,el\.dataset\.npcGuildHunt\)/);
});

test('quest 025 completion and acceptance screens never show an invalid battle button',()=>{
 const ready=lateChapterState('ready');
 const readyHtml=questsMarkup(ready,getVisibleQuestDefinitions(ready));
 assert.match(readyHtml,/ギルドマスターに達成報告する/);
 assert.doesNotMatch(readyHtml,/data-npc-guild-hunt=/);
 const unaccepted=lateChapterState(null);
 const waitingHtml=questsMarkup(unaccepted,getVisibleQuestDefinitions(unaccepted));
 assert.match(waitingHtml,/ギルドマスターから依頼を受ける/);
 assert.doesNotMatch(waitingHtml,/data-npc-guild-hunt=/);
 const finished=lateChapterState('completed');
 assert.doesNotMatch(questsMarkup(finished,getVisibleQuestDefinitions(finished)),/冒険者ギルド依頼 025/);
});

test('Adventurers Guild remains prominently accessible in town after moving to later chapters',()=>{
 const html=townMarkup(lateChapterState());
 assert.match(html,/<section class="panel town-menu"><button data-npc="guildMaster">/);
 assert.match(html,/冒険者ギルド/);
 assert.match(html,/依頼の受注・指定討伐・達成報告/);
});
