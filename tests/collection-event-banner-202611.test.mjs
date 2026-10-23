import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTION_EVENT_202611 as EVENT } from '../src/data/collection-event-202611.js';
import {collectionBannerPhase,nextCollectionBannerBoundary,collectionEventBannerMarkup,collectionEventDetailsMarkup} from '../src/ui/collection-event-banner.js';

test('Nov 4 00:00 JST is the first moment the announcement can be visible',()=>{
 assert.equal(EVENT.announceAt,Date.parse('2026-11-04T00:00:00+09:00'));
 assert.equal(collectionBannerPhase(EVENT.announceAt-1),'hidden');
 assert.equal(collectionEventBannerMarkup(EVENT.announceAt-1),'');
 assert.equal(collectionBannerPhase(EVENT.announceAt),'announcement');
 assert.match(collectionEventBannerMarkup(EVENT.announceAt),/data-collection-event-details/);
 assert.match(collectionEventBannerMarkup(EVENT.announceAt),/11月6日開幕/);
 assert.equal(collectionBannerPhase(EVENT.startsAt),'active');
 assert.match(collectionEventBannerMarkup(EVENT.startsAt),/開催中/);
 assert.equal(collectionEventBannerMarkup(EVENT.endsAt),'');
});
test('title uses the provided image filename and maintains the actual 8:3 source dimensions',()=>{
 assert.equal(EVENT.banner,'assets/events/collection-proof-202611.webp');
 assert.match(collectionEventBannerMarkup(EVENT.announceAt),/collection-event-banner-img/);
 assert.match(collectionEventDetailsMarkup(),/報酬を受け取る/);
});
test('next event boundary rotates banner automatically on local time schedule',()=>{
 assert.equal(nextCollectionBannerBoundary(EVENT.announceAt-1),EVENT.announceAt);
 assert.equal(nextCollectionBannerBoundary(EVENT.announceAt),EVENT.startsAt);
 assert.equal(nextCollectionBannerBoundary(EVENT.startsAt),EVENT.endsAt);
 assert.equal(nextCollectionBannerBoundary(EVENT.endsAt),Infinity);
});
