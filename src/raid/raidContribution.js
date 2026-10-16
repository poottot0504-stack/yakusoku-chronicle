export const RAID_RANK_THRESHOLDS=Object.freeze({C:20000,B:50000,A:100000,S:150000});
export const RAID_CONTRIBUTION_WEIGHTS=Object.freeze({damage:1,survivalSeconds:10,healing:1,supportActions:300,defensePrevented:1});
export const RAID_EXP_REWARDS=Object.freeze({C:10000,B:20000,A:35000,S:50000});
export function contributionPoints(values={}){return Math.max(0,Math.floor(Object.entries(RAID_CONTRIBUTION_WEIGHTS).reduce((sum,[key,weight])=>sum+Math.max(0,Number(values[key])||0)*weight,0)));}
export function raidRank(points=0){for(const rank of ['S','A','B','C'])if(points>=RAID_RANK_THRESHOLDS[rank])return rank;return null;}
export function rewardForRank(rank){return ({S:{itemId:'orichalcum',qty:1},A:{itemId:'orihal',qty:1},B:{itemId:'orichalcumShard',qty:1},C:{itemId:'orihalShard',qty:1}})[rank]??null;}
export function raidExperienceForRank(rank){return Math.max(0,Number(RAID_EXP_REWARDS[rank]??0));}
export function isRewardEligible({currentHp,maxHp,points}){return maxHp>0&&currentHp<=maxHp*.5&&raidRank(points)!=null;}
