import test from 'node:test';
import assert from 'node:assert/strict';
import {NEW_MONSTERS,newMonsterMaterialId,newMonsterGearId} from '../src/data/new-monsters.js';
import {ENEMIES,ENEMY_LIST,NORMAL_ENEMY_LIST} from '../src/data/enemies.js';
import {EQUIPMENT} from '../src/data/equipment.js';
import {RECIPES} from '../src/data/recipes.js';
import {getItemDef} from '../src/core/items.js';
import {actorArt} from '../src/ui/battle-art.js';
import {getEncounterCandidates} from '../src/core/encounters.js';
import {craftingGoldCost} from '../src/core/crafting.js';

test('five ordinary monsters have individual sprites, skills and encounters',()=>{
 assert.equal(NEW_MONSTERS.length,5);
 assert.equal(new Set(NEW_MONSTERS.map(m=>m.id)).size,5);
 for(const m of NEW_MONSTERS){
  const e=ENEMIES[m.id];assert.ok(e);
  assert.equal(e.isBoss,undefined);assert.equal(e.enemyClass,'normal');
  assert.ok(ENEMY_LIST.some(x=>x.id===m.id));
  assert.ok(NORMAL_ENEMY_LIST.some(x=>x.id===m.id));
  assert.ok(getEncounterCandidates({},m.regionId).some(x=>x.id===m.id));
  const art=actorArt({id:m.id+'-battle-01'});
  assert.ok(art.src.includes('/new-monsters/'+m.sprite+'.png'));
  assert.equal(art.aspect,1.3042);
  assert.ok(e.ai.length>=3);
 }
});
test('fifteen named material drops and twenty craft-only equipment entries',()=>{
 const materials=new Set(),equipment=new Set();
 for(const m of NEW_MONSTERS){
  for(const k of ['normal','uncommon','rare']){
   const id=newMonsterMaterialId(m,k);materials.add(id);
   assert.equal(ENEMIES[m.id].materials[k],id);
   assert.equal(getItemDef(id).name,m.materialNames[k]);
  }
  for(const [part,g] of Object.entries(m.gear)){
   const id=newMonsterGearId(m,part);equipment.add(id);
   const item=EQUIPMENT[id],recipe=RECIPES['craft-'+id];
   assert.ok(item&&recipe,id);
   assert.equal(item.name,g.name);
   assert.equal(item.requiredLevel,m.requiredLevel);
   assert.equal(item.sourceMonsterId,m.id);
   assert.equal(item.image,undefined);
   assert.equal(recipe.output.equipmentId,id);
   assert.equal(craftingGoldCost(recipe),g.gold*(part==='weapon'||part==='body'?2.5:3));
   for(const [k,qty] of Object.entries(g.mats))assert.equal(recipe.materials[newMonsterMaterialId(m,k)],qty);
  }
 }
 assert.equal(materials.size,15);assert.equal(equipment.size,20);
});
