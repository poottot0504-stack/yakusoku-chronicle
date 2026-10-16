export function formatPlayTime(totalSeconds=0){
  const seconds=Math.max(0,Math.floor(Number(totalSeconds)||0));
  const hours=Math.floor(seconds/3600);
  const minutes=Math.floor((seconds%3600)/60);
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

export function addElapsedPlayTime(state,startedAt,now=Date.now()){
  if(!state||!Number.isFinite(startedAt)||!Number.isFinite(now)||now<=startedAt)return {addedSeconds:0,accountedUntil:startedAt};
  const addedSeconds=Math.floor((now-startedAt)/1000);
  if(addedSeconds<=0)return {addedSeconds:0,accountedUntil:startedAt};
  state.playTimeSeconds=Math.max(0,Number(state.playTimeSeconds)||0)+addedSeconds;
  return {addedSeconds,accountedUntil:startedAt+addedSeconds*1000};
}
