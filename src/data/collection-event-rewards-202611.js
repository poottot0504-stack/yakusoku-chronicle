// Draft reward table for the November 2026 collection event.
// This is data only. Do NOT grant rewards from the browser or publish this draft.
// Book rewards use the game's existing 2x experience book IDs.
function makeTier(minRank,maxRank,gold,orichalcum,orihal,characterBooks,jobBooks){
 const items=[
  {id:'orichalcum',qty:orichalcum},
  {id:'orihal',qty:orihal},
  {id:'characterExpScroll',qty:characterBooks},
  {id:'jobExpScroll',qty:jobBooks},
 ].filter(item=>item.qty>0).map(item=>Object.freeze(item));
 return Object.freeze({minRank,maxRank,gold,items:Object.freeze(items)});
}
export const COLLECTION_RANK_REWARDS_202611=Object.freeze([
 makeTier(1,1,50_000_000,5,5,5,5),
 makeTier(2,2,30_000_000,3,3,3,3),
 makeTier(3,3,20_000_000,2,2,2,2),
 makeTier(4,10,5_000_000,1,1,1,1),
 makeTier(11,30,2_000_000,0,0,1,1),
 makeTier(31,100,500_000,0,0,1,1),
 makeTier(101,Number.MAX_SAFE_INTEGER,100_000,0,0,0,0),
]);

export function collectionRankReward(rank){
 if(!Number.isSafeInteger(rank)||rank<1)return null;
 return COLLECTION_RANK_REWARDS_202611.find(tier=>rank>=tier.minRank&&rank<=tier.maxRank)??null;
}
