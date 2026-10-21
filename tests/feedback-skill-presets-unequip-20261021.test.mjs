import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDefaultState,normalizeCharacter } from '../src/core/save-schema.js';
import { migrateSave } from '../src/core/save-migration.js';
import { getSkillPresets,normalizeSkillPresets,saveSkillPreset,applySkillPreset,SKILL_PRESET_COUNT } from '../src/core/skill-presets.js';
import { getSelectedSkillIds,setBattleSkillLoadout } from '../src/core/skillbook.js';
import { skillLoadoutMarkup } from '../src/ui/skills.js';
import { unequipAllEquipment } from '../src/core/equipment.js';

const makeCharacter=(id,name,job='sniper')=>normalizeCharacter({
 id,name,currentJob:job,level:200,jobLevels:{sniper:100,highWizard:100,whiteMage:100,mage:100},
 battleSkillLoadouts:{[job]:[]},battleSkillLoadoutManual:{[job]:true}
},0);
function state(){return {...createDefaultState(),characters:[makeCharacter('sora','ソラ'),makeCharacter('mira','ミラ')],equipmentInventory:[]};}
test('ten shared skill presets are empty on fresh saves and survive save migration',()=>{
 const s=state();assert.equal(SKILL_PRESET_COUNT,10);
 assert.equal(getSkillPresets(s).length,10);
 assert.deepEqual(getSkillPresets(s),Array(10).fill(null));
 setBattleSkillLoadout(s.characters[0],['pinpointShot']);
 saveSkillPreset(s,'sora',1);
 const stored=structuredClone(s.skillPresets);
 const next=migrateSave(s);
 assert.deepEqual(getSkillPresets(next),stored);
 assert.deepEqual(getSelectedSkillIds(next.characters[0]),['pinpointShot']);
});
test('skill set saved for Sora can be loaded by Mira instantly without changing Sora',()=>{
 const s=state();
 setBattleSkillLoadout(s.characters[0],['pinpointShot','doubleSnipe']);
 const before=[...getSelectedSkillIds(s.characters[0])];
 const saved=saveSkillPreset(s,'sora',1);
 assert.equal(saved.count,2);
 assert.deepEqual(getSkillPresets(s)[0].skills,[{sourceJob:'sniper',skillId:'pinpointShot'},{sourceJob:'sniper',skillId:'doubleSnipe'}]);
 setBattleSkillLoadout(s.characters[1],['armorPierce']);
 const out=applySkillPreset(s,'mira',1);
 assert.deepEqual(out,{slot:1,equipped:2,skipped:0,characterId:'mira'});
 assert.deepEqual(getSelectedSkillIds(s.characters[1]),before);
 assert.deepEqual(getSelectedSkillIds(s.characters[0]),before);
});
test('same skills saved by a different job restore inherited skill IDs safely',()=>{
 const s=state();
 const c=s.characters[0];
 c.currentJob='highWizard';
 setBattleSkillLoadout(c,['highFlare','whiteMage::highHeal']);
 saveSkillPreset(s,'sora',2);
 assert.deepEqual(getSkillPresets(s)[1].skills,[{sourceJob:'highWizard',skillId:'highFlare'},{sourceJob:'whiteMage',skillId:'highHeal'}]);
 const target=s.characters[1];
 target.currentJob='whiteMage';
 const result=applySkillPreset(s,'mira',2);
 assert.deepEqual(getSelectedSkillIds(target),['highWizard::highFlare','highHeal']);
 assert.equal(result.skipped,0);
});
test('incompatible jobs and missing learned skills do not corrupt the current loadout',()=>{
 const s=state();
 setBattleSkillLoadout(s.characters[0],['pinpointShot','doubleSnipe']);
 saveSkillPreset(s,'sora',3);
 const target=s.characters[1];
 target.currentJob='highWizard';
 setBattleSkillLoadout(target,['highFlare']);
 assert.throws(()=>applySkillPreset(s,'mira',3),/使える習得済みスキルがありません/);
 assert.deepEqual(getSelectedSkillIds(target),['highFlare']);
 target.currentJob='sniper';target.jobLevels.sniper=1;
 const partial=applySkillPreset(s,'mira',3);
 assert.equal(partial.equipped,1);
 assert.equal(partial.skipped,1);
 assert.deepEqual(getSelectedSkillIds(target),['pinpointShot']);
});
test('preset slots reject out-of-range input and tampered data is discarded',()=>{
 const s=state();
 assert.throws(()=>saveSkillPreset(s,'sora',0),/セット番号/);
 assert.throws(()=>saveSkillPreset(s,'sora',11),/セット番号/);
 assert.throws(()=>applySkillPreset(s,'mira',99),/セット番号/);
 assert.throws(()=>applySkillPreset(s,'mira',5),/保存されていません/);
 assert.throws(()=>saveSkillPreset(s,'unknown',1),/キャラクター/);
 const hacked=normalizeSkillPresets([{originJob:'invalid',sourceCharacterName:'a'.repeat(90),skills:[
  {sourceJob:'sniper',skillId:'pinpointShot'},
  {sourceJob:'sniper',skillId:'pinpointShot'},
  {sourceJob:'bad',skillId:'notSkill'},
  {sourceJob:'sniper',skillId:'<script>'}]}]);
 assert.equal(hacked[0].originJob,'');
 assert.equal(hacked[0].sourceCharacterName.length,40);
 assert.deepEqual(hacked[0].skills,[{sourceJob:'sniper',skillId:'pinpointShot'}]);
});
test('ten visible presets show save/apply actions and clear empty states',()=>{
 const s=state();const html=skillLoadoutMarkup(s,'sora');
 assert.equal((html.match(/data-skill-preset-save=/g)||[]).length,10);
 assert.equal((html.match(/data-skill-preset-apply=/g)||[]).length,10);
 assert.match(html,/未保存/);
 assert.match(html,/skill-presets-panel/);
 assert.match(html,/仲間同士で共用できます/);
 saveSkillPreset(s,'sora',10);
 const after=skillLoadoutMarkup(s,'mira');
 assert.match(after,/セット10/);
 assert.match(after,/スナイパー/);
 assert.match(after,/ソラ/);
});
test('all-equipment unequip is one tap, keeps inventory, and cannot accidentally sell',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const section=main.match(/if\(el\.hasAttribute\('data-unequip-all'\)\)\{[^\n]+/);
 assert.ok(section);
 assert.doesNotMatch(section[0],/openModal|data-unequip-all-confirm/);
 assert.match(section[0],/unequipAllEquipment\(state,selectedId\(\)\)/);
 assert.match(section[0],/saveNow\(\)/);
 const s=state();s.equipmentInventory=[{instanceId:'x',equipmentId:'ironSword'}];
 s.characters[0].equipment.weapon='x';const before=structuredClone(s.equipmentInventory);
 assert.equal(unequipAllEquipment(s,'sora').removed,1);
 assert.deepEqual(s.equipmentInventory,before);
});
test('presets actions are wired, guarded during battles and auto-saved',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const action of ['skillPresetSave','skillPresetApply']){
  assert.match(main,new RegExp('if\\(el\\.dataset\\.'+action+'\\)\\{if\\(battle\\|\\|raidRoom\\)'));
 }
 assert.match(main,/saveSkillPreset\(state,el\.dataset\.skillCharacter,el\.dataset\.skillPresetSave\)/);
 assert.match(main,/applySkillPreset\(state,el\.dataset\.skillCharacter,el\.dataset\.skillPresetApply\)/);
 assert.match(main,/renderGameKeepVertical\(\)/);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/skill-presets-20261021/);
});
