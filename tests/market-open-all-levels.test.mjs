import test from 'node:test';
import assert from 'node:assert/strict';
import {canUnlockMarket,isMarketUnlocked,unlockMarketIfEligible,isMarketSellable} from '../src/market/market-model.js';
import {townMarkup} from '../src/ui/adventure.js';

const gameState=(level,jobLevel,unlocked=false)=>({
 characters:[{isHero:true,level,currentJob:'swordsman',jobLevels:{swordsman:jobLevel}}],
 market:{unlocked,everUsed:false},inventory:[],equipmentInventory:[],materials:{},gold:0,
 adventure:{regionId:'field'},story:{},world:{day:1}
});
test('market is available for a brand new level 1 hero and level 1 job',()=>{
 const state=gameState(1,1);
 assert.equal(canUnlockMarket(state),true);
 assert.equal(isMarketUnlocked(state),true);
 assert.equal(unlockMarketIfEligible(state),true);
 assert.equal(state.market.unlocked,true);
 const html=townMarkup(state);
 assert.match(html,/<button data-town="market">/);
 assert.match(html,/だれでも利用可能/);
 assert.doesNotMatch(html,/Lv20 \/ ジョブLv10で解放/);
});
test('older market lock flags do not block access',()=>{
 const state=gameState(2,1,false);
 assert.equal(isMarketUnlocked(state),true);
 assert.equal(unlockMarketIfEligible(state),true);
 const newSave={characters:[],inventory:[],materials:{},equipmentInventory:[]};
 assert.equal(unlockMarketIfEligible(newSave),true);
 assert.equal(newSave.market.unlocked,true);
});
test('shop items stay forbidden and listing rules do not change',()=>{
 const state=gameState(1,1);
 state.inventory.push({id:'herb',qty:20});
 assert.equal(isMarketSellable(state,{kind:'item',id:'herb',quantity:1}).ok,false);
});
