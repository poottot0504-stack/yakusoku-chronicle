import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMashoRun,recordMashoRunVictory,mashoRunCanContinue,mashoRunSummary,setMashoResultVisibility,toggleMashoNextTen} from '../src/core/masho-chain.js';
import {mashoCaveMarkup} from '../src/ui/masho-cave.js';
import {battleMarkup} from '../src/ui/battle.js';

const state=()=>({cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:25,lastReward:{floor:23,exp:650000,jobExp:325000,gold:250000,equipment:null,promiseOre:0},lastRunSummary:{floor:23,total:10,completed:5,status:'stopped',earnedGold:1250000,exp:3250000,jobExp:1625000,promiseOre:0,materials:{},equipment:[]}},ui:{}});
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('stopped ten-run result does not permanently mask the next single victory',()=>{
 const s=state();setMashoResultVisibility(s,true);
 assert.match(mashoCaveMarkup(s),/10連戦 5\/10戦/);
 assert.doesNotMatch(mashoCaveMarkup(s),/第23階層 クリア！/);
 // Starting a new single run clears stale summary; the latest receipt stays saved.
 s.mashoCave.lastRunSummary=null;
 assert.match(mashoCaveMarkup(s),/第23階層 クリア！/);
 assert.match(mashoCaveMarkup(s),/キャラ経験値 650,000/);
 assert.match(mashoCaveMarkup(s),/ジョブ経験値 325,000/);
 assert.doesNotMatch(mashoCaveMarkup(s),/10連戦 5\/10戦/);
 assert.match(main,/if\(!mashoRun\)state\.mashoCave\.lastRunSummary=null/);
 assert.match(main,/state\.mashoCave\.lastRunSummary=null;setMashoResultVisibility\(state,true\)/);
});

test('repeating the last cleared floor is available at the top without navigating long cave lists',()=>{
 const s=state();const html=mashoCaveMarkup(s);
 assert.match(html,/masho-quick-actions/);
 assert.match(html,/data-masho-floor="23">1戦だけ/);
 assert.match(html,/data-masho-run10="23">10連戦/);
 assert.ok(html.indexOf('masho-quick-actions')<html.indexOf('masho-floors'));
 setMashoResultVisibility(s,true);
 const result=mashoCaveMarkup(s);
 assert.match(result,/masho-repeat-ten/);
 assert.match(result,/data-masho-run10="23" type="button">◆ もう10周する/);
});

test('cave ten-run starts directly; stop disables the extra-run reservation',()=>{
 assert.doesNotMatch(main,/敵を10回連続で倒します。HP・MPは各戦闘後も引き継がれ/);
 assert.match(main,/if\(el\.dataset\.mashoRun10\|\|el\.dataset\.mashoRunConfirm\)/);
 assert.match(main,/toggleMashoNextTen\(mashoRun\)/);
 assert.match(main,/mashoRun\.stopAfterCurrent=true;mashoRun\.queueNextTen=false/);
 let run=createMashoRun(23);assert.equal(run.queueNextTen,false);
 assert.equal(toggleMashoNextTen(run),true);
 assert.equal(toggleMashoNextTen(run),false);
 assert.equal(toggleMashoNextTen(run),true);
 run.stopAfterCurrent=true;
 assert.equal(toggleMashoNextTen(run),false);
 assert.equal(run.queueNextTen,true,'the controller resets the pending booking when stop is pressed');
});

test('the booked extra ten begins only after the current ten complete and never loops forever',()=>{
 const run=createMashoRun(23);
 toggleMashoNextTen(run);
 const receipt={floor:23,exp:1000,jobExp:500,promiseOre:0};
 for(let i=0;i<10;i++)recordMashoRunVictory(run,receipt,1250);
 assert.equal(run.completed,10);
 assert.equal(mashoRunCanContinue(run),false);
 const summary=mashoRunSummary(run);
 assert.equal(summary.earnedGold,12500);
 assert.equal(summary.exp,10000);
 assert.equal(summary.jobExp,5000);
 const next=createMashoRun(run.floor);
 assert.equal(next.queueNextTen,false);
 assert.equal(next.completed,0);
 assert.equal(summary.earnedGold,12500,'the prior group was already settled');
 assert.match(main,/if\(!stopped&&mashoRun\.queueNextTen\)/);
 assert.match(main,/mashoRun=createMashoRun\(floor\)/);
});

test('battle header exposes queue toggle, stop and autoplayer stop independently',()=>{
 const s=state();
 const player={id:'hero',side:'ally',name:'冒険者',hp:100,maxHp:100,mp:100,maxMp:100,currentJob:'summoner',jobLevels:{summoner:30}};
 const enemy={id:'enemy',side:'enemy',name:'洞窟ボス',hp:100,maxHp:100};
 const b={actors:[player,enemy],actorMap:{hero:player,enemy},mashoRun:{index:7,total:10,stopAfterCurrent:false,queueNextTen:true},phase:'planning',awaitingActorId:'hero',planningIndex:0,planningIds:['hero'],log:[]};
 const html=battleMarkup(s,b);
 assert.match(html,/data-masho-run-queue/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/次の10戦を予約済み/);
 assert.doesNotMatch(html,/[☐☑]/);
 assert.match(html,/data-masho-run-stop/);
 b.mashoRun.stopAfterCurrent=true;
 const stopHtml=battleMarkup(s,b);
 assert.match(stopHtml,/masho-run-queue[^>]*disabled/);
 assert.match(stopHtml,/masho-run-stop[^>]*disabled/);
});
