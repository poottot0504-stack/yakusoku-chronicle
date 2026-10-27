import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState} from '../src/core/adventure.js';
import {EQUIPMENT} from '../src/data/equipment.js';
import {equipmentMarkup,equipmentCategoryFor} from '../src/ui/equipment.js';
import {forgeMarkup} from '../src/ui/forge.js';
import {depthAccessoryEffects,applyDepthTurnRegen} from '../src/core/masho-depth-effects.js';

const REWARDS=[
 ['masho-26-eternal-tree-blessing','悠久樹の祝福','毎ターン終了時に最大HPと最大MPをそれぞれ1％回復'],
 ['masho-27-infernal-eclipse-ring','獄炎の蝕戒','防御力を確実に0.1％減少'],
 ['masho-28-final-claussolas','終極のクラウソラス','主人公本人']
];
const makeState=()=>{
 const s=ensureAdventureState(createNewGame(createDefaultRoster()));
 s.gold=999999999;
 s.equipmentInventory=REWARDS.map(([id],i)=>({instanceId:'depth-'+(i+26),equipmentId:id,enhanceLevel:0}));
 const hero=s.characters[0];
 hero.jobLevels[hero.currentJob]=400;
 return {s,hero};
};

test('26F charm stays a charm and its real end-of-turn 1% HP/MP recovery is intact',()=>{
 const {s,hero}=makeState();
 const charm=EQUIPMENT[REWARDS[0][0]];
 assert.equal(charm.slot,'accessory');
 assert.equal(charm.accessoryType,'charm');
 assert.equal(equipmentCategoryFor(charm),'charm');
 hero.equipment.accessory2='depth-26';
 const effects=depthAccessoryEffects(s,hero);
 const actor={side:'ally',hp:5000,maxHp:10000,mp:100,maxMp:1000,...effects};
 assert.deepEqual(applyDepthTurnRegen(actor),{hp:100,mp:10});
});

test('equipment candidate cards show the original 26-28F effects without user opening details',()=>{
 const {s,hero}=makeState();
 const html=equipmentMarkup(s,hero.id);
 for(const [id,name,needle] of REWARDS){
  assert.equal(EQUIPMENT[id].description.includes(needle),true,id+' source definition');
  const row=html.match(new RegExp('<article class="equipment-group-card[^]*?'+name+'[^]*?<\\/article>'))?.[0];
  assert.ok(row,name+' equipment candidate exists');
  assert.ok(row.includes('equipment-special-effect'),name+' has visible special-effect text');
  assert.ok(row.includes(needle),name+' shows its actual effect');
 }
});

test('equipped 26F charm itself shows the recovery description in the equipped slot',()=>{
 const {s,hero}=makeState();
 hero.equipment.accessory2='depth-26';
 const html=equipmentMarkup(s,hero.id);
 const slot=html.split('data-equipment-current-category="charm"')[1]?.split('</div>')[0];
 assert.ok(slot);
 assert.match(slot,/悠久樹の祝福/);
 assert.match(slot,/固有効果：/);
 assert.match(slot,/毎ターン終了時に最大HPと最大MPをそれぞれ1％回復/);
});

test('forge enhancement list also explains 26-28F unique equipment abilities',()=>{
 const {s}=makeState();
 s.ui.forgeEnhanceJob='all';
 const html=forgeMarkup(s,'enhance');
 for(const [,name,needle] of REWARDS){
  assert.ok(html.includes(name),name+' is visible in forge');
  assert.ok(html.includes(needle),name+' description is visible in forge');
 }
});
