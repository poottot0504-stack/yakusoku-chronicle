import test from 'node:test';
import assert from 'node:assert/strict';
import {BOOST_SCROLLS,BOOST_SCROLL_DROP_RATE} from '../src/core/boost-scrolls.js';
import {awardBattleDrops} from '../src/core/drops.js';

const storyMonster={id:'slime',bestiaryId:'slime',regionId:'field',materials:{}};
const makeState=()=>({inventory:[],materials:{},quests:{},unlockedRecipes:[],bestiary:{},equipmentInventory:[],story:{firstEndingSeen:true},cycle:1,world:{day:1}});
const noOtherDrops=()=>.9999;
const books=Object.keys(BOOST_SCROLLS);

// The drop is per eligible monster, and each of four book categories rolls separately.
test('every book is independently 0.1% and the combined chance is around 0.3994%',()=>{
 assert.equal(BOOST_SCROLL_DROP_RATE,.001);
 assert.equal(books.length,4);
 const any=1-Math.pow(1-BOOST_SCROLL_DROP_RATE,books.length);
 assert.ok(any>.00399 && any<.00401);
});

test('edge of probability: below 0.1% succeeds; at 0.1% fails for all four',()=>{
 const eligible=makeState();
 const hits=awardBattleDrops(eligible,[storyMonster],()=>.000999999);
 assert.deepEqual(hits.filter(x=>books.includes(x.id)).map(x=>x.id).sort(),books.slice().sort());
 const ineligible=makeState();
 awardBattleDrops(ineligible,[storyMonster],()=>.001);
 assert.equal(ineligible.inventory.filter(x=>books.includes(x.id)).length,0);
});

test('each book has its own roll; success in one slot does not grant all four',()=>{
 const s=makeState();let draws=0;
 const rng=()=>[.5,.0006,.5,.5][draws++]??.9999;
 awardBattleDrops(s,[storyMonster],rng);
 assert.deepEqual(s.inventory.filter(x=>books.includes(x.id)).map(x=>x.id),['jobExpScroll']);
});

test('book is 0.1% on each eligible monster including chapter bosses and cycle 2, without affecting other drops',()=>{
 const enemies=[storyMonster,storyMonster];
 const state=makeState();state.cycle=2;
 const drops=awardBattleDrops(state,enemies,()=>0);
 for(const id of books)assert.equal(drops.find(x=>x.id===id)?.qty,2,id);
 const boss=makeState();
 const rewards=awardBattleDrops(boss,[{id:'chapterboss',bestiaryId:'storyBoss-field',regionId:'field',isBoss:true}],()=>0);
 for(const id of books)assert.equal(rewards.find(x=>x.id===id)?.qty,1,id);
});

test('using the item drop boost does not change the new scroll chance',()=>{
 const state=makeState();state.boostScrolls={drop:{remainingMs:3600000}};
 awardBattleDrops(state,[storyMonster],()=>.001);
 assert.equal(state.inventory.filter(x=>books.includes(x.id)).length,0);
});

test('festival encounters, rematches and cave bosses do not receive book rolls',()=>{
 for(const enemy of [
  {id:'event-training-test',event:true,bestiaryId:'slime',regionId:'field'},
  {id:'slime',bestiaryId:'slime',regionId:'field',rematch:true},
  {id:'caveBoss',mashoBoss:true,regionId:'cave'}
 ]){
  const state=makeState();awardBattleDrops(state,[enemy],()=>0);
  assert.equal(state.inventory.filter(x=>books.includes(x.id)).length,0);
 }
});
