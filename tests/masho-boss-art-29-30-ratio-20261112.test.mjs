import test from 'node:test';
import assert from 'node:assert/strict';
import {actorArt, battleStageMarkup} from '../src/ui/battle-art.js';
import {MASHO_DEPTH_BOSS_ART} from '../src/ui/masho-depth-sprites.js';
import {size as oldSize} from '../src/data/masho-depth-tree-pixels.js';
import {size as axeSize,palette as axeColors,pixels as axePixels} from '../src/data/masho-depth-bellnecros-pixels.js';
import {size as galaxySize,palette as galaxyColors,pixels as galaxyPixels} from '../src/data/masho-depth-galaxy-dragon-pixels.js';

const SYMBOLS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
test('29F and 30F share the exact 56 by 52 canvas of existing Masho bosses',()=>{
 assert.deepEqual(oldSize,[56,52]);
 for(const [id,size,colors,pixels] of [
  ['masho29-bellnecros',axeSize,axeColors,axePixels],
  ['masho30-galaxy-dragon',galaxySize,galaxyColors,galaxyPixels]
 ]){
  assert.deepEqual(size,oldSize,id);
  assert.equal(pixels.length,56*52,id);
  assert.equal(colors[0],'none',id);
  assert.ok(colors.length<=SYMBOLS.length,id);
  assert.ok([...pixels].every(x=>SYMBOLS.indexOf(x)>=0&&SYMBOLS.indexOf(x)<colors.length),id);
  const art=actorArt({side:'enemy',artId:id,isBoss:true});
  assert.equal(art.aspect,56/52,id);
  assert.equal(art.cols,1,id);
  assert.equal(art.rows,1,id);
  assert.equal(art.index,0,id);
  assert.match(art.src,/^data:image\/svg\+xml;charset=UTF-8,/);
  const svg=decodeURIComponent(art.src.split(',')[1]);
  assert.match(svg,/viewBox="0 0 56 52"/);
  assert.match(svg,/width="56" height="52"/);
  assert.match(svg,/shape-rendering="crispEdges"/);
 }
});

test('29–30F boss art uses the same battle viewport as 26–28F without cropping',()=>{
 const old=actorArt({side:'enemy',artId:'masho28-graciel'});
 const axe=actorArt({side:'enemy',artId:'masho29-bellnecros'});
 const dragon=actorArt({side:'enemy',artId:'masho30-galaxy-dragon'});
 assert.equal(axe.aspect,old.aspect);
 assert.equal(dragon.aspect,old.aspect);
 const battle={actors:[{id:'final-dragon',side:'enemy',name:'星界の覇王',artId:'masho30-galaxy-dragon',isBoss:true,hp:100,maxHp:100}]};
 const html=battleStageMarkup({},battle);
 assert.match(html,/data-art-key="masho-depth-30:0"/);
 assert.match(html,/--sprite-aspect:1\.0769230769230769/);
 assert.match(html,/data:image\/svg\+xml/);
 assert.doesNotMatch(html,/sprite-mirror/);
});

test('all 26–30F Masho boss images maintain identical ratios',()=>{
 const ids=['masho26-yggdravain','masho27-volgrad','masho28-graciel','masho29-bellnecros','masho30-galaxy-dragon'];
 assert.equal(Object.keys(MASHO_DEPTH_BOSS_ART).length,ids.length);
 assert.deepEqual(ids.map(id=>MASHO_DEPTH_BOSS_ART[id].aspect),Array(5).fill(56/52));
});
