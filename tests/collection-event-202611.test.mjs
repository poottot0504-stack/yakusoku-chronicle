import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTION_EVENT_202611 as EVENT } from '../src/data/collection-event-202611.js';
import { collectionEventPhase,collectionDropPreview } from '../src/core/collection-event.js';

const jst=t=>Date.parse(t);
const begin=jst('2026-11-06T00:05:00+09:00');
const end=jst('2026-11-06T00:05:08+09:00');
const normal=(id,n)=>({id:n,bestiaryId:id,side:'enemy',hp:0,escaped:false});
const preview=(meta,actors,started=begin,finished=end)=>collectionDropPreview(meta,actors,started,finished);

test('November 6 00:00 through November 16 23:59:59 JST is the precise event period',()=>{
 assert.equal(EVENT.guaranteedDropsPerMonster,1);
 assert.equal(collectionEventPhase(EVENT.startsAt-1),'upcoming');
 assert.equal(collectionEventPhase(EVENT.startsAt),'active');
 assert.equal(collectionEventPhase(EVENT.endsAt-1),'active');
 assert.equal(collectionEventPhase(EVENT.endsAt),'ended');
});

test('one guaranteed proof for each ordinary dungeon monster actually defeated',()=>{
 const monsters=[normal('slime','fight-a'),normal('monster002','fight-b'),normal('slime','fight-c')];
 assert.deepEqual(preview({regionId:'field'},monsters),{
  eventId:EVENT.id,itemId:EVENT.itemId,count:3,enemyIds:['slime','monster002','slime']
 });
});

test('no proof for escape, living enemy, forged enemy, or duplicate actor id',()=>{
 const monsters=[normal('slime','1'),{...normal('slime','2'),escaped:true},
  {...normal('slime','3'),hp:7},normal('fake-monster','4'),normal('slime','1')];
 assert.equal(preview({regionId:'field'},monsters).count,1);
});

test('event, rare, cave, rematch, boss, training and guild fights cannot inflate ranking',()=>{
 const regular=[normal('slime','1')];
 for(const meta of [{regionId:'masho'},{regionId:'event:training'},{regionId:'field',rematch:true},
  {regionId:'field',boss:true},{regionId:'field',rareEncounter:true},
  {regionId:'field',eventId:'other-event'},{regionId:'field',trainingArea:'test'},
  {regionId:'field',guildQuestId:'quest'},{regionId:'field',mashoFloor:1},
  {regionId:'field',isRaid:true}]){
  assert.equal(preview(meta,regular).count,0,JSON.stringify(meta));
 }
 assert.equal(preview({regionId:'field'},[normal('storyBoss-field','boss')]).count,0);
 assert.equal(preview({regionId:'field'},[normal('monster012','other-region')]).count,0);
});

test('battle start and victory must both be in event window',()=>{
 const m=[normal('slime','a')],meta={regionId:'field'};
 assert.equal(preview(meta,m,EVENT.startsAt-1,EVENT.startsAt+8000).count,0);
 assert.equal(preview(meta,m,EVENT.endsAt-8000,EVENT.endsAt).count,0);
 assert.equal(preview(meta,m,EVENT.startsAt,EVENT.startsAt+8000).count,1);
 assert.equal(preview(meta,m,EVENT.endsAt-8000,EVENT.endsAt-1).count,1);
});
