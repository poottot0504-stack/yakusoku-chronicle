import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState} from '../src/core/adventure.js';
import {adventureMarkup} from '../src/ui/adventure.js';
import {festivalArchiveMarkup,festivalTitleMarkup} from '../src/ui/hunt-festival.js';
import {HUNT_FESTIVAL} from '../src/data/hunt-festival.js';
import {TITLE_UPDATES} from '../src/data/title-updates.js';

test('grand hunt ends exactly 2026-10-20 00:00 JST',()=>{
 assert.equal(HUNT_FESTIVAL.end,Date.parse('2026-10-20T00:00:00+09:00'));
 assert.match(festivalTitleMarkup(HUNT_FESTIVAL.end-1),/クロニクル大討伐祭/);
 assert.equal(festivalTitleMarkup(HUNT_FESTIVAL.end),'');
 assert.equal(festivalTitleMarkup(HUNT_FESTIVAL.end+86400000),'');
});

test('adventure removes the ended festival panel but keeps normal gameplay',()=>{
 const state=ensureAdventureState(createNewGame(createDefaultRoster()));
 const before=adventureMarkup(state,HUNT_FESTIVAL.end-1);
 const after=adventureMarkup(state,HUNT_FESTIVAL.end);
 assert.match(before,/id="hunt-festival"/);
 assert.doesNotMatch(after,/id="hunt-festival"/);
 assert.doesNotMatch(after,/クロニクル大討伐祭/);
 assert.match(after,/data-action="explore"/);
 assert.match(after,/ワールドマップ/);
 assert.match(after,/data-action="town"/);
});

test('archived reward panel is available only after event, with legacy claim actions',()=>{
 const saved={data:{total:5000,eligible:true,phase:'ended',receipt:{id:'r1',saveSlot:1,weapon:'staff'},bonusReceipts:{}},delivered:true,bonusDelivered:{},pending:0,loading:false};
 assert.equal(festivalArchiveMarkup(saved,HUNT_FESTIVAL.end-1),'');
 const archive=festivalArchiveMarkup(saved,HUNT_FESTIVAL.end);
 assert.match(archive,/id="hunt-festival-archive"/);
 assert.match(archive,/10月19日23:59/);
 assert.match(archive,/過去イベントの報酬/);
 assert.match(archive,/✓ 受取済み/);
 assert.match(archive,/data-hunt-bonus="5000"/);
 assert.doesNotMatch(archive,/data-hunt-bonus="10000"/);
 assert.doesNotMatch(archive,/data-action="explore"/);
 const fresh={...saved,delivered:false,data:{...saved.data,receipt:null}};
 assert.match(festivalArchiveMarkup(fresh,HUNT_FESTIVAL.end),/data-hunt-reward/);
});

test('completed and ineligible festival claim states remain safe',()=>{
 const total={data:{total:100000,eligible:true,phase:'ended',receipt:{id:'r1'},bonusReceipts:{}},delivered:true,bonusDelivered:{5000:true,10000:true,50000:true,100000:true}};
 const all=festivalArchiveMarkup(total,HUNT_FESTIVAL.end);
 assert.equal((all.match(/受取済み/g)||[]).length,5);
 assert.doesNotMatch(all,/data-hunt-bonus=/);
 const ineligible=festivalArchiveMarkup({data:{total:100000,eligible:false}},HUNT_FESTIVAL.end);
 assert.match(ineligible,/討伐に参加した方が報酬の対象/);
 assert.doesNotMatch(ineligible,/data-hunt-reward/);
 const offline=festivalArchiveMarkup({data:null,error:true},HUNT_FESTIVAL.end);
 assert.match(offline,/通信エラー/);
 assert.match(offline,/data-hunt-refresh/);
});

test('title retains history but stops advertising completed event in its latest highlight',()=>{
 assert.ok(!TITLE_UPDATES[0].headline.includes('大討伐祭'));
 assert.ok(TITLE_UPDATES[0].highlights.every(x=>!x.includes('大討伐祭')));
 assert.ok(TITLE_UPDATES.slice(1).some(u=>u.details.some(x=>x.includes('大討伐祭'))));
});

test('menu can open archived rewards and refresh the archive without showing ended adventure event',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/data-hunt-archive/);
 assert.match(main,/Date\.now\(\)>=HUNT_FESTIVAL\.end/);
 assert.match(main,/openModal\(festivalArchiveMarkup\(\)\)/);
 assert.match(main,/archive\.outerHTML=festivalArchiveMarkup\(\)/);
 assert.match(main,/festivalApi\.claimBonus\(goal,slot\)/);
});
