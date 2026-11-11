import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {actorArt, battleStageMarkup} from '../src/ui/battle-art.js';
import {MASHO_DEPTH_BOSS_ART} from '../src/ui/masho-depth-sprites.js';
import {size as oldSize} from '../src/data/masho-depth-tree-pixels.js';
import {MASHO_BOSS_29_IMAGE} from '../src/data/masho-boss-29-original.js';
import {MASHO_BOSS_30_IMAGE} from '../src/data/masho-boss-30-original.js';

// The originals were user-uploaded JPEGs. Production assets have only been
// proportionally resized and padded, not redrawn or replaced by generated art.
// These checksums protect the submitted designs across future releases.
const originals=[
 {id:'masho29-bellnecros',src:MASHO_BOSS_29_IMAGE,
  sha256:'d89fa79add19b9c9db91ede0ac2fa886c995979bfd5d91193d5cfee81003375b'},
 {id:'masho30-galaxy-dragon',src:MASHO_BOSS_30_IMAGE,
  sha256:'eea07e5439b7b7cd823a5f412f1404f9703a145f5a745bb683d8c04dc8645616'}
];

test('29F/30F use the actual submitted boss artwork, not previous low-res SVG substitutes',()=>{
 assert.deepEqual(oldSize,[56,52]);
 for(const {id,src,sha256} of originals){
  const art=actorArt({side:'enemy',artId:id,isBoss:true});
  assert.equal(art.src,src,id);
  assert.equal(art.aspect,56/52,id);
  assert.equal(art.cols,1,id);
  assert.equal(art.rows,1,id);
  assert.equal(art.index,0,id);
  assert.match(art.src,/^data:image\/webp;base64,/);
  const bytes=Buffer.from(art.src.split(',')[1],'base64');
  assert.equal(bytes.toString('ascii',0,4),'RIFF',id);
  assert.equal(bytes.toString('ascii',8,16),'WEBPVP8 ',id);
  assert.equal(bytes.readUInt16LE(26)&0x3fff,112,id);
  assert.equal(bytes.readUInt16LE(28)&0x3fff,104,id);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256,id);
 }
});

test('29F/30F keep identical boss viewport dimensions to 26–28F without cropping',()=>{
 const old=actorArt({side:'enemy',artId:'masho28-graciel'});
 const axe=actorArt({side:'enemy',artId:'masho29-bellnecros'});
 const dragon=actorArt({side:'enemy',artId:'masho30-galaxy-dragon'});
 assert.equal(axe.aspect,old.aspect);
 assert.equal(dragon.aspect,old.aspect);
 for(const [id,artId] of [['masho-depth-29:0','masho29-bellnecros'],['masho-depth-30:0','masho30-galaxy-dragon']]){
  const html=battleStageMarkup({}, {actors:[{id:'boss',side:'enemy',name:'魔障ボス',artId,isBoss:true,hp:100,maxHp:100}]});
  assert.ok(html.includes(`data-art-key="${id}"`),id);
  assert.match(html,/--sprite-aspect:1\.0769230769230769/);
  assert.match(html,/data:image\/webp;base64,/);
  assert.doesNotMatch(html,/sprite-mirror/);
 }
});

test('legacy 26–28F art remains intact and all 26–30F share the same rendered ratio',()=>{
 const ids=['masho26-yggdravain','masho27-volgrad','masho28-graciel','masho29-bellnecros','masho30-galaxy-dragon'];
 assert.equal(Object.keys(MASHO_DEPTH_BOSS_ART).length,ids.length);
 assert.deepEqual(ids.map(id=>MASHO_DEPTH_BOSS_ART[id].aspect),Array(5).fill(56/52));
 for(const id of ids.slice(0,3))assert.match(MASHO_DEPTH_BOSS_ART[id].src,/^data:image\/svg\+xml/);
});
