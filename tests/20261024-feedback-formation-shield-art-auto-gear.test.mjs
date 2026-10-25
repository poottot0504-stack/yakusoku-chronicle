import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {setActiveParty,movePartyMember,shiftPartyMember} from '../src/core/party.js';
import {migrateSave} from '../src/core/save-migration.js';
import {getAdventureBattleParty} from '../src/core/adventure.js';
import {shielderCoverTarget,distributeShieldCover} from '../src/core/shielder-guard.js';
import {partyMarkup} from '../src/ui/party.js';
import {canEquipForJob,recommendationAllowedForJob,equipRecommendedEquipment} from '../src/core/equipment.js';
import {EQUIPMENT} from '../src/data/equipment.js';
import {actorArt} from '../src/ui/battle-art.js';
const char=(id,job='swordsman')=>({id,name:id,level:100,jobLevels:{[job]:300},currentJob:job,hp:400,maxHp:400,mp:70,maxMp:70,stats:{attack:50,defense:50,magic:20,speed:20},equipment:{}});
function party(){
 const characters=[char('mira','mage'),char('allen','shielder'),char('luna','mage'),char('sora','healer')];
 return {characters,activePartyIds:['mira','allen','luna','sora'],equipmentInventory:[],materials:{},inventory:[],ui:{}};
}
test('drag/move controls persist exact left-to-right order and do not change lineup',()=>{
 const s=party(),original=[...s.activePartyIds];
 assert.deepEqual(movePartyMember(s,'allen','mira'),['allen','mira','luna','sora']);
 assert.deepEqual(shiftPartyMember(s,'allen',1),original);
 assert.deepEqual(movePartyMember(s,'sora','allen'),['mira','sora','allen','luna']);
 assert.equal(new Set(s.activePartyIds).size,4);
 assert.throws(()=>movePartyMember(s,'not-in-party','allen'),/編成中/);
 assert.deepEqual(setActiveParty(s,['luna','sora','mira','allen']),['luna','sora','mira','allen']);
 assert.deepEqual(shiftPartyMember(s,'luna',-1),['luna','sora','mira','allen']);
});
test('the order is retained by save migration and the battle actually follows it',()=>{
 const s=party();
 movePartyMember(s,'allen','mira');
 const saved=migrateSave(s);
 assert.deepEqual(saved.activePartyIds,['allen','mira','luna','sora']);
 const fighters=getAdventureBattleParty(saved);
 assert.deepEqual(fighters.map(c=>c.id),['allen','mira','luna','sora']);
 fighters.forEach(c=>c.side='ally');
 assert.equal(shielderCoverTarget(fighters,fighters[1])?.id,'allen');
 assert.equal(distributeShieldCover(fighters,fighters[1],80).protectedDamage,0,'shielder Lv300 automatically covers right neighbor in reordered battle');
 const markup=partyMarkup(saved);
 assert.ok(markup.indexOf('data-character-id="allen"')<markup.indexOf('data-character-id="mira"'));
 assert.match(markup,/data-party-shift="allen"/);
 assert.match(markup,/data-party-dir="1"/);
});
test('dock renders actual activePartyIds rather than character-array order; saved position appears before feedback',()=>{
 const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const start=js.indexOf('function partyDock()'),end=js.indexOf('const nav=',start);
 const dock=js.slice(start,end);
 assert.match(dock,/activePartyIds\?\?\[\]/);
 assert.match(dock,/\.map\(id=>byId\.get\(id\)\)/);
 assert.match(dock,/data-dock-member/);
 assert.doesNotMatch(dock,/characters\.filter\(c=>active\.has/);
 const menu=js.slice(js.indexOf('function openMore(){'),js.indexOf('function toggleParty(',js.indexOf('function openMore(){')));
 const names=['data-open-auto-settings','data-game-update','data-more="save"','data-feedback-open'].map(key=>menu.indexOf(key));
 assert.ok(names.every(x=>x>=0));
 assert.deepEqual([...names].sort((a,b)=>a-b),names);
 assert.equal(menu.split('data-more="save"').length-1,1);
 const gestures=readFileSync(new URL('../src/ui/party-dock-drag.js',import.meta.url),'utf8');
 assert.match(gestures,/pointerdown/);
 assert.match(gestures,/pointermove/);
 assert.match(gestures,/pointerup/);
 assert.match(gestures,/pointercancel/);
 assert.match(js,/wirePartyDockDrag\(\{root:game,onReorder/);
});
test('manual armor remains compatible; offensive weapons are blocked and auto gear keeps shield-compatible items',()=>{
 for(const job of ['shielder','greatShielder']){
  const c=char('allen',job);
  const other=EQUIPMENT['masho-3-swordsman-body'];
  const own=EQUIPMENT['masho-1-'+job+'-body'];
  assert.equal(canEquipForJob(c,other,{}),true,'manual armor can still use other-job pieces');
  assert.equal(recommendationAllowedForJob(c,other),false);
  assert.equal(recommendationAllowedForJob(c,own),true);
  assert.equal(recommendationAllowedForJob(c,EQUIPMENT['raid-orichalcum-ring']),true);
  const inventory=[
   {instanceId:'other',equipmentId:other.id,enhanceLevel:15},
   {instanceId:'own',equipmentId:own.id,enhanceLevel:0}
  ];
  const state={characters:[c],activePartyIds:['allen'],equipmentInventory:inventory};
  c.equipment.body='other';
  equipRecommendedEquipment(state,c.id);
  assert.equal(c.equipment.body,'own', 'an unrelated classs high-stat equipment must never be auto-selected');
  assert.deepEqual(state.equipmentInventory,inventory,'equipment inventory itself must not change');
 }
});
test('shield sprite atlas has completely opaque character pixels, fully transparent background and fresh URL',()=>{
 const source=readFileSync(new URL('../assets/battle/shield-jobs.png',import.meta.url));
 assert.equal(source.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(source.readUInt32BE(16),180);
 assert.equal(source.readUInt32BE(20),120);
 let at=8,transparent=null;
 while(at<source.length){
  const count=source.readUInt32BE(at),tag=source.toString('ascii',at+4,at+8);
  if(tag==='tRNS')transparent=source.subarray(at+8,at+8+count);
  at+=count+12;
 }
 assert.ok(transparent?.length>0,'transparent PNG must have a palette transparency chunk');
 assert.ok([...transparent].every(n=>n===0||n===255),'no subject pixel may have partial alpha');
 assert.ok(transparent.includes(0)&&transparent.includes(255),'background transparent and subjects opaque');
 for(const job of ['shielder','greatShielder'])
  assert.match(actorArt({side:'ally',currentJob:job}).src,/shield-jobs\.png\?v=20261024-opaque/);
});
