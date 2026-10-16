export const CHARACTER_LEVEL_MAX=500;
export const JOB_LEVEL_MAX=400;
export function hasFirstClear(state={}){return Boolean(state.story?.firstEndingSeen||state.story?.trueEndingSeen||Number(state.cycle)>=2);}
export function applyProgressionCaps(state){
 if(hasFirstClear(state)){state.levelCap=CHARACTER_LEVEL_MAX;state.jobCaps={basic:JOB_LEVEL_MAX,advanced:JOB_LEVEL_MAX,special:JOB_LEVEL_MAX};}
 return state;
}
