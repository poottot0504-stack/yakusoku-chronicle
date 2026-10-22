import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../maintenance/market-server-ledger-20261022.sql',import.meta.url),'utf8');

test('phase 5 records market transactions into private RLS tables',()=>{
  assert.match(sql,/CREATE TABLE IF NOT EXISTS yakusoku_private\.market_trade_ledger_20261022/i);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS yakusoku_private\.market_equipment_lineage_20261022/i);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON TABLE yakusoku_private\.market_trade_ledger_20261022\s+FROM PUBLIC, anon, authenticated/i);
  assert.match(sql,/REVOKE ALL ON TABLE yakusoku_private\.market_equipment_lineage_20261022\s+FROM PUBLIC, anon, authenticated/i);
  assert.match(sql,/WITH \(security_invoker = true\)/i);
  assert.doesNotMatch(sql,/GRANT\s+(SELECT|INSERT|UPDATE|DELETE|ALL)[\s\S]{0,90}TO\s+authenticated/i);
});

test('server ledger records debit, pending proceeds, delivery and claimed proceeds once',()=>{
  for(const action of [
    'buyer_purchase_recorded',
    'seller_proceeds_pending',
    'buyer_delivery_acknowledged',
    'seller_proceeds_claimed'
  ]){
    assert.ok(sql.includes(action),action);
  }
  assert.match(sql,/PRIMARY KEY \(sale_id, event_type\)/i);
  assert.ok((sql.match(/ON CONFLICT \(sale_id,event_type\) DO NOTHING/g)||[]).length>=3);
  assert.match(sql,/AFTER INSERT OR UPDATE OF buyer_ack_at, seller_claimed_at/i);
  assert.match(sql,/FOR row_sale IN SELECT \* FROM public\.market_sales ORDER BY created_at,id LOOP/i);
});

test('server-tracked equipment history avoids false owner bans for legacy item-id collisions',()=>{
  assert.match(sql,/instance_id text NOT NULL/);
  const executable=sql.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');
  assert.doesNotMatch(executable,/UNIQUE\s*\(instance_id\)/i);
  assert.match(sql,/SHADOW MODE ONLY/);
  assert.match(sql,/EXCEPTION WHEN OTHERS THEN[\s\S]*RETURN NEW/);
  assert.doesNotMatch(sql,/UPDATE\s+public\.yakusoku_account_saves|DELETE\s+FROM\s+public\.market_sales|TRUNCATE\s+public\./i);
});
