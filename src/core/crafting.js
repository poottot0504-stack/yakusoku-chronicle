import { RECIPES } from '../data/recipes.js?v=monster-name-clean';
import { createEquipmentInstance } from '../data/equipment.js';
export function getMaterialQuantity(state,id){const stored=state.materials?.[id]??0;const legacy=(state.inventory??[]).filter(x=>x.id===id).reduce((n,x)=>n+(x.qty??0),0);return stored+legacy;}
function consumeMaterial(state,id,qty){let remaining=qty;state.materials??={};const stored=Math.min(state.materials[id]??0,remaining);state.materials[id]=(state.materials[id]??0)-stored;remaining-=stored;if(remaining>0){for(const stack of state.inventory??[]){if(stack.id!==id||(stack.qty??0)<=0)continue;const take=Math.min(stack.qty,remaining);stack.qty-=take;remaining-=take;if(remaining<=0)break;}}if(remaining>0)throw new Error('必要な素材が足りません');}
function unlockSatisfied(state,u={type:'story'}){if(u.type==='specialJob')return state.unlockedSpecialJobs?.includes(u.jobId)??false;if(u.type==='story')return true;if(u.type==='material')return getMaterialQuantity(state,u.materialId)>0;if(u.type==='anyMaterial')return (u.materialIds??[]).some(id=>getMaterialQuantity(state,id)>0);return false;}
export function syncRecipeUnlocks(state,now=Date.now()){state.unlockedRecipes??=[];state.newRecipes??=[];const known=new Set(state.unlockedRecipes);const fresh=[];for(const r of Object.values(RECIPES)){if(r.releaseAt&&Number(now)<r.releaseAt)continue;if(!known.has(r.id)&&unlockSatisfied(state,r.unlock)){state.unlockedRecipes.push(r.id);state.newRecipes.push(r.id);known.add(r.id);fresh.push(r.id);}}return fresh;}
export function markRecipesSeen(state,recipeIds=[]){const seen=new Set(recipeIds);state.newRecipes=(state.newRecipes??[]).filter(id=>!seen.has(id));}
export function getAvailableRecipes(state,now=Date.now()){syncRecipeUnlocks(state,now);const unlocked=new Set(state.unlockedRecipes??[]);return Object.values(RECIPES).filter(r=>unlocked.has(r.id)&&(!r.releaseAt||Number(now)>=r.releaseAt)).sort((a,b)=>a.displayOrder-b.displayOrder);}
export function craftingGoldCost(recipe){
 if(!recipe)return 0;
 const base=Math.max(0,Number(recipe.gold)||0);
 const mult=recipe.category==='weapon'||recipe.category==='armor'?2.5:recipe.category==='ring'||recipe.category==='charm'?3:1;
 return mult===1?base:Math.ceil(base*mult/10)*10;
}
export function canCraft(state,recipeId,now=Date.now()){
 const r=RECIPES[recipeId];
 if(!r||r.releaseAt&&Number(now)<r.releaseAt)return {ok:false,missingMaterials:[],missingGold:0,locked:true,eventClosed:false};
 // 開催期間はイベントへの挑戦を制限するもので、入手した素材の生産期限ではない。
 // イベント装備（武器/防具/指輪/チャーム）は終了後も素材・G・解放条件を満たせば生産可能。
 const eventEnded=!!r.eventEndsAt&&Number(now)>=r.eventEndsAt;
 const eventGear=r.eventId&&r.output?.kind==='equipment'&&['weapon','armor','ring','charm'].includes(r.category);
 const eventClosed=eventEnded&&!eventGear;
 const eventNotStarted=!!r.eventStartsAt&&Number(now)<r.eventStartsAt;
 const missingMaterials=Object.entries(r.materials??{}).map(([id,need])=>({id,need,have:getMaterialQuantity(state,id)})).filter(x=>x.have<x.need);
 const cost=craftingGoldCost(r),missingGold=Math.max(0,cost-(state.gold??0));
 const recipeLocked=!(state.unlockedRecipes??[]).includes(recipeId)&&!unlockSatisfied(state,r.unlock);
 const outputFull=r.output.kind==='material'&&getMaterialQuantity(state,r.output.itemId)+(r.output.quantity??1)>999;
 return {ok:!recipeLocked&&!eventClosed&&!eventNotStarted&&!outputFull&&missingMaterials.length===0&&missingGold===0,missingMaterials,missingGold,cost,eventClosed,eventNotStarted,outputFull,locked:recipeLocked||eventClosed||eventNotStarted};
}
export function craftItem(state,recipeId,now=Date.now()){const r=RECIPES[recipeId];if(!r)throw new Error('レシピがありません');const check=canCraft(state,recipeId,now);if(!check.ok){if(check.eventClosed)throw new Error('このイベントの生産期間は終了しました');if(check.eventNotStarted)throw new Error('イベント開催前のため生産できません');if(check.locked)throw new Error('このレシピはまだ解放されていません');if(check.outputFull)throw new Error('精錬後の素材が所持上限を超えます');if(check.missingMaterials.length)throw new Error('必要な素材が足りません');throw new Error('ゴールドが足りません');}state.materials??={};for(const [id,n] of Object.entries(r.materials??{}))consumeMaterial(state,id,n);state.gold=(state.gold??0)-craftingGoldCost(r);const quantity=r.output.quantity??1;if(r.output.kind==='equipment'){state.equipmentInventory??=[];const inst=createEquipmentInstance(r.output.equipmentId);state.equipmentInventory.push(inst);return {recipeId,outputKind:'equipment',outputId:r.output.equipmentId,quantity:1,equipmentInstance:inst};}const id=r.output.itemId;state.materials[id]=Math.min(999,(state.materials[id]??0)+quantity);syncRecipeUnlocks(state,now);return {recipeId,outputKind:'material',outputId:id,quantity};}
