import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketOperationGuard} from '../src/market/market-operation-guard.js';
import {readFileSync} from 'node:fs';

test('rapid double tap never dispatches a second market transaction',async()=>{
 let release;
 const held=new Promise(resolve=>{release=resolve;});
 let entered=0,skipped=0,settled=0;
 const gate=createMarketOperationGuard({
  onBusy:()=>{skipped++;},
  onSettled:()=>{settled++;}
 });
 const first=gate.run(async()=>{entered++;await held;return 'receipt';});
 assert.equal(gate.busy,true);
 const second=await gate.run(async()=>{entered++;return 'duplicate';});
 assert.equal(second,false);
 assert.equal(entered,1);
 assert.equal(skipped,1);
 release();
 assert.equal(await first,'receipt');
 assert.equal(gate.busy,false);
 assert.equal(settled,1);
 assert.equal(await gate.run(async()=>{entered++;return 'second purchase';}),'second purchase');
 assert.equal(entered,2);
});

test('settlement lock blocks purchases without starting any server action',async()=>{
 let settlementInProgress=true;
 let ran=false;
 const gate=createMarketOperationGuard({isLocked:()=>settlementInProgress});
 assert.equal(await gate.run(async()=>{ran=true;}),false);
 assert.equal(ran,false);
 assert.equal(gate.busy,false);
 settlementInProgress=false;
 await gate.run(async()=>{ran=true;});
 assert.equal(ran,true);
});

test('network errors release the guard for a later safe retry',async()=>{
 let releases=0;
 const gate=createMarketOperationGuard({onSettled:()=>{releases++;}});
 await assert.rejects(gate.run(async()=>{throw new Error('network failed');}),/network failed/);
 assert.equal(gate.busy,false);
 assert.equal(releases,1);
 assert.equal(await gate.run(async()=>true),true);
 assert.equal(releases,2);
});

test('the game guards every inventory-changing market operation and slot switching',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const name of ['marketSubmitListing','marketBuy','marketCancelListing','marketUpdatePrice']){
  assert.match(main,new RegExp('async function '+name+'\\([^)]*\\)\\{return marketOperationGuard\\.run\\(async\\(\\)=>\\{'));
 }
 assert.match(main,/function startFresh\(slot=currentSlot\)\{if\(marketOperationGuard\.busy\|\|marketSyncBusy\)/);
 assert.match(main,/function continueGame\(slot=currentSlot\)\{if\(marketOperationGuard\.busy\|\|marketSyncBusy\)/);
 assert.match(main,/!targetState\.market\?\.everUsed\|\|marketSyncBusy\|\|marketOperationGuard\.busy/);
});
