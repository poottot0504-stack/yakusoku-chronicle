import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 useBoostScroll,remainingBoostMs,advanceBoostPlaytime,eligibleBoostPlaytimeMs,
 eligibleBoostTickMs,BOOST_MAX_FOREGROUND_TICK_MS
} from '../src/core/boost-scrolls.js';
import {migrateSave} from '../src/core/save-migration.js';

const book=hours=>{
 const state={inventory:[{id:'jobExpScroll',qty:2}]};
 const result=useBoostScroll(state,'jobExpScroll',{rng:()=>hours===1?.01:hours===2?.5:.99});
 assert.equal(result.hours,hours);
 return state;
};

test('a two-hour job EXP book only burns real foreground time across normal 10-second ticks',()=>{
 const state=book(2),start=Date.parse('2026-10-20T09:00:00+09:00');
 for(let i=0;i<360;i++){
  const from=start+i*10000,now=from+10000;
  advanceBoostPlaytime(state,eligibleBoostTickMs({from,now,lastInputAt:now,inCombat:true}));
 }
 assert.equal(remainingBoostMs(state,'jobExp'),3600000);
 const loaded=migrateSave(state);
 assert.equal(remainingBoostMs(loaded,'jobExp'),3600000);
 assert.equal(loaded.boostScrolls.jobExp.initialDurationMs,7200000);
 for(let i=0;i<360;i++){
  const from=start+3600000+i*10000,now=from+10000;
  advanceBoostPlaytime(loaded,eligibleBoostTickMs({from,now,lastInputAt:now,inCombat:true}));
 }
 assert.equal(remainingBoostMs(loaded,'jobExp'),0);
});

test('suspended iPhone tab while mid-battle never charges one hour for a single callback',()=>{
 const state=book(2),start=Date.parse('2026-10-20T09:00:00+09:00');
 const singleResume=eligibleBoostTickMs({from:start,now:start+3600000,lastInputAt:start,inCombat:true});
 assert.equal(BOOST_MAX_FOREGROUND_TICK_MS,60000);
 assert.equal(singleResume,60000);
 assert.equal(eligibleBoostPlaytimeMs({from:start,now:start+3600000,lastInputAt:start,inCombat:true}),3600000);
 advanceBoostPlaytime(state,singleResume);
 assert.equal(remainingBoostMs(state,'jobExp'),7140000);
 const loaded=migrateSave(state);
 assert.equal(remainingBoostMs(loaded,'jobExp'),7140000);
 assert.equal(eligibleBoostTickMs({from:start,now:start+3600000,lastInputAt:start,inCombat:false}),60000);
 assert.equal(eligibleBoostTickMs({from:start+600000,now:start+3600000,lastInputAt:start,inCombat:false}),0);
});

test('the one-, two- and three-hour scrolls survive sleep and save, without early expiration',()=>{
 for(const hours of [1,2,3]){
  const s=book(hours);
  advanceBoostPlaytime(s,eligibleBoostTickMs({from:1000,now:31000,lastInputAt:31000,inCombat:true}));
  const restored=migrateSave(s);
  assert.equal(remainingBoostMs(restored,'jobExp'),hours*3600000-30000);
  assert.equal(restored.boostScrolls.jobExp.initialDurationMs,hours*3600000);
 }
});

test('mobile view keeps 4 HP and blue MP bars visible without horizontal overflow',()=>{
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(js,/class="dock-hp" role="progressbar"/);
 assert.match(js,/class="dock-mp" role="progressbar"/);
 assert.match(js,/aria-valuenow="${hp}"/);
 assert.match(js,/aria-valuenow="${mp}"/);
 assert.match(css,/@media \(max-width:520px\)\{\s*\.party-dock\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.ok(css.lastIndexOf('.party-dock{display:grid;grid-template-columns:repeat(4,')>css.lastIndexOf('.party-dock{display:none}'));
 assert.match(css,/\.party-dock \.dock-member>\.dock-mp b\{background:linear-gradient\(90deg,#347bcf,#68c3ff\)\}/);
 assert.match(css,/@media \(max-width:350px\)\{/);
});

test('main game uses protected time delta and a newly versioned smartphone layout',()=>{
 const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(js,/advanceBoostPlaytime\(state,eligibleBoostTickMs\(\{from,now,lastInputAt:lastPlayerInputAt,inCombat:!!\(battle\|\|raidRoom\)\}\)\)/);
 assert.match(js,/setInterval\(\(\)=>\{\s*if\(playStartedAt===null\|\|document.hidden\|\|title.classList.contains\('active'\)\)return;/);
 assert.match(js,/addEventListener\('visibilitychange'/);
 assert.match(js,/window.addEventListener\('pagehide'/);
 assert.match(html,/mobile-hpmp20261020/);
 assert.match(html,/safeboost20261020/);
});
