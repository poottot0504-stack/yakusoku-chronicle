/** A session-only, bounded 10-battle chain for ordinary world-map exploration.
 * Each battle is still created and settled by the standard adventure flow.
 * This object must never be stored in the player save or used as a reward receipt.
 */
export const WORLD_RUN_LENGTH=10;

export function createWorldRun(regionId,total=WORLD_RUN_LENGTH){
 if(typeof regionId!=='string'||!regionId.trim())throw new Error('探索エリアを確認できません');
 if(total!==WORLD_RUN_LENGTH)throw new Error('ワールドマップの連戦は10戦のみです');
 return {regionId,total,completed:0,stopAfterCurrent:false,earnedGold:0};
}

export function recordWorldRunVictory(run,{regionId,earnedGold=0}={}){
 if(!run||regionId!==run.regionId||run.completed>=run.total)throw new Error('連戦の勝利記録が不正です');
 run.completed++;
 run.earnedGold+=Math.max(0,Number(earnedGold)||0);
 return run;
}

export function stopWorldRunAfterCurrent(run){
 if(!run||run.completed>=run.total)return false;
 run.stopAfterCurrent=true;
 return true;
}

export function worldRunCanContinue(run,{regionId=run?.regionId,partyReady=true}={}){
 return Boolean(run&&run.completed>0&&run.completed<run.total&&
  !run.stopAfterCurrent&&regionId===run.regionId&&partyReady);
}

export function worldRunSummary(run,status='completed'){
 if(!run)throw new Error('連戦の記録がありません');
 return {regionId:run.regionId,total:run.total,completed:run.completed,
  status,earnedGold:run.earnedGold};
}
