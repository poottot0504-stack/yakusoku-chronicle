import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNewGame } from '../src/state/game-state.js';
import { createDefaultRoster } from '../src/data/characters.js';
import { ensureAdventureState } from '../src/core/adventure.js';
import { renameCharacter, personalizeStoryNames } from '../src/core/character-name.js';
import { adventureMarkup } from '../src/ui/adventure.js';
import { festivalMarkup,festivalDetailsMarkup } from '../src/ui/hunt-festival.js';
import { HUNT_FESTIVAL } from '../src/data/hunt-festival.js';
import { getRaidWindow,isRaidActive } from '../src/raid/raidRules.js';

const makeState=()=>ensureAdventureState(createNewGame(createDefaultRoster()));
const ui=now=>festivalMarkup({data:{phase:'active',total:10,eligible:true,bonusReceipts:{}},delivered:false,bonusDelivered:{},pending:0},now);

test('renaming レン never corrupts アレン in static story texts',()=>{
 const state=makeState();
 renameCharacter(state,'ren','リオン');
 assert.equal(personalizeStoryNames(state,'アレンとレンの約束'),'アレンとリオンの約束');
 const markup=adventureMarkup(state,HUNT_FESTIVAL.start+60_000);
 assert.match(markup,/王都リュミエールを離れたアレンたちは/);
 assert.doesNotMatch(markup,/アリオン/);
});

test('both renamed original names map at once without cascading or substring mixing',()=>{
 const state=makeState();
 renameCharacter(state,'hero','レン');
 renameCharacter(state,'ren','アレン');
 assert.equal(personalizeStoryNames(state,'アレンとレン'),'レンとアレン');
 renameCharacter(state,'hero','カナ');
 renameCharacter(state,'ren','星');
 assert.equal(personalizeStoryNames(state,'アレンとレン'), 'カナと星');
});

test('dynamic level-up and battle text already using player names stays unchanged',()=>{
 const state=makeState();
 renameCharacter(state,'ren','リオン');
 state.adventure.message='アレンのLvが3に上がった！\nリオンのLvが3に上がった！';
 const html=adventureMarkup(state,HUNT_FESTIVAL.start+60_000);
 assert.match(html,/アレンのLvが3に上がった/);
 assert.match(html,/リオンのLvが3に上がった/);
 assert.doesNotMatch(html,/アリオン/);
});

test('region intro in adventure message gets renamed without touching other names',()=>{
 const state=makeState();
 renameCharacter(state,'hero','ヒカリ');
 renameCharacter(state,'ren','ケイ');
 const html=adventureMarkup(state,HUNT_FESTIVAL.start+60_000);
 assert.match(html,/王都リュミエールを離れたヒカリたちは/);
 assert.doesNotMatch(html,/王都リュミエールを離れたアレンたちは/);
});

test('festival tells users normal exploration will not spawn raid and normal kills count',()=>{
 const markup=ui(HUNT_FESTIVAL.start+60_000);
 const details=festivalDetailsMarkup();
 for(const text of ['通常探索','18:00','21:00','Lv10','レイドボスに挑戦'])assert.ok(markup.includes(text),text);
 assert.match(markup,/data-hunt-raid-guide/);
 assert.match(markup,/通常モンスターの討伐でも加算/);
 assert.match(details,/探索する.*出現しません/);
 assert.match(details,/討伐済み/);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/data-hunt-raid-guide/);
 assert.match(main,/scrollIntoView/);
});

test('festival raid guide uses actual raid schedule',()=>{
 const jst=(date,time)=>Date.parse(`${date}T${time}+09:00`);
 for(const hour of ['17:00','20:30'])assert.equal(isRaidActive(jst('2026-10-16',hour)),false);
 for(const hour of ['18:00','19:59','21:00','23:59'])assert.equal(isRaidActive(jst('2026-10-16',hour)),true);
 assert.equal(getRaidWindow(jst('2026-10-16','18:00')).period,'evening');
 assert.equal(getRaidWindow(jst('2026-10-16','21:00')).period,'night');
});
