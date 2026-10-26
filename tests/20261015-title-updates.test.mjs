import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TITLE_UPDATES} from '../src/data/title-updates.js';
import {titleUpdatesMarkup} from '../src/ui/title-updates.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const main=readFileSync(resolve(root,'src/main.js'),'utf8');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const css=readFileSync(resolve(root,'styles/title-updates.css'),'utf8');

test('title displays dated recent updates with key feature summaries',()=>{
 assert.equal(TITLE_UPDATES[0].date,'2026-10-26');
 assert.equal(TITLE_UPDATES[1].date,'2026-10-16');
 assert.equal(TITLE_UPDATES[2].date,'2026-10-15');
 const h=titleUpdatesMarkup();
 assert.match(h,/アップデート情報/);
 for(const item of ['闘技大会','ボス','コイン','2026.10.26'])assert.ok(h.includes(item));
 assert.match(h,/ページ 1 \/ 3/);
 assert.match(h,/data-title-update-page="2"/);
 assert.match(h,/data-title-update-details/);
 assert.doesNotMatch(h,/<details[^>]+\bopen\b/);
});
test('open update pane expands the details and is accessible with summary',()=>{
 const h=titleUpdatesMarkup(true,3);
 assert.match(h,/<details[^>]+\bopen\b/);
 for(const item of ['フリーマーケット','強化結晶'])assert.ok(h.includes(item));
 assert.doesNotMatch(h,/2倍の書|ドロップアイテム2倍の書|プレイ時間制/);
 assert.match(h,/<summary>/);
 assert.match(css,/:focus-visible/);
});
test('update listing is integrated in title only and survives re-render',()=>{
 assert.match(main,/\$\{titleUpdatesMarkup\(titleUpdateDetailsOpen,titleUpdatePage\)\}/);
 assert.match(main,/addEventListener\('toggle'/);
 assert.match(main,/let titleUpdateDetailsOpen=false/);
 assert.match(main,/let titleUpdatePage=1/);
 assert.match(main,/data-title-update-page/);
 assert.match(html,/title-updates.css\?v=title-update-pages-20261016/);
 assert.match(html,/main.js\?v=hunt-security-ticket-v2-20261016-v1/);
});

test('latest arena update and all historical event updates remain accessible',()=>{
 const recent=titleUpdatesMarkup(true,1);
 const previous=titleUpdatesMarkup(true,2);
 const historic=titleUpdatesMarkup(true,3);
 assert.match(recent,/闘技大会登場/);
 assert.match(recent,/固定パーティ/);
 assert.match(recent,/HPをそれぞれ約17％/);
 assert.match(previous,/100万G/);
 assert.match(previous,/オリハル2個/);
 assert.match(previous,/500万G/);
 assert.match(previous,/オリハルコン2個/);
 assert.match(previous,/最大HPの90%から40%/);
 assert.match(historic,/2026.10.15/);
 assert.match(historic,/レイド・装備・冒険の改善アップデート/);
 assert.match(historic,/ページ 3 \/ 3/);
 assert.match(css,/title-update-page-buttons/);
});
