import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NORMAL_ENEMY_LIST} from '../src/data/enemies.js';
import {NEW_MONSTERS,newMonsterMaterialId} from '../src/data/new-monsters.js';
import {EQUIPMENT,SUMMONER_SPELLBOOK_TIERS} from '../src/data/equipment.js';
import {RECIPES} from '../src/data/recipes.js';
import {canCraft,craftItem,craftingGoldCost,getAvailableRecipes} from '../src/core/crafting.js';
import {getItemDef} from '../src/core/items.js';

const stateFor=r=>({unlockedSpecialJobs:['summoner'],characters:[],materials:Object.fromEntries(Object.entries(r.materials).map(([id,n])=>[id,n+3])),inventory:[],gold:10_000_000,equipmentInventory:[],unlockedRecipes:[],newRecipes:[]});

test('each summoner book retains its original ingot recipe and gains two real monster drop routes',()=>{
 assert.equal(SUMMONER_SPELLBOOK_TIERS.length,5);
 const regionalIndices=[0,20,40,70,90];
 for(const [i,[tier]] of SUMMONER_SPELLBOOK_TIERS.entries()){
  const id=`summoner-${tier}-spellbook`;
  const original=RECIPES[`craft-${id}`];
  const regional=RECIPES[`craft-${id}-regular-materials`];
  const roaming=RECIPES[`craft-${id}-new-materials`];
  assert.ok(original&&regional&&roaming,tier);
  assert.ok(EQUIPMENT[id],tier);
  for(const r of [regional,roaming]){
   assert.equal(r.output.equipmentId,id);
   assert.equal(r.category,'weapon');
   assert.equal(r.monsterMaterialRecipe,true);
   assert.deepEqual(r.unlock,{type:'specialJob',jobId:'summoner'});
   assert.ok(Object.values(r.materials).every(qty=>Number.isInteger(qty)&&qty>0));
   for(const materialId of Object.keys(r.materials)){
    const realDrop=NORMAL_ENEMY_LIST.some(e=>Object.values(e.materials??{}).includes(materialId));
    assert.equal(realDrop,true,`${tier}: ${materialId} must actually drop from a normal enemy`);
    assert.ok(getItemDef(materialId).name,`unknown material ${materialId}`);
   }
  }
  assert.equal(regional.sourceMonsterId,NORMAL_ENEMY_LIST[regionalIndices[i]].id);
  assert.equal(roaming.sourceMonsterId,NEW_MONSTERS[i].id);
  assert.ok(Object.keys(roaming.materials).includes(newMonsterMaterialId(NEW_MONSTERS[i],'normal')));
  assert.ok(!Object.keys(original.materials).some(material=>Object.keys(regional.materials).includes(material)));
 }
});

test('monster-based book recipes unlock only after summoner is unlocked',()=>{
 const r=RECIPES['craft-summoner-astral-spellbook-regular-materials'];
 const s=stateFor(r);delete s.unlockedSpecialJobs;
 assert.equal(canCraft(s,r.id).ok,false);
 assert.equal(canCraft(s,r.id).locked,true);
 s.unlockedSpecialJobs=['summoner'];
 assert.equal(canCraft(s,r.id).ok,true);
 assert.ok(getAvailableRecipes(s).some(recipe=>recipe.id===r.id));
});

test('all ten monster book recipes craft the matching book and consume exactly their own drops and gold',()=>{
 for(const [tier] of SUMMONER_SPELLBOOK_TIERS){
  for(const path of ['regular','new']){
   const id=`summoner-${tier}-spellbook`,r=RECIPES[`craft-${id}-${path}-materials`];
   const s=stateFor(r),materials=structuredClone(s.materials),gold=s.gold;
   assert.equal(canCraft(s,r.id).ok,true,r.id);
   const made=craftItem(s,r.id);
   assert.equal(made.outputId,id,r.id);
   assert.equal(made.outputKind,'equipment');
   assert.equal(s.equipmentInventory.length,1);
   assert.equal(s.equipmentInventory[0].equipmentId,id);
   assert.equal(s.gold,gold-craftingGoldCost(r));
   for(const [material,qty] of Object.entries(r.materials))assert.equal(s.materials[material],materials[material]-qty,`${r.id}: ${material}`);
  }
 }
});

test('missing a normal monster material never creates free spellbooks or deducts gold',()=>{
 const r=RECIPES['craft-summoner-eternal-spellbook-new-materials'];
 const s=stateFor(r),first=Object.keys(r.materials)[0];s.materials[first]=0;
 const before=structuredClone(s);
 assert.equal(canCraft(s,r.id).ok,false);
 assert.ok(canCraft(s,r.id).missingMaterials.length>0);
 assert.throws(()=>craftItem(s,r.id),/素材が足りません/);
 assert.deepEqual(s,before);
});

test('all monster material spellbook recipes show the real book name without parenthesized material routes',()=>{
 for(const [tier] of SUMMONER_SPELLBOOK_TIERS){
  const equipmentId=`summoner-${tier}-spellbook`;
  const name=EQUIPMENT[equipmentId].name;
  const conventional=RECIPES[`craft-${equipmentId}`];
  const regional=RECIPES[`craft-${equipmentId}-regular-materials`];
  const roaming=RECIPES[`craft-${equipmentId}-new-materials`];
  assert.equal(conventional.name,name);
  assert.equal(regional.name,name);
  assert.equal(roaming.name,name);
  assert.equal(regional.materialSource,'通常モンスター素材');
  assert.equal(roaming.materialSource,'新モンスター素材');
  assert.notDeepEqual(regional.materials,roaming.materials);
 }
});

test('the book icon uses no decorative purple outline and other equipment icons are unchanged',()=>{
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/equipment.js',import.meta.url),'utf8');
 const rule=css.match(/\.equipment-spellbook-icon\{([^}]*)\}/)?.[1]??'';
 assert.match(rule,/background:transparent/);
 assert.match(rule,/border:0/);
 assert.doesNotMatch(rule,/#8976bc|linear-gradient/);
 assert.match(ui,/equipment-spellbook-icon/);
 assert.match(ui,/equipment-pixel-crop/);
});
