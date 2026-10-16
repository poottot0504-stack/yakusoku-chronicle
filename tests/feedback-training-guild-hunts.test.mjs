import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNewGame } from '../src/state/game-state.js';
import { createDefaultRoster } from '../src/data/characters.js';
import { makeGuildHuntEnemy } from '../src/core/guild-hunts.js';
import { QUESTS } from '../src/data/quests.js';
import { updateQuestProgress, reportQuestToNpc } from '../src/core/quests.js';
import { getEncounterCandidates } from '../src/core/encounters.js';
import { npcConversationMarkup } from '../src/ui/npcs.js';
import { TRAINING_AREAS, makeTrainingEnemy } from '../src/core/training-boundary.js';
import { createOathbreakerEnemy } from '../src/core/oathbreakers.js';
import { ensureAdventureState, recordAdventureVictory } from '../src/core/adventure.js';

const makeState = () => ensureAdventureState(createNewGame(createDefaultRoster()));
const questId = 'guild-side-025';
function acceptedQuestState() {
 const state=makeState();
 state.quests??={};
 for (let n=1;n<25;n++) state.quests[`guild-side-${String(n).padStart(3,'0')}`]={status:'completed',progress:1,rewardClaimed:true};
 state.quests[questId]={status:'accepted',progress:0};
 state.adventure.regionId='abyss'; // The player has already passed the original coast chapter.
 state.world.timePhase='day';state.world.weather='clear';
 state.story.rareGate=false;
 state.inventory=(state.inventory??[]).filter(x=>x.id!=='moonToken');
 return state;
}

test('guild request 025 keeps its original Siren kill requirement',()=>{
 assert.equal(QUESTS[questId].npcId,'guildMaster');
 assert.deepEqual(QUESTS[questId].goal,{type:'defeat',id:'stormSiren',amount:1});
});

test('accepted guild request 025 can fight a Siren after chapter, during clear daytime without token',()=>{
 const s=acceptedQuestState();
 assert.equal(getEncounterCandidates(s,'coast').some(x=>x.id==='stormSiren'),false);
 const enemy=makeGuildHuntEnemy(s,questId,()=>.5);
 assert.equal(enemy.bestiaryId,'stormSiren');
 assert.equal(enemy.regionId,'coast');
 assert.equal(enemy.name,'嵐歌のセイレーン');
 assert.ok(enemy.maxHp>0);
 assert.equal(enemy.hp,enemy.maxHp);
 assert.ok(enemy.exp>0);
 assert.equal(enemy.rematch,undefined);
 assert.equal(s.quests[questId].status,'accepted');
});

test('NPC offers a direct battle for the current accepted guild target, then reporting on success',()=>{
 const s=acceptedQuestState();
 const before=npcConversationMarkup(s,'guildMaster');
 assert.match(before,/data-npc-guild-hunt="guild-side-025"/);
 assert.match(before,/嵐歌のセイレーンに挑戦/);
 const enemy=makeGuildHuntEnemy(s,questId,()=>.5);
 const previousWins=JSON.stringify(s.adventure.regionWins);
 recordAdventureVictory(s,{regionId:enemy.regionId,enemyIds:[enemy.bestiaryId],exp:enemy.exp,jobExp:enemy.jobExp,gold:enemy.gold,countsForExploration:false});
 updateQuestProgress(s,{type:'defeat',id:enemy.bestiaryId,amount:1});
 assert.deepEqual(s.adventure.regionWins,JSON.parse(previousWins),'guild fight should not progress the story region');
 assert.equal(s.quests[questId].status,'ready');
 assert.match(npcConversationMarkup(s,'guildMaster'),/data-npc-report="guild-side-025"/);
 assert.doesNotMatch(npcConversationMarkup(s,'guildMaster'),/data-npc-guild-hunt=/);
 reportQuestToNpc(s,'guildMaster',questId);
 assert.equal(s.quests[questId].status,'completed');
 assert.throws(()=>makeGuildHuntEnemy(s,questId),/依頼を受注/);
});

test('guild direct fight cannot bypass accepting a quest or challenge non-guild quests',()=>{
 const s=makeState();
 assert.throws(()=>makeGuildHuntEnemy(s,questId),/依頼を受注/);
 s.quests[questId]={status:'ready',progress:1};
 assert.throws(()=>makeGuildHuntEnemy(s,questId),/依頼を受注/);
 s.quests['board-herbs']={status:'accepted',progress:0};
 assert.throws(()=>makeGuildHuntEnemy(s,'board-herbs'),/指定討伐の依頼/);
});

test('all training areas generate fresh enemies on consecutive fights',()=>{
 const s=makeState();s.story.trueEndingSeen=true;
 for(const area of TRAINING_AREAS){
  const first=makeTrainingEnemy(s,area.id);
  first.hp=0;
  const second=makeTrainingEnemy(s,area.id);
  assert.equal(second.hp,second.maxHp);
  assert.equal(first.id,second.id);
  assert.equal(first.exp,second.exp);
  assert.equal(first.materialDrop,second.materialDrop);
 }
});

test('oathbreaker already defeated remains available for rematch',()=>{
 const s=makeState();s.story.trueEndingSeen=true;
 const first=createOathbreakerEnemy(s,'oath-13');
 s.endgame??={};s.endgame.oathbreakerClears={'oath-13':true};
 const second=createOathbreakerEnemy(s,'oath-13');
 assert.equal(first.id,second.id);
 assert.equal(second.hp,second.maxHp);
});

test('battle UI handlers expose both replay buttons and guild NPC hunt with persistent results',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 assert.match(main,/openEndgameReplayPrompt\('training',battleMeta\.trainingArea/);
 assert.match(main,/openEndgameReplayPrompt\('oathbreaker',battleMeta\.oathbreaker/);
 assert.match(main,/if\(el\.dataset\.trainingArea\).*?closeModal\(\);return startBattle\(/);
 assert.match(main,/if\(el\.dataset\.npcGuildHunt\)/);
 assert.match(main,/view='endgame'/);
 assert.match(main,/guildQuestId/);
 assert.match(css,/\.endgame-replay-message\{white-space:pre-line/);
});
