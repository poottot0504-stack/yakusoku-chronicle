import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseAutoAction} from '../src/core/auto-play.js';
import {createBattle,startTurn} from '../src/core/battle.js';
import {applyTimedEffect,tickEffects} from '../src/core/effects.js';
import {marketPriceLimitForItem,isValidMarketPrice,MARKET_MAX_PRICE,MARKET_RARE_EQUIPMENT_MAX_PRICE} from '../src/market/market-model.js';
import {MARKET_MASHO_20_25_EQUIPMENT_IDS,MARKET_MASHO_20_25_MAX_PRICE} from '../src/market/masho-mid-price-items.js';
import {getMashoEquipmentDropPool,getMashoAbyssDropPool} from '../src/core/masho-cave.js';
import {SHIELDER_CAVE_SHIELDS} from '../src/data/shielder-equipment.js';
import {EQUIPMENT} from '../src/data/equipment.js';
import {marketListingFormMarkup,marketStoreMarkup} from '../src/ui/market.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hero=(id,job)=>({id,name:id,currentJob:job,jobLevels:{[job]:90},level:120,hp:900,maxHp:900,mp:300,maxMp:300,stats:{attack:130,defense:90,magic:180,speed:100},buffs:[],debuffs:[],statusAilments:[]});
const boss=()=>({id:'boss',side:'enemy',name:'ボス',hp:18000,maxHp:18000,stats:{attack:150,defense:120,magic:60,speed:3},ai:[{type:'attack',power:100}]});
const blessing={id:'celestialBlessing',name:'星札の祝福',mp:12,type:'buff',target:'all',selfBuff:{attackPct:.12,magicPct:.12}};
const aura={id:'wingGuard',name:'飛竜の構え',mp:8,type:'buff',selfBuff:{defensePct:.22}};

test('shielder opening buffs must never suppress another job active party buff',()=>{
 for(const shield of ['shielder','greatShielder']){
  const party=[hero('tank',shield),hero('caster','astrologian'),hero('dragon','dragoon')];
  const battle=createBattle(party,boss());
  startTurn(battle);
  const allies=battle.actors.filter(a=>a.side==='ally');
  const caster=battle.actorMap.caster,dragon=battle.actorMap.dragon,enemy=battle.actorMap.boss;
  assert.ok(caster.buffs.some(x=>x.id=== (shield==='shielder'?'shieldAttackShout':'shieldDefenseShout')&&x.permanent===true));
  const next=chooseAutoAction({actor:caster,allies,enemies:[enemy],skills:[blessing],turn:1});
  assert.equal(next.type,'skill',shield);
  assert.equal(next.skillId,'celestialBlessing');
  // Actual effects from the battle resolver have this skill ID and are shared.
  for(const a of allies)applyTimedEffect(a,{kind:'buff',id:blessing.id,turns:3,...blessing.selfBuff});
  const existing=chooseAutoAction({actor:caster,allies,enemies:[enemy],skills:[blessing],turn:2});
  assert.notEqual(existing.skillId,'celestialBlessing','do not recast an already active skill');
  for(const a of allies)for(let n=0;n<3;n++)tickEffects(a,'turnEnd');
  const expired=chooseAutoAction({actor:caster,allies,enemies:[enemy],skills:[blessing],turn:4});
  assert.equal(expired.skillId,'celestialBlessing','recast on turn four after expiry');
  const guard=chooseAutoAction({actor:dragon,allies,enemies:[enemy],skills:[aura],turn:1});
  assert.equal(guard.skillId,'wingGuard','self-buff is available despite a shield passive');
 }
});

test('auto buffs: reject passive perks, prioritize healing, obey enemy strength and raid buff state',()=>{
 const caster=hero('mage','mage'),ally=hero('tank','shielder'),enemy=boss();
 const passive={id:'shielderHp10',type:'buff',mp:0,autoPassive:true,target:'all',selfBuff:{attackPct:.80}};
 const p=chooseAutoAction({actor:caster,allies:[caster,ally],enemies:[enemy],skills:[passive,blessing],turn:1});
 assert.equal(p.skillId,blessing.id);
 const easy=chooseAutoAction({actor:caster,allies:[caster,ally],enemies:[{...enemy,hp:2}],skills:[blessing],turn:1});
 assert.notEqual(easy.skillId,blessing.id);
 caster.hp=1;
 const heal={id:'heal',type:'heal',mp:4,flatHeal:400};
 assert.equal(chooseAutoAction({actor:caster,allies:[caster,ally],enemies:[enemy],skills:[heal,blessing],turn:1}).skillId,'heal');
 caster.hp=900;
 caster.raidBuff={turns:4};
 assert.notEqual(chooseAutoAction({actor:caster,allies:[caster,ally],enemies:[enemy],skills:[blessing],turn:1,raid:true}).skillId,blessing.id);
});

test('Masho 20F and 21-25F allowlist matches exact floor drop pools and only real equipment',()=>{
 const ids=MARKET_MASHO_20_25_EQUIPMENT_IDS;
 const cave20=getMashoEquipmentDropPool(20).map(x=>x.id);
 const abyss=[21,22,23,24,25].flatMap(i=>getMashoAbyssDropPool(i).map(x=>x.id));
 const shield=SHIELDER_CAVE_SHIELDS.filter(x=>x.mashoFloor===20||x.mashoFloor===25).map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual([...ids].sort(),[...cave20,...abyss,...shield].sort());
 for(const id of ids){
  assert.ok(EQUIPMENT[id],id);
  assert.equal(marketPriceLimitForItem({kind:'equipment',equipmentId:id}),1_000_000_000,id);
  assert.equal(isValidMarketPrice(500_000_000,{kind:'equipment',equipmentId:id}),true);
  assert.equal(isValidMarketPrice(1_000_000_000,{kind:'equipment',equipmentId:id}),true);
  assert.equal(isValidMarketPrice(1_000_000_001,{kind:'equipment',equipmentId:id}),false);
  assert.equal(isValidMarketPrice(500_000_000,{kind:'item',id}),false);
 }
 assert.equal(ids.length,41);
 assert.equal(MARKET_MASHO_20_25_MAX_PRICE,1_000_000_000);
 assert.equal(MARKET_MAX_PRICE,30_000_000);
 assert.equal(MARKET_RARE_EQUIPMENT_MAX_PRICE,3_000_000_000);
 for(const high of ['masho-26-eternal-tree-blessing','masho-27-infernal-eclipse-ring','masho-28-final-claussolas']){
  assert.equal(marketPriceLimitForItem({kind:'equipment',equipmentId:high}),3_000_000_000);
  assert.equal(isValidMarketPrice(3_000_000_000,{kind:'equipment',equipmentId:high}),true);
 }
 assert.equal(marketPriceLimitForItem({kind:'equipment',equipmentId:'masho-3-swordsman-arms'}),30_000_000);
 assert.equal(isValidMarketPrice(50_000_000),false);
});

test('market forms and controls show 1B and retain safe numeric input formatting',()=>{
 const form=marketListingFormMarkup([{kind:'equipment',instanceId:'i20',equipmentId:MARKET_MASHO_20_25_EQUIPMENT_IDS[0],name:'魔障20',category:'armor',available:1},{kind:'equipment',instanceId:'i28',equipmentId:'masho-27-infernal-eclipse-ring',name:'獄炎の蝕戒',category:'ring',available:1}]);
 assert.match(form,/1,000,000,000G/);
 assert.match(form,/3,000,000,000G/);
 assert.match(form,/data-market-max-price="1000000000"/);
 assert.match(form,/data-market-max-price="3000000000"/);
 const store=marketStoreMarkup({profileName:'旅の店',store:{expiresAt:Date.now()+3600000},listings:[{id:'listing20',itemName:'魔障20',status:'active',quantityRemaining:1,unitPrice:990_000_000,itemPayload:{kind:'equipment',equipmentId:MARKET_MASHO_20_25_EQUIPMENT_IDS[0]}}]});
 assert.match(store,/data-market-price="listing20" data-market-max-price="1000000000"/);
 assert.match(store,/990,000,000/);
});

test('staged SQL and Edge price allowlists match client, preserve auth and purchases',()=>{
 const sql=read('maintenance/market-masho-20-25-price-20261029.sql');
 const edge=read('maintenance/market-masho-20-25-edge-20261029/index.ts');
 for(const id of MARKET_MASHO_20_25_EQUIPMENT_IDS){
  assert.ok(sql.includes("'"+id+"'"),'SQL ID: '+id);
  assert.ok(edge.includes("'"+id+"'")||edge.includes('"'+id+'"'),'Edge ID: '+id);
 }
 assert.match(sql,/quantity_initial=1 and item_id in/);
 assert.match(sql,/unit_price between 1 and 1000000000/);
 assert.match(sql,/then 1000000000 else 30000000 end/);
 assert.match(sql,/then 3000000000 when/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/seller_id=uid/);
 assert.match(sql,/for update/);
 assert.match(sql,/grant execute on function public\.market_create_listing/i);
 assert.doesNotMatch(sql,/drop table|truncate table|delete\s+from\s+public\.market_/i);
 assert.match(edge,/MARKET_MASHO_20_25_MAX_PRICE=1_000_000_000/);
 assert.match(edge,/body\?\.itemPayload\?\.equipmentId!==body\.itemId/);
 assert.match(edge,/supabase\.auth\.getUser\(token\)/);
 assert.match(edge,/p_expected_unit_price:expectedUnitPrice/);
 assert.doesNotMatch(edge,/SUPABASE_SERVICE_ROLE_KEY/);
});
