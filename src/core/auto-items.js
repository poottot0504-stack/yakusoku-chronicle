// Auto-play uses only existing consumable battle items and the same validation
// as manual use. Neither the battle outcome nor the inventory is mutated here.
import {canUseItemOn} from './items.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const portion=(value,max)=>clamp(Number(value??0)/Math.max(1,Number(max??1)),0,1);
const finite=(v)=>Math.max(0,Number(v)||0);
const maxHP=c=>Math.max(1,finite(c?.maxHp??c?.maxHP??c?.hp??1));
const maxMP=c=>finite(c?.maxMp??c?.maxMP??0);
const statusPriority=Object.freeze({sleep:5,paralysis:5,freeze:5,confusion:4,blind:3,poison:2,burn:2,curse:2});

/** Pick the strongest *useful* recovery item, not the biggest raw number.
 *  High-tier recovery wins for heavy damage; otherwise avoid wasting a full heal.
 */
function effectiveRecovery(item,target){
 const hpMissing=Math.max(0,maxHP(target)-finite(target.hp));
 const mpMissing=Math.max(0,maxMP(target)-finite(target.mp));
 const rawHp=item.fullHp?maxHP(target):item.healRatio
  ?Math.max(finite(item.minHeal),Math.floor(maxHP(target)*finite(item.healRatio))):finite(item.heal);
 const rawMp=item.fullMp?maxMP(target):finite(item.mpHeal);
 const healed=Math.min(hpMissing,rawHp),mpRestored=Math.min(mpMissing,rawMp);
 return {healed,mpRestored,hpWaste:Math.max(0,rawHp-healed),mpWaste:Math.max(0,rawMp-mpRestored)};
}

function reservations(plannedActions=[],allies=[]){
 const used=new Map(),covered=new Set();
 for(const action of plannedActions){
  if(action?.type==='item'){
   used.set(action.itemId,(used.get(action.itemId)??0)+1);
   if(action.targetId)covered.add(action.targetId);
  }
  if(action?.type==='skill'&&['heal','revive'].includes(action.skill?.type)){
   if(action.skill?.target==='all')for(const ally of allies)covered.add(ally.id);
   else if(action.targetId)covered.add(action.targetId);
  }
 }
 return {used,covered};
}

/**
 * @returns {{type:'item',itemId:string,targetId:string}|null}
 * Auto never uses boost scrolls, rare quest items, escape items, or materials.
 */
export function chooseAutoItemAction({actor,allies=[],items=[],strategy='balanced',plannedActions=[]}={}){
 if(!actor||!allies.length||!items.length)return null;
 const {used,covered}=reservations(plannedActions,allies);
 // Inventory can contain several stacks of the same item. Sum them before
 // subtracting earlier party members' reservations for this turn.
 const pooled=new Map();
 for(const item of items){
  if(item?.target!=='ally'||item.consumable===false||!item.id||finite(item.qty)<=0)continue;
  const previous=pooled.get(item.id);
  pooled.set(item.id,{...item,qty:finite(item.qty)+(previous?.qty??0)});
 }
 const stock=[...pooled.values()].filter(item=>item.qty-(used.get(item.id)??0)>0);
 if(!stock.length)return null;
 const candidates=allies.filter(a=>a?.id&&!covered.has(a.id));
 const pickBest=options=>options.sort((a,b)=>b.score-a.score||a.item.id.localeCompare(b.item.id))[0]??null;
 const action=option=>option?{type:'item',itemId:option.item.id,targetId:option.target.id}:null;

 // Full revival is a high-impact item action. Never waste it on living allies.
 const fallen=candidates.filter(c=>finite(c.hp)<=0);
 if(fallen.length){
  const options=fallen.flatMap(target=>stock.filter(item=>item.reviveFull&&canUseItemOn(item,target))
   .map(item=>({item,target,score:maxHP(target)+maxMP(target)*.5})));
  const choice=pickBest(options);
  if(choice)return action(choice);
 }

 // Use HP items before attacks only when a party member is genuinely at risk.
 const threshold=strategy==='safe'?.62:strategy==='aggressive'?.29:.43;
 const injured=candidates.filter(c=>finite(c.hp)>0&&portion(c.hp,maxHP(c))<threshold);
 if(injured.length){
  const options=injured.flatMap(target=>stock.filter(item=>!item.reviveFull&&
   (item.fullHp||item.heal||item.healRatio)&&canUseItemOn(item,target))
   .map(item=>{
    const r=effectiveRecovery(item,target),critical=1-portion(target.hp,maxHP(target));
    // Recover more health, with a small cost for wasting full recovery.
    // Recovery to a near-empty target is favored over topping off another.
    const hpScore=r.healed-r.hpWaste*.25;
    const mpCritical=maxMP(target)>0&&portion(target.mp,maxMP(target))<.35;
    const bonus=mpCritical?r.mpRestored*.6:0;
    const extraWaste=!mpCritical&&item.fullMp?maxMP(target)*.2:0;
    return {item,target,score:(hpScore+bonus-extraWaste)*(1+critical*.25)};
   }).filter(x=>x.score>0));
  const choice=pickBest(options);
  if(choice)return action(choice);
 }

 // Clear an actual hindering status before attacking. No blind/poison item
 // should ever be used unless that status exists on the chosen character.
 const statuses=candidates.filter(c=>finite(c.hp)>0&&(c.statusAilments??[]).length);
 const cures=statuses.flatMap(target=>stock.filter(item=>Array.isArray(item.cure)&&
   canUseItemOn(item,target)).map(item=>{
    const severity=(target.statusAilments??[]).filter(e=>finite(e.turns)>0&&item.cure.includes(e.id))
     .reduce((sum,e)=>sum+(statusPriority[e.id]??1),0);
    return {item,target,score:severity};
   }).filter(x=>x.score>0));
 const cure=pickBest(cures);
 if(cure)return action(cure);

 // MP replenishment is needed only when MP is low, not after every spell.
 const mpThreshold=strategy==='safe'?.35:strategy==='aggressive'?.16:.25;
 const thirsty=candidates.filter(c=>finite(c.hp)>0&&maxMP(c)>0&&
   portion(c.mp,maxMP(c))<mpThreshold&&maxMP(c)-finite(c.mp)>=20);
 const mpItems=thirsty.flatMap(target=>stock.filter(item=>!item.reviveFull&&
   (item.fullMp||item.mpHeal)&&canUseItemOn(item,target)).map(item=>{
    const r=effectiveRecovery(item,target);
    const hpu=!(item.fullHp||item.heal||item.healRatio)?0:r.healed;
    const hpCritical=portion(target.hp,maxHP(target))<.65;
    const bonus=hpCritical?hpu*.5:0;
    const penalty=!hpCritical&&item.fullHp?maxHP(target)*.2:0;
    return {item,target,score:r.mpRestored-r.mpWaste*.25+bonus-penalty};
   }).filter(x=>x.score>0));
 return action(pickBest(mpItems));
}
