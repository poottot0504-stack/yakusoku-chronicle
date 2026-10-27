import test from 'node:test';
import assert from 'node:assert/strict';
import {MASHO_FLOORS,createMashoEnemy,canEnterMashoFloor,settleMashoVictory,normalizeMashoProgress,getMashoAbyssDropPool} from '../src/core/masho-cave.js';
import {MASHO_ABYSS_WEAPONS} from '../src/data/masho-abyss-weapons.js';
import {EQUIPMENT,createEquipmentInstance} from '../src/data/equipment.js';
import {calculateDamage} from '../src/core/combat-math.js';
import {canEquip} from '../src/core/equipment.js';
import {isMarketSellable} from '../src/market/market-model.js';
import {actorArt} from '../src/ui/battle-art.js';
import {mashoCaveMarkup} from '../src/ui/masho-cave.js';
const state=(highest=25)=>({cycle:2,characters:[],activePartyIds:[],mashoCave:{highestCleared:highest},gold:0});
function win(s,floor,rng){return settleMashoVictory(s,{mashoFloor:floor,actors:[{side:'enemy',mashoBoss:true,mashoFloor:floor,hp:0},{side:'ally',hp:1}]},rng,0);}
test('28 floors, sequential access and old 25F save continuation',()=>{
 assert.equal(MASHO_FLOORS.length,28);const s=state(20);assert.ok(canEnterMashoFloor(s,21));assert.ok(!canEnterMashoFloor(s,22));win(s,21,()=>1);assert.ok(canEnterMashoFloor(s,22));
 assert.equal(normalizeMashoProgress(state(25)).highestCleared,25);assert.ok(canEnterMashoFloor(state(),26));assert.ok(!canEnterMashoFloor(state(),27));
 assert.match(mashoCaveMarkup(state(20)),/28階層/);assert.match(mashoCaveMarkup({...state(20),mashoCave:{highestCleared:20,lastReward:{floor:20}},ui:{mashoResultVisible:true}}),/第21階層へ/);
});
test('new raid enemies have progressively 5 to 25 percent higher floor20 stats and existing unique art',()=>{
 const s=state(),base=createMashoEnemy(s,20,()=>0);
 for(let f=21;f<=25;f++){const e=createMashoEnemy(s,f,()=>0);assert.equal(e.maxHp,Math.round(base.maxHp*(1+(f-20)*.05)));assert.equal(e.maxMp,Math.round(base.maxMp*(1+(f-20)*.05)));for(const k of Object.keys(base.stats))assert.equal(e.stats[k],Math.round(base.stats[k]*(1+(f-20)*.05)));assert.ok(e.raidBoss);assert.deepEqual(actorArt(e),actorArt({raidBoss:true,bossId:e.bossId}));const skill=e.ai.find(x=>x.skill?.maxHpDamageRatio)?.skill;assert.ok(skill.allTargets);const target={maxHp:1000,stats:{defense:999999,magic:999999},damageCap:1};assert.equal(calculateDamage(e,target,skill),400);assert.equal(calculateDamage(e,{...target,guarding:true},skill),0);}
});
test('0.5 percent boundary, original abyss weapons, no ore and once-only rewards',()=>{
 const ids=Object.keys(MASHO_ABYSS_WEAPONS);
 for(let i=0;i<5;i++){const s=state(),r=win(s,21+i,(()=>{let n=0;return()=>n++===0?.004999:(i+.1)/5;})());assert.ok(getMashoAbyssDropPool(21+i).some(x=>x.id===r.equipment.equipmentId));assert.equal(r.promiseOre,0);assert.equal(s.materials?.promiseOre,undefined);}
 for(const f of [21,22,23,24,25])assert.equal(win(state(),f,()=>.005).equipment,null);
 const s=state(),b={mashoFloor:25,actors:[{side:'enemy',mashoBoss:true,mashoFloor:25,hp:0},{side:'ally',hp:1}]};const a=settleMashoVictory(s,b,()=>0,0);assert.equal(settleMashoVictory(s,b,()=>0,0),a);assert.equal(s.equipmentInventory.length,1);
 assert.equal(win(state(),20,()=>1).promiseOre,2);
});
test('five originally 400-power weapons are buffed, require job150 and remain market sellable',()=>{
 const jobs=['swordsman','mage','thief','archer','fighter'];Object.values(MASHO_ABYSS_WEAPONS).forEach((d,i)=>{assert.equal(EQUIPMENT[d.id],d);assert.equal(d.slot,'weapon');assert.equal(d[i===1?'magic':'attack'],440);const c={currentJob:jobs[i],jobLevels:{[jobs[i]]:149}};assert.ok(!canEquip(c,d,{}));c.jobLevels[jobs[i]]=150;assert.ok(canEquip(c,d,{}));const inst=createEquipmentInstance(d.id);assert.ok(isMarketSellable({characters:[],equipmentInventory:[inst]},{kind:'equipment',instanceId:inst.instanceId,quantity:1}).ok);});
 const old=Object.values(EQUIPMENT).filter(d=>d.slot==='weapon'&&!MASHO_ABYSS_WEAPONS[d.id]);assert.ok(old.some(d=>d.attack>0));assert.ok(old.some(d=>d.magic>0));
});
import {createBattle,startTurn,resolveAction} from '../src/core/battle.js';
test('40 percent abyss attack still hits all four members, with guard protection',()=>{
 const enemy=createMashoEnemy(state(),21,()=>0),action=enemy.ai.find(x=>x.skill?.maxHpDamageRatio);
 const party=Array.from({length:4},(_,i)=>({id:`p${i}`,name:`仲間${i}`,hp:1000,maxHp:1000,mp:100,maxMp:100,stats:{attack:1,defense:999999,magic:999999,speed:1}}));
 const b=createBattle(party,enemy);b.actors.find(x=>x.side==='enemy').ai=[action];startTurn(b);for(let i=0;i<4;i++)resolveAction(b,{type:i===0?'defend':'wait'},()=>0);
 assert.deepEqual(b.actors.filter(x=>x.side==='ally').map(x=>x.hp),[1000,600,600,600]);assert.ok(b.visualTimeline.some(t=>t.visualEvents.filter(v=>v.amount===400).length===3));
});
