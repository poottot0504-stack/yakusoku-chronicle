export function chooseEnemyAction(battle,actor,rng=Math.random){
  // 予告済みの希少即死魔法は、逃走判定より優先して必ず次の自身ターンに発動する。
  if(actor._rareDeathPrimed){const primed=actor._rareDeathPrimed;actor._rareDeathPrimed=null;return {type:'rareInstantDeath',...primed};}
  if(actor._eventDeathPrimed){const primed=actor._eventDeathPrimed;actor._eventDeathPrimed=null;return {type:'instantDeath',...primed};}
  if(actor.eventBoss&&rng()<(actor.eventInstantDeathChance??.05)){const allies=battle.actors.filter(x=>x.side==='ally'&&x.hp>0);if(allies.length){const target=allies[Math.min(allies.length-1,Math.floor(rng()*allies.length))];actor._eventDeathPrimed={name:actor.eventInstantDeathName??'死の宣告',targetId:target.id};return {type:'instantDeathWarning',...actor._eventDeathPrimed};}}
  if(actor.rareMonster&&rng()<(actor.escapeChance??0))return {type:'enemyEscape'};
  if(actor.rareInstantDeath&&rng()<(actor.rareInstantDeath.triggerChance??.05)){
    const allies=battle.actors.filter(x=>x.side==='ally'&&x.hp>0);if(allies.length){
      const allTargets=rng()<(actor.rareInstantDeath.allChance??.1);
      const target=allTargets?null:allies[Math.min(allies.length-1,Math.floor(rng()*allies.length))];
      const primed={allTargets,targetId:target?.id??null,targetName:target?.name??null,name:allTargets?(actor.rareInstantDeath.allName??'大呪命'):(actor.rareInstantDeath.singleName??'呪命'),successChance:allTargets?(actor.rareInstantDeath.allSuccess??.1):(actor.rareInstantDeath.singleSuccess??.3)};
      actor._rareDeathPrimed=primed;return {type:'rareInstantDeathWarning',...primed};
    }
  }
  if(actor.instantDeathCycle){if(actor._instantDeathPrimed){const primed=actor._instantDeathPrimed;actor._instantDeathPrimed=false;return {type:'instantDeath',name:actor.instantDeathName,...primed};}if((battle.turnNumber??0)>0&&(battle.turnNumber??0)%3===2){const targets=battle.actors.filter(a=>a.side==='ally'&&a.hp>0);const target=targets[Math.min(targets.length-1,Math.floor(rng()*targets.length))];actor._instantDeathPrimed={targetId:target?.id,targetName:target?.name};return {type:'instantDeathWarning',name:actor.instantDeathName,...actor._instantDeathPrimed};}}
  const list=actor.ai?.length?actor.ai:[{type:'wait'}];
  let available=list;
  if(actor.mashoBoss&&actor.mashoFloor>=20){const since=(battle.turnNumber??0)-(actor._mashoLastAreaTurn??-99);if(since<3){const safe=list.filter(a=>!(a.type==='skill'&&a.skill?.allTargets));if(safe.length)available=safe;}}
  const base={...(available[Math.floor(rng()*available.length)]??{type:'wait'})};
  if(actor.mashoBoss&&actor.mashoFloor>=20&&base.type==='skill'&&base.skill?.allTargets)actor._mashoLastAreaTurn=battle.turnNumber??0;
  if(base.type==='skill'&&base.skill?.selfTarget)base.targetId=actor.id;
  else if((base.type==='attack'||base.type==='skill')&&!base.targetId){
    const allies=battle.actors.filter(x=>x.side==='ally'&&x.hp>0);
    if(allies.length) base.targetId=allies[Math.min(allies.length-1,Math.floor(rng()*allies.length))].id;
  }
  return base;
}
