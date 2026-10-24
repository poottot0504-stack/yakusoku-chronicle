import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isGameUpdateAvailable,fetchLatestGameBuild,validGameBuildId} from '../src/core/game-update.js';

const oldVersion='a'.repeat(24),nextVersion='b'.repeat(24);
test('only a real changed, valid production asset fingerprint shows the red dot',()=>{
 assert.equal(validGameBuildId(oldVersion),true);
 assert.equal(isGameUpdateAvailable(oldVersion,oldVersion),false);
 assert.equal(isGameUpdateAvailable(oldVersion,nextVersion),true);
 assert.equal(isGameUpdateAvailable('',nextVersion),false);
 assert.equal(isGameUpdateAvailable(oldVersion,'<script>'),false);
});

test('manifest fetch bypasses stale browser cache',async()=>{
 let requested;
 const version=await fetchLatestGameBuild(async (url,init)=>{
  requested={url,init};return {ok:true,json:async()=>({buildId:nextVersion})};
 },1234);
 assert.equal(version,nextVersion);
 assert.match(requested.url,/build-version\.json\?check=1234/);
 assert.equal(requested.init.cache,'no-store');
 assert.equal(requested.init.credentials,'same-origin');
 await assert.rejects(()=>fetchLatestGameBuild(async()=>({ok:true,json:async()=>({buildId:'invalid'})})),/不正/);
});

test('game menu has active update button, new-release red dot and save-before-refresh',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const header=readFileSync(new URL('../_headers',import.meta.url),'utf8');
 const build=readFileSync(new URL('../tools/build_worker.py',import.meta.url),'utf8');
 assert.match(main,/data-game-update/);
 assert.match(main,/data-game-update-dot/);
 assert.match(main,/data-skill-preset-rename-confirm/);
 assert.match(main,/saveNow\(\);\s*await flushAccountCloudSave\(currentSlot\)/);
 assert.match(main,/location\.replace\(/);
 assert.match(main,/pollForGameUpdate/);
 assert.match(build,/build-version\.json/);
 assert.match(build,/__CHRONICLE_BUILD_ID__/);
 assert.match(build,/hashlib\.sha256/);
 assert.match(header,/\/build-version\.json[\s\S]*?Cache-Control: no-store/);
});

test('previous 22 jobs are retained and two new shield jobs are added',()=>{
 const data=readFileSync(new URL('../src/data/jobs.js',import.meta.url),'utf8');
 assert.match(data,/J\('shielder','盾士'/);
 assert.match(data,/J\('greatShielder','大盾士'/);
});
