import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estimatedRaidDamageCeiling,prepareRaidDamageSubmission} from '../src/raid/raidDamageGuard.js';
import {formatRaidReward} from '../src/raid/raidRewardDisplay.js';
import {raidBattleMarkup} from '../src/raid/raidBattle.js';

const actor=(level,job)=>({level,currentJob:'highWizard',jobLevels:{highWizard:job},stats:{attack:100000,magic:120000}});
test('server-verified character level but unknown verified job uses a conservative ceiling',()=>{
 const hero=actor(200,150);
 const ceil=estimatedRaidDamageCeiling(hero,200);
 const prepared=prepareRaidDamageSubmission({damage:ceil},hero,200);
 assert.ok(prepared.submitted<ceil);
 assert.equal(prepared.submitted,Math.floor(estimatedRaidDamageCeiling({...hero,jobLevels:{highWizard:1}},200)*.9));
 assert.equal(prepared.payload.damage,prepared.submitted);
 assert.equal(prepareRaidDamageSubmission({damage:0},hero,200).payload.damage,0);
 assert.equal(prepareRaidDamageSubmission({damage:200000},actor(200,150),50).submitted,27000);
});
test('raid result names the exact reward, quantity, experience and extra crystal',()=>{
 const r=formatRaidReward({rank:'S',itemId:'orichalcum',qty:2,exp:50000,bonusMaterialId:'ultimateEnhanceCrystal'});
 assert.match(r,/オリハルコン ×2/);assert.match(r,/50,000/);assert.match(r,/究極強化結晶×1/);
 const unknown=formatRaidReward({rank:'B',itemId:'rare_item_id',qty:1,exp:20000});
 assert.match(unknown,/rare_item_id/);
});
test('raid markup has live server-applied hit and persistent reward receipt',()=>{
 const h=raidBattleMarkup({boss:{name:'フェンリル'},currentHp:200,maxHp:400},{id:'a',name:'a',hp:100,maxHp:100,mp:20,maxMp:20},null,[],[],{rewardText:'報酬アイテム',lastHitText:'200ダメージ'});
 assert.match(h,/data-raid-reward-status/);assert.match(h,/報酬アイテム/);
 assert.match(h,/data-raid-last-hit/);assert.match(h,/200ダメージ/);
});
test('raid implementation displays actual server result and MP consumption, not requested speculative damage',()=>{
 const s=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(s,/const appliedDamage=Math\.max/);
 assert.match(s,/r\.damageApplied\?\?0/);
 assert.match(s,/log\+=' ／ MP '/);
 assert.match(s,/formatRaidReward\(receipt\)/);
 assert.match(s,/if\(r\.damageRejected\)\{/);
});
