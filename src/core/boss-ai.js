function weighted(list,rng){const total=list.reduce((s,a)=>s+(a.weight??1),0);let r=rng()*total;for(const a of list){r-=a.weight??1;if(r<=0)return a;}return list[0];}
export function chooseBossAction(battle,boss,rng=Math.random){
 if(boss.telegraph){const action=boss.telegraph;boss.telegraph=null;return action;}
 const action=weighted((boss.ai??[]).filter(a=>(a.weight??1)>0),rng)??{id:'attack'};
 if(action.telegraphed){boss.telegraph={...action,chargedOnTurn:battle.turnNumber};return {type:'telegraph',actionId:action.id};}
 return action;
}
