import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MATERIAL_STACK_LIMIT,totalMaterialQuantity,materialCapacity,addMaterial} from '../src/core/material-cap.js';
import {applyMarketReturn,applyMarketPurchase,listMarketCandidates} from '../src/market/market-model.js';
import {purchaseMarketListing,persistMarketReturn} from '../src/market/market-sync.js';
import {migrateSave} from '../src/core/save-migration.js';
import {itemsMarkup} from '../src/ui/items.js';

const make=()=>({characters:[],activePartyIds:[],gold:20000,inventory:[],equipmentInventory:[],materials:{},market:{}});
test('market cancelled listing returns the full 1,000+ crystals once and save migration keeps them',()=>{
 const s=make();s.materials.ultimateEnhanceCrystal=995;
 const ret={id:'return-1',quantity:10,itemPayload:{kind:'material',id:'ultimateEnhanceCrystal'}};
 assert.equal(applyMarketReturn(s,ret),true);
 assert.equal(s.materials.ultimateEnhanceCrystal,1005);
 assert.equal(applyMarketReturn(s,ret),false,'receipt deduplication prevents duplicate delivery');
 const restored=migrateSave(structuredClone(s));
 assert.equal(restored.materials.ultimateEnhanceCrystal,1005);
 assert.ok(listMarketCandidates(restored).some(x=>x.id==='ultimateEnhanceCrystal'&&x.available===1005));
 assert.match(itemsMarkup({...restored,ui:{itemCategory:'material'}}),/×1,005/);
});
test('legacy inventory stacks count towards the new 9,999 item cap',()=>{
 const s=make();s.materials.ultimateEnhanceCrystal=9_990;s.inventory.push({id:'ultimateEnhanceCrystal',qty:5});
 assert.equal(MATERIAL_STACK_LIMIT,9999);
 assert.equal(totalMaterialQuantity(s,'ultimateEnhanceCrystal'),9995);
 assert.equal(materialCapacity(s,'ultimateEnhanceCrystal'),4);
 assert.equal(addMaterial(s,'ultimateEnhanceCrystal',12),4);
 assert.equal(s.materials.ultimateEnhanceCrystal,9994);
 assert.equal(materialCapacity(s,'ultimateEnhanceCrystal'),0);
});
test('market refunds beyond 9,999 never delete escrowed items or shrink old holdings',()=>{
 const s=make();s.materials.ultimateEnhanceCrystal=9998;
 assert.equal(applyMarketReturn(s,{id:'refund-over',quantity:20,itemPayload:{kind:'material',id:'ultimateEnhanceCrystal'}}),true);
 assert.equal(s.materials.ultimateEnhanceCrystal,10018);
 assert.equal(addMaterial(s,'ultimateEnhanceCrystal',5),0);
 assert.equal(s.materials.ultimateEnhanceCrystal,10018);
 assert.equal(migrateSave(structuredClone(s)).materials.ultimateEnhanceCrystal,10018);
});
test('market purchase over capacity is rejected before charging; exact boundary succeeds',async()=>{
 const s=make();s.materials.ultimateEnhanceCrystal=9998;
 const listing={id:'live-listing',unitPrice:10,quantityRemaining:10,itemPayload:{kind:'material',id:'ultimateEnhanceCrystal'}};
 let calls=0,acks=0;
 const api={purchase:async()=>{calls++;return {id:'purchase-1',quantity:1,totalPrice:10,itemPayload:listing.itemPayload};},ackPurchase:async()=>{acks++;}};
 await assert.rejects(purchaseMarketListing({api,state:s,slot:1,listing,quantity:2,save:async()=>{}}),/9,999個/);
 assert.equal(calls,0);assert.equal(s.gold,20000);assert.equal(s.materials.ultimateEnhanceCrystal,9998);
 await purchaseMarketListing({api,state:s,slot:1,listing,quantity:1,save:async()=>{}});
 assert.equal(calls,1);assert.equal(acks,1);assert.equal(s.gold,19990);
 assert.equal(s.materials.ultimateEnhanceCrystal,9999);
});
test('market returns persist and acknowledge only after a successful save',async()=>{
 const s=make();s.materials.ultimateEnhanceCrystal=999;
 let saved=0;
 const ret={id:'return-2',quantity:80,itemPayload:{kind:'material',id:'ultimateEnhanceCrystal'}};
 await persistMarketReturn({state:s,ret,save:async()=>{saved++;}});
 assert.equal(s.materials.ultimateEnhanceCrystal,1079);assert.equal(saved,1);
 assert.equal(await persistMarketReturn({state:s,ret,save:async()=>{saved++;}}),false);
 assert.equal(saved,1);
});
test('every ordinary reward source uses a shared limit and the frontend gets a new module version',()=>{
 for(const path of ['drops','gathering','crafting','chests','eclipse-rewards','hunt-festival','hunt-count-apology','masho-cave','quests']){
  const src=readFileSync(new URL('../src/core/'+path+'.js',import.meta.url),'utf8');
  assert.ok(src.includes('material-cap.js'),path);
 }
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(index,/market-materials-9999-20261022/);
});
