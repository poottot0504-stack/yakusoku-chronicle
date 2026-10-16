import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { evaluateAchievements } from '../src/core/achievements.js';
import { achievementsMarkup } from '../src/ui/achievements.js';

const definitions=Object.values(ACHIEVEMENTS);

test('retired third-playthrough achievement is not shown or offered as progression',()=>{
 assert.ok(ACHIEVEMENTS['cycle-2'],'the second-playthrough achievement stays');
 assert.equal(ACHIEVEMENTS['cycle-3'],undefined,'an unavailable third playthrough must not be advertised');
 assert.equal(definitions.some(a=>a.description.includes('3周目')||a.name==='三度目の旅'),false);
 const html=achievementsMarkup({cycle:2,achievements:{}},definitions);
 assert.match(html,/2周目へ進む/);
 assert.doesNotMatch(html,/三度目の旅|3周目へ進む|３周目/);
 assert.match(html,new RegExp(`0/${definitions.length}`));
});

test('removing retired achievement preserves legacy save rewards and keeps achievement counts correct',()=>{
 const oldReceipt={unlocked:true,claimed:true,unlockedAt:123456};
 const state={
  cycle:2,
  gold:12345,
  titles:['時巡りの旅人'],
  achievements:{'cycle-2':{unlocked:true,claimed:true},'cycle-3':structuredClone(oldReceipt)}
 };
 assert.deepEqual(evaluateAchievements(state),[]);
 assert.deepEqual(state.achievements['cycle-3'],oldReceipt,'do not delete old save fields');
 assert.equal(state.gold,12345,'do not change or duplicate rewards');
 assert.deepEqual(state.titles,['時巡りの旅人'],'do not revoke granted titles');
 const html=achievementsMarkup(state,definitions);
 assert.match(html,new RegExp(`1/${definitions.length}`));
 assert.doesNotMatch(html,/三度目の旅|3周目へ進む/);
});

test('progressing a legacy cycle value does not award a retired achievement again',()=>{
 const state={cycle:3,gold:0,achievements:{'cycle-2':{unlocked:true,claimed:true}}};
 assert.deepEqual(evaluateAchievements(state),[]);
 assert.equal(state.achievements['cycle-3'],undefined);
 assert.equal(state.gold,0);
});
