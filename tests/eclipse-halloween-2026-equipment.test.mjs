import test from 'node:test';
import assert from 'node:assert/strict';
import {ECLIPSE_EVENT,ECLIPSE_MATERIALS,ECLIPSE_EQUIPMENT,ECLIPSE_TIERS,ECLIPSE_WEAPONS,ECLIPSE_ARMOR,eclipseRecipeMaterials} from '../src/data/eclipse-2026.js';
import {EQUIPMENT,createEquipmentInstance} from '../src/data/equipment.js';
import {RECIPES} from '../src/data/recipes.js';
import {getItemDef,getItemCategory} from '../src/core/items.js';
import {canCraft,craftItem,getAvailableRecipes,craftingGoldCost} from '../src/core/crafting.js';
import {canEquipForJob} from '../src/core/equipment.js';

const early=Date.parse('2026-10-30T23:59:59+09:00');
const open=Date.parse('2026-10-31T00:00:00+09:00');
const end=Date.parse('2026-11-02T00:00:00+09:00');
const recipe=id=>RECIPES[`craft-${id}`];
const fundedState=(r)=>({
 materials:Object.fromEntries(Object.entries(r.materials).map(([id,qty])=>[id,qty*2])),
 inventory:[],gold:1_000_000,equipmentInventory:[],unlockedRecipes:[],newRecipes:[]
});

test('the two-day Halloween schedule uses exclusive Nov 2 midnight JST end',()=>{
 assert.equal(ECLIPSE_EVENT.startsAt,open);
 assert.equal(ECLIPSE_EVENT.endsAt,end);
 assert.equal(end-open,48*60*60*1000);
});

test('five unique collectible materials are correctly named in inventory and event category',()=>{
 assert.equal(Object.keys(ECLIPSE_MATERIALS).length,5);
 for(const [id,def] of Object.entries(ECLIPSE_MATERIALS)){
  assert.equal(getItemDef(id).name,def.name);
  assert.equal(getItemCategory(id),'event');
  assert.equal(def.event,true);
  assert.ok(def.description.length>=10);
 }
});

test('two full ranks contain 16 usable weapon types, 6 armor slots, ring, charm each',()=>{
 assert.equal(ECLIPSE_TIERS.length,2);
 assert.equal(ECLIPSE_WEAPONS.length,16);
 assert.equal(ECLIPSE_ARMOR.length,6);
 assert.equal(new Set(ECLIPSE_WEAPONS.map(w=>w.type)).size,16);
 assert.equal(Object.keys(ECLIPSE_EQUIPMENT).length,48);
 for(const [id,def] of Object.entries(ECLIPSE_EQUIPMENT)){
  const actual=EQUIPMENT[id],r=recipe(id);
  assert.ok(actual,`missing game equipment ${id}`);
  assert.ok(r,`missing crafting recipe ${id}`);
  assert.equal(r.output.equipmentId,id);
  assert.equal(actual.slot,def.slot);
  assert.equal(actual.requiredLevel,def.requiredLevel);
  assert.equal(actual.eventLimited,true);
  assert.equal(actual.eventId,ECLIPSE_EVENT.id);
  assert.equal(r.eventId,ECLIPSE_EVENT.id);
  assert.equal(r.eventStartsAt,open);
  assert.equal(r.eventEndsAt,end);
  assert.ok(r.gold>0&&craftingGoldCost(r)>r.gold);
  assert.equal(Object.values(r.materials).every(n=>n>0),true);
  assert.ok(Object.keys(r.materials).every(mat=>ECLIPSE_MATERIALS[mat]));
  assert.ok(Number(actual.elementResist.dark)>0);
  const inst=createEquipmentInstance(id);
  assert.equal(inst.equipmentId,id);
  assert.equal(inst.enhanceLevel,0);
 }
 for(const tier of ECLIPSE_TIERS){
  for(const w of ECLIPSE_WEAPONS){
   const gear=EQUIPMENT[`eclipse-${tier.id}-${w.id}`];
   assert.equal(gear.weaponType,w.type);
   assert.equal(recipe(gear.id).category,'weapon');
  }
  for(const a of ECLIPSE_ARMOR)assert.equal(recipe(`eclipse-${tier.id}-${a.id}`).category,'armor');
  assert.equal(EQUIPMENT[`eclipse-${tier.id}-ring`].accessoryType,'ring');
  assert.equal(EQUIPMENT[`eclipse-${tier.id}-charm`].accessoryType,'charm');
  assert.equal(recipe(`eclipse-${tier.id}-ring`).category,'ring');
  assert.equal(recipe(`eclipse-${tier.id}-charm`).category,'charm');
 }
});

test('base and advanced event gear preserve weapon-specific job compatibility',()=>{
 assert.equal(canEquipForJob({id:'x',currentJob:'swordsman'},EQUIPMENT['eclipse-i-blade']),true);
 assert.equal(canEquipForJob({id:'x',currentJob:'mage'},EQUIPMENT['eclipse-i-blade']),false);
 assert.equal(canEquipForJob({id:'x',currentJob:'gunbreaker'},EQUIPMENT['eclipse-ii-gunblade']),true);
 assert.equal(canEquipForJob({id:'x',currentJob:'astrologian'},EQUIPMENT['eclipse-ii-starGlobe']),true);
});

test('all gear is locked before start, but craftable on/after end with acquired materials',()=>{
 const parts=['blade','body','shield','ring','charm'];
 for(const part of parts){
  const id=`eclipse-ii-${part}`,r=recipe(id);
  const state=fundedState(r);
  const unchanged=JSON.stringify(state);
  const before=canCraft(state,r.id,early);
  assert.equal(before.ok,false);
  assert.equal(before.eventNotStarted,true);
  assert.throws(()=>craftItem(state,r.id,early),/開催前/);
  assert.equal(JSON.stringify(state),unchanged,'failed pre-start craft must not change inventory/materials/gold');
  assert.equal(canCraft(state,r.id,open).ok,true);
  const result=craftItem(state,r.id,end);
  assert.equal(result.outputId,id);
  assert.equal(result.outputKind,'equipment');
  assert.equal(result.quantity,1);
  assert.ok(state.equipmentInventory.some(x=>x.equipmentId===id));
  assert.equal(state.gold,1_000_000-craftingGoldCost(r));
  for(const [mat,n] of Object.entries(r.materials))assert.equal(state.materials[mat],n);
 }
});

test('recipes stay unavailable with no ingredients and all five mats have legitimate uses',()=>{
 const mats=new Set(Object.values(ECLIPSE_EQUIPMENT).flatMap(x=>Object.keys(recipe(x.id).materials)));
 assert.deepEqual(mats,new Set(Object.keys(ECLIPSE_MATERIALS)));
 const s={materials:{},gold:1_000_000,inventory:[],unlockedRecipes:[],newRecipes:[]};
 assert.equal(getAvailableRecipes(s,open).some(x=>x.eventId===ECLIPSE_EVENT.id),false);
 const r=recipe('eclipse-i-blade');
 const before=canCraft(s,r.id,open);
 assert.equal(before.ok,false);
 assert.equal(before.locked,true);
 s.materials.eclipseShard=1;
 assert.equal(getAvailableRecipes(s,open).filter(x=>x.eventId===ECLIPSE_EVENT.id).length,48);
 assert.equal(canCraft(s,r.id,open).ok,false);
 assert.ok(canCraft(s,r.id,open).missingMaterials.length>0);
});

test('limited post-event crafting uses raw saved materials and never creates phantom rewards',()=>{
 const low=recipe('eclipse-i-charm');
 const s=fundedState(low);
 const before=Object.values(s.materials).reduce((a,b)=>a+b,0);
 const result=craftItem(s,low.id,end+365*86400000);
 assert.equal(result.outputId,'eclipse-i-charm');
 assert.ok(Object.values(s.materials).reduce((a,b)=>a+b,0)<before);
 assert.equal(s.equipmentInventory.length,1);
 assert.equal(Object.keys(s).includes('eventBattle'),false);
});

test('advanced pieces deliberately require boss core; ordinary pieces do not',()=>{
 for(const tier of ECLIPSE_TIERS)for(const part of ['blade','body','ring','charm','head','waist']){
  const mats=eclipseRecipeMaterials(tier.id,part);
  assert.equal(Boolean(mats.noxCore),tier.id==='ii'&&['blade','body','ring','charm'].includes(part));
 }
});
