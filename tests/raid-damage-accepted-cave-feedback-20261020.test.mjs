import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estimatedRaidDamageCeiling,prepareRaidDamageSubmission} from '../src/raid/raidDamageGuard.js';
import {raidActionPayload} from '../src/raid/raidBattle.js';
import {calculateRaidSkillDamage} from '../src/raid/raidPartyTurn.js';

const make=(level,job=1,stats={attack:5000,magic:5000,speed:60})=>({level,currentJob:'summoner',jobLevels:{summoner:job},stats});
test('raid budget mirrors the server upper bound while retaining a 10% safety margin',()=>{
 assert.equal(estimatedRaidDamageCeiling(make(57,26)),31920);
 assert.equal(estimatedRaidDamageCeiling(make(70,37)),38440);
 assert.equal(estimatedRaidDamageCeiling(make(128,52)),85000);
 assert.equal(estimatedRaidDamageCeiling(make(200,139)),200000);
 assert.equal(estimatedRaidDamageCeiling(make(200,139),57),31920+120*(139-26));
});
test('oversized legitimate spell damage is submitted with verified safe bounds, not as a rejected 0',()=>{
 const actor=make(57,26,{attack:100000,magic:120000,speed:10});
 const computed=calculateRaidSkillDamage(actor,{type:'magic',kind:'magic',power:1000,element:'light'},{defense:400,magicDefense:600},{},{element:'dark'});
 assert.ok(computed>30000);
 const adjusted=prepareRaidDamageSubmission({type:'skill',damage:computed,supportActions:1},actor,57);
 assert.equal(adjusted.adjusted,true);
 assert.ok(adjusted.submitted>0&&adjusted.submitted<31920);
 assert.equal(adjusted.payload.supportActions,1);
 assert.equal(adjusted.payload.type,'skill');
 assert.equal(adjusted.requested,computed);
});
test('server-side guard remains authoritative; client never raises an original damage request',()=>{
 const actor=make(200,139);
 const raw=raidActionPayload('attack',actor,{defense:400});
 const safe=prepareRaidDamageSubmission(raw,actor,200);
 assert.ok(safe.submitted<=safe.requested);
 const plain=prepareRaidDamageSubmission({damage:350},actor,200);
 assert.equal(plain.submitted,350);
 assert.equal(plain.adjusted,false);
 assert.equal(prepareRaidDamageSubmission({damage:0},actor,200).submitted,0);
 assert.equal(prepareRaidDamageSubmission({damage:Infinity},actor,200).submitted,0);
});
test('verified join cap is retained across server snapshots and used by skill and DOT submissions',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/verifiedLevel:r\?\.verifiedLevel\?\?prev\?\.verifiedLevel/);
 assert.match(main,/prepareRaidDamageSubmission\(payload,actor,raidRoom\?\.verifiedLevel\)/);
 assert.match(main,/prepareRaidDamageSubmission\(\{damage:dot\.damage\},raidHero\(\),raidRoom\?\.verifiedLevel\)/);
 assert.match(main,/if\(r\.damageRejected\)\{/);
});
