import { EQUIPMENT } from '../data/equipment.js';
import { getDailyTravelBonus } from './daily-travel-bonus.js';
import { getRequiredJobLevel } from './equipment-requirements.js';
import { getMaterialQuantity } from './crafting.js';

// +1...+10 remains backward compatible. The advanced tiers grant a further +15%.
// Previously +5-limited event equipment progresses more gently beyond its old cap.
export const ENHANCE_ADVANCED_STAGES = Object.freeze({
 11:Object.freeze({materialId:'enhanceCrystal',quantity:2,successRate:.85,cost:150000}),
 12:Object.freeze({materialId:'enhanceCrystal',quantity:4,successRate:.75,cost:240000}),
 13:Object.freeze({materialId:'advancedEnhanceCrystal',quantity:3,successRate:.65,cost:360000}),
 14:Object.freeze({materialId:'advancedEnhanceCrystal',quantity:5,successRate:.55,cost:520000}),
 15:Object.freeze({materialId:'ultimateEnhanceCrystal',quantity:3,successRate:.45,cost:750000})
});
export const ENHANCE_MATERIAL_NAMES=Object.freeze({enhanceCrystal:'強化結晶',advancedEnhanceCrystal:'上級強化結晶',ultimateEnhanceCrystal:'究極強化結晶'});

export function getEnhanceMaxLevel(defOrId){
 const d=typeof defOrId==='string'?EQUIPMENT[defOrId]:defOrId;
 return d?15:0;
}
export function getEnhancedStats(instance){
 const d=EQUIPMENT[instance?.equipmentId]??{};
 const max=getEnhanceMaxLevel(d),level=Math.max(0,Math.min(max,Math.floor(Number(instance?.enhanceLevel)||0)));
 // Preserve existing strength exactly at the former caps: normal +10, event +5.
 let mult;
 if(d.noEnhance){
  // Formerly non-enhanceable raid signature weapons get only +1% per level.
  // Their former +0 stats stay identical, and even +15 is capped near +15%.
  mult=1+level*.01;
 }else if(d.eventLimited){
  // High-base-stat event gear gets only 1.5% per new level after +5.
  // +15 is 15% stronger than the previous maximum +5, not 25%+.
  const oldFactor=1+Math.min(5,level)*.08;
  mult=oldFactor*(1+Math.max(0,level-5)*.015);
 }else{
  mult=(1+Math.min(level,10)*.08)*(level>10?1+(level-10)*.03:1);
 }
 if(instance?.trueEvolved)mult*=1.5;
 const out={attack:0,defense:0,magic:0,speed:0,maxHp:0,maxMp:0};
 for(const k of Object.keys(out))out[k]=Math.round(Math.max(0,d[k]??0)*mult);
 return out;
}
function findInst(state,id){const x=state.equipmentInventory?.find(i=>i.instanceId===id);if(!x)throw new Error('装備が見つかりません');return x;}
export function getEnhanceQuote(state,instanceId,now=Date.now()){
 const inst=findInst(state,instanceId),def=EQUIPMENT[inst.equipmentId]??{};
 const maxLevel=getEnhanceMaxLevel(def),current=Math.min(maxLevel,Math.max(0,Math.floor(Number(inst.enhanceLevel)||0))),next=Math.min(maxLevel,current+1);
 if(current>=maxLevel)return {targetLevel:maxLevel,maxLevel,successRate:1,baseSuccessRate:1,cost:0,maxed:true,requiredMaterial:null};
 const advanced=ENHANCE_ADVANCED_STAGES[next];
 const baseRate=advanced?.successRate??(next<=7?1:next===8?.8:next===9?.6:.4);
 const daily=getDailyTravelBonus(now),bonus=daily.active?Number(daily.enhanceSuccessBonus??0):0;
 const rate=Math.min(1,baseRate+bonus);
 const step=next<=3?1:next<=5?1.2:next<=7?1.5:next===8?2:next===9?2.5:3;
 const cost=advanced?.cost??Math.ceil((100*next*next*2.5*step)/10)*10;
 const requiredMaterial=advanced?{id:advanced.materialId,name:ENHANCE_MATERIAL_NAMES[advanced.materialId],quantity:advanced.quantity,have:getMaterialQuantity(state,advanced.materialId)}:null;
 return {targetLevel:next,maxLevel,successRate:rate,baseSuccessRate:baseRate,dailyBonusApplied:bonus>0,cost,maxed:false,requiredMaterial};
}
function consumeCharm(state){const item=state.inventory?.find(x=>x.id==='forgeCharm'&&x.qty>0);if(!item)throw new Error('強化護符がありません');item.qty--;}
function consumeMaterial(state,id,quantity){
 let remaining=quantity;
 state.materials??={};
 const fromMaterials=Math.min(Math.max(0,Number(state.materials[id])||0),remaining);
 state.materials[id]=(state.materials[id]??0)-fromMaterials;remaining-=fromMaterials;
 for(const stack of state.inventory??[]){if(remaining<=0)break;if(stack.id!==id||stack.qty<=0)continue;const take=Math.min(stack.qty,remaining);stack.qty-=take;remaining-=take;}
 if(remaining>0)throw new Error('強化素材が足りません');
}
export function enhanceEquipment(state,instanceId,{useCharm=false,rng=Math.random,now=Date.now()}={}){
 const inst=findInst(state,instanceId),def=EQUIPMENT[inst.equipmentId]??{},q=getEnhanceQuote(state,instanceId,now);
 if(q.maxed)return {success:true,level:q.maxLevel,maxLevel:q.maxLevel,maxed:true};
 if((state.gold??0)<q.cost)throw new Error('ゴールドが足りません');
 if(q.requiredMaterial&&q.requiredMaterial.have<q.requiredMaterial.quantity)throw new Error(`${q.requiredMaterial.name}が足りません（${q.requiredMaterial.have}/${q.requiredMaterial.quantity}）`);
 if(useCharm){if(q.targetLevel<8||q.targetLevel>10)throw new Error('強化護符は+8〜+10への強化でのみ使用できます');if(!(state.inventory??[]).some(x=>x.id==='forgeCharm'&&x.qty>0))throw new Error('強化護符がありません');}
 // All affordability checks complete: spend atomically and never regress enhancement levels.
 if(useCharm)consumeCharm(state);
 if(q.requiredMaterial)consumeMaterial(state,q.requiredMaterial.id,q.requiredMaterial.quantity);
 state.gold-=q.cost;
 const old=inst.enhanceLevel??0,success=useCharm||rng()<q.successRate;
 if(success)inst.enhanceLevel=q.targetLevel;
 const unequipped=[];
 if(success&&def.eventLimited){
   const required=getRequiredJobLevel(def,inst);
   for(const c of state.characters??[])for(const [slot,ref] of Object.entries(c.equipment??{})){
     const equippedId=typeof ref==='object'?ref?.instanceId:ref;
     if(equippedId===instanceId&&Number(c.jobLevels?.[c.currentJob]??1)<required){c.equipment[slot]=null;unequipped.push(c.name??c.id);}
   }
 }
 return {success,level:inst.enhanceLevel??old,maxLevel:q.maxLevel,successRate:useCharm?1:q.successRate,unequipped,consumedMaterial:q.requiredMaterial??null};
}
export function evolveLegendaryToTrue(state,characterId){if(!state.story?.blacksmithDefeated)throw new Error('鍛冶師の試練が未達成です');const c=state.characters?.find(x=>x.id===characterId);if(!c)throw new Error('キャラクターが見つかりません');const ids=Object.values(c.equipment??{}).filter(Boolean);let evolved=null;for(const iid of ids){const inst=findInst(state,iid);const def=EQUIPMENT[inst.equipmentId];if(def?.dedicatedLegendary){inst.trueEvolved=true;evolved=inst;}}
 if(!evolved)throw new Error('専用伝説装備ではありません');return evolved;}
