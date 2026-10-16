import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {HUNT_FESTIVAL} from '../src/data/hunt-festival.js';
import {createFestivalKillRecorder} from '../src/online/hunt-festival-record.js';
import {festivalBattleType,reserveFestivalBattle,buildRecordedFestivalVictory} from '../src/online/hunt-festival-security.js';
import {buildProgressionAuditEvents} from '../src/online/progression-audit.js';

const at=HUNT_FESTIVAL.start+3600000;
const fight=[{id:'slime'},{id:'slime'},{bestiaryId:'dragon'}];
const audit=(battleId='bb000000-0000-4000-8000-000000000001',ids=['slime','dragon'])=>({battleId,enemyIds:ids,battleType:'normal',clientAt:new Date(at+3000).toISOString()});
const fakeStorage=()=>{
 const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),m};
};

test('a valid non-rematch battle begins with immutable ID, type and original enemies',async()=>{
 let sent=null;
 const p=reserveFestivalBattle({rareEncounter:true},fight,async v=>{sent=v;return {ok:true,protocol:2}},
 {now:at,newId:()=>audit().battleId});
 assert.deepEqual(sent,null);
 assert.equal(await p.ticketPromise,true);
 assert.deepEqual(sent,{battleId:audit().battleId,enemyIds:['slime','slime','dragon'],battleType:'rare'});
 assert.equal(p.battleId,audit().battleId);
});

test('never issue ticket for rematches or raids or battles beyond the event',()=>{
 let count=0;const begin=()=>{count++;return {ok:true,protocol:2}};
 for(const [meta,now] of [[{rematch:true},at],[{isRaid:true},at],[{},HUNT_FESTIVAL.start-1],[{},HUNT_FESTIVAL.end]]){
  assert.equal(reserveFestivalBattle(meta,fight,begin,{now}),null);
 }
 assert.equal(count,0);
});

test('never issue tickets for invalid enemy lists or missing IDs',()=>{
 const begin=()=>assert.fail('should never start');
 for(const v of [[],[{}],Array.from({length:6},()=>({id:'x'})),[{id:'x'.repeat(121)}]]){
  assert.equal(reserveFestivalBattle({},v,begin,{now:at}),null);
 }
});

test('map battle categories to the existing backend allowlist',()=>{
 assert.equal(festivalBattleType({eventId:'halloween'}),'event');
 assert.equal(festivalBattleType({trainingArea:'xp'}),'training');
 assert.equal(festivalBattleType({boss:true}),'boss');
 assert.equal(festivalBattleType({rareEncounter:true}),'rare');
 assert.equal(festivalBattleType({}),'normal');
});

test('v2 battle result is chosen only after a successful ticket response',async()=>{
 const proof=reserveFestivalBattle({},fight,async()=>({ok:true,protocol:2}),{now:at,newId:()=>audit().battleId});
 const output=await buildRecordedFestivalVictory(proof,audit());
 assert.equal(output.protocol,2);
 assert.equal(output.battleId,proof.battleId);
});

test('offline ticket error retains legacy queue compatibility instead of losing the battle',async()=>{
 const proof=reserveFestivalBattle({},fight,async()=>{throw Error('offline')},{now:at,newId:()=>audit().battleId});
 const result=await buildRecordedFestivalVictory(proof,audit());
 assert.equal(result.protocol,undefined);
 assert.equal(result.battleId,proof.battleId);
});

test('unexpected ticket response does not fake a proof',async()=>{
 const proof=reserveFestivalBattle({},fight,async()=>({ok:true,protocol:1}),{now:at,newId:()=>audit().battleId});
 assert.equal((await buildRecordedFestivalVictory(proof,audit())).protocol,undefined);
});

test('no audit event or zero killed enemies cannot make a festival claim',async()=>{
 assert.equal(await buildRecordedFestivalVictory(null,null),null);
 assert.equal(await buildRecordedFestivalVictory(null,{...audit(),enemyIds:[]}),null);
});

test('progression audit uses the same battle ID as the server-issued ticket',()=>{
 const before=[{characterId:'hero',name:'Hero',level:1,exp:0,jobId:'sword',jobLevel:1}];
 const events=buildProgressionAuditEvents({playerId:'uuid',before,after:before,meta:{...audit(),battleId:audit().battleId}});
 assert.equal(events[0].battleId,audit().battleId);
});

test('v2 ticketed victories are stored, acknowledged and removed from retry queue',async()=>{
 let sent=null;
 const storage=fakeStorage();
 const recorder=createFestivalKillRecorder(async b=>{sent=b;return {ok:true,recorded:true,protocol:2}},storage);
 const entry={...audit(),protocol:2};
 const result=await recorder.record(entry);
 assert.equal(result.sent,1);
 assert.equal(recorder.pending(),0);
 assert.deepEqual(sent,entry);
});

test('failed server acknowledgement does not delete local saved kills',async()=>{
 const storage=fakeStorage();
 const recorder=createFestivalKillRecorder(async()=>{throw Error('temporary failure')},storage);
 const b=await recorder.record({...audit(),protocol:2});
 assert.equal(b.remaining,1);
 assert.equal(recorder.pending(),1);
});

test('server migration has nonbreaking monitor-only default and explicit manual strict switch',()=>{
 const sql=readFileSync(new URL('../maintenance/hunt-festival-battle-ticket-v2-20261016.sql',import.meta.url),'utf8');
 assert.match(sql,/strict_mode boolean NOT NULL DEFAULT false/);
 assert.match(sql,/VALUES\(1,false\) ON CONFLICT/);
 assert.match(sql,/IF coalesce\(enforce,false\) THEN RAISE EXCEPTION 'festival_ticket_required'/);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.yakusoku_hunt_festival_record_v2/);
 assert.match(sql,/CREATE OR REPLACE VIEW yakusoku_private\.hunt_festival_security_review/);
 assert.match(sql,/REVOKE ALL ON yakusoku_private\.hunt_festival_battle_tickets FROM PUBLIC,anon,authenticated/);
});

test('server v2 validates battle IDs, account, enemy multiset, and timing',()=>{
 const sql=readFileSync(new URL('../maintenance/hunt-festival-battle-ticket-v2-20261016.sql',import.meta.url),'utf8');
 for(const p of [
  /ticket\.auth_user_id|battle_id=p_battle_id AND auth_user_id=uid/,
  /ticket\.enemy_ids/,
  /ticket\.battle_type/,
  /ticket\.issued_at\+interval '900 milliseconds'/,
  /count\(\*\)>\(/,
  /pg_advisory_xact_lock/,
  /festival_ticket_rate_limited/,
  /festival_rate_limited/,
  /REVOKE ALL ON FUNCTION public\.yakusoku_hunt_festival_record_v2\(uuid,text\[\],text,timestamptz\) FROM PUBLIC,anon/
 ])assert.match(sql,p);
});

test('battle ticket integration never changes five-stage rewards or auto mode',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/battleMeta\.festivalProof=reserveFestivalBattle/);
 assert.match(main,/battleId:meta\?\.festivalProof\?\.battleId/);
 assert.match(main,/buildRecordedFestivalVictory\(meta\?\.festivalProof,audit\)/);
 assert.match(index,/hunt-security-ticket-v2-20261016-v1/);
 const api=readFileSync(new URL('../src/online/hunt-festival-api.js',import.meta.url),'utf8');
 assert.match(api,/battle\.protocol===2\?'yakusoku_hunt_festival_record_v2':'yakusoku_hunt_festival_record'/);
});


test('legitimate offline users keep more than 300 battle records for recovery',()=>{
 const storage=fakeStorage(),recorder=createFestivalKillRecorder(async()=>({ok:false}),storage);
 for(let i=0;i<325;i++)assert.equal(recorder.enqueue({battleId:`20261016-${i}`,enemyIds:['slime'],battleType:'normal',clientAt:new Date(at).toISOString()}),true);
 assert.equal(recorder.pending(),325);
});
