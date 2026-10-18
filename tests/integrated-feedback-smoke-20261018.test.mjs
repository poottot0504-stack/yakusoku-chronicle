import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState} from '../src/core/adventure.js';
import {adventureMarkup,townMarkup} from '../src/ui/adventure.js';
import {jobsMarkup} from '../src/ui/jobs.js';
import {statusMarkup} from '../src/ui/status.js';
import {getJobPassive,describeJobPassive} from '../src/data/jobs.js';
import {createBattle} from '../src/core/battle.js';
import {migrateSave} from '../src/core/save-migration.js';
import {remainingBoostMs} from '../src/core/boost-scrolls.js';

const fresh=()=>ensureAdventureState(createNewGame(createDefaultRoster()));

test('merged map and guild hunt UI coexist with an active job passive',()=>{
 const s=fresh(),hero=s.characters[0];
 s.gathering={miningCharges:{field:3}};
 s.quests['guild-side-025']={status:'accepted',progress:0,rewardClaimed:false};
 const map=adventureMarkup(s);
 assert.match(map,/data-region="field"/);
 assert.match(map,/⛏️ 採掘 残り3回/);
 const town=townMarkup(s);
 assert.match(town,/data-npc-guild-hunt="guild-side-025"/);
 const jobUi=jobsMarkup(s,hero.id,Date.parse('2027-01-01T00:00:00Z'));
 assert.ok(jobUi.includes(`✨ パッシブ：${describeJobPassive(hero.currentJob)}【発動中】`));
 assert.ok(statusMarkup(s,hero.id).includes('発動中の固有パッシブ'));
});

test('active job passive does not mutate the save or erase mining and guild progress',()=>{
 const s=fresh(),c=s.characters[0];
 s.gathering={miningCharges:{field:3}};
 s.quests['guild-side-025']={status:'accepted',progress:0};
 const actor={...structuredClone(c),stats:{attack:100,defense:100,magic:100,speed:100},battleFlatStats:{attack:20},hp:1000,maxHp:1000,mp:100,maxMp:100};
 const snapshot=structuredClone(s);
 const enemy={id:'dummy',name:'テスト魔物',hp:1000,maxHp:1000,stats:{attack:1,defense:1,magic:1,speed:1}};
 const battle=createBattle([actor],enemy);
 const pass=getJobPassive(actor.currentJob);
 const base=100+(pass.stat==='attack'?20:0);
 assert.equal(battle.actorMap[actor.id].stats[pass.stat],Math.round(base*(1+pass.rate)));
 assert.deepEqual(s,snapshot,'Battle should not alter actual save data');
 const migrated=migrateSave(structuredClone(s));
 assert.equal(migrated.gathering.miningCharges.field,3);
 assert.equal(migrated.quests['guild-side-025'].status,'accepted');
 assert.equal(migrated.characters.find(x=>x.id===c.id).currentJob,c.currentJob);
});

test('rolled scroll duration and cave clear counter survive full save migration',()=>{
 const s=fresh();
 s.boostScrolls={jobExp:{remainingMs:3600000,initialDurationMs:7200000}};
 s.mashoCave={highestCleared:25,abyssClearCount:7,clearCounts:{21:3,22:4}};
 const migrated=migrateSave(structuredClone(s));
 assert.equal(remainingBoostMs(migrated,'jobExp'),3600000);
 assert.equal(migrated.boostScrolls.jobExp.initialDurationMs,7200000);
 assert.equal(migrated.mashoCave.abyssClearCount,7);
 assert.equal(migrated.mashoCave.clearCounts[22],4);
});

test('mobile viewport and responsive layout rules are retained after merging UI changes',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">/);
 assert.match(css,/\.region-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.job-name-block\{min-width:0/);
 assert.match(css,/\.job-name-block strong\{overflow-wrap:anywhere\}/);
});
