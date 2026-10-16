import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT,createEquipmentInstance } from '../src/data/equipment.js';
import { getEnhanceQuote,getEnhancedStats,getEnhanceMaxLevel,enhanceEquipment,ENHANCE_ADVANCED_STAGES } from '../src/core/forge.js';
import { getItemDef } from '../src/core/items.js';
import { forgeMarkup } from '../src/ui/forge.js';
import { mashoCaveMarkup } from '../src/ui/masho-cave.js';
import { isMarketSellable } from '../src/market/market-model.js';
import { awardBattleDrops } from '../src/core/drops.js';
import { settleMashoVictory } from '../src/core/masho-cave.js';
import { getRequiredJobLevel } from '../src/core/equipment-requirements.js';
import { getBattleBoostMultiplier } from '../src/core/boost-scrolls.js';
const normal=Object.values(EQUIPMENT).find(d=>!d.noEnhance&&!d.eventLimited&&d.attack>=10);
const limited=Object.values(EQUIPMENT).find(d=>!d.noEnhance&&d.eventLimited&&d.attack>=1)??Object.values(EQUIPMENT).find(d=>!d.noEnhance&&d.eventLimited);
const build=(def=normal,lv=10)=>{const instance=createEquipmentInstance(def.id,'test-id');instance.enhanceLevel=lv;const s={gold:100_000_000,equipmentInventory:[instance],materials:{enhanceCrystal:10,advancedEnhanceCrystal:15,ultimateEnhanceCrystal:10},inventory:[{id:'forgeCharm',qty:5}],characters:[],activePartyIds:[],cycle:2,story:{firstEndingSeen:true},mashoCave:{highestCleared:25}};return {s,instance};};
function cave(floor,roll,hasBook=false){const {s}=build();if(hasBook)s.boostScrolls={drop:{remainingMs:3600000}};const battle={mashoFloor:floor,actors:[{side:'enemy',mashoBoss:true,mashoFloor:floor,hp:0},{side:'ally',hp:1}]};const seq=[1,roll];return {s,result:settleMashoVictory(s,battle,()=>seq.shift()??1,Date.parse('2026-10-15T00:00:00+09:00'))};}

test('all enhanceable equipment can reach +15; no existing enhancement strength is reduced',()=>{
 let checked=0,hasNormal=0,hasEvent=0;
 for(const def of Object.values(EQUIPMENT)){
  // Previously non-enhanceable raid weapons also become eligible, but grow only 1% per stage.
  assert.equal(getEnhanceMaxLevel(def),15);
  for(const key of ['attack','defense','magic','speed','maxHp','maxMp']){
   const stat=d=>{let ins=createEquipmentInstance(def.id);ins.enhanceLevel=d;return getEnhancedStats(ins)[key];};
   const legacyCap=def.noEnhance?0:def.eventLimited?5:10;
   assert.equal(stat(legacyCap),Math.round((def[key]??0)*(1+legacyCap*.08)),`${def.id} ${key} historical cap stays unchanged`);
   let previous=stat(0);
   for(let level=1;level<=15;level++){const now=stat(level);assert.ok(now>=previous,`${def.id} ${key} +${level} declined`);previous=now;}
  }
  checked++;if(def.eventLimited)hasEvent++;else hasNormal++;
 }
 assert.equal(checked,Object.keys(EQUIPMENT).length);assert.ok(hasNormal>100&&hasEvent>100);
});

test('advanced +11 to +15 rates, costs and material requirements match agreed table',()=>{
 const {s,instance}=build();
 for(const [stage,material,qty,rate] of [[11,'enhanceCrystal',2,.85],[12,'enhanceCrystal',4,.75],[13,'advancedEnhanceCrystal',3,.65],[14,'advancedEnhanceCrystal',5,.55],[15,'ultimateEnhanceCrystal',3,.45]]){
  assert.equal(getEnhanceQuote(s,instance.instanceId,0).targetLevel,stage);
  const q=getEnhanceQuote(s,instance.instanceId,0);assert.equal(q.requiredMaterial.id,material);assert.equal(q.requiredMaterial.quantity,qty);assert.equal(q.baseSuccessRate,rate);assert.ok(q.cost>=150000);
  const gold=s.gold,mats=s.materials[material];const result=enhanceEquipment(s,instance.instanceId,{rng:()=>0,now:0});
  assert.ok(result.success);assert.equal(result.level,stage);assert.equal(s.materials[material],mats-qty);assert.equal(s.gold,gold-q.cost);
 }
 assert.ok(getEnhanceQuote(s,instance.instanceId).maxed);
 const oldPlus10=getEnhancedStats({...instance,enhanceLevel:10});const plus15=getEnhancedStats(instance);
 assert.ok(plus15.attack>=Math.round(oldPlus10.attack*1.14));
 assert.ok(plus15.attack<=Math.round(oldPlus10.attack*1.16));
});

test('all enhancement failures consume requirements but never downgrade; insufficient supplies are atomic',()=>{
 for(const stage of [8,9,10,11,12,13,14,15]){
  const {s,instance}=build(normal,stage-1),q=getEnhanceQuote(s,instance.instanceId,0);const oldGold=s.gold;
  const material=q.requiredMaterial?.id,before=material?s.materials[material]:null;
  const fail=enhanceEquipment(s,instance.instanceId,{rng:()=>.9999999,now:0});
  assert.equal(fail.success,false);assert.equal(instance.enhanceLevel,stage-1);assert.equal(s.gold,oldGold-q.cost);
  if(material)assert.equal(s.materials[material],before-q.requiredMaterial.quantity);
 }
 const {s,instance}=build();s.materials.enhanceCrystal=1;const beforeGold=s.gold;
 assert.throws(()=>enhanceEquipment(s,instance.instanceId,{now:0}),/足りません/);
 assert.equal(s.gold,beforeGold);assert.equal(s.materials.enhanceCrystal,1);
 const {s:withCharm,instance:charmTarget}=build(normal,7);const charmQty=withCharm.inventory[0].qty;
 const yes=enhanceEquipment(withCharm,charmTarget.instanceId,{useCharm:true,rng:()=>1,now:0});
 assert.equal(yes.success,true);assert.equal(withCharm.inventory[0].qty,charmQty-1);assert.equal(charmTarget.enhanceLevel,8);
 const {s:advanced,instance:advancedTarget}=build(normal,10);const advanceGold=advanced.gold;
 assert.throws(()=>enhanceEquipment(advanced,advancedTarget.instanceId,{useCharm:true,rng:()=>1,now:0}),/使用できます/);
 assert.equal(advanced.gold,advanceGold);assert.equal(advanced.inventory[0].qty,5);
});

test('previously unenhanceable raid weapons remain balanced, gaining only 15% at +15',()=>{
 const d=Object.values(EQUIPMENT).find(x=>x.noEnhance);assert.ok(d);
 const level0=getEnhancedStats({equipmentId:d.id,enhanceLevel:0});
 const level15=getEnhancedStats({equipmentId:d.id,enhanceLevel:15});
 assert.equal(getEnhanceMaxLevel(d),15);
 for(const k of Object.keys(level0))if(level0[k]>=20){const r=level15[k]/level0[k];assert.ok(r>1.1&&r<1.2);}
});

test('event gear gains do not lower former +5 power or raise extra job requirements beyond +5',()=>{
 assert.ok(limited);
 const {s,instance}=build(limited,5);
 const oldPower=getEnhancedStats(instance);const oldJob=getRequiredJobLevel(limited,instance);
 instance.enhanceLevel=15;
 const newPower=getEnhancedStats(instance);
 for(const k of Object.keys(oldPower))assert.ok(newPower[k]>=oldPower[k]);
 assert.equal(getRequiredJobLevel(limited,instance),oldJob);
 assert.equal(getEnhanceMaxLevel(limited),15);
});

test('story bosses grant crystal 20%, excluded on rematch, material book doubles to 40%',()=>{
 const enemy={id:'fieldBoss',bestiaryId:'storyBoss-field',regionId:'field',isBoss:true,hp:0};
 const base=()=>({inventory:[],materials:{},unlockedRecipes:[],newRecipes:[],quests:{},bestiary:{},world:{day:1}});
 const s1=base(),s2=base();s2.boostScrolls={drop:{remainingMs:3600000}};
 assert.equal(awardBattleDrops(s1,[enemy],()=>.1999,0,{allowBoostScrollDrops:false}).find(x=>x.id==='enhanceCrystal')?.qty,1);
 assert.ok(!awardBattleDrops(base(),[enemy],()=>.2,0,{allowBoostScrollDrops:false}).some(x=>x.id==='enhanceCrystal'));
 assert.ok(awardBattleDrops(s2,[enemy],()=>.399,0,{allowBoostScrollDrops:false}).some(x=>x.id==='enhanceCrystal'));
 assert.ok(!awardBattleDrops(base(),[{...enemy,rematch:true}],()=>0,0,{allowBoostScrollDrops:false}).some(x=>x.id==='enhanceCrystal'));
 assert.ok(awardBattleDrops(base(),[{...enemy,bestiaryId:'storyBoss-ngp-field'}],()=>.1,0,{allowBoostScrollDrops:false}).some(x=>x.id==='enhanceCrystal'));
});

test('cave crystal material rates are 25/20/12%, doubling by book; original rare weapon rolls remain unchanged',()=>{
 for(const [floor,id,rate] of [[1,'enhanceCrystal',.25],[10,'enhanceCrystal',.25],[11,'advancedEnhanceCrystal',.2],[20,'advancedEnhanceCrystal',.2],[21,'ultimateEnhanceCrystal',.12],[25,'ultimateEnhanceCrystal',.12]]){
  const won=cave(floor,rate-.0001);assert.equal(won.result.enhanceMaterial?.id,id);assert.equal(won.s.materials[id],11===0?0:(id==='enhanceCrystal'?11:id==='advancedEnhanceCrystal'?16:11));
  const missed=cave(floor,rate);assert.equal(missed.result.enhanceMaterial,null);
  const withBoost=cave(floor,rate*2-.0001,true);assert.equal(withBoost.result.enhanceMaterial?.id,id);
  const notEnough=cave(floor,rate*2,true);assert.equal(notEnough.result.enhanceMaterial,null);
 }
});

test('all three materials are tradable through market without identifying as consumable',()=>{
 for(const id of ['enhanceCrystal','advancedEnhanceCrystal','ultimateEnhanceCrystal']){
  const {s}=build();assert.ok(isMarketSellable(s,{kind:'material',id,quantity:1}).ok);
  assert.equal(getItemDef(id).consumable,undefined);assert.ok(getItemDef(id).name.includes('結晶'));
 }
});


test('forge shows +15 ceiling, prices and materials, cave receipt shows earned crystal',()=>{
 const {s,instance}=build(normal,14);
 s.forgeCategory='enhance';s.ui={forgeEnhanceJob:'all'};
 const html=forgeMarkup(s,'enhance');
 assert.match(html,/最大 \+15/);assert.match(html,/究極強化結晶/);assert.match(html,/750,000G/);
 const caveState={...s,mashoCave:{highestCleared:21,lastReward:{floor:21,enhanceMaterial:{id:'ultimateEnhanceCrystal',name:'究極強化結晶',qty:1}}}};
 assert.match(mashoCaveMarkup(caveState),/究極強化結晶 ×1 を獲得/);
});
