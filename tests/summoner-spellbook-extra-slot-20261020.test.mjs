import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {EQUIPMENT,SUMMONER_SPELLBOOK_TIERS} from '../src/data/equipment.js';
import {RECIPES} from '../src/data/recipes.js';
import {getCharacterResourceCaps,getEquipmentStatBonus} from '../src/core/combat-stats.js';
import {equipItem,canEquipForJob,normalizeEquipmentForJob,equipRecommendedEquipment} from '../src/core/equipment.js';
import {equipmentMarkup,equipmentCategoryFor} from '../src/ui/equipment.js';
import {createBattle} from '../src/core/battle.js';
import {migrateSave} from '../src/core/save-migration.js';
import {getEnhancedStats} from '../src/core/forge.js';
import {canCraft,craftItem,craftingGoldCost} from '../src/core/crafting.js';

const make=()=>{const s=createNewGame(createDefaultRoster()),c=s.characters[0];c.currentJob='summoner';c.jobLevels.blackMage=30;c.jobLevels.summoner=200;s.gold=10000000;s.materials.ironIngot=20;s.selectedCharacterId=c.id;return {s,c};};
const inst=(id,i)=>({instanceId:i,equipmentId:id,enhanceLevel:0,trueEvolved:false});

test('five spellbook tiers provide usable secondary weapons with magic and MP scaling',()=>{
 assert.equal(SUMMONER_SPELLBOOK_TIERS.length,5);
 let previousMagic=0,previousMp=0;
 for(const [tier] of SUMMONER_SPELLBOOK_TIERS){
  const d=EQUIPMENT[`summoner-${tier}-spellbook`],r=RECIPES[`craft-${d.id}`];
  assert.ok(d&&r);assert.equal(d.slot,'spellbook');assert.equal(d.weaponType,'spellbook');
  assert.deepEqual(d.allowedJobs,['summoner']);assert.equal(r.category,'weapon');assert.equal(r.output.equipmentId,d.id);
  assert.ok(d.magic>previousMagic&&d.maxMp>previousMp);previousMagic=d.magic;previousMp=d.maxMp;
  assert.equal(equipmentCategoryFor(d),'weapon');
  assert.equal(canEquipForJob({currentJob:'summoner'},d),true);
  for(const job of ['blackMage','mage','highWizard','astrologian','dragoon'])assert.equal(canEquipForJob({currentJob:job},d),false);
 }
});

test('summoner displays a tenth slot and can equip a two-handed staff plus spellbook',()=>{
 const {s,c}=make();
 assert.match(equipmentMarkup(s,c.id),/0\/10部位|1\/10部位/);
 s.equipmentInventory.push(inst('summoner-novice-weapon','staff-1'),inst('summoner-novice-spellbook','book-1'));
 equipItem(s,c.id,'staff-1','weapon');
 const before=getEquipmentStatBonus(s,c),capBefore=getCharacterResourceCaps(s,c);
 assert.throws(()=>equipItem(s,c.id,'book-1','weapon'),/装備スロットが違います/);
 equipItem(s,c.id,'book-1','spellbook');
 assert.equal(c.equipment.weapon,'staff-1');
 assert.equal(c.equipment.spellbook,'book-1');
 const after=getEquipmentStatBonus(s,c),capAfter=getCharacterResourceCaps(s,c);
 assert.ok(after.magic>before.magic);
 assert.ok(after.maxMp>before.maxMp);
 assert.ok(capAfter.maxMP>capBefore.maxMP);
 const html=equipmentMarkup(s,c.id);
 assert.match(html,/魔本（召喚士専用）/);
 assert.match(html,/data-slot="spellbook"/);
 assert.match(html,/2\/10部位/);
 const b=createBattle([{...c,stats:{...c.stats,magic:c.stats.magic+after.magic},maxMp:capAfter.maxMP,mp:capAfter.maxMP}],{id:'enemy',name:'敵',hp:100,maxHp:100,stats:{attack:1,defense:1,magic:1,speed:1}});
 assert.equal(b.actorMap[c.id].maxMp,capAfter.maxMP);
 const migrated=migrateSave(s);
 assert.equal(migrated.characters[0].equipment.spellbook,'book-1');
 assert.equal(migrated.characters[0].equipment.weapon,'staff-1');
});

test('switching away from summoner automatically removes only the book without destroying it',()=>{
 const {s,c}=make();s.equipmentInventory.push(inst('summoner-novice-spellbook','book-2'));
 equipItem(s,c.id,'book-2','spellbook');
 c.currentJob='blackMage';normalizeEquipmentForJob(s,c);
 assert.equal(c.equipment.spellbook,null);
 assert.ok(s.equipmentInventory.some(i=>i.instanceId==='book-2'));
 assert.doesNotMatch(equipmentMarkup(s,c.id),/equipment-spellbook-icon/);
 assert.match(equipmentMarkup(s,c.id),/\/9部位/);
 assert.throws(()=>equipItem(s,c.id,'book-2','spellbook'),/装備できません/);
});

test('recommended equipment can select a spellbook alongside normal weapon',()=>{
 const {s,c}=make();s.equipmentInventory.push(inst('summoner-astral-spellbook','book-best'),inst('summoner-novice-spellbook','book-basic'),inst('summoner-veteran-weapon','staff-best'));
 const response=equipRecommendedEquipment(s,c.id);
 assert.equal(response.character.id,c.id);
 assert.equal(c.equipment.spellbook,'book-best');
 assert.equal(c.equipment.weapon,'staff-best');
});

test('all historical Halloween, new Eclipse and five-gods raid event spellbooks can be crafted',()=>{
 const books=['halloween-i-spellbook','halloween-ii-spellbook','halloween-iii-spellbook','eclipse-i-spellbook','eclipse-ii-spellbook','raid-summoner-spellbook'];
 for(const id of books){
  const def=EQUIPMENT[id],r=RECIPES[`craft-${id}`];
  assert.ok(def&&r,id);assert.equal(def.slot,'spellbook',id);assert.equal(r.category,'weapon',id);
  assert.ok(def.magic>0&&def.maxMp>0,id);
  assert.equal(def.eventLimited,true,id);assert.ok(r.eventId,id);
 }
 for(const id of ['halloween-iii-spellbook','eclipse-ii-spellbook','raid-summoner-spellbook']){
  const r=RECIPES[`craft-${id}`],{s}=make();
  s.materials={...Object.fromEntries(Object.entries(r.materials).map(([key,qty])=>[key,qty*2]))};
  const time=id.includes('halloween')?Date.parse('2026-10-20T00:00:00Z'):id.includes('eclipse')?Date.parse('2026-11-02T00:00:00Z'):Date.parse('2026-10-20T00:00:00Z');
  assert.equal(canCraft(s,r.id,time).ok,true,id);
  const gold=s.gold,created=craftItem(s,r.id,time);
  assert.equal(created.outputId,id);
  assert.equal(s.gold,gold-craftingGoldCost(r));
  assert.ok(s.equipmentInventory.some(i=>i.equipmentId===id));
 }
});

test('enhancing spellbooks improves magic and maximum MP without affecting other items',()=>{
 for(const id of ['summoner-eternal-spellbook','eclipse-ii-spellbook','raid-summoner-spellbook']){
  const weak=getEnhancedStats(inst(id,'weak')),{magic,maxMp}=getEnhancedStats({...inst(id,'strong'),enhanceLevel:5});
  assert.ok(magic>weak.magic,id);
  assert.ok(maxMp>weak.maxMp,id);
 }
});
