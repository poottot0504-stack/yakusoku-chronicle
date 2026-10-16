import test from 'node:test';
import assert from 'node:assert/strict';
import {raidActionPayload} from '../src/raid/raidBattle.js';
import {getRaidPlayerId} from '../src/raid/raidApi.js';

test('existing raid attack, guard, and healer payloads still work',()=>{
 const actor={level:50,currentJob:'swordsman',jobLevels:{swordsman:35},stats:{attack:320,magic:90,speed:50},hp:500,maxHp:500};
 const atk=raidActionPayload('attack',actor,{defense:220});
 assert.equal(atk.type,'attack');assert.ok(Number.isInteger(atk.damage)&&atk.damage>0);
 const guard=raidActionPayload('guard',actor,{defense:220});
 assert.equal(guard.damage,0);assert.ok(guard.defensePrevented>0);
 const heal=raidActionPayload('heal',actor,{defense:220});
 assert.ok(heal.healing>0);
});
test('existing player id remains stable across reloads',()=>{
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,val)=>map.set(key,val)};
 const first=getRaidPlayerId(storage);
 assert.equal(getRaidPlayerId(storage),first);
 assert.match(first,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
