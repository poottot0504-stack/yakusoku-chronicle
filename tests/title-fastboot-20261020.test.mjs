import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');

test('title hero is readable from HTML before JavaScript and network initialization',()=>{
 assert.match(html,/<section id="title-screen"[^>]+><div class="title-card" data-title-boot-skeleton>/);
 assert.match(html,/<h1>約束の<br><span>クロニクル<\/span><\/h1>/);
 assert.match(html,/ゲームを読み込んでいます…/);
 assert.match(html,/title-fastboot-20261020/);
 assert.match(css,/data-title-boot-skeleton/);
});

test('title announcements render before the account API request resolves',()=>{
 assert.match(main,/installPixelIconRenderer\(\);\s*renderTitle\(\);[^\n]*\nvoid initializeAccountSystem\(\);/);
 assert.match(main,/if\(!accountState.ready\)\{\s*title.innerHTML=/);
 assert.match(main,/role="status">アカウントとセーブデータを確認しています…/);
 assert.match(main,/accountState.ready=true;renderTitle\(\);/);
 assert.match(main,/\}const slots=listSaveSlots\(session\);title.innerHTML=/);
 assert.ok(main.indexOf('if(!accountState.ready){',main.indexOf('function renderTitle()'))<main.indexOf('const slots=listSaveSlots(session)',main.indexOf('function renderTitle()')));
 assert.match(main,/\$\{titleUpdatesMarkup\(titleUpdateDetailsOpen,titleUpdatePage\)\}/);
});

test('initial page does not compete with battle sprites for bandwidth',()=>{
 assert.match(html,/rel="preload" as="image" href="\.\/assets\/title-forest\.png"/);
 assert.doesNotMatch(html,/rel="preload" as="image" href="\.\/assets\/battle\//);
});
