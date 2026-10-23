import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLECTION_EVENT_202611 as EVENT} from '../src/data/collection-event-202611.js';
import {reserveCollectionBattle} from '../src/online/collection-battle-ticket.js';
const enemy={id:'slime-123',bestiaryId:'slime'};
test('normal battle issues server ticket at start and not outside event window',async()=>{
 let requests=[];
 const begin=async args=>{requests.push(args);return {ok:true,battleId:args.battleId}};
 const meta={regionId:'field'},enemies=[enemy,enemy];
 assert.equal(reserveCollectionBattle(meta,enemies,begin,{now:EVENT.startsAt-1}),null);
 assert.equal(reserveCollectionBattle(meta,enemies,begin,{now:EVENT.endsAt}),null);
 const proof=reserveCollectionBattle(meta,enemies,begin,{now:EVENT.startsAt,displayName:'主人公',
  newId:()=> 'uuid-testing'});
 assert.equal(await proof.ticketPromise,true);
 assert.deepEqual(requests[0],{battleId:'uuid-testing',regionId:'field',enemyIds:['slime','slime'],displayName:'主人公'});
});
test('special, boss, rare and non-story region battles never issue tickets',()=>{
 const begin=()=>{throw Error('must not call');};
 for(const meta of [{regionId:'masho'},{regionId:'field',boss:true},{regionId:'field',rematch:true},
  {regionId:'field',eventId:'eclipse'}, {regionId:'field',rareEncounter:true},
  {regionId:'field',guildQuestId:'quest'}])
  assert.equal(reserveCollectionBattle(meta,[enemy],begin,{now:EVENT.startsAt}),null);
 assert.equal(reserveCollectionBattle({regionId:'field'},[{bestiaryId:'storyBoss-field'}],begin,{now:EVENT.startsAt}),null);
});
