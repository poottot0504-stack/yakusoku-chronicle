import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { COLLECTION_EVENT_202611 as EVENT } from '../src/data/collection-event-202611.js';
import { collectionEventBannerMarkup,nextCollectionBannerBoundary } from '../src/ui/collection-event-banner.js';
import { collectionRankingMarkup } from '../src/ui/collection-ranking.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const stylesheet=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
const privateSQL=readFileSync(new URL('../maintenance/collection-reward-claim-202611.sql',import.meta.url),'utf8');
const publicSQL=readFileSync(new URL('../maintenance/collection-public-ranking-202611.sql',import.meta.url),'utf8');

test('Nov 4 announcement is included on both title renders and auto-refreshes at schedule boundaries',()=>{
 assert.equal(source.split('${collectionEventBannerMarkup()}').length-1,2);
 assert.match(source,/nextCollectionBannerBoundary\(\)/);
 assert.equal(nextCollectionBannerBoundary(EVENT.announceAt-1),EVENT.announceAt);
 assert.match(collectionEventBannerMarkup(EVENT.announceAt),/collection-proof-202611\.webp/);
 assert.match(stylesheet,/aspect-ratio:8\/3/);
});
test('claim button appears only after event ended and server-approved status is available',()=>{
 const before=collectionRankingMarkup({rewardClaimable:true},EVENT.endsAt-1);
 const after=collectionRankingMarkup({rewardFinalized:true,rewardClaimable:true},EVENT.endsAt);
 const already=collectionRankingMarkup({rewardFinalized:true,rewardReceipt:{id:'a'},rewardDelivered:true},EVENT.endsAt);
 assert.doesNotMatch(before,/data-collection-reward-claim/);
 assert.match(after,/data-collection-reward-claim/);
 assert.doesNotMatch(already,/data-collection-reward-claim/);
 assert.match(source,/grantCollectionReward\(target,receipt,slot\)/);
 assert.match(source,/data-collection-reward-refresh/);
});
test('database migration uses private RLS-protected rewards and no direct table access',()=>{
 assert.match(privateSQL,/collection_final_standings_202611/);
 assert.match(privateSQL,/collection_reward_claims_202611/);
 assert.match(privateSQL,/pg_advisory_xact_lock/);
 assert.match(privateSQL,/enable row level security/i);
 assert.match(privateSQL,/grant execute on function public\.yakusoku_collection_claim\(integer\) to authenticated,service_role/);
 assert.match(publicSQL,/revoke all on yakusoku_private\.collection_tallies_202611 from public,anon,authenticated/);
 assert.match(publicSQL,/jsonb_build_object\([\s\S]*?'displayName'[\s\S]*?'count'/);
 assert.doesNotMatch(publicSQL,/'email'|'investigation'|'ip_address'/);
});
