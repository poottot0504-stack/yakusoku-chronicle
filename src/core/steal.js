function pick(table=[],rng=Math.random){if(!table.length)return null;const total=table.reduce((s,x)=>s+(x.weight??1),0);let r=rng()*total;for(const x of table){r-=x.weight??1;if(r<=0)return x;}return table.at(-1);}
export function attemptSteal(battle,actor,enemy,mode='steal',rng=Math.random){
 if(enemy.stealAttempted)throw new Error('この敵には一度しか盗む・略奪を試せません');
 const isPlunder=mode==='plunder';const cost=isPlunder?15:3;if((actor.mp??0)<cost)return {success:false,message:'MPが足りない！',consumesTurn:false};
 actor.mp-=cost;enemy.stealAttempted=true;const bonus=actor.masteryBonuses?.stealSuccessBonus??0;const chance=Math.min(.95,(isPlunder?.60:.30)+bonus);
 if(rng()>=chance)return {success:false,chance};
 const item=pick(isPlunder?(enemy.plunderTable??enemy.stealTable):enemy.stealTable,rng);if(!item)return {success:false,chance};
 if(item.rareEquipment){battle.removedRareDrops??=new Set();battle.removedRareDrops.add(item.id);battle.rareDropPity??={};battle.rareDropPity[item.id]=0;}
 return {success:true,item,chance};
}
