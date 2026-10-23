import test from 'node:test';
import assert from 'node:assert/strict';
import { forgeMarkup,sortForgeEnhanceInstances } from '../src/ui/forge.js';

const equipmentId='copper-oneHandSword';
const inst=(instanceId,enhanceLevel,eid=equipmentId)=>({instanceId,equipmentId:eid,enhanceLevel});
const base=()=>({
 gold:1_000_000,
 inventory:[],materials:{},
 ui:{forgeEnhanceCategory:'all',forgeEnhanceJob:'all',forgeEnhanceArmorSlot:'all'},
 selectedCharacterId:'hero',
 characters:[{id:'hero',name:'勇者',currentJob:'swordsman',jobLevels:{swordsman:150},equipment:{}}],
 equipmentInventory:[]
});

test('equipped unenhanced gear precedes equipped +15 gear; remaining gear keeps original order',()=>{
 const s=base();
 s.equipmentInventory=[
  inst('unused-max',15),
  inst('worn-mid',7),
  inst('unused-zero',0),
  inst('worn-max-a',15),
  inst('worn-zero-a',0),
  inst('unused-mid',1),
  inst('worn-zero-b',0),
  inst('worn-max-b',15),
  inst('worn-mid-b',9)
 ];
 s.characters[0].equipment={weapon:'worn-mid',head:{instanceId:'worn-max-a'},
  body:'worn-zero-a',arms:{instanceId:'worn-zero-b'},
  legs:'worn-max-b',waist:'worn-mid-b'};
 const equipped=new Map(Object.values(s.characters[0].equipment).map(ref=>[typeof ref==='object'?ref.instanceId:ref,[{name:'勇者'}]]));
 const oldOrder=s.equipmentInventory.map(i=>i.instanceId);
 const sorted=sortForgeEnhanceInstances(s.equipmentInventory,equipped).map(i=>i.instanceId);
 assert.deepEqual(sorted,[
  'worn-zero-a','worn-zero-b','worn-max-a','worn-max-b',
  'unused-max','worn-mid','unused-zero','unused-mid','worn-mid-b'
 ]);
 assert.deepEqual(s.equipmentInventory.map(i=>i.instanceId),oldOrder,'should never mutate inventory');
});

test('the actual forge enhancement page respects equipped instance IDs, including legacy reference objects',()=>{
 const s=base();
 s.equipmentInventory=[
  inst('max-unworn',15),inst('mid-worn',4),inst('zero-unworn',0),
  inst('max-worn',15),inst('zero-worn',0)
 ];
 s.characters[0].equipment={weapon:'mid-worn',head:{instanceId:'max-worn'},body:'zero-worn'};
 const html=forgeMarkup(s,'enhance');
 const shown=[...html.matchAll(/data-forge="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(shown,['zero-worn','max-worn','max-unworn','mid-worn','zero-unworn']);
 assert.match(html,/装備中：勇者/);
 assert.match(html,/data-forge="max-worn"[^>]*disabled/,'maxed gear remains visible, but not enhanceable');
});

test('existing category filters are applied before sorting, with stable fallback order',()=>{
 const s=base();
 s.ui.forgeEnhanceCategory='weapon';
 s.equipmentInventory=[
  inst('weapon-other',5),inst('armor-worn-zero',0,'copper-head'),
  inst('weapon-worn-max',15),inst('weapon-worn-zero',0),
  inst('weapon-other-2',8)
 ];
 s.characters[0].equipment={head:'armor-worn-zero',weapon:'weapon-worn-max',
  body:'weapon-worn-zero'};
 const html=forgeMarkup(s,'enhance');
 const shown=[...html.matchAll(/data-forge="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(shown,['weapon-worn-zero','weapon-worn-max','weapon-other','weapon-other-2']);
 assert.doesNotMatch(html,/data-forge="armor-worn-zero"/);
});

test('no equipped items retains original order and handles malformed stored levels',()=>{
 const rows=[inst('a',9),inst('b',15),inst('c',0),inst('d','garbled')];
 assert.deepEqual(sortForgeEnhanceInstances(rows,new Map()).map(x=>x.instanceId),['a','b','c','d']);
 const sort=sortForgeEnhanceInstances(rows,new Map([['d',[]]]));
 assert.deepEqual(sort.map(x=>x.instanceId),['d','a','b','c']);
});
