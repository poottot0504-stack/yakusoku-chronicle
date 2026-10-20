import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_JOBS} from '../src/data/jobs.js';
import {getSkillBook,getCharacterSkillCatalog,SUMMONER_MP_MULTIPLIER} from '../src/core/skillbook.js';
import {createBattle,startTurn,resolveAction} from '../src/core/battle.js';
import {calculateDamage} from '../src/core/combat-math.js';

const summons=getSkillBook('summoner');
const blacks=getSkillBook('blackMage');
const offense=s=>s.type==='magic'||s.type==='attack';

test('summoner spells beat black mage damage at each equivalent progression point',()=>{
 for(const level of [1,10,20,30,45,70,80,90,95,100,120,150,200,250,300]){
  const summoner=summons.filter(s=>s.level<=level&&offense(s));
  const black=blacks.filter(s=>s.level<=level&&offense(s));
  const bestSummon=Math.max(...summoner.map(s=>s.power*(s.multiHit??1)));
  const bestBlack=Math.max(...black.map(s=>s.power*(s.multiHit??1)*1.1)); // Dark Mage mastery bonus
  assert.ok(bestSummon>bestBlack,`Lv${level}: summoner ${bestSummon} must beat black mage ${bestBlack}`);
 }
 assert.ok(summons.find(s=>s.level===300).power>blacks.find(s=>s.level===300).power);
});

test('summoner skills have the highest MP costs at comparable progression tiers and highest absolute MP cost',()=>{
 assert.equal(SUMMONER_MP_MULTIPLIER,1.6);
 for(const level of [1,10,20,30,45,60,70,80,95,100,120,150,200,250,300]){
  const latestSummon=summons.filter(s=>s.level<=level).at(-1);
  const highestOther=Math.max(...ALL_JOBS.filter(job=>job.id!=='summoner').flatMap(job=>getSkillBook(job.id).filter(s=>s.level<=level).map(s=>s.mp)));
  assert.ok(latestSummon.mp>highestOther,`Lv${level}: summoner ${latestSummon.mp} must exceed other jobs' ${highestOther}`);
 }
 const maxOther=Math.max(...ALL_JOBS.filter(j=>j.id!=='summoner').flatMap(j=>getSkillBook(j.id).map(s=>s.mp)));
 assert.ok(Math.max(...summons.map(s=>s.mp))>maxOther);
 assert.ok(summons.every(s=>s.mp>0));
 const character={currentJob:'blackMage',jobLevels:{blackMage:100,summoner:100}};
 const inherited=getCharacterSkillCatalog(character).find(s=>s.originalId==='summonPhoenix');
 assert.equal(inherited?.mp,summons.find(s=>s.id==='summonPhoenix').mp);
});

test('phoenix restores 70% maximum HP to every living ally and clears all their status ailments',()=>{
 const skill=summons.find(s=>s.id==='summonPhoenix');
 assert.equal(skill.type,'heal');assert.equal(skill.target,'all');
 assert.equal(skill.healRatio,.7);assert.equal(skill.highClear,true);
 assert.match(skill.description,/生存中の味方全員のHPを最大HPの70％回復/);
 assert.match(skill.description,/生存中の味方全員の状態異常を解除/);
 const stats={attack:15,defense:15,magic:300,speed:15};
 const allies=Array.from({length:4},(_,i)=>({id:`ally-${i}`,name:`味方${i}`,currentJob:i===0?'summoner':'healer',level:100,hp:i===3?0:i===0?200:100,maxHp:1000,mp:2000,maxMp:2000,stats:{...stats,speed:i===0?100:15}}));
 // Battle clones begin with clean statuses, so seed ailments once it is created.
 const enemy={id:'enemy',name:'敵',hp:999999,maxHp:999999,mp:0,maxMp:0,stats:{attack:1,defense:1,magic:1,speed:1},ai:[{type:'wait'}]};
 const battle=createBattle(allies,enemy);
 for(const id of ['ally-0','ally-1','ally-2']){
  const actor=battle.actorMap[id];actor.statusAilments=[{id:'poison',turns:3},{id:'curse',turns:3}];actor.statusResistTurns={poison:2};
 }
 startTurn(battle);
 assert.equal(resolveAction(battle,{type:'skill',skill,targetId:'ally-0'}).ok,true);
 for(let i=1;i<3;i++)resolveAction(battle,{type:'wait'},()=>.9);
 for(let i=0;i<3;i++){
  assert.equal(battle.actorMap[`ally-${i}`].hp, i===0?900:800);
  assert.deepEqual(battle.actorMap[`ally-${i}`].statusAilments,[]);
  assert.deepEqual(battle.actorMap[`ally-${i}`].statusResistTurns,{});
 }
 assert.equal(battle.actorMap['ally-3'].hp,0,'phoenix should not revive fallen allies');
 assert.equal(battle.actorMap['ally-0'].mp,2000-skill.mp);
 assert.match(battle.log.join('\n'),/ハイクリア/);
});

test('phoenix rejects insufficient MP without consuming MP or altering HP',()=>{
 const skill=summons.find(s=>s.id==='summonPhoenix');
 const caster={id:'caster',name:'召喚士',hp:100,maxHp:1000,mp:skill.mp-1,maxMp:1000,stats:{attack:5,defense:5,magic:100,speed:100}};
 const enemy={id:'enemy',name:'敵',hp:1000,maxHp:1000,stats:{attack:1,defense:1,magic:1,speed:1}};
 const battle=createBattle([caster],enemy);startTurn(battle);
 const result=resolveAction(battle,{type:'skill',skill,targetId:'caster'});
 assert.equal(result.ok,false);assert.match(result.message,/MPが足りない/);
 assert.equal(battle.actorMap.caster.hp,100);
 assert.equal(battle.actorMap.caster.mp,skill.mp-1);
});
