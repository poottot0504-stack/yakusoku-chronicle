import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState} from '../src/core/adventure.js';
import {equipmentMarkup} from '../src/ui/equipment.js';
import {normalizeEquipmentSearch,equipmentMatchesSearch,equipmentCandidateVisible} from '../src/ui/equipment-search.js';

function withEquipment(){
 const state=ensureAdventureState(createNewGame(createDefaultRoster()));
 state.equipmentInventory=[
  {instanceId:'test-sword',equipmentId:'ironSword',enhanceLevel:0},
  {instanceId:'test-staff',equipmentId:'noviceStaff',enhanceLevel:0},
  {instanceId:'test-shield',equipmentId:'smallShield',enhanceLevel:0},
  {instanceId:'test-charm',equipmentId:'travelerCharm',enhanceLevel:0}
 ];
 state.characters[0].equipment={...state.characters[0].equipment,weapon:'test-sword'};
 return state;
}

test('search normalizes kana width, case, spaces, and matches multiple terms',()=>{
 assert.equal(normalizeEquipmentSearch('  ＡＢＣ  '),'abc');
 assert.equal(equipmentMatchesSearch('魔障の大剣 +15','魔障 大剣'),true);
 assert.equal(equipmentMatchesSearch('魔障の大剣 +15','魔障の杖'),false);
 assert.equal(equipmentMatchesSearch('Iron SWORD','ＩＲＯＮ sword'),true);
 assert.equal(equipmentMatchesSearch('鉄の剣',''),true);
});

test('category and name filters must both match, including unequipped',()=>{
 const params={itemCategory:'weapon',name:'鉄の剣',unequipped:false};
 assert.equal(equipmentCandidateVisible({...params,category:'all',query:'剣'}),true);
 assert.equal(equipmentCandidateVisible({...params,category:'weapon',query:'鉄'}),true);
 assert.equal(equipmentCandidateVisible({...params,category:'armor',query:'鉄'}),false);
 assert.equal(equipmentCandidateVisible({...params,category:'unequipped',query:'鉄'}),false);
 assert.equal(equipmentCandidateVisible({...params,unequipped:true,category:'unequipped',query:'鉄'}),true);
 assert.equal(equipmentCandidateVisible({...params,category:'weapon',query:'杖'}),false);
});

test('equipment screen filters candidate cards while preserving existing equipped slots and character state',()=>{
 const state=withEquipment(),hero=state.characters[0];
 const snapshot=structuredClone(state);
 const markup=equipmentMarkup(state,hero.id,'見習い');
 assert.match(markup,/data-equipment-search[^>]*value="見習い"/);
 assert.match(markup,/data-equipment-search-name="見習いの杖"/);
 assert.match(markup,/data-equipment-search-name="鉄の剣"[^>]*hidden/);
 assert.match(markup,/1種を表示/);
 assert.match(markup,/data-equipment-current-category="weapon"/);
 assert.match(markup,/data-equip="test-staff"/);
 assert.deepEqual(state,snapshot);
});

test('empty results, category changes and special characters are rendered safely',()=>{
 const state=withEquipment(),id=state.characters[0].id;
 state.ui??={};state.ui.equipmentCategory='weapon';
 let markup=equipmentMarkup(state,id,'該当なし');
 assert.match(markup,/0種を表示/);
 assert.match(markup,/検索に一致する装備がありません。/);
 assert.match(markup,/data-equipment-search-clear/);
 state.ui.equipmentCategory='armor';
 markup=equipmentMarkup(state,id,'見習い');
 assert.match(markup,/0種を表示/);
 assert.match(markup,/data-equipment-category="armor"/);
 const escaped=equipmentMarkup(state,id,'"><img src=x>');
 assert.match(escaped,/value="&quot;&gt;&lt;img src=x&gt;"/);
 assert.doesNotMatch(escaped,/value=""><img/);
});

test('live input event preserves keyboard focus and CSS is safe on iPhone',()=>{
 const script=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(script,/game\.addEventListener\('input',e=>\{const input=e\.target;if\(view!=='equipment'/);
 assert.match(script,/equipmentSearch=String\(input\.value\?\?''\)\.slice\(0,100\);syncEquipmentCandidateFilters\(\)/);
 assert.match(script,/if\(el\.hasAttribute\('data-equipment-search-clear'\)\)/);
 assert.match(css,/\.equipment-search-controls>input\{[^}]*font-size:16px/);
 assert.match(html,/main\.js\?v=hunt-security-ticket-v2-20261016-v1-equipment-search-20261019-v1/);
 assert.match(html,/main\.css\?v=mobile-region-map-20261018-v2-equipment-search-20261019-v1/);
});
