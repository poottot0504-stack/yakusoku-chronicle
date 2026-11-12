import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProgressionAuditApi} from '../src/online/progression-audit.js';
import {collectionRankingMarkup} from '../src/ui/collection-ranking.js';

function storage(){
 const values=new Map();
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}
function event(battleId,eventId){
 return {battleId,eventId,playerId:'player-one',characterId:'hero',expAwarded:100};
}
const response=value=>({ok:true,status:200,json:async()=>value});
const acknowledged=(accepted=[],rejected=[],processed=[])=>({
 ok:true,ack_version:2,policy_version:13,
 accepted_battles:accepted.length,rejected_battles:rejected.length,
 accepted_battle_ids:accepted,
 already_processed_battle_ids:processed,
 rejected_battle_details:rejected.map(battleId=>({battleId,reason:'progression_chain_mismatch'}))
});

test('per-battle acknowledgements retain rejected full events but clear accepted and duplicates',async()=>{
 const store=storage();let calls=0;
 const api=createProgressionAuditApi('https://example.invalid',store,async()=>{},'player-one',async()=>{
  calls++;return response(acknowledged(['a'],['b'],['c']));
 });
 const r=await api.record([event('a','event-a'),event('b','event-b'),event('c','event-c')]);
 assert.equal(r.ok,true);
 assert.equal(r.acceptedBattles,1);
 assert.equal(r.rejectedBattles,1);
 assert.equal(api.pending(),0);
 assert.equal(api.pendingReview(),1);
 const preserved=JSON.parse(store.getItem('yakusoku_progress_audit_review_queue'));
 assert.equal(preserved[0].event.battleId,'b');
 assert.equal(preserved[0].reason,'progression_chain_mismatch');
 assert.equal(preserved[0].policyVersion,13);
 await api.flush();
 assert.equal(calls,1,'a rejected battle is not replayed forever');
});

test('incomplete server acknowledgements keep all original events for retry',async()=>{
 const store=storage();
 const api=createProgressionAuditApi('https://example.invalid',store,async()=>{},'player-one',async()=>response({
  ...acknowledged(['a']),accepted_battle_ids:['a'],rejected_battle_details:[]
 }));
 const r=await api.record([event('a','event-a'),event('b','event-b')]);
 assert.equal(r.ok,false);
 assert.equal(api.pending(),2);
 assert.equal(api.pendingReview(),0);
});

test('a rejected event can retry once after a newer server validation policy, not before',async()=>{
 const store=storage();let policyVersion=13,battleCalls=0;
 const fetcher=async(_url,options)=>{
  const body=JSON.parse(options.body);
  if(body.action==='progression_audit_policy')return response({ok:true,policy_version:policyVersion});
  battleCalls++;
  if(battleCalls===1)return response(acknowledged([],['b']));
  return response({...acknowledged(['b']),policy_version:14});
 };
 const api=createProgressionAuditApi('https://example.invalid',store,async()=>{},'player-one',fetcher);
 await api.record([event('b','event-b')]);
 assert.equal(api.pendingReview(),1);
 const same=await api.retryReview();
 assert.equal(same.requeued,0);
 assert.equal(battleCalls,1);
 policyVersion=14;
 const next=await api.retryReview();
 assert.equal(next.requeued,1);
 await api.flush();
 assert.equal(api.pending(),0);
 assert.equal(api.pendingReview(),0);
 assert.equal(battleCalls,2);
});

test('ranking shows local pending-verification warning but does not invent points',()=>{
 const html=collectionRankingMarkup({rows:[],totalParticipants:0,auditPendingReview:4},Date.parse('2026-11-09T08:30:00+09:00'));
 assert.match(html,/戦闘検証待ちの記録が4件/);
 assert.match(html,/承認済みの討伐のみ/);
 assert.doesNotMatch(html,/あなたの順位：/);
});

test('the Edge Function exposes no unconditional backfill and keeps all anti-cheat limits',()=>{
 const edge=readFileSync(new URL('../supabase/functions/yakusoku-player-stats/index.ts',import.meta.url),'utf8');
 for(const guard of [
  'if((recentCount??0)+submittedBattles>27)',
  'progression_audit_policy',
  'new Set(events.map(e=>String(e?.battleId??""))).size',
  'ack_version:2',
  'accepted_battle_ids:acceptedBattleIds',
  'already_processed_battle_ids:alreadyProcessedBattleIds',
  'rejected_battle_details:rejectedBattleDetails',
  'if(expAwarded>(deepEndgameBoss?8_000_000:2_000_000))',
  'progression_chain_mismatch',
  'raw_exp_over_limit',
  'collection_one_time_rebaseline'
 ])assert.ok(edge.includes(guard),guard);
 assert.doesNotMatch(edge,/update.*collection_tallies_202611.*set proof_count/is);
});
