import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const main=readFileSync(resolve(root,'src/main.js'),'utf8');
const index=readFileSync(resolve(root,'index.html'),'utf8');
// A transparent fixture mirroring the installed server-side pure SQL limit helper.
// The real PostgreSQL function was checked separately after the migration.
const cap=(lv,job)=>Math.min(240000,Math.max(30000,
  6000+400*Math.min(200,Math.max(1,lv))+120*Math.min(200,Math.max(1,job)),
  lv>=150&&job>=100?200000:lv>=120&&job>=75?130000:lv>=80&&job>=50?85000:30000));

test('low-level guard remains strict enough to block historical early raid speedruns',()=>{
 assert.equal(cap(62,37),35240);
 assert.equal(cap(48,45),30600);
 assert.ok(36*cap(62,37)<3661379,'Lv62 cannot clear the old full raid with 36 accepted actions');
 assert.ok(11*cap(48,45)<1063600,'Lv48 cannot clear the old boss in 11 accepted actions');
});
test('experienced characters retain multi-hit and high-level burst headroom',()=>{
 assert.equal(cap(120,75),130000);
 assert.equal(cap(189,193),200000);
 assert.equal(cap(200,139),200000);
 for(const n of [119558,128116]) assert.ok(n<cap(200,139));
});
test('server refusal refunds MP for rejected skill, not free negative actions',()=>{
 assert.match(main,/const mpBefore=Number\(actor\.mp\?\?0\)/);
 assert.match(main,/if\(action\.type==='skill'&&Number\(actor\.mp\?\?0\)<mpBefore\)\{actor\.mp=mpBefore;syncRaidParty\(party\);saveNow\(\);\}/);
 assert.match(main,/pendingBossStatusSkill=null/);
 assert.match(main,/if\(r\.damageRejected\)/);
 assert.match(index,/src\/main\.js\?v=hunt-security-ticket-v2-20261016-v1/);
});
