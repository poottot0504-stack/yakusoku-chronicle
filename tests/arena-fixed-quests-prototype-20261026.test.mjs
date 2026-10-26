import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARENA_RANKS,ARENA_QUESTS,arenaFixedEquipment } from '../src/data/arena-quests.js';
import { ARENA_EQUIPMENT } from '../src/data/arena-equipment.js';
import {EQUIPMENT} from '../src/data/equipment.js';
import {
 arenaRank,createArenaSession,arenaSessionSkills,settleArenaSession,
 normalizeArenaProgress,arenaCraftQuote,craftArenaEquipment,arenaEnhanceQuote,enhanceArenaEquipment
} from '../src/core/arena.js';
import { createDefaultState } from '../src/core/save-schema.js';
import { migrateSave } from '../src/core/save-migration.js';
import { startTurn,resolveAction,finishTurn } from '../src/core/battle.js';
import { arenaMarkup } from '../src/ui/arena.js';
import { getEnhanceQuote } from '../src/core/forge.js';

const fresh=()=>({
 ...createDefaultState(),
 characters:[{id:'hero',name:'名前変更後の主人公',isHero:true,level:500,currentJob:'mage',jobLevels:{mage:400},hp:12345,mp:8888,equipment:{weapon:'untouched-mainhand'},stats:{attack:12000,magic:14000}}],
 activePartyIds:['hero'],
 equipmentInventory:[{instanceId:'untouched-mainhand',equipmentId:'legendBlade',enhanceLevel:13}],
 inventory:[{id:'potion',qty:123}],materials:{promiseOre:10},gold:999999,bankGold:777777
});

test('quest configuration has three fixed Lv30/50/70 4-person loadouts',()=>{
 assert.deepEqual(Object.values(ARENA_QUESTS).map(q=>q.level),[30,50,70]);
 assert.deepEqual(ARENA_RANKS.map(r=>[r.grade,r.maxTurns,r.coins]),[['S',3,5],['A',6,3],['B',10,2],['C',100,1]]);
 for(const q of Object.values(ARENA_QUESTS)){
  assert.equal(q.roster.length,4);
  assert.ok(q.roster.every(t=>EQUIPMENT[t.weapon]),'preset equipment ids resolve');
  assert.ok(q.roster.every(t=>Object.values(arenaFixedEquipment(t,q.level)).every(id=>Boolean(EQUIPMENT[id]))),'all 9 preset gear slots resolve');
  assert.ok(q.roster.every(t=>t.skills?.length>0),'preset skills exist');
 }
});

test('only shield, spellbook, ring and charm can be crafted',()=>{
 assert.deepEqual(Object.values(ARENA_EQUIPMENT).map(x=>x.slot),['shield','spellbook','accessory','accessory']);
 assert.deepEqual(Object.values(ARENA_EQUIPMENT).filter(x=>x.slot==='accessory').map(x=>x.accessoryType),['ring','charm']);
 assert.equal(ARENA_EQUIPMENT['arena-guardian-shield'].shieldSize,'large');
 assert.equal(ARENA_EQUIPMENT['arena-arcane-spellbook'].weaponType,'spellbook');
 assert.equal(ARENA_EQUIPMENT['arena-bronze-saber'],undefined);
 assert.equal(ARENA_EQUIPMENT['arena-silver-mail'],undefined);
});
test('rank boundaries are exact at 3,6,10,100',()=>{
 for(const [turns,grade,coins] of [[1,'S',5],[3,'S',5],[4,'A',3],[6,'A',3],[7,'B',2],[10,'B',2],[11,'C',1],[100,'C',1]]){
  assert.deepEqual([arenaRank(turns)?.grade,arenaRank(turns)?.coins],[grade,coins]);
 }
 for(const turns of [0,-1,101,1.1,NaN])assert.equal(arenaRank(turns),null);
});

test('arena never scales from the saved hero level, equipment, HP, job mastery or potion stock',()=>{
 const s=fresh(),before=structuredClone(s),session=createArenaSession('arena30');
 assert.deepEqual(s,before,'creating a virtual battle does not write to normal save');
 assert.equal(session.roster.length,4);
 for(const actor of session.roster){
  assert.equal(actor.level,30);
  assert.equal(actor.jobLevels[actor.currentJob],30);
  assert.ok(actor.maxHp<1000,'saved Lv500 HP is not imported');
  assert.ok(actor.arenaFixedEquipment.weapon);
  assert.equal(Object.keys(actor.arenaFixedEquipment).length,actor.currentJob==='shielder'?9:8);
  assert.ok(actor.arenaSkills.length>0);
  assert.deepEqual(actor.masteryBonuses,{});
  assert.equal(actor.battleFlatStats.attack,0);
 }
 assert.notEqual(session.roster[0].id,'hero');
 assert.equal(session.roster[0].arenaFixedEquipment.weapon,'鉄の剣');
 assert.equal(session.battle.actors.filter(a=>a.side==='ally').length,4);
 assert.ok(session.battle.arenaQuestId);
});

test('fixed loadouts are not affected by a stranger modifying other party builds',()=>{
 const a=createArenaSession('arena50'),b=createArenaSession('arena50');
 a.roster[0].stats.attack=9999;
 a.roster[0].arenaSkills.push({id:'cheat',mp:0});
 assert.deepEqual(b.roster[0].arenaSkills,ARENA_QUESTS.arena50.roster[0].skills);
 assert.notEqual(a.roster[0].stats.attack,b.roster[0].stats.attack);
});

function forcedWin(state,questId,turns){
 const session=createArenaSession(questId),battle=session.battle;
 battle.turnNumber=turns-1;
 battle.actors.filter(a=>a.side==='enemy').forEach(a=>a.hp=0);
 return {session,battle,result:settleArenaSession(state,session)};
}

test('victory grants coins on every clear but never twice for one session',()=>{
 const s=fresh(),baseline=structuredClone(s);
 let w=forcedWin(s,'arena30',3);
 assert.equal(w.result.grade,'S');
 assert.equal(w.result.coins,5);
 assert.equal(s.arena.coins,5);
 assert.throws(()=>settleArenaSession(s,w.session),/受取済み/);
 assert.equal(s.arena.coins,5);
 w=forcedWin(s,'arena30',6);
 assert.equal(w.result.coins,3);
 assert.equal(s.arena.coins,8);
 assert.equal(s.arena.best.arena30,3);
 assert.equal(s.arena.records.arena30.wins,2);
 assert.equal(s.arena.records.arena30.attempts,2);
 for(const key of ['characters','activePartyIds','equipmentInventory','inventory','materials','gold','bankGold'])assert.deepEqual(s[key],baseline[key],key);
});

test('failure at 100 turns gives zero coins, preserves the normal adventure',()=>{
 const s=fresh(),original=structuredClone(s.characters);
 const session=createArenaSession('arena70');
 session.battle.turnNumber=100;
 session.battle.phase='complete';
 const result=settleArenaSession(s,session);
 assert.equal(result.victory,false);
 assert.equal(result.coins,0);
 assert.equal(result.turns,100);
 assert.equal(s.arena.records.arena70.attempts,1);
 assert.deepEqual(s.characters,original);
});

test('settlement rejects incomplete battles and unknown quest ids',()=>{
 const s=fresh(),a=createArenaSession('arena30');
 assert.throws(()=>settleArenaSession(s,a),/戦闘が終了/);
 assert.throws(()=>createArenaSession('arena999'),/クエスト/);
 assert.equal(s.arena.coins,0);
});

test('battle engine accepts supplied arena skills and uses turn ordering',()=>{
 const a=createArenaSession('arena30'),b=a.battle;
 startTurn(b);
 for(let i=0;i<4;i++){
  const current=b.actorMap[b.awaitingActorId];
  const skills=arenaSessionSkills(a,current.id);
  const skill=skills.at(-1);
  assert.ok(skill);
  const result=resolveAction(b,{type:'skill',skill,targetId:'arena30-stonebeast'},()=>.85);
  assert.equal(result.ok,true);
 }
 assert.equal(b.phase,'complete');
 assert.ok(b.actors.some(x=>x.side==='enemy'&&x.hp<b.actors.find(a=>a.side==='enemy').maxHp));
 assert.equal(b.turnNumber,0,'first full round is still recorded as turn 1 until finishTurn');
 finishTurn(b);
 assert.equal(b.turnNumber,1);
});

test('coin crafting is atomic, isolated from G/materials, and uses registered gear',()=>{
 const s=fresh();
 assert.equal(arenaCraftQuote(s,'arena-guardian-shield').canCraft,false);
 assert.throws(()=>craftArenaEquipment(s,'arena-guardian-shield'),/コイン/);
 const beforeGold=s.gold,beforeMaterials=structuredClone(s.materials);
 s.arena.coins=16;
 const inst=craftArenaEquipment(s,'arena-guardian-shield');
 assert.equal(inst.equipmentId,'arena-guardian-shield');
 assert.equal(EQUIPMENT[inst.equipmentId],ARENA_EQUIPMENT[inst.equipmentId]);
 assert.equal(s.arena.coins,4);
 assert.deepEqual(s.materials,beforeMaterials);
 assert.equal(s.gold,beforeGold);
 assert.throws(()=>getEnhanceQuote(s,inst.instanceId),/闘技大会装備/);
 assert.throws(()=>craftArenaEquipment(s,'arena-guardian-shield'),/コイン/);
});

test('arena upgrade spends coins only and is capped at +10',()=>{
 const s=fresh();
 s.arena.coins=100;
 const inst=craftArenaEquipment(s,'arena-gold-ring');
 const gold=s.gold,materials=structuredClone(s.materials);
 for(let level=1;level<=10;level++){
  const q=arenaEnhanceQuote(s,inst.instanceId);
  assert.equal(q.next,level);
  assert.equal(q.canEnhance,true);
  const r=enhanceArenaEquipment(s,inst.instanceId);
  assert.equal(r.level,level);
 }
 assert.equal(arenaEnhanceQuote(s,inst.instanceId).maxed,true);
 assert.throws(()=>enhanceArenaEquipment(s,inst.instanceId),/これ以上/);
 assert.equal(inst.enhanceLevel,10);
 assert.equal(s.gold,gold);
 assert.deepEqual(s.materials,materials);
});

test('legacy saves initialize their own arena wallets without affecting existing progress',()=>{
 const s=fresh();delete s.arena;
 const result=migrateSave(s);
 assert.equal(result.arena.coins,0);
 assert.equal(result.arena.records.arena50.attempts,0);
 assert.equal(result.characters[0].level,500);
 const legacy={arena:{coins:-300,best:{arena50:999},records:{arena30:{wins:-1,attempts:Infinity}}}};
 normalizeArenaProgress(legacy);
 assert.equal(legacy.arena.coins,0);
 assert.equal(legacy.arena.best.arena50,undefined);
 assert.equal(legacy.arena.records.arena30.wins,0);
});

test('arena screen renders grades, fixed builds and workshop for mobile or PC',()=>{
 const html=arenaMarkup(fresh());
 for(const lv of [30,50,70])assert.match(html,new RegExp('Lv'+lv));
 for(const value of ['3枚','5枚','2枚','1枚'])assert.match(html,new RegExp(value));
 assert.match(html,/data-arena-start="arena30"/);
 assert.match(html,/data-arena-craft="arena-guardian-shield"/);
 assert.match(html,/data-arena-back/);
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(source,/if\(battle\?\.arenaQuestId\)return finishArenaBattle\(\)/);
 assert.match(source,/if\(!battle\.arenaQuestId\)syncBattlePartyToState\(state,battle\)/);
 assert.match(source,/battle\.arenaQuestId&&battle\.turnNumber>=100/);
 assert.match(source,/battle\?\.arenaQuestId\?arenaSessionSkills\(/);
 assert.match(source,/battle\.arenaQuestId\|\|battle\.autoPlayStopped/);
 assert.match(source,/data-more="arena"/);
});
