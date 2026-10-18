import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame } from '../src/state/game-state.js';
import { createDefaultRoster } from '../src/data/characters.js';
import { ensureAdventureState } from '../src/core/adventure.js';
import { ALL_JOBS, getJobPassive, describeJobPassive } from '../src/data/jobs.js';
import { jobsMarkup } from '../src/ui/jobs.js';
import { statusMarkup } from '../src/ui/status.js';

const makeState=()=>ensureAdventureState(createNewGame(createDefaultRoster()));
const availableDate=Date.parse('2027-01-01T12:00:00+09:00');

test('every job has one small, readable intrinsic passive',()=>{
 assert.equal(ALL_JOBS.length,20);
 for(const job of ALL_JOBS){
  const passive=getJobPassive(job.id);
  assert.ok(passive,`Missing passive for ${job.id}`);
  assert.ok(['attack','defense','magic','speed'].includes(passive.stat));
  assert.ok(passive.rate>=.025&&passive.rate<=.04,`Passive balance out of bounds: ${job.id}`);
  const description=describeJobPassive(job.id);
  assert.ok(description.includes(passive.name));
  assert.ok(description.includes(`${Math.round(passive.rate*1000)/10}%`));
 }
});

test('job selection displays passives for locked and unlocked jobs but marks only current one active',()=>{
 const state=makeState(),character=state.characters[0];
 const html=jobsMarkup(state,character.id,availableDate);
 for(const job of ALL_JOBS){
  const start=html.indexOf(`data-job-id="${job.id}"`);
  assert.ok(start>=0,`Missing job row: ${job.id}`);
  const row=html.slice(start,html.indexOf('</button>',start));
  assert.ok(row.includes(`✨ パッシブ：${describeJobPassive(job.id)}`),`Missing description: ${job.id}`);
  assert.equal(row.includes('【発動中】'),job.id===character.currentJob,`Active marker mismatch: ${job.id}`);
 }
 assert.equal((html.match(/【発動中】/g)||[]).length,1);
 assert.ok(html.includes('未解放のジョブも効果を確認できます'));
});

test('status panel follows active job without changing saved stats',()=>{
 const state=makeState(),character=state.characters[0];
 const originalStats=JSON.stringify(character.stats);
 const initialJob=character.currentJob;
 assert.ok(statusMarkup(state,character.id).includes(`✨ 発動中の固有パッシブ：${describeJobPassive(initialJob)}`));
 character.currentJob='highWizard'; // UI-only assertion, no unlock bypass in game logic.
 assert.ok(statusMarkup(state,character.id).includes(`✨ 発動中の固有パッシブ：${describeJobPassive('highWizard')}`));
 assert.equal(JSON.stringify(character.stats),originalStats);
});
