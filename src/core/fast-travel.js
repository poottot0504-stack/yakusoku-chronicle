export function activateWarpStone(state,stoneId){state.warpStones??=[];if(!state.warpStones.includes(stoneId))state.warpStones.push(stoneId);return state.warpStones;}
export function canFastTravel(state,stoneId,context={}){if(!(state.warpStones??[]).includes(stoneId))return false;if(context.battle||context.specialEvent)return false;if(state.story?.freeWarpUnlocked)return true;return context.atWarpStone===true;}
export function fastTravel(state,stoneId,context={}){if(!canFastTravel(state,stoneId,context))throw new Error('今はワープできません');state.currentLocationId=stoneId;return stoneId;}
