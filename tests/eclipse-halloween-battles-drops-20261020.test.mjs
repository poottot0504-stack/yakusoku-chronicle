import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ECLIPSE_EVENT,ECLIPSE_MATERIALS} from '../src/data/eclipse-2026.js';
import {ECLIPSE_ENEMIES,ECLIPSE_ENEMY_LIST} from '../src/data/eclipse-enemies.js';
import {ENEMIES,ENEMY_LIST} from '../src/data/enemies.js';
import {getEclipseEventStatus,makeEclipseWave,getNextEclipseWave} from '../src/core/events.js';
import {awardEclipseWaveBonus} from '../src/core/eclipse-rewards.js';
import {awardBattleDrops} from '../src/core/drops.js';
import {RECIPES} from '../src/data/recipes.js';
import {canCraft,craftItem} from '../src/core/crafting.js';
import {actorArt,backgroundIndex} from '../src/ui/battle-art.js';
import {eventQuestMarkup} from '../src/ui/events.js';
import {getBestiaryEntry,recordEncounter,createBestiaryRematch} from '../src/core/bestiary.js';

const opening=ECLIPSE_EVENT.startsAt,ending=ECLIPSE_EVENT.endsAt;
const save=()=>{
 const state=createNewGame(createDefaultRoster());
 state.gold=1000000;
 return state;
};

test('five unique event enemies are registered without locking the main story bestiary completion',()=>{
 assert.equal(ECLIPSE_ENEMY_LIST.length,5);
 assert.equal(new Set(ECLIPSE_ENEMY_LIST.map(x=>x.id)).size,5);
 for(const enemy of ECLIPSE_ENEMY_LIST){
  assert.equal(ENEMIES[enemy.id],enemy);
  assert.equal(enemy.event,true);
  assert.equal(enemy.eclipseEvent,true);
  assert.equal(enemy.element,'dark');
  assert.ok(ECLIPSE_MATERIALS[enemy.materials.normal]);
  assert.ok(ECLIPSE_MATERIALS[enemy.materials.rare]);
  assert.equal(ENEMY_LIST.includes(enemy),false);
 }
 assert.equal(ECLIPSE_ENEMIES.nox.isBoss,true);
 assert.equal(ECLIPSE_ENEMIES.dragonet.rareMonster,undefined);
});

test('three battles feature four regular enemies then one final Nox with persistent bestiary ids',()=>{
 const state=save();
 const names=['星蝕のスライム','異界のミミック','宵闇のレイス','星喰いドラゴネット','星蝕の支配者・ノクス'];
 const wave1=makeEclipseWave(state,1),wave2=makeEclipseWave(state,2),wave3=makeEclipseWave(state,3);
 assert.equal(wave1.length,2);
 assert.equal(wave2.length,2);
 assert.equal(wave3.length,1);
 assert.deepEqual([...wave1,...wave2,...wave3].map(e=>e.name),names);
 for(const e of [...wave1,...wave2,...wave3]){
  assert.equal(e.bestiaryId.startsWith('event-eclipse-'),true);
  assert.ok(e.maxHp>0&&e.hp===e.maxHp);
  assert.ok(e.stats.attack>0&&e.stats.defense>0);
  assert.ok(e.exp>0&&e.jobExp>0&&e.gold>0);
  assert.ok(e.ai.length>0);
  assert.ok(e.eventEnemy);
  assert.equal(e.eclipseEvent,true);
 }
 assert.equal(wave3[0].eventBoss,true);
 assert.equal(wave3[0].isBoss,true);
 assert.equal(getNextEclipseWave(1),2);
 assert.equal(getNextEclipseWave(2),3);
 assert.equal(getNextEclipseWave(3),null);
 assert.equal(getNextEclipseWave(4),null);
 assert.equal(actorArt({...wave3[0],side:'enemy'}).sheet,'oaths');
 assert.equal(actorArt({...wave1[0],side:'enemy'}).sheet,'normal');
 assert.equal(actorArt({...wave1[1],side:'enemy'}).sheet,'normal');
 assert.equal(backgroundIndex({},[{...wave3[0],side:'enemy'}]),10);
 recordEncounter(state,wave3[0].bestiaryId);
 assert.equal(getBestiaryEntry(state,wave3[0].bestiaryId).name,ECLIPSE_ENEMIES.nox.name);
});

test('3-wave clear yields five real materials from the generic drop and guarantee paths',()=>{
 const state=save(),drops=[];
 for(let w=1;w<=3;w++){
  const enemies=makeEclipseWave(state,w);
  const random=awardBattleDrops(state,enemies,()=>1,opening);
  assert.equal(random.length,0,'random chance 0 ensures deterministic guarantee test');
  const certain=awardEclipseWaveBonus(state,enemies,w,opening);
  assert.ok(certain.length>=2);
  drops.push(...certain);
 }
 assert.equal(state.materials.eclipseShard,3);
 assert.equal(state.materials.riftStone,2);
 assert.equal(state.materials.wraithVeil,2);
 assert.equal(state.materials.voidCrystal,2);
 assert.equal(state.materials.noxCore,1);
 assert.equal(drops.find(d=>d.id==='noxCore')?.qty,1);
 assert.equal(canCraft(state,'craft-eclipse-i-blade',opening).ok,true);
 const crafted=craftItem(state,'craft-eclipse-i-blade',opening);
 assert.equal(crafted.outputId,'eclipse-i-blade');
 assert.ok(state.equipmentInventory.some(e=>e.equipmentId==='eclipse-i-blade'));
});

test('two complete clears supply the required mats to craft a rank II event weapon',()=>{
 const state=save();
 for(let i=0;i<2;i++)for(let w=1;w<=3;w++){
  const enemies=makeEclipseWave(state,w);
  awardEclipseWaveBonus(state,enemies,w,opening);
 }
 assert.equal(canCraft(state,'craft-eclipse-ii-blade',opening).ok,true);
 const result=craftItem(state,'craft-eclipse-ii-blade',opening);
 assert.equal(result.outputId,'eclipse-ii-blade');
 assert.equal(state.materials.noxCore,1);
});

test('event cannot be entered before Oct 31 or from Nov 2; adventure card closes precisely',()=>{
 assert.equal(getEclipseEventStatus(opening-1).active,false);
 assert.equal(getEclipseEventStatus(opening).active,true);
 assert.equal(getEclipseEventStatus(ending-1).active,true);
 assert.equal(getEclipseEventStatus(ending).active,false);
 const state=save();
 assert.doesNotMatch(eventQuestMarkup(state,opening-1),/data-eclipse-event-start/);
 assert.match(eventQuestMarkup(state,opening),/data-eclipse-event-start/);
 assert.match(eventQuestMarkup(state,ending-1),/data-eclipse-event-start/);
 assert.doesNotMatch(eventQuestMarkup(state,ending),/data-eclipse-event-start/);
 assert.match(eventQuestMarkup(state,opening),/ノクスの心核 1個確定/);
});

test('eclipse materials never drop from off-season or bestiary rematches',()=>{
 const state=save();
 const wave=makeEclipseWave(state,1);
 const before=JSON.stringify(state.materials??{});
 for(const now of [opening-1,ending,ending+86400000]){
  assert.equal(awardBattleDrops(state,wave,()=>0,now).length,0);
  assert.equal(awardEclipseWaveBonus(state,wave,1,now).length,0);
 }
 assert.equal(JSON.stringify(state.materials??{}),before);
 assert.equal(awardBattleDrops(state,[{...wave[0],rematch:true}],()=>0,opening).length,0);
 assert.equal(awardEclipseWaveBonus(state,[{...wave[0],rematch:true},wave[1]],1,opening).length,0);
 state.bestiary??={};
 state.bestiary[wave[0].bestiaryId]={encounters:1,defeats:1,elements:{},skills:[],drops:[]};
 assert.throws(()=>createBestiaryRematch(state,wave[0].bestiaryId),/イベント期間中の専用クエスト/);
});

test('guaranteed boss core cannot be farmed using an invalid boss, partial wave or wrong wave',()=>{
 const state=save(),nox=makeEclipseWave(state,3);
 assert.equal(awardEclipseWaveBonus(state,nox,1,opening).length,0);
 assert.equal(awardEclipseWaveBonus(state,nox,2,opening).length,0);
 assert.equal(awardEclipseWaveBonus(state,[],3,opening).length,0);
 assert.equal(awardEclipseWaveBonus(state,[{...nox[0],bestiaryId:'event-eclipse-fake'}],3,opening).length,0);
 assert.equal(awardEclipseWaveBonus(state,[{...nox[0],rematch:true}],3,opening).length,0);
 assert.equal(awardEclipseWaveBonus(state,nox,3,opening).find(d=>d.id==='noxCore')?.qty,1);
 state.materials.noxCore=9999;
 assert.equal(awardEclipseWaveBonus(state,nox,3,opening).some(d=>d.id==='noxCore'),false);
 assert.equal(state.materials.noxCore,9999);
});

test('real generic event drop table only awards event crafting materials',()=>{
 const state=save(),enemies=makeEclipseWave(state,2);
 const awarded=awardBattleDrops(state,enemies,()=>0,opening);
 assert.ok(awarded.length>0);
 assert.ok(awarded.every(d=>ECLIPSE_MATERIALS[d.id]));
 assert.ok(awarded.some(d=>d.id==='wraithVeil'));
 assert.ok(awarded.some(d=>d.id==='voidCrystal'));
 assert.equal(awarded.some(d=>/potion|herb|ether/i.test(d.id)),false);
});

test('main integrates battle entry, settlement, saving and continuation without auto-publishing',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/function startEclipseWave\(wave=1\)/);
 assert.match(main,/if\(!getEclipseEventStatus\(\)\.active\)/);
 assert.match(main,/data-eclipse-event-start/);
 assert.match(main,/getNextEclipseWave\(wave\)/);
 assert.match(main,/awardBattleDrops\(state,defeated,Math\.random,battleMeta\.eventStartedAt\)/);
 assert.match(main,/awardEclipseWaveBonus\(state,defeated,wave,battleMeta\.eventStartedAt\)/);
 assert.match(main,/state\.adventure\.eclipseDrops=mergeDropTotals/);
 assert.match(main,/saveNow\(\);battle=null/);
 assert.match(main,/if\(canContinue\)return startEclipseWave\(next\)/);
 const ui=readFileSync(new URL('../src/ui/events.js',import.meta.url),'utf8');
 assert.match(ui,/data-eclipse-event-start/);
 const art=readFileSync(new URL('../src/ui/battle-art.js',import.meta.url),'utf8');
 assert.match(art,/event-eclipse-nox/);
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(index,/eclipse-battles-20261020/);
});
