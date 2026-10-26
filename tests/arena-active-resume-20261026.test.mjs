import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArenaSession} from '../src/core/arena.js';
import {replayArenaCheckpoint} from '../src/core/arena-replay.js';
import {arenaSeededRandom} from '../src/core/arena-proof.js';
import {startTurn,resolveAction,finishTurn} from '../src/core/battle.js';
import {saveArenaActive,loadArenaActive,clearArenaActive} from '../src/online/arena-active.js';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const MATCH='33333333-3333-4333-8333-333333333333';
const storage=()=>{const rows=new Map();return {getItem:k=>rows.has(k)?rows.get(k):null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};};
const cp=(q='arena30')=>({matchId:MATCH,questId:q,seed:1001,actions:[],createdAt:1790000000000});

test('active match checkpoint belongs to one auth user and one save slot',()=>{
 const st=storage(),record=cp();
 saveArenaActive(st,A,2,record);
 assert.deepEqual(loadArenaActive(st,A,2),record);
 assert.equal(loadArenaActive(st,A,1),null);
 assert.equal(loadArenaActive(st,B,2),null);
 const updated={...record,actions:[{actorId:'arena-actor-0',type:'defend'}]};
 saveArenaActive(st,A,2,updated);
 assert.throws(()=>saveArenaActive(st,A,2,record),/巻き戻せません/);
 assert.throws(()=>saveArenaActive(st,A,2,{...updated,matchId:B}),/以前の/);
 assert.deepEqual(loadArenaActive(st,A,2),updated);
 clearArenaActive(st,A,2,B);
 assert.deepEqual(loadArenaActive(st,A,2),updated);
 clearArenaActive(st,A,2,MATCH);
 assert.equal(loadArenaActive(st,A,2),null);
});
test('two committed rounds deterministically reconstruct party/enemy HP and next RNG state',()=>{
 for(const questId of ['arena30','arena50','arena70']){
  const record=cp(questId),live=createArenaSession(questId),b=live.battle;
  const rng=arenaSeededRandom(record.seed);
  startTurn(b,rng);
  for(let round=0;round<2;round++){
   for(const actorId of [...b.planningIds]){
    record.actions.push({actorId,type:'defend'});
    assert.equal(resolveAction(b,{type:'defend'},rng).ok,true);
   }
   assert.equal(b.phase,'complete');
   if(!b.actors.some(a=>a.side==='ally'&&a.hp>0)||!b.actors.some(a=>a.side==='enemy'&&a.hp>0))break;
   finishTurn(b);
   if(round<1)startTurn(b,rng);
  }
  // A complete checkpoint resumes at the next planning phase, as the browser did.
  if(b.phase==='complete'&&b.actors.some(a=>a.side==='ally'&&a.hp>0)&&b.actors.some(a=>a.side==='enemy'&&a.hp>0)){
   finishTurn(b);startTurn(b,rng);
  }else if(b.phase==='planning'&&b.turnNumber===1){
   // The loop already prepared turn 2; no additional transitions are necessary.
  }
  const replay=replayArenaCheckpoint(record);
  assert.deepEqual(replay.actions,record.actions);
  assert.deepEqual(replay.battle.actors.map(x=>[x.id,x.hp,x.mp,x.statusAilments]),b.actors.map(x=>[x.id,x.hp,x.mp,x.statusAilments]),questId);
  assert.equal(replay.battle.turnNumber,b.turnNumber,questId);
  assert.equal(replay.battle.phase,b.phase,questId);
  assert.equal(replay.rng(),rng(),questId+' seeded RNG continuation');
 }
});
test('corrupt or partial previous-round actions are not silently accepted',()=>{
 const one=cp(),a={actorId:'arena-actor-0',type:'defend'};
 assert.throws(()=>replayArenaCheckpoint({...one,actions:[a]}),/一致しません/);
 assert.throws(()=>replayArenaCheckpoint({...one,actions:Array.from({length:4},()=>a)}),/一致しません/);
 assert.throws(()=>replayArenaCheckpoint({...one,actions:[{...a,actorId:'fake'},...Array(3).fill(a)]}),/一致しません/);
});
test('game resumes only against an authenticated server match and saves confirmed turns',()=>{
 const ui=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const edge=readFileSync(new URL('../supabase/functions/yakusoku-arena/index.ts',import.meta.url),'utf8');
 assert.match(ui,/await arenaApi\.resume\(slot,checkpoint\.matchId\)/);
 assert.match(ui,/status\.questId!==checkpoint\.questId/);
 assert.match(ui,/saveArenaActive\(session\.storage,arenaSession\.ownerId,currentSlot/);
 assert.match(ui,/data-arena-resume/);
 assert.match(edge,/if\(action==='resume'\)/);
 assert.match(edge,/rpc\('lookup',\{p_id:matchId\}\)/);
});
