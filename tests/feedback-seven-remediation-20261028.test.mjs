import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shieldProgressRate,shieldProgressBonus,applyShieldOpeningShouts} from '../src/core/shielder-guard.js';
import {tickEffects} from '../src/core/effects.js';
import {battleMarkup} from '../src/ui/battle.js';
import {createBattle,startTurn,resolveAction} from '../src/core/battle.js';
import {calculateDamage} from '../src/core/combat-math.js';
import {getEffectiveCombatStat} from '../src/core/combat-stats.js';
import {MASHO_DEPTH_EQUIPMENT} from '../src/data/masho-depth-rewards.js';
import {depthAccessoryEffects,applyDepthTurnRegen,applyDepthArmorShred} from '../src/core/masho-depth-effects.js';
import {getBattleBoostMultiplier} from '../src/core/boost-scrolls.js';
import {settleMashoVictory} from '../src/core/masho-cave.js';
import {mashoCaveMarkup} from '../src/ui/masho-cave.js';
import {createWorldRun,recordWorldRunVictory,worldRunSummary} from '../src/core/world-chain.js';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState,recordAdventureVictory} from '../src/core/adventure.js';
import {SKILL_BOOK} from '../src/core/skillbook.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('world map 10 wins keep full XP and sum every material receipt rather than the last victory',()=>{
 const s=ensureAdventureState(createNewGame(createDefaultRoster()));
 const hero=s.characters[0],job=hero.currentJob;
 const initial=(hero.exp??0);
 const r=createWorldRun('field');
 for(let i=0;i<10;i++){
  const win=recordAdventureVictory(s,{regionId:'field',enemyIds:['slime'],exp:10,jobExp:8,gold:10});
  recordWorldRunVictory(r,{regionId:'field',earnedGold:10,rewardsByCharacter:win.rewardsByCharacter,
   drops:[{id:'copperOre',name:'銅鉱石',qty:1},...(i===3?[{id:'mythrilOre',name:'ミスリル鉱石',qty:2}]:[])]});
 }
 const summary=worldRunSummary(r);
 assert.equal(summary.completed,10);
 assert.equal(summary.expByCharacter[hero.id],120);
 assert.equal(summary.jobExpByCharacter[hero.id],120);
 assert.equal(hero.exp-initial,120);
 assert.equal(summary.drops.find(d=>d.id==='copperOre')?.qty,10);
 assert.equal(summary.drops.find(d=>d.id==='mythrilOre')?.qty,2);
 assert.equal(summary.earnedGold,100);
 assert.match(main,/連戦全体のドロップ合計/);
 assert.match(main,/meta\.worldDrops\?\?null/);
 assert.match(main,/meta\.worldRewardByCharacter\?\?null/);
 assert.match(main,/if\(battleMeta\.exploration&&worldRun\)battleMeta\.worldDrops=drops/);
});

test('every learned shielder HP and defense level stacks: 3+6+9+12+15=45%',()=>{
 const limits=[10,20,30,45,60];
 for(const [lv,expected] of [[1,0],[10,.03],[20,.09],[30,.18],[45,.30],[60,.45],[200,.45]]){
  assert.ok(Math.abs(shieldProgressRate(lv,limits)-expected)<1e-9);
 }
 for(const job of ['shielder','greatShielder']){
  const character={currentJob:job,jobLevels:{[job]:400}};
  assert.ok(Math.abs(shieldProgressBonus(character,'hp')-.45)<1e-9);
  assert.ok(Math.abs(shieldProgressBonus(character,'defense')-.45)<1e-9);
 }
});

test('shield shouts provide +20% throughout battle, not only three turns',()=>{
 const guardian={id:'guardian',name:'守護者',side:'ally',hp:1000,maxHp:1000,mp:1,maxMp:1,level:200,currentJob:'shielder',jobLevels:{shielder:200},stats:{attack:100,defense:100,magic:100,speed:10}};
 const great={...guardian,id:'great',name:'大盾',currentJob:'greatShielder',jobLevels:{greatShielder:200}};
 const target={...guardian,id:'target',name:'対象',currentJob:'swordsman',jobLevels:{swordsman:200}};
 const b={actors:[guardian,great,target],turnNumber:0,log:[]};
 applyShieldOpeningShouts(b);
 const buffs=target.buffs;
 assert.equal(buffs.length,2);
 assert.ok(buffs.every(x=>x.permanent===true));
 assert.ok(buffs.some(x=>x.attackPct===.2&&x.magicPct===.2));
 assert.ok(buffs.some(x=>x.defensePct===.2));
 for(let turn=0;turn<20;turn++)tickEffects(target,'turnEnd');
 assert.equal(target.buffs.length,2);
 const base={actors:b.actors,actorMap:{target},awaitingActorId:'target',planningIds:['target'],planningIndex:0,turnNumber:20};
 assert.match(battleMarkup({ui:{}},base),/戦闘中常時/);
});

test('28F hero-only sword restores 1% MP alone and 2% with the 26F blessing; HP only gets charm healing',()=>{
 assert.equal(MASHO_DEPTH_EQUIPMENT['masho-28-final-claussolas'].turnMpRegenRatio,.01);
 const state={equipmentInventory:[
  {instanceId:'sword',equipmentId:'masho-28-final-claussolas'},
  {instanceId:'blessing',equipmentId:'masho-26-eternal-tree-blessing'}
 ]};
 const alone=depthAccessoryEffects(state,{equipment:{weapon:'sword'}});
 assert.equal(alone.mashoTurnRegenRatio,0);
 assert.equal(alone.mashoTurnMpRegenRatio,.01);
 let actor={side:'ally',hp:5000,maxHp:10000,mp:200,maxMp:1000,...alone};
 assert.deepEqual(applyDepthTurnRegen(actor),{hp:0,mp:10});
 const withCharm=depthAccessoryEffects(state,{equipment:{weapon:'sword',accessory2:'blessing'}});
 assert.equal(withCharm.mashoTurnRegenRatio,.01);
 assert.equal(withCharm.mashoTurnMpRegenRatio,.02);
 actor={side:'ally',hp:5000,maxHp:10000,mp:200,maxMp:1000,...withCharm};
 assert.deepEqual(applyDepthTurnRegen(actor),{hp:100,mp:20});
});

test('27F ring lowers magic defense as well as physical defense, counting each of three skill hits',()=>{
 const source={side:'ally',hp:100000,maxHp:100000,mp:1000,maxMp:1000,id:'hero',name:'勇者',
  level:200,stats:{attack:2200,magic:2200,defense:200,speed:100},mashoArmorShredPerHit:.001,mashoArmorShredMaxStacks:10};
 const enemy={side:'enemy',id:'monster',name:'魔物',hp:100000,maxHp:100000,mp:0,maxMp:0,level:200,stats:{defense:1200,magic:1200,speed:1}};
 const before=calculateDamage(source,enemy,{kind:'magic',power:100,canCrit:false},()=>.99);
 const b=createBattle([source],[enemy]);
 startTurn(b);
 assert.equal(resolveAction(b,{type:'skill',skill:{id:'tripleHit',name:'三連撃',type:'attack',kind:'physical',mp:0,power:80,multiHit:3}},()=>.99).ok,true);
 const target=b.actorMap.monster;
 assert.equal(target.mashoArmorShredStacks,3);
 assert.equal(applyDepthArmorShred(source,target,1),true);
 assert.ok(getEffectiveCombatStat(target,'defense')<getEffectiveCombatStat(enemy,'defense'));
 const after=calculateDamage(source,target,{kind:'magic',power:100,canCrit:false},()=>.99);
 assert.ok(after>before, 'Magic attacks must benefit from the ring defense effect');
});

test('drop scroll doubles 26F rare equipment chance independently on each victory, without guaranteed 2x items',()=>{
 const now=Date.UTC(2026,9,28,6);
 const make=active=>({cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:28},characters:[],activePartyIds:[],gold:0,ui:{},boostScrolls:{drop:{remainingMs:active?3600000:0}}});
 const chance=(s)=>getBattleBoostMultiplier(s,'drop',{now,includeDaily:false});
 const roll=s=>settleMashoVictory(s,{mashoFloor:26,actors:[{side:'enemy',mashoBoss:true,mashoFloor:26,hp:0},{side:'ally',hp:1}]},()=>.007,now);
 const normal=make(false),boosted=make(true);
 assert.equal(chance(normal),1);
 assert.equal(chance(boosted),2);
 assert.equal(roll(normal).equipment,null,'0.7% chance does not beat baseline 0.5%');
 assert.equal(roll(boosted).equipment?.equipmentId,'masho-26-eternal-tree-blessing','0.7% beats 1.0% with scroll');
 assert.match(mashoCaveMarkup(boosted,now),/0.5%→1%/);
});

test('Masho cave back action leads directly to town; world-map escape still allows town return',()=>{
 const state={cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:1,clearCounts:{}},ui:{}};
 assert.match(mashoCaveMarkup(state),/← 街へ戻る/);
 assert.match(main,/data-masho-back'\)\)\{if\(battle\)return;setMashoResultVisibility\(state,false\);view='town'/);
 assert.match(main,/data-explore-return/);
});
