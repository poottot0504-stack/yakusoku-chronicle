import test from 'node:test';
import assert from 'node:assert/strict';
import {festivalMarkup,festivalDetailsMarkup} from '../src/ui/hunt-festival.js';
import {HUNT_FESTIVAL} from '../src/data/hunt-festival.js';

const snapshot=(total, now=HUNT_FESTIVAL.start+12*3600_000)=>festivalMarkup({data:{total,phase:now<HUNT_FESTIVAL.end?'active':'ended',eligible:true,receipt:null,bonusReceipts:{}},delivered:false,bonusDelivered:{},pending:0},now);

test('first goal at exactly 2,500 switches to second 5,000, not finished',()=>{const h=snapshot(2500);assert.match(h,/第1段階達成！ イベント継続中、次は5,000体へ！/);assert.match(h,/2,500 <small>\/ 5,000体/);assert.match(h,/aria-valuemax="5000"/);assert.match(h,/50%/);assert.match(h,/data-hunt-reward/);assert.match(h,/data-action="explore"/);assert.doesNotMatch(h,/討伐期間終了/);});
test('2,509 progress continues to 5,000, not 2,500/100%',()=>{const h=snapshot(2509);assert.match(h,/2,509 <small>\/ 5,000体/);assert.match(h,/50.1%/);assert.match(h,/あと 2,491体/);assert.match(h,/次の報酬：100万G ＋ オリハル2個/);assert.doesNotMatch(h,/2,509 <small>\/ 2,500体/);});
test('5,000 advances to 10,000 goal and enables both reward actions after gear delivery',()=>{const h=festivalMarkup({data:{total:5000,phase:'active',eligible:true,receipt:{id:'r',weapon:'oneHandSword',saveSlot:1},bonusReceipts:{}},delivered:true,bonusDelivered:{},pending:0},HUNT_FESTIVAL.start+13*3600_000);assert.match(h,/第2段階達成！ イベント継続中、次は10,000体へ！/);assert.match(h,/5,000 <small>\/ 10,000体/);assert.match(h,/data-hunt-bonus="5000"/);assert.match(h,/次の報酬：500万G ＋ オリハルコン2個/);});
test('10,000 advances to 50,000 instead of ending',()=>{const h=snapshot(10000);assert.match(h,/次は50,000体へ/);assert.match(h,/10,000 <small>\/ 50,000体/);assert.match(h,/20%/);});
test('even after event end, previously met milestones stay claimable',()=>{const h=snapshot(2509,HUNT_FESTIVAL.end+3600_000);assert.match(h,/討伐期間終了/);assert.match(h,/data-hunt-reward/);assert.doesNotMatch(h,/data-action="explore"/);});
test('all five rewards and 19th end described consistently',()=>{assert.match(festivalDetailsMarkup(),/2,500体を達成してもイベントは終了せず/);assert.equal(new Date(HUNT_FESTIVAL.end).toISOString(),'2026-10-19T15:00:00.000Z');});
