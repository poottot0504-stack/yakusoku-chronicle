import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HUNT_FESTIVAL,HUNT_FESTIVAL_BONUSES} from '../src/data/hunt-festival.js';
import {grantFestivalReward,grantFestivalBonus} from '../src/core/hunt-festival.js';
import {festivalMarkup,festivalDetailsMarkup,festivalTitleMarkup} from '../src/ui/hunt-festival.js';
import {createNewGame} from '../src/state/game-state.js';
import {migrateSave} from '../src/core/save-migration.js';
import {TITLE_UPDATES} from '../src/data/title-updates.js';

const eventId=HUNT_FESTIVAL.id;
const start=HUNT_FESTIVAL.start+60_000;
const base={id:'gear-receipt-20261016',weapon:'oneHandSword',saveSlot:2};
const rec=(goal)=>({id:`bonus-${goal}-20261016`,milestone:goal,saveSlot:2});
const fresh=()=>{const s=createNewGame([]);s.gold=0;return s;};
const show=(total,{data:overrides={},...flags}={})=>festivalMarkup({data:{phase:'active',total,receipt:null,bonusReceipts:{},eligible:true,...overrides},delivered:false,bonusDelivered:{},pending:0,...flags},start);

const milestones=[2500,5000,10000,50000,100000];
const specs=[
 [5000,1_000_000,{orihal:2}],
 [10000,5_000_000,{orichalcum:2}],
 [50000,10_000_000,{orichalcum:5,enhanceCrystal:5}],
 [100000,30_000_000,{orichalcum:10,enhanceCrystal:10}],
];
test('five-stage definition preserves all three old milestones and exact rewards',()=>{
 assert.deepEqual(HUNT_FESTIVAL.milestones,milestones);
 assert.equal(HUNT_FESTIVAL.goal,2500);
 assert.equal(HUNT_FESTIVAL.maxGoal,100000);
 assert.equal(HUNT_FESTIVAL.end,Date.parse('2026-10-20T00:00:00+09:00'));
 assert.deepEqual(Object.keys(HUNT_FESTIVAL_BONUSES).map(Number).sort((a,b)=>a-b),[5000,10000,50000,100000]);
 for(const [goal,gold,materials] of specs){
  const bonus=HUNT_FESTIVAL_BONUSES[goal];
  assert.equal(bonus.gold,gold);
  assert.deepEqual(Object.fromEntries(bonus.materials.map(({id,qty})=>[id,qty])),materials);
 }
});

test('all five stages are readable on mobile and reward description',()=>{
 const html=show(3456);
 for(const n of ['2,500体','5,000体','10,000体','50,000体','100,000体']) assert.ok(html.includes(n));
 assert.match(html,/aria-label="累計討伐数の5段階達成報酬"/);
 for(const text of ['10,000,000G','30,000,000G','オリハルコン5個','強化結晶5個','オリハルコン10個','強化結晶10個'])assert.match(festivalDetailsMarkup(),new RegExp(text));
 assert.match(festivalTitleMarkup(start),/最大100,000体まで、全5段階報酬/);
});

test('progress switches from 10,000 to 50,000 at the exact boundary',()=>{
 const before=show(9999);
 assert.match(before,/9,999 <small>\/ 10,000体/);
 const after=show(10000);
 assert.match(after,/10,000 <small>\/ 50,000体/);
 assert.match(after,/第3段階達成！/);
 assert.match(after,/20%/);
 assert.match(after,/次の報酬：1,000万G ＋ オリハルコン5個 ＋ 強化結晶5個/);
});

test('progress switches from 50,000 to 100,000 at the exact boundary',()=>{
 const before=show(49999);
 assert.match(before,/49,999 <small>\/ 50,000体/);
 const after=show(50000);
 assert.match(after,/50,000 <small>\/ 100,000体/);
 assert.match(after,/第4段階達成！/);
 assert.match(after,/50%/);
 assert.match(after,/次の報酬：3,000万G ＋ オリハルコン10個 ＋ 強化結晶10個/);
});

test('100,000 is the only fifth-stage completion, 100k-plus stays capped visually',()=>{
 for(const total of [100000,200000]){
  const html=show(total);
  assert.match(html,/全5段階達成！/);
  assert.match(html,/\/ 100,000体/);
  assert.match(html,/100%/);
  assert.doesNotMatch(html,/次は150,000体/);
 }
 assert.doesNotMatch(show(99999),/全5段階達成/);
});

test('new milestones remain locked before threshold or without any personal participation',()=>{
 let html=show(49999,{data:{receipt:base},delivered:true});
 assert.doesNotMatch(html,/data-hunt-bonus="50000"/);
 html=show(50000,{data:{receipt:base,eligible:false},delivered:true});
 assert.match(html,/討伐参加が必要/);
 assert.doesNotMatch(html,/data-hunt-bonus="50000"/);
});

test('gear grant must be completed in same slot before new bonus button is enabled',()=>{
 const html=show(100000,{data:{receipt:base},delivered:false});
 assert.match(html,/先に2,500体報酬を受け取ってください/);
 assert.doesNotMatch(html,/data-hunt-bonus="100000"/);
 const ready=show(100000,{data:{receipt:base},delivered:true});
 assert.match(ready,/data-hunt-bonus="50000"/);
 assert.match(ready,/data-hunt-bonus="100000"/);
});

test('50k reward grants exactly 10m G, 5 orichalcum and 5 crystals',()=>{
 const s=fresh();grantFestivalReward(s,base,2);
 assert.equal(grantFestivalBonus(s,rec(50000),2),true);
 assert.equal(s.gold,10_000_000);
 assert.equal(s.materials.orichalcum,5);
 assert.equal(s.materials.enhanceCrystal,5);
 assert.equal(s.inventory.some(x=>x.id==='enhanceCrystal'),false);
 assert.equal(s.festivalReceipts[`${eventId}:50000`],rec(50000).id);
});

test('100k reward grants exactly 30m G, 10 orichalcum and 10 crystals',()=>{
 const s=fresh();grantFestivalReward(s,base,2);
 assert.equal(grantFestivalBonus(s,rec(100000),2),true);
 assert.equal(s.gold,30_000_000);
 assert.equal(s.materials.orichalcum,10);
 assert.equal(s.materials.enhanceCrystal,10);
 assert.equal(s.festivalReceipts[`${eventId}:100000`],rec(100000).id);
});

test('collecting all five stages once yields exact combined total and gear',()=>{
 const s=fresh();s.gold=72;
 grantFestivalReward(s,base,2);
 for(const [goal] of specs) assert.equal(grantFestivalBonus(s,rec(goal),2),true);
 assert.equal(s.gold,46_000_072);
 assert.equal(s.materials.orihal,2);
 assert.equal(s.materials.orichalcum,17);
 assert.equal(s.materials.enhanceCrystal,15);
 assert.equal(s.equipmentInventory.filter(x=>x.instanceId.startsWith('festival-')).length,9);
 for(const [goal] of specs)assert.equal(grantFestivalBonus(s,rec(goal),2),false);
 assert.equal(s.gold,46_000_072);
});

test('new reward receipts stay idempotent after save/load and old receipt is not overwritten',()=>{
 const s=fresh();
 grantFestivalReward(s,base,2);
 grantFestivalBonus(s,rec(5000),2);
 grantFestivalBonus(s,rec(10000),2);
 const before={...s.festivalReceipts};
 grantFestivalBonus(s,rec(50000),2);
 grantFestivalBonus(s,rec(100000),2);
 const loaded=migrateSave(structuredClone(s));
 assert.equal(grantFestivalBonus(loaded,rec(50000),2),false);
 assert.equal(grantFestivalBonus(loaded,rec(100000),2),false);
 assert.equal(loaded.festivalReceipts[`${eventId}:5000`],before[`${eventId}:5000`]);
 assert.equal(loaded.festivalReceipts[`${eventId}:10000`],before[`${eventId}:10000`]);
 assert.equal(loaded.gold,s.gold);
});

test('a server-receipt mismatch, changed ID or a different slot cannot add bonuses',()=>{
 const s=fresh();
 assert.throws(()=>grantFestivalBonus(s,{...rec(50000),milestone:777},2),/受取情報/);
 assert.throws(()=>grantFestivalBonus(s,rec(50000),1),/SLOT 2/);
 assert.equal(grantFestivalBonus(s,rec(50000),2),true);
 assert.throws(()=>grantFestivalBonus(s,{...rec(50000),id:'another-server-receipt'},2),/受取済み/);
 assert.equal(s.gold,10_000_000);
});

test('50k reward is atomic when first material is at cap',()=>{
 const s=fresh();s.gold=50;s.materials.orichalcum=9995;
 assert.throws(()=>grantFestivalBonus(s,rec(50000),2),/所持上限/);
 assert.equal(s.gold,50);
 assert.equal(s.materials.orichalcum,9995);
 assert.equal(s.materials.enhanceCrystal??0,0);
 assert.equal(s.festivalReceipts?.[`${eventId}:50000`],undefined);
});

test('50k reward is atomic when second material is at cap',()=>{
 const s=fresh();s.gold=60;s.materials.orichalcum=40;s.materials.enhanceCrystal=9995;
 assert.throws(()=>grantFestivalBonus(s,rec(50000),2),/所持上限/);
 assert.equal(s.gold,60);
 assert.equal(s.materials.orichalcum,40);
 assert.equal(s.materials.enhanceCrystal,9995);
 assert.equal(s.festivalReceipts?.[`${eventId}:50000`],undefined);
});

test('100k reward is atomic when either material is at cap including legacy stacks',()=>{
 for(const blocked of ['orichalcum','enhanceCrystal']){
  const s=fresh();s.materials[blocked]=9988;
  s.inventory.push({id:blocked,qty:2});
  assert.throws(()=>grantFestivalBonus(s,rec(100000),2),/所持上限/);
  assert.equal(s.gold,0);
  assert.equal(s.materials.orichalcum??0,blocked==='orichalcum'?9988:0);
  assert.equal(s.materials.enhanceCrystal??0,blocked==='enhanceCrystal'?9988:0);
 }
});

test('material 9999 exact limit works for both 50k and 100k',()=>{
 for(const [goal,quantity] of [[50000,5],[100000,10]]){
  const s=fresh();s.materials.orichalcum=9999-quantity;s.materials.enhanceCrystal=9999-quantity;
  assert.equal(grantFestivalBonus(s,rec(goal),2),true);
  assert.equal(s.materials.orichalcum,9999);
  assert.equal(s.materials.enhanceCrystal,9999);
 }
});

test('overflow protection keeps both new rewards completely unclaimed',()=>{
 for(const [goal,gold] of [[50000,10_000_000],[100000,30_000_000]]){
  const s=fresh();s.gold=Number.MAX_SAFE_INTEGER-gold+1;
  assert.throws(()=>grantFestivalBonus(s,rec(goal),2),/所持金の上限/);
  assert.equal(s.gold,Number.MAX_SAFE_INTEGER-gold+1);
  assert.equal(s.materials.orichalcum??0,0);
  assert.equal(s.materials.enhanceCrystal??0,0);
  assert.equal(s.festivalReceipts?.[`${eventId}:${goal}`],undefined);
 }
});

test('new receipts can resume delivery after server has already reserved reward',()=>{
 const data={receipt:base,bonusReceipts:{50000:rec(50000),100000:rec(100000)}};
 const h=show(100000,{data,delivered:true});
 assert.match(h,/data-hunt-bonus="50000">受取を再開する/);
 assert.match(h,/data-hunt-bonus="100000">受取を再開する/);
 const s=fresh();grantFestivalBonus(s,rec(50000),2);grantFestivalBonus(s,rec(100000),2);
 const done=show(100000,{data,delivered:true,bonusDelivered:{50000:true,100000:true}});
 assert.equal((done.match(/✓ 受取済み/g)||[]).length,3);
});

test('title update archive preserves all five hunt festival rewards',()=>{
 assert.equal(TITLE_UPDATES.length,3);
 assert.equal(TITLE_UPDATES[0].date,'2026-10-26');
 assert.equal(TITLE_UPDATES[1].date,'2026-10-16');
 assert.equal(TITLE_UPDATES[2].date,'2026-10-15');
 for(const a of ['2,500','5,000','10,000','50,000','100,000','1,000万G','3,000万G','強化結晶'])
  assert.match(JSON.stringify(TITLE_UPDATES[1]),new RegExp(a));
});

test('new stages are wired to same server claimBonus, save rollback and unique cache keys',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/HUNT_FESTIVAL\.milestones\.includes\(goal\)/);
 assert.match(main,/festivalApi\.claimBonus\(goal,slot\)/);
 assert.match(main,/target\.materials=priorMaterials;target\.gold=priorGold;target\.festivalReceipts=priorReceipts/);
 assert.match(main,/huntBonusDelivered\.v1/);
 assert.match(html,/src\/main\.js\?v=hunt-security-ticket-v2-20261016-v1/);
});
