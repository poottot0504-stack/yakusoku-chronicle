import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {battleMarkup} from '../src/ui/battle.js';
import {
 WORLD_RUN_LENGTH,createWorldRun,recordWorldRunVictory,
 stopWorldRunAfterCurrent,worldRunCanContinue,worldRunSummary
} from '../src/core/world-chain.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function gameHarness({hp=100}={}){
 let startCount=0,renderCount=0,generated=0;
 const saved=[],messages=[];
 const ctx={
  worldRun:createWorldRun('field'),
  state:{gold:0,adventure:{regionId:'field',message:''}},
  battleMeta:{exploration:true,regionId:'field'},
  battle:{worldRun:{index:1,total:10,stopAfterCurrent:false}},
  view:'adventure',
  recordWorldRunVictory,worldRunCanContinue,worldRunSummary,
  getActiveParty:()=>[{id:'hero',hp}],
  getCharacterResourceCaps:()=>({maxHP:100}),
  saveNow:()=>saved.push({gold:ctx.state.gold,completed:ctx.worldRun?.completed??10}),
  makeEncounterGroup:()=>{generated++;return [{id:'slime-'+generated}];},
  startBattle:(enemies,opt)=>{
   assert.equal(opt.exploration,true);
   assert.ok(saved.length>=startCount+1,'each battle must save its reward before the next starts');
   assert.ok(enemies.length>0);
   startCount++;
   ctx.worldRun.goldBefore=ctx.state.gold;
   ctx.battle={worldRun:{index:ctx.worldRun.completed+1,total:10,stopAfterCurrent:false}};
   ctx.battleMeta={exploration:true,regionId:'field'};
  },
  battleScreen:{classList:{remove:()=>{}}},
  renderGame:()=>renderCount++,
  toast:(msg)=>messages.push(msg)
 };
 vm.createContext(ctx);
 const begin=main.indexOf('function finishWorldRunVictory(){');
 const end=main.indexOf('// Three genuine battles with HP/MP',begin);
 assert.ok(begin>0&&end>begin,'battle-chain settlement must be in main');
 vm.runInContext(main.slice(begin,end),ctx);
 return {ctx,saved,messages,finish:()=>vm.runInContext('finishWorldRunVictory()',ctx),
  get startCount(){return startCount;},get renderCount(){return renderCount;},get generated(){return generated;}};
}

test('world-map chain is exactly ten ordinary fights; stops cannot exceed bound',()=>{
 assert.equal(WORLD_RUN_LENGTH,10);
 assert.throws(()=>createWorldRun('field',20),/10戦/);
 assert.throws(()=>createWorldRun(''),/探索エリア/);
 const r=createWorldRun('field');
 assert.equal(worldRunCanContinue(r),false);
 for(let i=1;i<=10;i++){
  recordWorldRunVictory(r,{regionId:'field',earnedGold:12});
  assert.equal(r.completed,i);
  assert.equal(worldRunCanContinue(r),i<10);
 }
 assert.deepEqual(worldRunSummary(r),{regionId:'field',total:10,completed:10,status:'completed',earnedGold:120});
 assert.throws(()=>recordWorldRunVictory(r,{regionId:'field'}),/不正/);
 assert.throws(()=>recordWorldRunVictory(createWorldRun('field'),{regionId:'coast'}),/不正/);
});
test('chain cannot continue when region changes or stop is requested',()=>{
 const r=createWorldRun('coast');
 recordWorldRunVictory(r,{regionId:'coast',earnedGold:100});
 assert.equal(worldRunCanContinue(r,{regionId:'field'}),false);
 assert.equal(worldRunCanContinue(r,{regionId:'coast',partyReady:false}),false);
 assert.equal(stopWorldRunAfterCurrent(r),true);
 assert.equal(worldRunCanContinue(r),false);
 assert.equal(stopWorldRunAfterCurrent(r),true);
});
test('actual victory continuation creates 9 new encounters, saves each battle, then shows results',()=>{
 const h=gameHarness();
 h.ctx.worldRun.goldBefore=0;
 for(let i=1;i<=10;i++){
  h.ctx.state.gold+=50;
  h.ctx.state.adventure.message='第'+i+'戦：勝利！';
  assert.equal(h.finish(),true);
  assert.equal(h.saved[i-1]?.completed,i);
  if(i<10){
   assert.equal(h.startCount,i,'next battle started after settlement');
   assert.equal(h.ctx.battle.worldRun.index,i+1);
   assert.equal(h.renderCount,0,'do not show result screen mid-chain');
  }
 }
 assert.equal(h.startCount,9);
 assert.equal(h.generated,9);
 assert.equal(h.ctx.worldRun,null);
 assert.equal(h.ctx.view,'exploreResult');
 assert.equal(h.renderCount,1);
 assert.ok(h.ctx.state.adventure.message.includes('10/10戦 クリア'));
 assert.ok(h.ctx.state.adventure.message.includes('500G'));
 assert.ok(h.ctx.state.adventure.message.includes('第10戦：勝利'));
 assert.equal(h.saved.length,11,'ten individual saves plus final summary');
 assert.ok(h.messages.some(msg=>msg.includes('10連戦クリア')));
});
test('stop-after-current safely ends after the next settled victory',()=>{
 const h=gameHarness(),r=h.ctx.worldRun;
 r.goldBefore=0;
 stopWorldRunAfterCurrent(r);
 h.ctx.state.gold=23;
 assert.equal(h.finish(),true);
 assert.equal(r.completed,1);
 assert.equal(h.startCount,0);
 assert.equal(h.ctx.worldRun,null);
 assert.ok(h.ctx.state.adventure.message.includes('1/10戦'));
 assert.ok(h.ctx.state.adventure.message.includes('指定どおり'));
 assert.equal(h.saved.length,2);
});
test('critical party HP stops instead of starting another unattended fight',()=>{
 const h=gameHarness({hp:10});
 h.ctx.state.gold=7;
 h.ctx.worldRun.goldBefore=0;
 assert.equal(h.finish(),true);
 assert.equal(h.startCount,0);
 assert.match(h.ctx.state.adventure.message,/HP低下/);
 assert.match(h.ctx.state.adventure.message,/1\/10戦/);
});
test('run never alters an unrelated boss or special fight',()=>{
 const h=gameHarness();
 h.ctx.battleMeta={exploration:false,boss:true,regionId:'field'};
 assert.equal(h.finish(),false);
 assert.equal(h.ctx.worldRun.completed,0);
 assert.equal(h.saved.length,0);
});
test('standard battle UI shows progress and accessible stop control only for world run',()=>{
 const hero={id:'hero',name:'アレン',side:'ally',level:100,hp:90,maxHp:100,mp:50,maxMp:50,jobLevels:{swordsman:99},currentJob:'swordsman'};
 const foe={id:'enemy',name:'魔物',side:'enemy',level:100,hp:100,maxHp:100};
 const base={actors:[hero,foe],actorMap:{hero,enemy:foe},awaitingActorId:'hero',phase:'planning',planningIds:['hero'],planningIndex:0,turnNumber:0};
 const html=battleMarkup({ui:{autoPlay:{enabled:true}}},{...base,worldRun:{index:4,total:10,stopAfterCurrent:false}});
 assert.match(html,/探索連戦 4\/10戦/);
 assert.match(html,/data-world-run-stop/);
 assert.match(html,/この戦い後に終了/);
 assert.match(html,/data-auto-stop/);
 assert.doesNotMatch(html,/data-masho-run-queue/);
 const disabled=battleMarkup({ui:{}},{...base,worldRun:{index:4,total:10,stopAfterCurrent:true}});
 assert.match(disabled,/data-world-run-stop[^>]*disabled/);
 assert.match(disabled,/終了予約済み/);
 const normal=battleMarkup({ui:{}},base);
 assert.doesNotMatch(normal,/data-world-run-stop|探索連戦/);
});
test('main only offers 10 runs on exploration results and settles rewards through normal paths',()=>{
 assert.match(main,/data-explore-continue/);
 assert.match(main,/data-explore-return/);
 assert.match(main,/data-explore-run10/);
 assert.match(main,/if\(el\.hasAttribute\('data-explore-run10'\)\)/);
 assert.match(main,/if\(el\.hasAttribute\('data-world-run-stop'\)\)/);
 assert.match(main,/if\(battleMeta\.exploration&&worldRun&&finishWorldRunVictory\(\)\)return;/);
 assert.match(main,/battleMeta\.collectionProof=reserveCollectionBattle/);
 assert.match(main,/auditVictory\(battleMeta,battle\.exp\?\?0\)/);
 assert.match(main,/worldRun=null;if\(mashoRun\)/,'wipe must cancel chain');
 assert.match(main,/if\(r\.success\)\{syncBattlePartyToState\(state,battle\);worldRun=null/,'escape must cancel chain');
});
