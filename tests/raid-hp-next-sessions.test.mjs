import test from 'node:test';
import assert from 'node:assert/strict';
import {createEncounter,currentEncounter,getRaidWindow} from '../src/raid/raidRules.js';
import {raidDetailsMarkup,raidEventQuestMarkup} from '../src/ui/raid.js';

test('completed Oct 15 raids retain their original 3–4 million HP',()=>{
  for(const slot of ['2026-10-15-evening','2026-10-15-night']){
    const r=createEncounter(slot);assert.ok(r.maxHp>=3_000_000&&r.maxHp<=4_000_000);
  }
  assert.equal(createEncounter('2026-10-15-night').maxHp,3_699_305);
});
test('all subsequent raid sessions use 10–12 million HP, without changing bosses',()=>{
  const expected={
    '2026-10-16-evening':['fenrir',10_768_539],
    '2026-10-16-night':['fenrir',10_848_934],
  };
  for(const [slot,[bossId,hp]] of Object.entries(expected)){
    const r=createEncounter(slot);
    assert.equal(r.maxHp,hp);
    assert.equal(r.currentHp,hp);
    assert.equal(r.bossId,bossId);
  }
  for(const slot of ['2026-10-17-night','2026-10-18-evening','2026-11-01-night']){
    const r=createEncounter(slot);assert.ok(r.maxHp>=10_000_000&&r.maxHp<=12_000_000);
  }
});
test('raid information explains new HP and front-end current encounter uses same bounds',()=>{
  const info=raidDetailsMarkup();
  assert.match(info,/10,000,000～12,000,000/);
  assert.doesNotMatch(info,/800,000～1,200,000/);
  const t=Date.parse('2026-10-16T09:30:00Z');
  assert.equal(getRaidWindow(t)?.id,'2026-10-16-evening');
  const r=currentEncounter(t);
  assert.ok(r.maxHp>=10_000_000&&r.maxHp<=12_000_000);
});
