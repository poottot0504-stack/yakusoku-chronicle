import { syncRecipeUnlocks } from './crafting.js';
export const MINING_TABLES={
 field:[['ironOre',70],['copperOre',30]],forest:[['ironOre',45],['copperOre',35],['goldOre',20]],
 coast:[['goldOre',55],['ironOre',25],['copperOre',20]],cave:[['goldOre',55],['platinumOre',30],['ironOre',15]],
 snow:[['platinumOre',60],['goldOre',25],['mythrilOre',15]],desert:[['mythrilOre',55],['platinumOre',30],['goldOre',15]],
 swamp:[['unionOre',60],['mythrilOre',30],['platinumOre',10]],volcano:[['lightCrystal',55],['unionOre',35],['mythrilOre',10]],
 ruins:[['starCrystal',50],['lightCrystal',35],['unionOre',15]],abyss:[['starCrystal',65],['lightCrystal',25],['unionOre',10]]
};
export const getMiningTable=regionId=>MINING_TABLES[regionId]??MINING_TABLES.field;
const unlockedIds=state=>{const a=state.adventure??{};if(Array.isArray(a.unlockedRegions)&&a.unlockedRegions.length)return a.unlockedRegions;const order=['field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss'];const n=Math.max(1,Number(state.story?.chapter??1));return order.slice(0,Math.min(10,n));};
export function resetMiningCharges(state,rng=Math.random){state.gathering??={};state.gathering.miningCharges??={};for(const id of unlockedIds(state))state.gathering.miningCharges[id]=Math.floor(Math.max(0,Math.min(.999999,Number(rng())))*6);return state.gathering.miningCharges;}
export function getMiningCharges(state,regionId){return Number(state.gathering?.miningCharges?.[regionId]??0);}
function pick(table,rng){let roll=rng()*100;for(const [id,w] of table){roll-=w;if(roll<0)return id;}return table[0][0];}
export function mineRegion(state,regionId=state.adventure?.regionId??'field',rng=Math.random){state.gathering??={};state.gathering.miningCharges??={};if(state.gathering.miningCharges[regionId]==null)state.gathering.miningCharges[regionId]=Math.floor(Math.max(0,Math.min(.999999,Number(rng())))*6);if(state.gathering.miningCharges[regionId]<=0)throw new Error('採掘ポイントを掘り尽くした');const materialId=pick(getMiningTable(regionId),rng),qty=1+Math.floor(rng()*3);state.materials??={};const before=state.materials[materialId]??0;state.materials[materialId]=Math.min(999,before+qty);state.gathering.miningCharges[regionId]--;return {materialId,qty:state.materials[materialId]-before,remaining:state.gathering.miningCharges[regionId],unlockedRecipes:syncRecipeUnlocks(state)};}
export function getGatherPointForState(state){return state.adventure?.regionId??'field';}
export function gatherAtPoint(state,pointId,rng=Math.random){return mineRegion(state,state.adventure?.regionId??pointId??'field',rng);}
