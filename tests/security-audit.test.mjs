import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgressionAuditApi,pickProgressionAuditBatch} from '../src/online/progression-audit.js';
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
const ev=(battle,id)=>({battleId:battle,eventId:id,characterId:'c1'});
const success={ok:true,status:200,json:async()=>({ok:true,accepted_battles:1,rejected_battles:0})};
test('party audit events are not split across a batch boundary',()=>{
 const q=[];for(let b=0;b<12;b++)for(let j=0;j<4;j++)q.push(ev('battle-'+b,'event-'+b+'-'+j));
 const batch=pickProgressionAuditBatch(q);
 assert.equal(batch.length,40);assert.equal(new Set(batch.map(e=>e.battleId)).size,10);
});
test('batch never splits a party near its event limit',()=>{
 const q=[];
 for(let b=0;b<9;b++)for(let j=0;j<4;j++)q.push(ev('battle-'+b,'event-'+b+'-'+j));
 for(let j=0;j<4;j++)q.push(ev('last','last-'+j));
 const batch=pickProgressionAuditBatch(q,38,10);
 assert.equal(batch.length,36);
 assert.equal(batch.some(e=>e.battleId==='last'),false);
});
test('slow requests use only one in-flight network call and keep later events queued',async()=>{
 const store=storage();let calls=0,complete;
 const fetcher=async()=>{calls++;return new Promise(resolve=>{complete=()=>resolve(success);});};
 const api=createProgressionAuditApi('https://example.invalid',store,async()=>{},'player',fetcher);
 const one=api.record([ev('battle-1','evt-1')]);
 const two=api.record([ev('battle-2','evt-2')]);
 assert.equal(calls,1);assert.equal(api.pending(),2);
 complete();await Promise.all([one,two]);
 assert.equal(api.pending(),1);assert.equal(calls,1);
 const next=api.flush();complete();await next;
 assert.equal(api.pending(),0);
});
test('acknowledged rejects are removed instead of flooding security event logs',async()=>{
 const store=storage();let calls=0;
 const api=createProgressionAuditApi('https://example.invalid',store,async()=>{},'player',async()=>{calls++;return {ok:true,json:async()=>({ok:true,accepted_battles:0,rejected_battles:1})};});
 const r=await api.record([ev('bad-battle','bad-event')]);
 assert.equal(r.rejectedBattles,1);assert.equal(api.pending(),0);await api.flush();assert.equal(calls,1);
});
test('HTTP 429 retains the audit queue and does not immediately retry',async()=>{
 const store=storage();let calls=0;
 const api=createProgressionAuditApi('https://example.invalid',store,async()=>{},'player',async()=>{calls++;return {ok:false,status:429,headers:{get:()=>null}};});
 const r=await api.record([ev('battle-1','evt-1')]);
 assert.equal(r.ok,false);assert.ok(r.retryAfterMs>0);assert.equal(api.pending(),1);
 const later=await api.flush();assert.equal(later.deferred,true);assert.equal(calls,1);
});
