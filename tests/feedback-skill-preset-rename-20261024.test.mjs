import test from 'node:test';
import assert from 'node:assert/strict';
import { renameSkillPreset,getSkillPresetName,normalizeSkillPresetNames,SKILL_PRESET_COUNT } from '../src/core/skill-presets.js';
import {migrateSave} from '../src/core/save-migration.js';
import {skillLoadoutMarkup} from '../src/ui/skills.js';
import {createDefaultState} from '../src/core/save-schema.js';

test('all ten skill set labels may be renamed without altering stored builds',()=>{
 const state=createDefaultState();
 state.skillPresets[0]={originJob:'swordsman',skills:[{sourceJob:'swordsman',skillId:'hit'}],sourceCharacterName:'旅人'};
 const before=structuredClone(state.skillPresets);
 for(let slot=1;slot<=SKILL_PRESET_COUNT;slot++){
  const named=renameSkillPreset(state,slot,`  対ボス用 ${slot}  `);
  assert.equal(named.name,`対ボス用 ${slot}`);
  assert.equal(getSkillPresetName(state,slot),`対ボス用 ${slot}`);
 }
 assert.deepEqual(state.skillPresets,before);
 assert.equal(state.skillPresetNames.length,10);
});

test('empty names reset to default and malformed names cannot cause HTML injection',()=>{
 const state=createDefaultState();
 renameSkillPreset(state,2,'雷属性対策');
 assert.equal(renameSkillPreset(state,2,'   ').name,'セット2');
 assert.equal(getSkillPresetName(state,2),'セット2');
 assert.throws(()=>renameSkillPreset(state,4,'字'.repeat(25)),/24文字以内/);
 assert.throws(()=>renameSkillPreset(state,11,'詐称'),/番号が不正/);
 assert.throws(()=>renameSkillPreset(state,4,'行\n改行'),/使用できない文字/);
 const normalize=normalizeSkillPresetNames(['a',42,null,...Array(50).fill('Z')]);
 assert.equal(normalize.length,10);
 assert.equal(normalize[1],'');
});

test('save migration retains old preset data and new names after reopening',()=>{
 const initial=createDefaultState();
 renameSkillPreset(initial,3,'周回');
 const after=migrateSave({...initial});
 assert.equal(after.skillPresetNames[2],'周回');
 assert.equal(getSkillPresetName(after,1),'セット1');
 const old=migrateSave({...initial,skillPresetNames:undefined});
 assert.equal(old.skillPresetNames.length,10);
 assert.equal(getSkillPresetName(old,3),'セット3');
});

test('loadout UI shows custom names and editable save/apply controls',()=>{
 const state=createDefaultState();
 state.characters=[{id:'hero',name:'旅人',currentJob:'swordsman',jobLevels:{swordsman:1},battleSkillLoadouts:{},battleSkillLoadoutManual:{}}];
 renameSkillPreset(state,1,'ドラゴン討伐');
 const html=skillLoadoutMarkup(state,'hero');
 assert.match(html,/ドラゴン討伐/);
 assert.match(html,/data-skill-preset-rename="1"/);
 assert.match(html,/data-skill-preset-save="1"/);
 assert.match(html,/data-skill-preset-apply="1"/);
});
