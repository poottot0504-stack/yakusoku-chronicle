/** Session-only, sequential Masho battles. Rewards are settled by settleMashoVictory, once per fight. */
export function createMashoRun(floor,total=10){
 if(!Number.isInteger(floor)||floor<1||floor>28)throw new Error('階層が不正です');
 if(total!==10)throw new Error('10連戦のみ選択できます');
 return {floor,total,completed:0,stopAfterCurrent:false,queueNextTen:false,manualOnly:false,earnedGold:0,exp:0,jobExp:0,promiseOre:0,materials:{},equipment:[]};
}
export function recordMashoRunVictory(run,receipt,actualGold=0){
 if(!run||receipt?.floor!==run.floor||run.completed>=run.total)throw new Error('連戦の報酬を確認できません');
 run.completed++;
 run.earnedGold+=Math.max(0,Number(actualGold)||0);
 run.exp+=Math.max(0,Number(receipt.exp)||0);
 run.jobExp+=Math.max(0,Number(receipt.jobExp)||0);
 run.promiseOre+=Math.max(0,Number(receipt.promiseOre)||0);
 if(receipt.enhanceMaterial?.id){
  const id=receipt.enhanceMaterial.id;
  run.materials[id]=(run.materials[id]??0)+Math.max(1,Number(receipt.enhanceMaterial.qty)||1);
 }
 if(receipt.equipment?.equipmentId)run.equipment.push(receipt.equipment.equipmentId);
 if(receipt.shieldEquipment?.equipmentId)run.equipment.push(receipt.shieldEquipment.equipmentId);
 return run;
}
export const mashoRunCanContinue=run=>Boolean(run&&run.completed>0&&run.completed<run.total&&!run.stopAfterCurrent);
export function mashoRunSummary(run,status='completed'){
 if(!run)throw new Error('連戦記録がありません');
 return {floor:run.floor,total:run.total,completed:run.completed,status,earnedGold:run.earnedGold,exp:run.exp,jobExp:run.jobExp,promiseOre:run.promiseOre,materials:{...run.materials},equipment:[...run.equipment]};
}

/** Result receipts stay saved; only the temporary cave notice is dismissible. */
export function setMashoResultVisibility(state,visible=false){
 state.ui??={};
 state.ui.mashoResultVisible=visible===true;
 return state.ui.mashoResultVisible;
}

/** Queue one additional 10-battle group, without unlimited automatic repeats. */
export function toggleMashoNextTen(run){
 if(!run||run.stopAfterCurrent||run.completed>=run.total)return false;
 run.queueNextTen=!run.queueNextTen;
 return run.queueNextTen;
}
