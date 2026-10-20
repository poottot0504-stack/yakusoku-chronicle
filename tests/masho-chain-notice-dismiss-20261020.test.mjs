import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setMashoResultVisibility} from '../src/core/masho-chain.js';
import {mashoCaveMarkup} from '../src/ui/masho-cave.js';

const sample=()=>({cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:25,lastReward:{floor:9,exp:480000},lastRunSummary:{floor:1,total:10,completed:2,status:'stopped',earnedGold:30000,exp:480000,jobExp:200000,promiseOre:0,materials:{enhanceCrystal:1},equipment:[]}},ui:{}});

test('previously saved cave chain notices never reappear on entry',()=>{
 const s=sample();
 const html=mashoCaveMarkup(s);
 assert.doesNotMatch(html,/10連戦 2\/10戦/);
 assert.doesNotMatch(html,/途中で連戦を終了しました/);
 assert.doesNotMatch(html,/第9階層 クリア！/);
 assert.match(html,/25階層/);
 assert.equal(s.mashoCave.lastRunSummary.earnedGold,30000);
});

test('a freshly completed chain is visible once with dismiss button and no duplicate last battle',()=>{
 const s=sample();setMashoResultVisibility(s,true);
 const html=mashoCaveMarkup(s);
 assert.match(html,/10連戦 2\/10戦/);
 assert.match(html,/30,000G/);
 assert.match(html,/data-masho-dismiss-result/);
 assert.doesNotMatch(html,/第9階層 クリア！/);
});

test('dismissal changes visibility only, retaining saved rewards and progress',()=>{
 const s=sample();setMashoResultVisibility(s,true);
 const before=JSON.stringify(s.mashoCave),gold=30000;
 setMashoResultVisibility(s,false);
 assert.equal(JSON.stringify(s.mashoCave),before);
 assert.equal(s.mashoCave.lastRunSummary.earnedGold,gold);
 assert.doesNotMatch(mashoCaveMarkup(s),/10連戦 2\/10戦/);
 setMashoResultVisibility(s,true);
 s.mashoCave.lastRunSummary=null;
 assert.match(mashoCaveMarkup(s),/第9階層 クリア！/);
});

test('navigation and next battle hide old notices without touching receipts',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/if\(el\.hasAttribute\('data-masho-open'\)\).*setMashoResultVisibility\(state,false\)/);
 assert.match(main,/if\(el\.hasAttribute\('data-masho-back'\)\).*setMashoResultVisibility\(state,false\)/);
 assert.match(main,/if\(el\.hasAttribute\('data-masho-dismiss-result'\)\).*setMashoResultVisibility\(state,false\)/);
 assert.match(main,/function startMashoFloorBattle\(floor\)\{[\s\S]{0,200}setMashoResultVisibility\(state,false\)/);
 assert.match(main,/setMashoResultVisibility\(state,true\);mashoRun=null;saveNow/);
});
