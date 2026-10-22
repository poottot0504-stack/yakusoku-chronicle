import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(
  new URL('../maintenance/account-save-integrity-20261022.sql', import.meta.url),
  'utf8'
);

test('cloud-save rollout protects existing data before adding validation',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS yakusoku_private\.account_saves_backup_20261022 AS/i);
 assert.match(sql,/FROM public\.yakusoku_account_saves/i);
 assert.match(sql,/ALTER TABLE yakusoku_private\.account_saves_backup_20261022 ENABLE ROW LEVEL SECURITY/i);
 assert.match(sql,/REVOKE ALL ON TABLE yakusoku_private\.account_saves_backup_20261022/i);
 assert.doesNotMatch(sql,/DROP TABLE\s+public\.yakusoku_account_saves|TRUNCATE|DELETE\s+FROM\s+public\.yakusoku_account_saves/i);
});

test('non-destructive integrity guard checks money and inventory structure',()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION yakusoku_private\.account_save_payload_sane\(p jsonb\)/i);
 assert.match(sql,/SECURITY INVOKER/i);
 for(const keyword of ["'gold'","'bankGold'","'inventory'","'materials'","'equipmentInventory'","'instanceId'","'equipmentId'","'enhanceLevel'"]){
  assert.ok(sql.includes(keyword),keyword);
 }
 assert.match(sql,/count\(DISTINCT obj->>'instanceId'\)/);
 assert.match(sql,/ADD CONSTRAINT account_save_integrity_guard_20261022/i);
 assert.match(sql,/CHECK \(yakusoku_private\.account_save_payload_sane\(save_data\) IS TRUE\)/i);
 assert.match(sql,/Older save versions may omit bankGold/);
 assert.ok(sql.includes("k='bankGold' AND NOT (p ? 'bankGold')"));
 assert.match(sql,/TO service_role/i);
 assert.doesNotMatch(sql,/jsonb_object_length/);
});

test('integrity monitoring has no client access, bans, or player notifications',()=>{
 assert.match(sql,/account_save_integrity_watch/);
 assert.match(sql,/REVOKE ALL ON TABLE yakusoku_private\.account_save_integrity_watch/i);
 assert.match(sql,/AFTER INSERT OR UPDATE OF save_data ON public\.yakusoku_account_saves/i);
 assert.match(sql,/EXCEPTION WHEN OTHERS THEN[\s\S]*RETURN new/i);
 assert.doesNotMatch(sql,/auth\.admin\.deleteUser|delete\s+from\s+auth\.users|notify\s/i);
});
