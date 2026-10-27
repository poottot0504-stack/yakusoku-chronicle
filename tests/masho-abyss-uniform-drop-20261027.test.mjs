import test from 'node:test';
import assert from 'node:assert/strict';
import {
 MASHO_ABYSS_DROP_RATE,MASHO_DROP_RATE,getMashoAbyssDropPool,
 settleMashoVictory
} from '../src/core/masho-cave.js';

const state=()=>({
 cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:28},
 characters:[],activePartyIds:[],gold:0,ui:{},equipmentInventory:[]
});
function clearFloor(floor,firstRoll){
 const s=state();
 let count=0;
 const rng=()=>count++===0?firstRoll:0.99;
 const battle={mashoFloor:floor,actors:[
  {side:'enemy',mashoBoss:true,mashoFloor:floor,hp:0},
  {side:'ally',hp:1}
 ]};
 return {save:s,reward:settleMashoVictory(s,battle,rng,Date.UTC(2026,9,27))};
}

test('all eight 21-28F rare equipment pools use the 0.5% base chance',()=>{
 assert.equal(MASHO_ABYSS_DROP_RATE,0.005);
 assert.equal(MASHO_DROP_RATE,0.05);
 for(let floor=21;floor<=28;floor++){
  const pool=getMashoAbyssDropPool(floor);
  assert.ok(pool.length>=1, floor+' has a reward pool');
  const success=clearFloor(floor,0.004);
  assert.ok(success.reward.equipment, floor+' should drop at 0.4% roll');
  assert.ok(pool.some(p=>p.id===success.reward.equipment.equipmentId),
   floor+' keeps its floor-specific equipment');
  assert.ok(success.save.equipmentInventory.some(p=>p.equipmentId===success.reward.equipment.equipmentId));
  const failure=clearFloor(floor,0.005);
  assert.equal(failure.reward.equipment,null,floor+' must not drop at the exclusive 0.5% boundary');
  assert.equal(failure.save.equipmentInventory.length,0);
 }
});

test('Masho normal floors retain 5% equipment rate, independent of abyss changes',()=>{
 const success=clearFloor(20,0.02);
 assert.ok(success.reward.equipment,'20F: 2% roll drops at 5% base chance');
 const failure=clearFloor(20,0.05);
 assert.equal(failure.reward.equipment,null,'20F: exact 5% boundary does not drop');
});

test('Masho rewards stay idempotent after a battle has been settled',()=>{
 const s=state();
 const battle={mashoFloor:26,actors:[
  {side:'enemy',mashoBoss:true,mashoFloor:26,hp:0},
  {side:'ally',hp:1}
 ]};
 const reward=settleMashoVictory(s,battle,()=>0.004,Date.UTC(2026,9,27));
 assert.equal(s.equipmentInventory.length,1);
 assert.equal(settleMashoVictory(s,battle,()=>0.004,Date.UTC(2026,9,27)),reward);
 assert.equal(s.equipmentInventory.length,1,'do not award same equipment twice');
});
