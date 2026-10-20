import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleMarkup} from '../src/ui/battle.js';

const css=readFileSync(new URL('../styles/battle-art.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function fixture(withAuto){
 const hero={id:'hero',name:'冒険者',side:'ally',hp:100,maxHp:100,mp:100,maxMp:100,currentJob:'summoner',jobLevels:{summoner:93}};
 const boss={id:'masho',name:'洞窟ボス',side:'enemy',hp:112500,maxHp:112500};
 const state={ui:{autoPlay:{enabled:withAuto}}};
 const battle={actors:[hero,boss],actorMap:{hero,boss},mashoRun:{index:1,total:10,stopAfterCurrent:false,queueNextTen:false},awaitingActorId:'hero',planningIds:['hero'],planningIndex:0,turnNumber:4};
 return battleMarkup(state,battle);
}

test('mobile cave ten-run action header spans two rows and overrides legacy nowrap styling',()=>{
 const rule=css.slice(css.indexOf('/* Masho mobile layout fix:'));
 assert.ok(rule.startsWith('/* Masho mobile layout fix:'));
 assert.match(rule,/@media \(max-width:600px\)/);
 assert.match(rule,/#battle-screen>.battle-ui>.battle-header:has\(\.masho-run-stop\)\s*\{\s*display:grid;/);
 assert.match(rule,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(rule,/>span\{\s*grid-column:1 \/ 5;\s*grid-row:1;/);
 assert.match(rule,/>strong\{\s*grid-column:5 \/ 7;\s*grid-row:1;/);
 assert.match(rule,/>.masho-run-stop\{\s*grid-column:1 \/ 3;\s*grid-row:2;/);
 assert.match(rule,/>.masho-run-queue\{\s*grid-column:3 \/ 5;\s*grid-row:2;/);
 assert.match(rule,/>.battle-auto-stop\{\s*grid-column:5 \/ 7;\s*grid-row:2;/);
 assert.match(rule,/min-height:44px/);
 assert.match(rule,/overflow-wrap:anywhere/);
});

test('manual ten-run splits its two controls evenly without blank auto button space',()=>{
 const rule=css.slice(css.indexOf('/* Masho mobile layout fix:'));
 assert.match(rule,/:not\(:has\(\.battle-auto-stop\)\)>.masho-run-stop\{grid-column:1 \/ 4\}/);
 assert.match(rule,/:not\(:has\(\.battle-auto-stop\)\)>.masho-run-queue\{grid-column:4 \/ 7\}/);
 const markup=fixture(false);
 assert.match(markup,/data-masho-run-stop/);
 assert.match(markup,/data-masho-run-queue/);
 assert.doesNotMatch(markup,/data-auto-stop/);
});

test('auto ten-run has three independent reachable buttons and turn count',()=>{
 const markup=fixture(true);
 assert.match(markup,/魔障 1\/10戦/);
 assert.match(markup,/data-masho-run-stop/);
 assert.match(markup,/data-masho-run-queue/);
 assert.match(markup,/data-auto-stop/);
 assert.match(markup,/ターン 5/);
 assert.match(html,/battle-art\.css\?v=raid-balance-20261014-masho-mobile-header-20261020/);
});

test('ordinary battle without ten-run has no extra buttons or special grid selector',()=>{
 const hero={id:'hero',name:'冒険者',side:'ally',hp:100,maxHp:100,mp:100,maxMp:100,currentJob:'swordsman'};
 const boss={id:'boss',name:'敵',side:'enemy',hp:100,maxHp:100};
 const markup=battleMarkup({ui:{autoPlay:{enabled:false}}},{actors:[hero,boss],actorMap:{hero,boss},awaitingActorId:'hero',planningIds:['hero'],planningIndex:0});
 assert.doesNotMatch(markup,/data-masho-run-stop|data-masho-run-queue/);
 assert.match(markup,/<header class="battle-header">/);
});
