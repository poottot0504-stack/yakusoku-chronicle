import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleMarkup} from '../src/ui/battle.js';
import {splitEmojiText} from '../src/ui/pixel-icons.js';
import {canReuseBattleQueueButton,updateBattleView,renderMotionFrame} from '../src/ui/battle-motion.js';

const hero={id:'hero',name:'召喚士',side:'ally',hp:100,maxHp:100,mp:100,maxMp:100,currentJob:'summoner',jobLevels:{summoner:123}};
const foe={id:'foe',name:'魔障の敵',side:'enemy',hp:800,maxHp:800};
const markup=(reserved=false,auto=true)=>battleMarkup({ui:{autoPlay:{enabled:auto}}},{
 actors:[hero,foe],actorMap:{hero,foe},awaitingActorId:'hero',planningIndex:0,planningIds:['hero'],turnNumber:2,
 mashoRun:{index:5,total:10,queueNextTen:reserved,stopAfterCurrent:false}
});
const button=(pressed,disabled=false,label='☐ 次の10戦を予約')=>({
 getAttribute:key=>key==='aria-pressed'?String(pressed):null,
 hasAttribute:key=>key==='disabled'?disabled:false,
 textContent:label
});

test('next ten reservation uses native static glyphs, not the missing pixel-icon files',()=>{
 assert.ok(splitEmojiText('☐ 次の10戦を予約').some(part=>part.type==='emoji'));
 for(const value of [false,true]){
  const html=markup(value);
  const buttonHtml=html.match(/<button[^>]*data-masho-run-queue[^>]*>[^<]*<\/button>/)?.[0];
  assert.ok(buttonHtml);
  assert.match(buttonHtml,/data-no-pixel-icon/);
  assert.match(buttonHtml,new RegExp('aria-pressed="'+value+'"'));
  assert.match(buttonHtml,value?/☑ 次の10戦を予約/:/☐ 次の10戦を予約/);
 }
 const pixelRenderer=readFileSync(new URL('../src/ui/pixel-icons.js',import.meta.url),'utf8');
 assert.match(pixelRenderer,/\[data-no-pixel-icon\]/);
});

test('queue button is preserved only when booking state, disabled state and label are unchanged',()=>{
 const off=button(false),on=button(true,false,'☑ 次の10戦を予約');
 assert.equal(canReuseBattleQueueButton(off,button(false)),true);
 assert.equal(canReuseBattleQueueButton(off,on),false);
 assert.equal(canReuseBattleQueueButton(off,button(false,true)),false);
 assert.equal(canReuseBattleQueueButton(off,button(false,false,'変更後')),false);
 assert.equal(canReuseBattleQueueButton(null,off),false);
 assert.equal(canReuseBattleQueueButton(off,null),false);
});

test('real battle frame and normal redraw routes reuse queue button through the shared updater',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const motion=readFileSync(new URL('../src/ui/battle-motion.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.equal(typeof updateBattleView,'function');
 assert.equal(typeof renderMotionFrame,'function');
 assert.match(main,/updateBattleView\(battleScreen,battleMarkup\(state,battle\)\)/);
 assert.match(motion,/if\(canReuseBattleQueueButton\(current,next\)\)next\.replaceWith\(current\)/);
 assert.match(motion,/updateBattleView\(root,markup\)/);
 assert.match(index,/masho-queue-no-flicker-20261020/);
});

test('ordinary battles continue rendering without the ten-run reservation element',()=>{
 const basic=battleMarkup({ui:{}},{actors:[hero,foe],actorMap:{hero,foe},awaitingActorId:'hero',planningIds:['hero'],planningIndex:0});
 assert.doesNotMatch(basic,/data-masho-run-queue/);
 assert.match(markup(),/data-masho-run-stop/);
 assert.match(markup(),/data-auto-stop/);
});
