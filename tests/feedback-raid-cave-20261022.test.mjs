import test from 'node:test';
import assert from 'node:assert/strict';
import {MASHO_FLOOR_DROP_FOCUS,getMashoEquipmentDropPool,getMashoAbyssDropPool,MASHO_ABYSS_DROP_RATE,MASHO_DROP_RATE,settleMashoVictory} from '../src/core/masho-cave.js';
import {MASHO_EQUIPMENT} from '../src/data/masho-equipment.js';
import {MASHO_ABYSS_SPELLBOOK,MASHO_ABYSS_WEAPONS} from '../src/data/masho-abyss-weapons.js';
import {EQUIPMENT,createEquipmentInstance} from '../src/data/equipment.js';
import {canEquip} from '../src/core/equipment.js';
import {isMarketSellable} from '../src/market/market-model.js';
import {mashoCaveMarkup} from '../src/ui/masho-cave.js';

test('each deep cave floor has an exact job type and non-overlapping equipment slot group',()=>{
 const expected={15:['magic','weapon,ring,charm'],16:['physical','shield,head,body'],17:['physical','weapon,ring,charm'],18:['magic','shield,head,body'],19:['physical','arms,waist,legs'],20:['magic','arms,waist,legs']};
 const ids=[];
 for(const [floor,expectedRule] of Object.entries(expected)){
  const focus=MASHO_FLOOR_DROP_FOCUS[Number(floor)],pool=getMashoEquipmentDropPool(Number(floor));
  assert.equal(focus.group,expectedRule[0]);assert.equal(focus.parts.join(','),expectedRule[1]);
  assert.ok(pool.length>0);
  for(const gear of pool){assert.ok(focus.parts.some(slot=>gear.id.endsWith('-'+slot)));ids.push(gear.id);}
 }
 const expectedIds=Object.values(MASHO_EQUIPMENT).filter(x=>x.mashoTier===3).map(x=>x.id);
 assert.equal(new Set(ids).size,expectedIds.length,'all tier-3 items must remain obtainable');
 assert.deepEqual(ids.slice().sort(),expectedIds.slice().sort());
 assert.equal(MASHO_DROP_RATE,.05);
});
test('floor-specific rare loot keeps legacy 5 weapons and offers new summoner book on floor 25',()=>{
 const expected=['masho-abyss-sword','masho-abyss-instrument','masho-abyss-bow','masho-abyss-staff'];
 for(let i=0;i<4;i++)assert.deepEqual(getMashoAbyssDropPool(21+i).map(x=>x.id),[expected[i]]);
 assert.deepEqual(getMashoAbyssDropPool(25).map(x=>x.id),[MASHO_ABYSS_SPELLBOOK.id,'masho-abyss-dagger']);
 assert.equal(Object.keys(MASHO_ABYSS_WEAPONS).length,5);
 assert.equal(MASHO_ABYSS_DROP_RATE,.002);
 assert.equal(getMashoAbyssDropPool(20).length,0);
});
test('summoner special book can be worn alongside a weapon without changing old inventory ids',()=>{
 const book=EQUIPMENT[MASHO_ABYSS_SPELLBOOK.id],inst=createEquipmentInstance(book.id);
 const summoner={id:'hero',currentJob:'summoner',jobLevels:{summoner:150},equipment:{weapon:null,spellbook:null}};
 const state={characters:[summoner],equipmentInventory:[inst]};
 assert.equal(book.slot,'spellbook');
 assert.equal(canEquip(summoner,book,state,inst),true);
 assert.equal(canEquip({...summoner,currentJob:'mage',jobLevels:{mage:150}},book,state,inst),false);
 assert.equal(canEquip({...summoner,jobLevels:{summoner:149}},book,state,inst),false);
 assert.ok(isMarketSellable(state,{kind:'equipment',instanceId:inst.instanceId,quantity:1}).ok);
 assert.ok(EQUIPMENT['masho-abyss-dagger']);
});
test('new drop rate is a 0.2 percent total roll, including special book on floor 25',()=>{
 const run=(floor,values)=>{const state={cycle:2,characters:[],activePartyIds:[],mashoCave:{highestCleared:25},gold:0};
  let i=0;const battle={mashoFloor:floor,actors:[{side:'enemy',mashoBoss:true,mashoFloor:floor,hp:0},{side:'ally',hp:100}]};
  return settleMashoVictory(state,battle,()=>values[i++]??0.5,0).equipment?.equipmentId??null;};
 assert.equal(run(25,[.001,0]),MASHO_ABYSS_SPELLBOOK.id);
 assert.equal(run(25,[.001,.999]),'masho-abyss-dagger');
 assert.equal(run(25,[.002,0]),null);
 assert.equal(run(22,[.001,0]),'masho-abyss-instrument');
 const html=mashoCaveMarkup({cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:25}});
 assert.match(html,/星淵の幻獣魔典/);
});
