import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyMarketPurchase,serializeMarketItem,isMarketSellable} from '../src/market/market-model.js';
import {EQUIPMENT} from '../src/data/equipment.js';

const sql=readFileSync(new URL('../maintenance/market-issued-ownership-20261022.sql',import.meta.url),'utf8');

test('new market equipment IDs originate from server-side purchase inserts',()=>{
 assert.match(sql,/BEFORE INSERT ON public\.market_sales/i);
 assert.match(sql,/v_id:='verified-market-v1-'\|\|NEW\.id::text/i);
 assert.match(sql,/NEW\.item_payload:=jsonb_set\(NEW\.item_payload/i);
 assert.match(sql,/originating_sale_id uuid NOT NULL UNIQUE/i);
});

test('the database checks ownership when listing and locks the token in escrow',()=>{
 assert.match(sql,/BEFORE INSERT ON public\.market_listings/i);
 assert.match(sql,/FROM yakusoku_private\.market_issued_equipment_20261022\s+WHERE instance_id=v_id FOR UPDATE/i);
 assert.match(sql,/owner_auth_user_id <> NEW\.seller_id/i);
 assert.match(sql,/owner_save_slot <> NEW\.save_slot/i);
 assert.match(sql,/ownership_state='listed',active_listing_id=NEW\.id/i);
 assert.match(sql,/MARKET_ISSUED_EQUIPMENT_NOT_OWNED/);
});

test('only the trusted purchase transaction transfers issued equipment',()=>{
 assert.match(sql,/v_asset\.active_listing_id IS DISTINCT FROM NEW\.listing_id/i);
 assert.match(sql,/v_asset\.owner_auth_user_id IS DISTINCT FROM NEW\.seller_id/i);
 assert.match(sql,/SET owner_auth_user_id=NEW\.buyer_id/i);
 assert.match(sql,/ownership_state='pending_delivery'/i);
 assert.match(sql,/MARKET_ISSUED_NOT_IN_ESCROW/);
 assert.match(sql,/AFTER UPDATE OF buyer_ack_at ON public\.market_sales/i);
 assert.match(sql,/ownership_state='owned',updated_at=now\(\)/i);
 assert.match(sql,/AFTER UPDATE OF status ON public\.market_listings/i);
 assert.match(sql,/NEW\.status IN \('cancelled','expired','returned'\)/i);
});

test('issued ledger is private with RLS and no write or read permissions for clients',()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/i);
 assert.match(sql,/REVOKE ALL ON TABLE yakusoku_private\.market_issued_equipment_20261022\s+FROM PUBLIC, anon, authenticated/i);
 for(const functionName of [
  'reserve_issued_listing_20261022',
  'transfer_issued_equipment_20261022',
  'ack_issued_equipment_20261022',
  'release_issued_listing_20261022'
 ])assert.ok(sql.includes('REVOKE ALL ON FUNCTION yakusoku_private.'+functionName),functionName);
 assert.doesNotMatch(sql,/DELETE\s+FROM\s+public\.yakusoku_account_saves|TRUNCATE\s+public\.market_sales/i);
});

test('a server-issued receipt maintains the issued instance ID in the local save',()=>{
 const candidate=Object.keys(EQUIPMENT).find(equipmentId=>isMarketSellable({characters:[],equipmentInventory:[{instanceId:'test-asset',equipmentId}],inventory:[],materials:{}},{kind:'equipment',instanceId:'test-asset',quantity:1}).ok);
 assert.ok(candidate,'At least one saleable equipment definition exists');
 const receipt={id:'sale-1',totalPrice:100,quantity:1,
  itemPayload:{kind:'equipment',equipmentId:candidate,instance:{
   instanceId:'verified-market-v1-11111111-1111-4111-8111-111111111111',
   equipmentId:candidate,enhanceLevel:1,trueEvolved:false
  }}};
 const state={gold:200,inventory:[],materials:{},equipmentInventory:[],market:{}};
 assert.equal(applyMarketPurchase(state,receipt),true);
 assert.equal(state.gold,100);
 assert.equal(state.equipmentInventory.length,1);
 assert.equal(state.equipmentInventory[0].instanceId,receipt.itemPayload.instance.instanceId);
 assert.equal(applyMarketPurchase(state,receipt),false);
 assert.equal(state.gold,100);
 assert.equal(state.equipmentInventory.length,1);
 const outgoing=serializeMarketItem(state,{kind:'equipment',instanceId:receipt.itemPayload.instance.instanceId,quantity:1});
 assert.equal(outgoing.instance.instanceId,receipt.itemPayload.instance.instanceId);
 assert.equal(outgoing.equipmentId,candidate);
});
