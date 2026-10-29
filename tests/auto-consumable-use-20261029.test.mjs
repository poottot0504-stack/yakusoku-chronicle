import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseAutoAction} from '../src/core/auto-play.js';
import {chooseAutoItemAction} from '../src/core/auto-items.js';
import {ITEMS,getUsableInventory,useBattleItem} from '../src/core/items.js';
import {createBattle,startTurn,resolveAction} from '../src/core/battle.js';
import {applyRaidItemEffect,createRaidTurnState,planRaidPartyAction} from '../src/raid/raidPartyTurn.js';

const make=(id,hp=1000,mp=100,job='swordsman')=>({
 id,name:id,side:'ally',currentJob:job,jobLevels:{[job]:70},level:100,
 hp,maxHp:1000,mp,maxMp:200,stats:{attack:80,defense:50,magic:90,speed:10},
 buffs:[],statusAilments:[],debuffs:[]
});
const enemy=()=>({id:'boss',name:'巨獣',side:'enemy',hp:20000,maxHp:20000,stats:{attack:80,defense:50,magic:20,speed:1},ai:[{type:'attack',power:100}]});
const supply=ids=>ids.map(id=>({...ITEMS[id],qty:1}));
const auto=(actor,allies,items,opts={})=>chooseAutoAction({actor,allies,enemies:[enemy()],skills:[],items,turn:1,...opts});

test('critical HP: use strongest effective potion first, but save full heals when mostly wasted',()=>{
 const hero=make('hero',30,200),items=supply(['highPotion','potion','megaPotion','elixir']);
 // Elixir covers HP+MP; with full MP the healing-only mega potion is preferable.
 assert.deepEqual(auto(hero,[hero],items),{type:'item',itemId:'megaPotion',targetId:'hero'});
 hero.mp=0;
 assert.deepEqual(auto(hero,[hero],items),{type:'item',itemId:'elixir',targetId:'hero'});
 hero.hp=500;hero.mp=200;
 assert.deepEqual(auto(hero,[hero],items,{strategy:'safe'}),{type:'item',itemId:'potion',targetId:'hero'});
 hero.hp=800;
 assert.equal(auto(hero,[hero],items,{strategy:'safe'}).type,'attack','not an excuse to spend at high HP');
});

test('revive highest impact first, and never select a non-battle quest, escape, or boost item',()=>{
 const alive=make('alive',900,200),ko=make('ko',0,0);
 const items=[...supply(['phoenixTail','megaPotion','turboEther','antidote']),{...ITEMS.dropScroll,qty:4},{...ITEMS.smokeBomb,qty:5},{...ITEMS.promiseChronicle,qty:2}];
 assert.deepEqual(auto(alive,[alive,ko],items),{type:'item',itemId:'phoenixTail',targetId:'ko'});
 assert.notEqual(auto(alive,[alive],items).type,'item');
});

test('MP and antidote: only used if deficit/status is meaningful, strongest effective MP first',()=>{
 const a=make('a',1000,4);
 assert.deepEqual(auto(a,[a],supply(['ether','highEther','turboEther'])),{type:'item',itemId:'turboEther',targetId:'a'});
 a.mp=195;
 assert.notEqual(auto(a,[a],supply(['ether','highEther','turboEther'])).type,'item');
 a.mp=180;a.statusAilments=[{id:'poison',turns:3}];
 assert.deepEqual(auto(a,[a],supply(['antidote','highPotion','wakeUp'])),{type:'item',itemId:'antidote',targetId:'a'});
 a.statusAilments=[{id:'sleep',turns:3}];
 assert.deepEqual(auto(a,[a],supply(['wakeUp','antidote'])),{type:'item',itemId:'wakeUp',targetId:'a'});
 a.statusAilments=[{id:'burn',turns:3}];
 assert.notEqual(auto(a,[a],supply(['wakeUp','antidote'])).type,'item');
});

test('autoplay protects against planned over-consumption and double-target recovery in one turn',()=>{
 const healer=make('healer',1000,200),a=make('injuredA',5,100),b=make('injuredB',12,100);
 const items=supply(['megaPotion']);
 const first=auto(healer,[healer,a,b],items);
 assert.equal(first.itemId,'megaPotion');
 const second=auto(healer,[healer,a,b],items,{plannedActions:[first]});
 assert.notEqual(second.type,'item','a single remaining stack cannot be used by two actors in the same turn');
 const more=[{...ITEMS.megaPotion,qty:2}];
 const another=auto(healer,[healer,a,b],more,{plannedActions:[first]});
 assert.equal(another.itemId,'megaPotion');
 assert.notEqual(another.targetId,first.targetId);
 const plannedHeal=auto(healer,[healer,a],more,{plannedActions:[{type:'skill',skill:{type:'heal'},targetId:a.id}]});
 assert.notEqual(plannedHeal.type,'item','do not spend an item over an already planned healing spell');
});

test('duplicated item stacks are pooled and never overspent during party action planning',()=>{
 const hero=make('hero',1000,200),a=make('a',30,100),b=make('b',40,100),c=make('c',50,100);
 const items=[{...ITEMS.megaPotion,qty:1},{...ITEMS.megaPotion,qty:1}];
 const first=auto(hero,[hero,a,b,c],items);
 assert.equal(first.type,'item');
 const second=auto(hero,[hero,a,b,c],items,{plannedActions:[first]});
 assert.equal(second.type,'item','one of two stacks remains after the first reservation');
 assert.notEqual(second.targetId,first.targetId);
 const third=auto(hero,[hero,a,b,c],items,{plannedActions:[first,second]});
 assert.notEqual(third.type,'item','two reserved copies fully exhaust inventory');
});

test('normal battle auto-item goes through the real battle resolver and consumes exactly one item',()=>{
 const actor=make('actor',1000,200),hurt=make('hurt',50,200);
 const state={inventory:[{id:'megaPotion',qty:1},{id:'highPotion',qty:1}]};
 const battle=createBattle([actor,hurt],enemy(),{useItem:(id,target)=>useBattleItem(state,id,target)});
 startTurn(battle);
 const selection=chooseAutoAction({actor:battle.actorMap.actor,allies:battle.actors.filter(x=>x.side==='ally'),
  enemies:battle.actors.filter(x=>x.side==='enemy'),items:getUsableInventory(state),skills:[],turn:1});
 assert.equal(selection.type,'item');
 assert.equal(selection.itemId,'megaPotion');
 assert.equal(resolveAction(battle,selection).ok,true);
 const second=chooseAutoAction({actor:battle.actorMap.hurt,allies:battle.actors.filter(x=>x.side==='ally'),
  enemies:battle.actors.filter(x=>x.side==='enemy'),items:getUsableInventory(state),
  plannedActions:Object.values(battle.plannedActions),skills:[],turn:1});
 assert.notEqual(second.itemId,'megaPotion','prior plan reserved the single mega potion');
 assert.equal(resolveAction(battle,second).ok,true);
 assert.equal(state.inventory.find(x=>x.id==='megaPotion').qty,0);
 assert.ok(battle.actorMap.hurt.hp>=950,'the item fully restores HP before the enemy attacks');
 assert.ok(battle.log.some(x=>x.includes('メガポーション')));
});

test('raid auto selection can schedule an item and the existing authenticated turn code executes it',()=>{
 const actor=make('actor',1000,200),hurt=make('hurt',50,200);
 const state={inventory:[{id:'megaPotion',qty:1}]};
 let turn=createRaidTurnState([actor,hurt]);
 const pick=auto(actor,[actor,hurt],getUsableInventory(state),{raid:true});
 assert.deepEqual(pick,{type:'item',itemId:'megaPotion',targetId:'hurt'});
 turn=planRaidPartyAction(turn,{...pick,actorId:actor.id});
 const next=auto(hurt,[actor,hurt],getUsableInventory(state),{raid:true,plannedActions:turn.actions});
 assert.notEqual(next.type,'item');
 const receipt=applyRaidItemEffect({state,itemId:pick.itemId,targetId:pick.targetId,party:[actor,hurt]});
 assert.equal(receipt.ok,true);
 assert.equal(state.inventory[0].qty,0);
 assert.equal(hurt.hp,1000);
});

test('auto warning never uses an item instead of guarding and setting screen accurately describes consumable usage',()=>{
 const a=make('a',10,0);
 assert.equal(auto(a,[a],supply(['elixir']),{warning:true}).type,'defend');
 assert.equal(auto(a,[a],supply(['elixir']),{warning:true,raid:true}).type,'guard');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/items:getUsableInventory\(state\),plannedActions:Object.values\(current.plannedActions\?\?\{\}\)/);
 assert.match(main,/items:getUsableInventory\(state\),plannedActions:\(raidTurnState.actions\?\?\[\]\)/);
 assert.match(main,/selected.type==='item'\?\{type:'item',itemId:selected.itemId,targetId:selected.targetId\}/);
 assert.match(main,/所持する回復アイテムは戦闘中に実際に消費されます/);
 assert.doesNotMatch(main,/アイテムの自動消費は行いません/);
});
