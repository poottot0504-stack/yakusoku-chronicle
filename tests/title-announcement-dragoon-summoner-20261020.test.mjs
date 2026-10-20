import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DRAGOON_SUMMONER_TITLE_AT,jobReleaseNoticeMarkup,jobReleaseDetailsMarkup,titleEventNoticeMarkup} from '../src/ui/events.js';
import {JOBS} from '../src/data/jobs.js';

test('title job release banner changes to the two new special jobs on October 20, JST',()=>{
 const release=Date.parse('2026-10-20T00:00:00+09:00');
 assert.equal(DRAGOON_SUMMONER_TITLE_AT,release);
 assert.equal(jobReleaseNoticeMarkup(release-1),'');
 const markup=jobReleaseNoticeMarkup(release);
 assert.match(markup,/新ジョブ追加！/);
 assert.match(markup,/竜騎士＆召喚士 解放！/);
 assert.match(markup,/data-job-release-notice/);
 assert.match(markup,/title-event-notice job-release-notice is-active/);
 assert.doesNotMatch(markup,/アーチャー＆スナイパー/);
 assert.doesNotMatch(markup,/新ジョブ追加予告/);
 assert.ok(titleEventNoticeMarkup(release).includes(markup),'title integration must display the updated promotion');
});

test('tapping the new title banner explains the real job effects and unlock levels',()=>{
 const html=jobReleaseDetailsMarkup();
 assert.match(html,/新ジョブ追加！/);
 assert.match(html,/竜騎士/);
 assert.match(html,/召喚士/);
 assert.match(html,/パラディンのジョブLv30以上/);
 assert.match(html,/黒魔術師のジョブLv30以上/);
 assert.match(html,/イフリート/);
 assert.match(html,/バハムート/);
 assert.match(html,/竜牙突き/);
 assert.match(html,/武器・防具・指輪・チャーム/);
 assert.doesNotMatch(html,/アーチャーを追加|スナイパーも追加|2026年10月13日/);
 assert.deepEqual(JOBS.dragoon.unlock.requires,{paladin:30});
 assert.deepEqual(JOBS.summoner.unlock.requires,{blackMage:30});
});

test('the title screen retains its existing button handler and cache key is new',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/titleEventNoticeMarkup\(\)/);
 assert.match(main,/data-job-release-notice/);
 assert.match(main,/jobReleaseDetailsMarkup\(\)/);
 assert.match(main,/events\.js\?v=[^']+new-jobs-title-20261020/);
 assert.match(html,/src\/main\.js\?v=[^"]+title-job-notice-20261020/);
});
