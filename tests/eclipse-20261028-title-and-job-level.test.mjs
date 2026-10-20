import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ECLIPSE_EVENT,ECLIPSE_EQUIPMENT,ECLIPSE_TIERS} from '../src/data/eclipse-2026.js';
import {EQUIPMENT} from '../src/data/equipment.js';
import {getRequiredJobLevel} from '../src/core/equipment-requirements.js';
import {getEclipseEventStatus,getNextEventBoundary} from '../src/core/events.js';
import {eclipseEventNoticeMarkup,eclipseEventDetailsMarkup,titleEventNoticeMarkup} from '../src/ui/events.js';

const ann=Date.parse('2026-10-28T00:00:00+09:00');
const open=Date.parse('2026-10-31T00:00:00+09:00');
const end=Date.parse('2026-11-02T00:00:00+09:00');

test('rank I needs Job Lv 1, rank II Job Lv 50, both unchanged after enhancement',()=>{
 assert.equal(ECLIPSE_TIERS.length,2);
 assert.equal(Object.keys(ECLIPSE_EQUIPMENT).length,48);
 for(const d of Object.values(ECLIPSE_EQUIPMENT)){
  const expected=d.id.startsWith('eclipse-ii-')?50:1;
  assert.equal(d.requiredLevel,expected,d.id);
  assert.equal(d.noEventLevelScaling,true,d.id);
  const def=EQUIPMENT[d.id];
  assert.equal(def.requiredLevel,expected,d.id);
  for(const level of [0,1,5,8,10,15]){
   assert.equal(getRequiredJobLevel(def,{enhanceLevel:level}),expected,`${d.id} +${level}`);
  }
 }
});

test('all star eclipse gear has dark-element resistance, with rank II slightly higher',()=>{
 for(const [id,gear] of Object.entries(EQUIPMENT)){
  if(!id.startsWith('eclipse-'))continue;
  const rankII=id.startsWith('eclipse-ii-');
  const expected=(gear.slot==='weapon'?1:gear.slot==='body'||gear.slot==='shield'?3:2)+(rankII?1:0);
  assert.deepEqual(gear.elementResist,{dark:expected/100},`${id}: expected ${expected}% dark resistance`);
 }
});

test('other event equipment still uses the original required job level scaling',()=>{
 const first=EQUIPMENT['halloween-i-blade'],third=EQUIPMENT['halloween-iii-blade'];
 assert.equal(getRequiredJobLevel(first,{enhanceLevel:0}),first.requiredLevel);
 assert.equal(getRequiredJobLevel(first,{enhanceLevel:5}),first.requiredLevel+25);
 assert.equal(getRequiredJobLevel(third,{enhanceLevel:5}),third.requiredLevel+50);
});

test('JST Oct 28 announcement is hidden before midnight and visible at precisely midnight',()=>{
 assert.equal(ECLIPSE_EVENT.announcementStart,ann);
 assert.equal(ECLIPSE_EVENT.startsAt,open);
 assert.equal(ECLIPSE_EVENT.endsAt,end);
 assert.equal(getEclipseEventStatus(ann-1).announced,false);
 assert.equal(getEclipseEventStatus(ann-1).phase,'hidden');
 assert.equal(eclipseEventNoticeMarkup(ann-1),'');
 assert.doesNotMatch(titleEventNoticeMarkup(ann-1),/data-eclipse-event-notice/);
 assert.equal(getEclipseEventStatus(ann).announced,true);
 assert.equal(getEclipseEventStatus(ann).active,false);
 const notice=eclipseEventNoticeMarkup(ann);
 assert.match(notice,/data-eclipse-event-notice/);
 assert.match(notice,/eclipse-gate-2026\.svg/);
 assert.match(notice,/10\/31 0:00 ～ 11\/1 23:59/);
 assert.match(titleEventNoticeMarkup(ann),/data-eclipse-event-notice/);
});

test('event status and title switch at Oct 31 and retire after Nov 1 end',()=>{
 assert.equal(getEclipseEventStatus(open-1).phase,'announced');
 assert.equal(getEclipseEventStatus(open).phase,'active');
 assert.equal(getEclipseEventStatus(open).active,true);
 assert.match(eclipseEventNoticeMarkup(open),/開催期間中！/);
 assert.equal(getEclipseEventStatus(end-1).active,true);
 assert.equal(getEclipseEventStatus(end).phase,'ended');
 assert.equal(getEclipseEventStatus(end).announced,false);
 assert.equal(eclipseEventNoticeMarkup(end),'');
 assert.doesNotMatch(titleEventNoticeMarkup(end),/data-eclipse-event-notice/);
});

test('event scheduler discovers Oct 28, Oct 31 and Nov 2 boundaries for automatic title refreshing',()=>{
 assert.equal(getNextEventBoundary(ann-1),ann);
 assert.equal(getNextEventBoundary(ann),open);
 assert.equal(getNextEventBoundary(open),end);
 assert.equal(getNextEventBoundary(end),null);
});

test('tapping the banner opens a detailed modal with accurate items, event time and Lv1 rules',()=>{
 const details=eclipseEventDetailsMarkup();
 assert.match(details,/eclipse-gate-2026\.svg/);
 assert.match(details,/星蝕の異界門/);
 assert.match(details,/2026年10月31日 0:00 ～ 11月1日 23:59/);
 assert.match(details,/星蝕の欠片/);
 assert.match(details,/異界の魔石/);
 assert.match(details,/亡霊の霊布/);
 assert.match(details,/虚星の結晶/);
 assert.match(details,/ノクスの心核/);
 assert.match(details,/限定装備48種類/);
 assert.match(details,/ⅠはジョブLv1、ⅡはジョブLv50から装備可能/);
 assert.match(details,/イベント終了後も生産できます/);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/data-eclipse-event-notice/);
 assert.match(main,/openModal\(eclipseEventDetailsMarkup\(\)\)/);
 assert.match(main,/getNextEventBoundary\(\)/);
});

test('banner is a committed 3:1 themed asset with no external network dependencies or cut-off',()=>{
 const asset=readFileSync(new URL('../assets/events/eclipse-gate-2026.svg',import.meta.url),'utf8');
 assert.match(asset,/<svg\s/);
 assert.match(asset,/viewBox="0 0 1200 400"/);
 assert.match(asset,/星蝕の異界門/);
 assert.match(asset,/10\/31 0:00/);
 assert.match(asset,/11\/1 23:59/);
 assert.doesNotMatch(asset,/<script|<image[^>]+(?:href|src)=[\"']https?:/i);
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 assert.match(css,/\.eclipse-event-notice>\.event-notice-banner\{[^}]*aspect-ratio:3\/1;object-fit:contain/);
});
