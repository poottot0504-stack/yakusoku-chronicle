import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const main=readFileSync(resolve(base,'src/main.js'),'utf8');
const index=readFileSync(resolve(base,'index.html'),'utf8');

test('raid battle explains rejected server damage without showing an inflated hit',()=>{
 assert.match(main,/if\(r\.damageRejected\)\{/);
 assert.match(main,/else if\(payload\.damage>0&&r\.damageApplied!=null\)/);
 assert.match(main,/状態異常ダメージはサーバー検証で反映されませんでした/);
});

test('deployed browser reloads latest main module after raid guard update',()=>{
 assert.match(index,/src\/main\.js\?v=hunt-security-ticket-v2-20261016-v1/);
});
