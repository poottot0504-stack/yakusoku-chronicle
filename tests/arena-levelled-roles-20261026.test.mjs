import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_QUESTS,arenaFixedEquipment} from '../src/data/arena-quests.js';
import {JOBS} from '../src/data/jobs.js';
import {getSkillBook} from '../src/core/skillbook.js';
import {EQUIPMENT} from '../src/data/equipment.js';
import {actorArt,BOSS_ART} from '../src/ui/battle-art.js';
import {createArenaSession,arenaSessionSkills} from '../src/core/arena.js';
import {startTurn,resolveAction,finishTurn} from '../src/core/battle.js';
import {arenaSeededRandom,verifyArenaTranscript} from '../src/core/arena-proof.js';

const classes={
 arena30:['redMage','mage','trickster','bishop'],
 arena50:['paladin','highWizard','bard','bishop'],
 arena70:['dragoon','summoner','greatShielder','astrologian']
};

test('real higher and special jobs are assigned to each arena level',()=>{
 for(const [id,expected] of Object.entries(classes)){
  const q=ARENA_QUESTS[id];
  assert.deepEqual(q.roster.map(t=>t.job),expected);
  assert.equal(q.level,Number(id.slice(-2)));
  assert.equal(q.roster.length,4);
  assert.ok(q.roster.some(t=>JOBS[t.job].unlock.type==='special'),id);
  if(id==='arena30')assert.equal(JOBS[q.roster[0].job].unlock.type,'advanced');
  if(id==='arena70')assert.equal(JOBS[q.roster[2].job].unlock.type,'advanced');
 }
});
test('every actual active job skill unlocks at or below the fixed level with real MP, power and effects',()=>{
 for(const [id,q] of Object.entries(ARENA_QUESTS)){
  for(const t of q.roster){
   const book=getSkillBook(t.job).filter(s=>!s.autoPassive&&s.level<=q.level);
   const actual=t.skills.filter(s=>!s.id.startsWith('arena-greatshield-'));
   assert.deepEqual(actual,book,id+' '+t.job);
   assert.ok(t.skills.length>0&&t.skills.length<=10);
   assert.equal(new Set(t.skills.map(s=>s.id)).size,t.skills.length);
   for(const s of t.skills){
    assert.ok(s.level>=1&&s.level<=q.level,id+' '+s.id+' skill cap');
    assert.ok(Number.isFinite(s.mp)&&s.mp>=0&&s.mp<400);
    assert.ok(Number.isFinite(s.power)&&s.power>=0);
    assert.ok(['attack','magic','heal','revive','buff'].includes(s.type),s.id);
   }
   assert.ok(Object.values(arenaFixedEquipment(t,q.level)).every(e=>!!EQUIPMENT[e]),'fixed gear exists');
  }
 }
});
test('tank has usable shield active skills instead of relying only on auto-passives',()=>{
 const defender=ARENA_QUESTS.arena70.roster[2];
 assert.equal(defender.job,'greatShielder');
 assert.deepEqual(defender.skills.map(s=>s.level),[1,30,50,70]);
 assert.deepEqual(defender.skills.map(s=>s.type),['attack','buff','buff','attack']);
});
test('arena bosses display matching real pixel bosses from the existing story atlas',()=>{
 const sprites={arena30:'storyBoss-field',arena50:'storyBoss-snow',arena70:'storyBoss-volcano'};
 for(const [id,artId] of Object.entries(sprites)){
  const q=ARENA_QUESTS[id],boss=createArenaSession(id).battle.actors.find(a=>a.side==='enemy');
  assert.equal(q.enemy.artId,artId);
  assert.ok(BOSS_ART[artId],'registered boss asset key');
  assert.equal(actorArt(boss).sheet,'story','not generic monster art');
  assert.equal(actorArt(boss).index,actorArt({side:'enemy',artId}).index);
 }
});
function tryAggressiveClear(id,seed){
 const session=createArenaSession(id),b=session.battle,rng=arenaSeededRandom(seed),actions=[];
 for(let turn=1;turn<=3;turn++){
  startTurn(b,rng);
  const ids=[...b.planningIds];
  if(!ids.length)break;
  for(const actorId of ids){
   const actor=b.actorMap[actorId];
   const skill=arenaSessionSkills(session,actorId)
    .filter(s=>(s.type==='attack'||s.type==='magic')&&s.mp<=actor.mp)
    .sort((a,b)=>((b.power??0)*(b.multiHit??1)*(b.kind==='magic'?actor.stats.magic:actor.stats.attack))-
                  ((a.power??0)*(a.multiHit??1)*(a.kind==='magic'?actor.stats.magic:actor.stats.attack)))[0];
   const action=skill?{type:'skill',skill,targetId:b.actors.find(a=>a.side==='enemy').id}:{type:'attack',targetId:b.actors.find(a=>a.side==='enemy').id};
   actions.push({actorId,type:action.type,...(skill?{skillId:skill.id}:{}),targetId:action.targetId});
   assert.equal(resolveAction(b,action,rng).ok,true);
  }
  const win=!b.actors.some(a=>a.side==='enemy'&&a.hp>0);
  if(win)return {actions,turns:turn};
  if(!b.actors.some(a=>a.side==='ally'&&a.hp>0))break;
  finishTurn(b);
 }
 return null;
}
test('S rank is reachable with legitimate fixed-skill actions and validated server replay',()=>{
 for(const id of Object.keys(ARENA_QUESTS)){
  let success=null;
  for(let seed=1;seed<=60&&!success;seed++){
   const match=tryAggressiveClear(id,seed);
   if(match){const receipt=verifyArenaTranscript({questId:id,seed,actions:match.actions});
     if(receipt.victory&&receipt.grade==='S')success={seed,receipt};
   }
  }
  assert.ok(success,id+' must be realistically S-rankable in <=3 turns');
  assert.equal(success.receipt.coins,5);
 }
});
