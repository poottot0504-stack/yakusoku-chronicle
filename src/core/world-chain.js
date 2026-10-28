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

export function recordWorldRunVictory(run,{regionId,earnedGold=0,rewardsByCharacter=null,drops=null}={}){
 if(!run||regionId!==run.regionId||run.completed>=run.total)throw new Error('連戦の勝利記録が不正です');
 run.completed++;
 run.earnedGold+=Math.max(0,Number(earnedGold)||0);
 if(rewardsByCharacter){run.expByCharacter??={};run.jobExpByCharacter??={};for(const [id,reward] of Object.entries(rewardsByCharacter)){run.expByCharacter[id]=(run.expByCharacter[id]??0)+Math.max(0,Number(reward.characterExp??0));run.jobExpByCharacter[id]=(run.jobExpByCharacter[id]??0)+Math.max(0,Number(reward.jobExp??0));}}
 if(drops){run.drops??=[];const merged=new Map(run.drops.map(d=>[d.id,{...d}]));for(const d of drops){if(!d?.id)continue;const prev=merged.get(d.id);if(prev)prev.qty+=Number(d.qty)||0;else merged.set(d.id,{id:d.id,name:d.name,qty:Math.max(0,Number(d.qty)||0)});}run.drops=[...merged.values()].filter(d=>d.qty>0);}
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
  status,earnedGold:run.earnedGold,...(run.expByCharacter?{expByCharacter:{...run.expByCharacter},jobExpByCharacter:{...run.jobExpByCharacter}}:{}),...(run.drops?{drops:run.drops.map(d=>({...d}))}:{})};
}
