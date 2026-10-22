import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewGame} from '../src/state/game-state.js';
import {migrateSave} from '../src/core/save-migration.js';
import {grantHuntCountApology,canReceiveHuntCountApology,isHuntCountApologyDelivered} from '../src/core/hunt-count-apology.js';
import {huntCountApologyNpcMarkup,huntCountApologyDialogueMarkup} from '../src/ui/hunt-count-apology.js';
import {townMarkup} from '../src/ui/adventure.js';

const receipt={eligible:true,claimed:true,id:'a8dd9eb7-2fbe-4205-9c4d-321b70de1234',rewardId:'enhanceCrystal',quantity:5,saveSlot:1};
const ready={eligible:true,claimed:false,rewardId:'enhanceCrystal',quantity:5};
const make=()=>createNewGame([]);

test('count apology is shown in the town only before reward is delivered',()=>{
 const fresh=make();
 assert.doesNotMatch(townMarkup(fresh,null,1),/data-hunt-count-apology-npc/);
 assert.match(townMarkup(fresh,ready,1),/data-hunt-count-apology-npc/);
 assert.match(townMarkup(fresh,ready,1),/大討伐祭|お詫びの案内人/);
 assert.match(townMarkup(fresh,receipt,1),/data-hunt-count-apology-npc/);
 assert.doesNotMatch(townMarkup(fresh,receipt,2),/data-hunt-count-apology-npc/);
 grantHuntCountApology(fresh,receipt,1);
 assert.doesNotMatch(townMarkup(fresh,receipt,1),/data-hunt-count-apology-npc/);
});

test('material compensation grants five enhancement crystals exactly once',()=>{
 const s=make();s.materials.enhanceCrystal=24;
 assert.equal(grantHuntCountApology(s,receipt,1),true);
 assert.equal(s.materials.enhanceCrystal,29);
 assert.equal(s.inventory.find(x=>x.id==='enhanceCrystal'),undefined);
 assert.equal(isHuntCountApologyDelivered(s,receipt),true);
 assert.equal(grantHuntCountApology(s,receipt,1),false);
 assert.equal(s.materials.enhanceCrystal,29);
 const migrated=migrateSave(structuredClone(s));
 assert.equal(grantHuntCountApology(migrated,receipt,1),false);
 assert.equal(migrated.materials.enhanceCrystal,29);
});

test('invalid receipt and save slot cannot grant rewards',()=>{
 const s=make();
 for(const value of [{...receipt,claimed:false},{...receipt,quantity:10},{...receipt,rewardId:'orihal'},{...receipt,id:'garbage'},receipt]){
  assert.throws(()=>grantHuntCountApology(s,value,2));
 }
 assert.equal(s.materials.enhanceCrystal??0,0);
});

test('at capacity the compensation remains pending and no materials are lost',()=>{
 const s=make();s.materials.enhanceCrystal=9995;
 assert.equal(canReceiveHuntCountApology(s),false);
 assert.throws(()=>grantHuntCountApology(s,receipt,1),/所持上限/);
 assert.equal(s.materials.enhanceCrystal,9995);
 s.materials.enhanceCrystal=9992;
 s.inventory.push({id:'enhanceCrystal',qty:3});
 assert.equal(canReceiveHuntCountApology(s),false,'legacy crystal inventory must count toward 99,999 cap');
 s.inventory=[];
 s.materials.enhanceCrystal=9995;
 assert.match(huntCountApologyDialogueMarkup(s,ready,1),/5個分の空き/);
 s.materials.enhanceCrystal=9994;
 assert.equal(grantHuntCountApology(s,receipt,1),true);
 assert.equal(s.materials.enhanceCrystal,9999);
});

test('NPC conversation apologizes for event count bug and exposes the claim button',()=>{
 const html=huntCountApologyDialogueMarkup(make(),ready,1);
 assert.match(html,/討伐数が正しくカウントされない不具合/);
 assert.match(html,/強化結晶 ×5個/);
 assert.match(html,/data-hunt-count-apology-claim/);
});

test('main client uses authenticated backend and server receipt, preserving other compensation',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const api=readFileSync(new URL('../src/online/hunt-count-apology-api.js',import.meta.url),'utf8');
 assert.match(main,/refreshHuntCountApologyStatus/);
 assert.match(main,/claimHuntCountApology/);
 assert.match(main,/saveNow\(\);closeModal\(\);renderGame\(\)/);
 assert.match(main,/rankingApologyApi\.claim/);
 assert.match(api,/yakusokuAuthorizedFetch/);
 assert.match(api,/yakusoku_hunt_count_apology_status/);
 assert.match(api,/yakusoku_hunt_count_apology_claim/);
});
