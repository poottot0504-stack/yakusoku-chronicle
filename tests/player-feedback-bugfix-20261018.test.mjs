import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState} from '../src/core/adventure.js';
import {ENEMIES} from '../src/data/enemies.js';
import {getEncounterCandidates} from '../src/core/encounters.js';
import {restAtInn} from '../src/core/inn.js';
import {getMiningCharges} from '../src/core/gathering.js';
import {townMarkup} from '../src/ui/adventure.js';
import {makeGuildHuntEnemy} from '../src/core/guild-hunts.js';
import {settleMashoVictory, MASHO_ABYSS_DROP_RATE} from '../src/core/masho-cave.js';
import {mashoCaveMarkup} from '../src/ui/masho-cave.js';
import {getCharacterSkillCatalog} from '../src/core/skillbook.js';
import {createBattle,startTurn,resolveAction} from '../src/core/battle.js';
import {applyRaidSkillEffect} from '../src/raid/raidPartyTurn.js';
import {useBoostScroll,remainingBoostMs,advanceBoostPlaytime,normalizeBoostScrolls,isBoostScrollActive} from '../src/core/boost-scrolls.js';
import {itemsMarkup} from '../src/ui/items.js';

const state=()=>ensureAdventureState(createNewGame(createDefaultRoster()));

test('chapter 8 volcano Golem restored without removing the rare ruins Mimic',()=>{
 assert.equal(ENEMIES.monster078?.name,'ゴーレム・8');
 assert.equal(ENEMIES.monster078?.regionId,'volcano');
 assert.ok(getEncounterCandidates(state(),'volcano').some(e=>e.id==='monster078'));
 assert.equal(ENEMIES.mimic?.name,'ミミック');
 assert.equal(ENEMIES.mimic?.regionId,'ruins');
 assert.ok(getEncounterCandidates(state(),'ruins').some(e=>e.id==='mimic'));
});

test('guild hunt 025 is visible directly in town even if old quest prerequisites are incomplete',()=>{
 const s=state(),id='guild-side-025';
 s.quests[id]={status:'accepted',progress:0};s.adventure.regionId='abyss';
 s.world.timePhase='day';s.world.weather='clear';s.story.rareGate=false;
 s.inventory=s.inventory.filter(x=>x.id!=='moonToken');
 const html=townMarkup(s);
 assert.match(html,/data-npc-guild-hunt="guild-side-025"/);
 assert.match(html,/嵐歌のセイレーンに直接挑戦する/);
 const enemy=makeGuildHuntEnemy(s,id,()=>.5);
 assert.equal(enemy.bestiaryId,'stormSiren');
 s.quests[id].status='completed';
 assert.doesNotMatch(townMarkup(s),/data-npc-guild-hunt="guild-side-025"/);
});

test('inn always replenishes at least one mining charge even on a zero roll and for revisited areas',()=>{
 const s=state();
 s.gold=100000;s.adventure.regionId='volcano';
 s.gathering={miningCharges:{field:0,volcano:0}};
 const goldBefore=s.gold;
 restAtInn(s,'volcano-inn',()=>0);
 assert.ok(s.gold<goldBefore);
 assert.equal(getMiningCharges(s,'field'),1);
 assert.equal(getMiningCharges(s,'volcano'),1);
 restAtInn(s,'volcano-inn',()=>.999999);
 assert.equal(getMiningCharges(s,'volcano'),5);
});

const caveState=()=>({cycle:2,characters:[],activePartyIds:[],gold:0,inventory:[],equipmentInventory:[],materials:{},story:{firstEndingSeen:true},mashoCave:{highestCleared:25,clearCounts:{}}});
const caveWin=(s,f=21,rng=()=>1)=>settleMashoVictory(s,{mashoFloor:f,actors:[{side:'enemy',hp:0,mashoBoss:true,mashoFloor:f},{side:'ally',hp:1}]},rng,0);

test('abyss 21-25 maintains rare weapon rate but guarantees one ultimate crystal every 5 wins',()=>{
 assert.equal(MASHO_ABYSS_DROP_RATE,.002);
 const s=caveState();
 for(let n=1;n<=10;n++){
  const reward=caveWin(s,20+n%5+1,()=>1);
  assert.equal(reward.equipment,null);
  assert.equal(Boolean(reward.enhanceMaterial),n%5===0,'Expected the 5-run material safety net');
 }
 assert.equal(s.mashoCave.abyssClearCount,10);
 assert.equal(s.materials.ultimateEnhanceCrystal,2);
 assert.equal(s.equipmentInventory.length,0);
 const html=mashoCaveMarkup(s);
 assert.match(html,/究極強化結晶/);
 assert.doesNotMatch(html,/ドロップアイテムなし/);
 const legacy=caveState();delete legacy.mashoCave.abyssClearCount;legacy.mashoCave.clearCounts={21:4};
 const after=caveWin(legacy,22,()=>1);
 assert.equal(legacy.mashoCave.abyssClearCount,5);
 assert.ok(after.enhanceMaterial,'Existing clear counts must still count toward the next guaranteed crystal');
});

const bishop=()=>({id:'bishop',name:'大神官',currentJob:'bishop',level:320,jobLevels:{bishop:300},stats:{attack:50,defense:50,magic:500,speed:50},hp:100,maxHp:10000,mp:2000,maxMp:2000});
const fallen=()=>({id:'ally',name:'倒れた仲間',level:320,stats:{attack:50,defense:50,magic:50,speed:50},hp:0,maxHp:10000,mp:100,maxMp:100});
const bishopSkills=()=>getCharacterSkillCatalog(bishop());
function bishopBattle(skill,extraAllies=[]){
 const caster=bishop(),enemy={id:'test-foe',name:'敵',hp:30000,maxHp:30000,stats:{attack:1,defense:1,magic:1,speed:1},ai:[{type:'attack',power:1}]};
 const b=createBattle([caster,...extraAllies],enemy);startTurn(b);
 resolveAction(b,{type:'skill',skill,targetId:caster.id},()=>.9999);
 // The battle engine resolves a round only after every living ally plans an action.
 for(let i=0;i<4&&b.phase==='planning'&&b.awaitingActorId;i++)resolveAction(b,{type:'wait'},()=>.9999);
 return b;
}
test('bishop level 120 area blessing and level 300 salvation are no longer identical',()=>{
 const low=bishopSkills().find(s=>s.id==='bishop-master-120');
 const high=bishopSkills().find(s=>s.id==='bishop-master-300');
 assert.ok(low&&high);assert.equal(low.fullHeal,false);assert.equal(high.fullHeal,true);
 assert.equal(high.reviveFallenRatio,.3);
 assert.ok(low.description.includes('1,100回復'));assert.ok(high.description.includes('蘇生'));
 const groupLow=bishopBattle(low,[{...fallen(),hp:100}]);
 assert.equal(groupLow.actorMap.ally.hp,1200,'Level 120 skill is a 1100-point heal');
 const groupHigh=bishopBattle(high,[fallen()]);
 assert.equal(groupHigh.actorMap.ally.hp,3000,'Final skill revives allies at 30 percent');
 assert.equal(groupHigh.actorMap.bishop.hp,10000,'Final skill fully restores living allies');
 const raidCaster=bishop(),raidFallen=fallen();
 const raid=applyRaidSkillEffect({actor:raidCaster,skill:high,targetId:raidCaster.id,party:[raidCaster,raidFallen]});
 assert.ok(raid.ok);assert.equal(raid.revived,1);assert.equal(raidFallen.hp,3000);
 assert.equal(raidCaster.hp,10000);
});

test('a rolled two-hour job EXP book stays active for two full gameplay hours after save/load',()=>{
 const s={inventory:[{id:'jobExpScroll',qty:2}]};
 const use=useBoostScroll(s,'jobExpScroll',{rng:()=>.5});
 assert.equal(use.hours,2);
 assert.equal(remainingBoostMs(s,'jobExp'),7200000);
 advanceBoostPlaytime(s,3600000);
 assert.equal(remainingBoostMs(s,'jobExp'),3600000);
 assert.equal(s.boostScrolls.jobExp.initialDurationMs,7200000);
 s.boostScrolls=normalizeBoostScrolls(s.boostScrolls);
 assert.equal(remainingBoostMs(s,'jobExp'),3600000);
 assert.match(itemsMarkup(s),/今回の効果：2時間/);
 assert.ok(isBoostScrollActive(s,'jobExp'));
 advanceBoostPlaytime(s,3600000);
 assert.equal(remainingBoostMs(s,'jobExp'),0);
 assert.equal(isBoostScrollActive(s,'jobExp'),false);
});
