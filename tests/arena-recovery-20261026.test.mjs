import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadArenaPending,saveArenaPending,clearArenaPending,arenaPendingKey} from '../src/online/arena-recovery.js';
import {recordArenaServerReceipt} from '../src/core/arena-authority.js';
import {createDefaultState} from '../src/core/save-schema.js';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const MID='33333333-3333-4333-8333-333333333333';
const RQ='44444444-4444-4444-8444-444444444444';
function store(){
 const map=new Map();
 return {map,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
}
const claim=()=>({kind:'claim',matchId:MID,questId:'arena30',
 actions:[{actorId:'arena-actor-0',type:'attack',targetId:'arena30-stonebeast'}],createdAt:12345678});
const craft=()=>({kind:'craft',itemId:'arena-guardian-shield',requestId:RQ,createdAt:12345678});

test('reload survives a pending claim without leaking to a different auth account or save slot',()=>{
 const st=store(),a=claim();
 saveArenaPending(st,A,2,a);
 assert.deepEqual(loadArenaPending(st,A,2),a);
 assert.equal(loadArenaPending(st,B,2),null);
 assert.equal(loadArenaPending(st,A,3),null);
 assert.notEqual(arenaPendingKey(A,1),arenaPendingKey(A,2));
 assert.throws(()=>saveArenaPending(st,A,2,craft()),/未完了/);
 assert.deepEqual(loadArenaPending(st,A,2),a);
 assert.throws(()=>clearArenaPending(st,A,2,craft()),/別の/);
 assert.deepEqual(loadArenaPending(st,A,2),a);
 clearArenaPending(st,A,2,a);
 assert.equal(loadArenaPending(st,A,2),null);
});

test('retry journal never includes client coin awards; rejects malformed or oversized entries',()=>{
 const st=store(),a=claim();
 assert.deepEqual(Object.keys(saveArenaPending(st,A,1,a)).sort(),['actions','createdAt','kind','matchId','questId']);
 assert.throws(()=>saveArenaPending(st,B,1,{...a,kind:'claim',actions:Array(401).fill(a.actions[0])}),/不正/);
 assert.throws(()=>saveArenaPending(st,B,1,{...a,matchId:'bad'}),/不正/);
 assert.throws(()=>saveArenaPending(st,B,1,{kind:'enhance',itemId:'x',requestId:RQ,createdAt:1}),/不正/);
 st.map.set(arenaPendingKey(B,3),'{corrupt');
 assert.throws(()=>loadArenaPending(st,B,3),/読み込めません/);
 assert.throws(()=>arenaPendingKey('someoneelse',1),/ログイン/);
});

test('storage failures prevent starting a potentially unrepeatable financial request',()=>{
 const bad={getItem:()=>null,setItem:()=>{throw Error('storage full')}};
 assert.throws(()=>saveArenaPending(bad,A,1,craft()),/storage full/);
});

test('two retries of one verified match only update local counts once and never local wallet',()=>{
 const s=createDefaultState(),r={matchId:MID,questId:'arena30',victory:true,turns:3,grade:'S',coins:5};
 const originalCoins=s.arena.coins;
 assert.equal(recordArenaServerReceipt(s,r),true);
 assert.equal(recordArenaServerReceipt(s,r),false);
 assert.equal(s.arena.records.arena30.wins,1);
 assert.equal(s.arena.records.arena30.attempts,1);
 assert.equal(s.arena.best.arena30,3);
 assert.equal(s.arena.coins,originalCoins);
 assert.throws(()=>recordArenaServerReceipt(s,{...r,grade:'C'}),/不一致/);
 assert.throws(()=>recordArenaServerReceipt(s,{...r,coins:999}),/不正/);
});
test('battle loss is counted once but never pretends a reward was won',()=>{
 const s=createDefaultState(),r={matchId:MID,questId:'arena70',victory:false,turns:100,grade:null,coins:0};
 recordArenaServerReceipt(s,r);
 recordArenaServerReceipt(s,r);
 assert.equal(s.arena.records.arena70.attempts,1);
 assert.equal(s.arena.records.arena70.wins,0);
 assert.equal(s.arena.coins,0);
});

test('browser uses server-authoritative retry for claims and purchases without local coin minting',()=>{
 const text=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(text,/saveArenaPending\(session\.storage,owner,slot,entry\)/);
 assert.match(text,/clearArenaPending\(session\.storage,ownerId,slot,entry\)/);
 assert.match(text,/await arenaApi\.claim\(slot,entry\.matchId,entry\.actions\)/);
 assert.match(text,/recordArenaServerReceipt\(state,receipt\)/);
 assert.match(text,/showGame\(\);void recoverArenaPending\(\);/);
 assert.doesNotMatch(text,/settleArenaSession\(state,arenaSession\)/);
 assert.doesNotMatch(text,/craftArenaEquipment\(state,/);
});
