import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('server market listing flood protection is a database trigger, not just a UI throttle',()=>{
 const sql=readFileSync(new URL('../maintenance/market-listing-rate-guard-20261022.sql',import.meta.url),'utf8');
 assert.match(sql,/create trigger market_listing_insert_rate_guard_20261022/i);
 assert.match(sql,/before insert on public\.market_listings/i);
 assert.match(sql,/recent_count\s*>=\s*30/);
 assert.match(sql,/pg_catalog\.pg_advisory_xact_lock/);
 assert.match(sql,/new\.seller_id::text/);
 assert.match(sql,/new\.save_slot::text/);
 assert.match(sql,/security invoker/i);
 assert.match(sql,/revoke all on function/i);
 assert.doesNotMatch(sql,/truncate table|delete\s+from\s+public\.market_listings/i);
});
