import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDefaultState} from '../src/core/save-schema.js';
import {migrateSave} from '../src/core/save-migration.js';
import {applyAuthoritativeArenaProfile,suspendUnverifiedArenaAssets,arenaInventoryId} from '../src/core/arena-authority.js';
import {createArenaApi} from '../src/online/arena-api.js';
import {ARENA_EQUIPMENT} from '../src/data/arena-equipment.js';
const goodId='b1234567-8abc-4def-8abc-123456789012';
const state=()=>({...createDefaultState(),
 equipmentInventory:[{instanceId:'normal-1',equipmentId:'ironSword',enhanceLevel:5}],
 characters:[{id:'hero',equipment:{weapon:'normal-1',shield:null,accessory1:null,accessory2:null}}]
});
test('local saves cannot grant arena coins or counterfeit arena equipment',()=>{
 const s=state();
 s.arena.coins=900000;
 s.equipmentInventory.push({instanceId:'local-forged',equipmentId:'arena-guardian-shield',enhanceLevel:10});
 s.characters[0].equipment.shield='local-forged';
 suspendUnverifiedArenaAssets(s);
 assert.equal(s.arena.coins,0);
 assert.equal(s.equipmentInventory.length,1);
 assert.equal(s.characters[0].equipment.shield,null);
 assert.equal(s.characters[0].equipment.weapon,'normal-1');
});
test('server profile supersedes local coins and equipment level and retains ordinary gear',()=>{
 const s=state(),instance=arenaInventoryId(goodId);
 applyAuthoritativeArenaProfile(s,{coins:24,gear:[{id:goodId,equipmentId:'arena-gold-ring',enhanceLevel:3}]});
 assert.equal(s.arena.coins,24);
 assert.deepEqual(s.equipmentInventory.find(x=>x.instanceId===instance),{
  instanceId:instance,equipmentId:'arena-gold-ring',enhanceLevel:3,arenaServerOwned:true,trueEvolved:false
 });
 s.characters[0].equipment.accessory1=instance;
 s.arena.coins=999999;
 s.equipmentInventory.find(x=>x.instanceId===instance).enhanceLevel=10;
 applyAuthoritativeArenaProfile(s,{coins:7,gear:[{id:goodId,equipmentId:'arena-gold-ring',enhanceLevel:4}]});
 assert.equal(s.arena.coins,7);
 assert.equal(s.equipmentInventory.find(x=>x.instanceId===instance).enhanceLevel,4);
 assert.equal(s.characters[0].equipment.accessory1,instance);
 applyAuthoritativeArenaProfile(s,{coins:6,gear:[]});
 assert.equal(s.equipmentInventory.length,1);
 assert.equal(s.characters[0].equipment.accessory1,null);
});
test('untrusted wallet and malicious profile IDs are never applied',()=>{
 const s=state(),before=structuredClone(s);
 for(const profile of [
  {coins:-1,gear:[]},
  {coins:1000000,gear:[]},
  {coins:'100',gear:[]},
  {coins:5,gear:[{id:'not-a-uuid',equipmentId:'arena-gold-ring',enhanceLevel:0}]},
  {coins:5,gear:[{id:goodId,equipmentId:'heroLegendSword',enhanceLevel:0}]},
  {coins:5,gear:[{id:goodId,equipmentId:'arena-gold-ring',enhanceLevel:15}]},
  {coins:5,gear:[{id:goodId,equipmentId:'arena-gold-ring',enhanceLevel:0},{id:goodId,equipmentId:'arena-gold-ring',enhanceLevel:0}]}
 ])assert.throws(()=>applyAuthoritativeArenaProfile(s,profile),/不正|重複/);
 assert.equal(s.characters[0].equipment.weapon,before.characters[0].equipment.weapon);
});
test('API supports authenticated profile, start, claim, craft, enhance but never accepts client-defined price or coins',async()=>{
 const calls=[];
 const authorizedFetch=async(url,options)=>{
  calls.push({url,body:JSON.parse(options.body),method:options.method});
  return {ok:true,json:async()=>({ok:true,data:{accepted:true}})};
 };
 const api=createArenaApi({storage:null,authorizedFetch,endpoint:'https://mock.invalid/arena'});
 await api.profile(2);
 await api.start(2,'arena70');
 await api.claim(2,goodId,[{actorId:'arena-actor-0',type:'attack',targetId:'enemy'}]);
 await api.craft(2,'arena-guardian-shield',goodId);
 await api.enhance(2,goodId,goodId);
 assert.deepEqual(calls.map(x=>x.body.action),['profile','start','claim','craft','enhance']);
 assert.ok(calls.every(x=>x.body.saveSlot===2&&x.method==='POST'));
 assert.ok(calls.every(x=>!Object.hasOwn(x.body,'coins')&&!Object.hasOwn(x.body,'cost')&&!Object.hasOwn(x.body,'userId')));
 await assert.rejects(()=>api.start(0,'arena70'),/スロット/);
});
test('network disabled response cannot credit offline wallet',async()=>{
 const api=createArenaApi({authorizedFetch:async()=>({ok:false,status:503,json:async()=>({ok:false,error:'ARENA_NOT_RELEASED'})})});
 await assert.rejects(()=>api.start(1,'arena30'),/準備中/);
});
test('main game arena integration no longer calls local coin settlement or local craft/upgrade',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(main.includes('await arenaApi.start(slot,questId)'));
 assert.ok(main.includes('await arenaApi.claim(slot,entry.matchId,entry.actions)'));
 assert.ok(main.includes('await arenaApi.profile(slot)'));
 assert.ok(main.includes("arenaApi.craft(slot,entry.itemId,entry.requestId)"));
 assert.ok(main.includes("arenaApi.enhance(slot,String(entry.itemId).replace(/^arena-/,''),entry.requestId)"));
 assert.ok(main.includes("suspendUnverifiedArenaAssets(state)"));
 assert.ok(!main.includes('settleArenaSession(state,arenaSession)'));
 assert.ok(!main.includes('craftArenaEquipment(state,'));
 assert.ok(!main.includes('enhanceArenaEquipment(state,'));
 assert.ok(main.includes('arenaSession.actions.push('));
 assert.ok(main.includes('arenaSeededRandom(match.seed)'));
 assert.ok(main.includes('saveArenaPending(session.storage,owner,slot,entry)'));
 assert.ok(main.includes('clearArenaPending(session.storage,ownerId,slot,entry)'));
});

test('verified tournament ring remains equipped after save migration and reload',()=>{
 const inst=arenaInventoryId(goodId);
 const s=state();
 s.characters[0].currentJob='swordsman';
 s.characters[0].jobLevels={swordsman:90};
 s.characters[0].equipment.accessory1=inst;
 s.equipmentInventory.push({instanceId:inst,equipmentId:'arena-gold-ring',enhanceLevel:7});
 s.arena.coins=12;
 suspendUnverifiedArenaAssets(s);
 assert.equal(s.characters[0].equipment.accessory1,null);
 assert.equal(s.arena.coins,0);
 assert.equal(s.arena.needsServerSync,true);
 assert.equal(s.arena.equippedRestore.hero.accessory1,inst);
 const reloaded=migrateSave(structuredClone(s));
 assert.equal(reloaded.arena.equippedRestore.hero.accessory1,inst);
 applyAuthoritativeArenaProfile(reloaded,{coins:12,gear:[{id:goodId,equipmentId:'arena-gold-ring',enhanceLevel:7}]});
 assert.equal(reloaded.characters[0].equipment.accessory1,inst);
 assert.equal(reloaded.characters[0].equipment.weapon,'normal-1');
 assert.equal(reloaded.arena.needsServerSync,false);
 assert.deepEqual(reloaded.arena.equippedRestore,{});
 assert.equal(reloaded.arena.coins,12);
 assert.equal(reloaded.equipmentInventory.find(x=>x.instanceId===inst).enhanceLevel,7);
});

test('missing, forged, incompatible or duplicated gear cannot be restored',()=>{
 const instance=arenaInventoryId(goodId);
 const invalid=state();
 invalid.characters[0].currentJob='swordsman';
 invalid.characters[0].jobLevels={swordsman:90};
 invalid.characters[0].equipment.accessory1=instance;
 invalid.equipmentInventory.push({instanceId:instance,equipmentId:'arena-gold-ring',enhanceLevel:10});
 suspendUnverifiedArenaAssets(invalid);
 applyAuthoritativeArenaProfile(invalid,{coins:0,gear:[]});
 assert.equal(invalid.characters[0].equipment.accessory1,null);
 assert.equal(invalid.equipmentInventory.some(x=>x.instanceId===instance),false);

 const mismatched=state();
 mismatched.characters[0].currentJob='swordsman';
 mismatched.characters[0].jobLevels={swordsman:5};
 mismatched.equipmentInventory.push({instanceId:instance,equipmentId:'arena-gold-ring',enhanceLevel:5});
 mismatched.characters[0].equipment.shield=instance;
 suspendUnverifiedArenaAssets(mismatched);
 applyAuthoritativeArenaProfile(mismatched,{coins:4,gear:[{id:goodId,equipmentId:'arena-gold-ring',enhanceLevel:5}]});
 assert.equal(mismatched.characters[0].equipment.shield,null); // Wrong slot and job level

 const duplicate=state();
 duplicate.characters=[{
  id:'hero',currentJob:'swordsman',jobLevels:{swordsman:100},
  equipment:{accessory1:instance}
 },{
  id:'friend',currentJob:'swordsman',jobLevels:{swordsman:100},
  equipment:{accessory1:instance}
 }];
 duplicate.equipmentInventory.push({instanceId:instance,equipmentId:'arena-gold-ring',enhanceLevel:0});
 suspendUnverifiedArenaAssets(duplicate);
 applyAuthoritativeArenaProfile(duplicate,{coins:1,gear:[{id:goodId,equipmentId:'arena-gold-ring',enhanceLevel:0}]});
 assert.equal(duplicate.characters.filter(c=>c.equipment.accessory1===instance).length,1);
});

test('another item in the previously occupied slot is never overwritten by profile recovery',()=>{
 const instance=arenaInventoryId(goodId);
 const s=state();
 s.characters[0].currentJob='swordsman';
 s.characters[0].jobLevels={swordsman:100};
 s.equipmentInventory.push({instanceId:instance,equipmentId:'arena-gold-ring',enhanceLevel:0});
 s.characters[0].equipment.accessory1=instance;
 suspendUnverifiedArenaAssets(s);
 s.characters[0].equipment.accessory1='normal-ring';
 applyAuthoritativeArenaProfile(s,{coins:15,gear:[{id:goodId,equipmentId:'arena-gold-ring',enhanceLevel:0}]});
 assert.equal(s.characters[0].equipment.accessory1,'normal-ring');
});

test('saved arena equipment recovery fetches server wallet in ordinary adventure without navigating to arena',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/if\(!normalizeArenaProgress\(targetState\)\.needsServerSync\)return/);
 assert.match(main,/const profile=await arenaApi\.profile\(slot\);\s*if\(state!==targetState\|\|currentSlot!==slot\)return;\s*applyAuthoritativeArenaProfile\(state,profile\);/);
 assert.match(main,/showGame\(\);void recoverArenaPending\(\);/);
});
