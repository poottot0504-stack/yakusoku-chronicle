import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { COLLECTION_EVENT_202611 as EVENT } from '../src/data/collection-event-202611.js';
import {collectionRankingMarkup,collectionRankingTitleButton,COLLECTION_RANKING_PAGE_SIZE} from '../src/ui/collection-ranking.js';
import {createCollectionRankingApi} from '../src/online/collection-ranking-api.js';

const mockState={rows:[{rank:1,displayName:'旅人A',count:380},{rank:2,displayName:'旅人B',count:230}],totalParticipants:123,page:1,myRank:6,myCount:34};
test('every player can discover the shared ranking from the title once event begins',()=>{
 assert.equal(collectionRankingTitleButton(EVENT.startsAt-1),'');
 assert.match(collectionRankingTitleButton(EVENT.startsAt),/data-collection-ranking-open/);
 assert.match(collectionRankingTitleButton(EVENT.endsAt+1),/data-collection-ranking-open/);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/collectionRankingTitleButton\(\)/);
 assert.match(main,/data-collection-ranking-open/);
 assert.match(main,/collectionRankingMarkup/);
 assert.match(main,/data-collection-ranking-page/);
});
test('shows public name, exact position, counts and own ranking with pagination',()=>{
 const output=collectionRankingMarkup(mockState,EVENT.startsAt+5000);
 assert.match(output,/旅人A/);
 assert.match(output,/380個/);
 assert.match(output,/あなたの順位：/);
 assert.match(output,/6位/);
 assert.match(output,/data-collection-ranking-page="2"/);
 assert.match(output,/参加者 123人/);
});
test('never prints user-controlled HTML or server-private fields',()=>{
 const output=collectionRankingMarkup({
  rows:[{rank:1,displayName:'<script>alert("oops")</script>',count:5,auth_user_id:'secret',email:'do-not-display',isCheater:true}],
  totalParticipants:1,page:1,myRank:null
 },EVENT.startsAt+5000);
 assert.doesNotMatch(output,/<script>/);
 assert.match(output,/&lt;script&gt;/);
 assert.doesNotMatch(output,/secret|do-not-display|isCheater/);
});
test('before start has no rows or pagination; empty and errors have explicit states',()=>{
 assert.match(collectionRankingMarkup({},EVENT.startsAt-1),/11月6日/);
 assert.doesNotMatch(collectionRankingMarkup({},EVENT.startsAt-1),/data-collection-ranking-page/);
 assert.match(collectionRankingMarkup({rows:[],totalParticipants:0},EVENT.startsAt),/データがありません/);
 assert.match(collectionRankingMarkup({error:true},EVENT.startsAt),/通信エラー/);
});
test('public client requests one limited page and ignores private response fields',async()=>{
 let request;
 const api=createCollectionRankingApi({storage:null,authorizedFetch:async(url,options)=>{
  request={url,options};
  return {ok:true,json:async()=>({
   rows:[{rank:1,displayName:'旅人A',count:80,auth_user_id:'do-not-return',investigation:'secret'}],
   totalParticipants:1,myRank:1,myCount:80
  })};
 }});
 const data=await api.page(1);
 assert.deepEqual(data.rows,[{rank:1,displayName:'旅人A',count:80}]);
 assert.match(request.url,/yakusoku_collection_public_ranking/);
 assert.equal(request.options.method,'POST');
 assert.deepEqual(JSON.parse(request.options.body),{
  p_event_id:EVENT.id,p_page:1,p_page_size:COLLECTION_RANKING_PAGE_SIZE
 });
 await assert.rejects(()=>api.page(0),/ページが不正/);
});
test('API fails closed rather than displaying invented ranking scores',async()=>{
 const api=createCollectionRankingApi({storage:null,authorizedFetch:async()=>({ok:false,json:async()=>null})});
 await assert.rejects(()=>api.page(1),/取得できません/);
});
