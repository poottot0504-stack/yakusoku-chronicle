import { ENEMIES } from '../data/enemies.js';
import { getItemDef } from './items.js';
import { syncRecipeUnlocks } from './crafting.js';
import { recordObservedDrop } from './bestiary.js';
import { updateQuestProgress } from './quests.js';
import { isHalloweenActive, isTrainingFestivalActive, getEclipseEventStatus } from './events.js';
import { TRAINING_FESTIVAL } from '../data/events.js';
import { getDailyTravelBonus } from './daily-travel-bonus.js';
import { BOOST_SCROLLS, BOOST_SCROLL_DROP_RATE, isBoostScrollActive } from './boost-scrolls.js';

const REGION_ORDER=['field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss'];
const BASE_ORES=[
 {id:'copperOre',chance:.18},
 {id:'ironOre',chance:.16},
 {id:'goldOre',chance:.13},
 {id:'platinumOre',chance:.10},
 {id:'mythrilOre',chance:.08}
];

export function addMaterials(state,materials={}){state.materials??={};for(const [id,qty] of Object.entries(materials))state.materials[id]=Math.min(999,(state.materials[id]??0)+qty);return state.materials;}
function addItem(state,id,qty=1){state.inventory??=[];const x=state.inventory.find(i=>i.id===id);if(x)x.qty=(x.qty??0)+qty;else state.inventory.push({id,qty});}
function isCraftMaterial(id){const d=getItemDef(id);return !(d.consumable||d.target||id==='forgeCharm');}
// ドロップ抽選は素材のみ。回復・MP回復アイテムは通常戦闘・イベントとも対象外。
function isEventEnemy(enemy={},base={}){return !!(enemy.event||base.event||String(enemy.id??'').startsWith('event-')||String(enemy.bestiaryId??'').startsWith('event-'));}

export function getOreDropTable(state,enemy={}){
 const base=ENEMIES[enemy.bestiaryId]??ENEMIES[enemy.id]??{};
 if(enemy.isBoss||base.isBoss||enemy.enemyClass==='boss'||base.enemyClass==='boss')return [];
 const regionId=base.regionId??enemy.regionId;
 const regionIndex=REGION_ORDER.indexOf(regionId);
 const table=[];
 if(regionIndex>=0)table.push(BASE_ORES[Math.min(BASE_ORES.length-1,Math.floor(regionIndex/2))]);
 const trueEnd=!!state.story?.trueEndingSeen;
 const cycle=state.cycle??1;
 const level=enemy.level??base.level??1;
 if((cycle>=2&&regionIndex>=6)||(trueEnd&&level>=240))table.push({id:'unionOre',chance:.06});
 if((cycle>=2&&regionIndex>=8)||(trueEnd&&level>=280))table.push({id:'lightCrystal',chance:.04});
 return table;
}

export function awardBattleDrops(state,enemies=[],rng=Math.random,now=Date.now(),{allowBoostScrollDrops=true}={}){
 const totals=new Map();const rateMultiplier=isHalloweenActive(now)?1.5:1;
 const daily=getDailyTravelBonus(now);const materialMultiplier=daily.active?Number(daily.monsterMaterialDropMultiplier??1):1;
 for(const enemy of enemies){
  if(enemy.mashoBoss)continue;
  const base=ENEMIES[enemy.bestiaryId]??ENEMIES[enemy.id]??{};
  // Only authentic live eclipse fights may award seasonal materials. No bestiary rematches.
  if((enemy.eclipseEvent||base.eclipseEvent)&&((enemy.rematch||base.rematch)||!getEclipseEventStatus(now).active))continue;
  const eventEnemy=isEventEnemy(enemy,base);
  const monsterId=String(enemy.bestiaryId??enemy.id??'');
  const chapterRegion=base.regionId??enemy.regionId??'';
  const storyBoss=/^storyBoss-(?:ngp-)?(?:field|forest|coast|cave|snow|desert|swamp|volcano|ruins|abyss)$/.test(monsterId);
  const storyMonster=!eventEnemy&&!enemy.rematch&&!enemy.mashoBoss&&!monsterId.startsWith('rematch-')&&!String(chapterRegion).startsWith('training:')
    &&(storyBoss||(REGION_ORDER.includes(chapterRegion)&&Boolean(base.id||enemy.bestiaryId)));
  // Each book has its own 0.1% roll, not multiplied by material-drop bonuses.
  if(allowBoostScrollDrops&&storyMonster){for(const id of Object.keys(BOOST_SCROLLS)){if(rng()<BOOST_SCROLL_DROP_RATE)totals.set(id,(totals.get(id)??0)+1);}}
  if(storyBoss&&!enemy.rematch){const crystalChance=Math.min(1,.20*(isBoostScrollActive(state,'drop',now)?2:1));if(rng()<crystalChance)totals.set('enhanceCrystal',(totals.get('enhanceCrystal')??0)+1);}
  if(enemy.rareMonster||base.rareMonster)continue; // Rare monsters award only the special books here.
  const trainingEnemy=isTrainingFestivalActive(now)&&String(enemy.bestiaryId??base.id??enemy.id??'').startsWith('event-training-');
  // 通常モンスターの素材（固有素材・鉱石）を2倍にする。ボス・レア・イベントは除外。
  const normalMonster=!eventEnemy&&!!base.regionId&&!enemy.isBoss&&!base.isBoss&&enemy.enemyClass!=='boss'&&base.enemyClass!=='boss';
  // 回復アイテムは抽選しない。修練祭素材の専用倍率は従来どおり。
  const table=[];
  const storyDropBoost=!eventEnemy&&!enemy.rematch&&!enemy.mashoBoss&&REGION_ORDER.includes(chapterRegion)&&isBoostScrollActive(state,'drop',now)?2:1;
  const materials=enemy.materials??base.materials;
  if(materials?.normal)table.push({id:materials.normal,chance:trainingEnemy?.18:.28,monsterMaterial:true});
  if(materials?.rare)table.push({id:materials.rare,chance:trainingEnemy?.04:.06,monsterMaterial:true});
  table.push(...getOreDropTable(state,enemy));
  for(const d of table){
   const normalMonsterRate=normalMonster?2:1;
   const dailyRate=d.monsterMaterial?materialMultiplier:1;
   const festivalRate=trainingEnemy?TRAINING_FESTIVAL.dropRateMultiplier:1;
   // The scroll and daily material bonus are alternatives, not a 4x multiplier.
   if(rng()<Math.min(1,d.chance*normalMonsterRate*rateMultiplier*Math.max(dailyRate,storyDropBoost)*festivalRate)){
    totals.set(d.id,(totals.get(d.id)??0)+1);
    if(enemy.bestiaryId)recordObservedDrop(state,enemy.bestiaryId,d.id);
   }
  }
 }
 const drops=[...totals].map(([id,qty])=>({id,qty,name:getItemDef(id).name}));
 for(const d of drops){if(isCraftMaterial(d.id))addMaterials(state,{[d.id]:d.qty});else addItem(state,d.id,d.qty);updateQuestProgress(state,{type:'collect',id:d.id,amount:d.qty});}
 drops.unlockedRecipes=syncRecipeUnlocks(state);return drops;
}
export function mergeDropTotals(current=[],added=[]){
 const totals=new Map();
 for(const d of [...(current??[]),...(added??[])]){
  if(!d?.id)continue;
  const prev=totals.get(d.id);
  if(prev)prev.qty+=(Number(d.qty)||0);
  else totals.set(d.id,{id:d.id,name:d.name??getItemDef(d.id).name,qty:Number(d.qty)||0});
 }
 return [...totals.values()].filter(d=>d.qty>0);
}
export function formatDropLines(drops=[]){return drops.length?['🎁 モンスターからドロップ！',...drops.map(d=>`・${d.name} ×${d.qty} を手に入れた！`)]:['🎁 ドロップアイテム：なし'];}
