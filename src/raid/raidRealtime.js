export function createRaidPoller({api,getPayload,onSnapshot,onError=()=>{},intervalMs=1000,setTimer=setTimeout,clearTimer=clearTimeout}){
 let active=false,timer=null,busy=false,generation=0;
 const schedule=()=>{if(active){if(timer!=null)clearTimer(timer);timer=setTimer(tick,intervalMs);}};
 async function tick(){
  if(!active||busy)return schedule();
  const requestGeneration=generation;busy=true;
  try{const data=await api.snapshot(getPayload());if(active&&requestGeneration===generation)onSnapshot(data);}
  catch(err){if(active&&requestGeneration===generation)onError(err);}
  finally{busy=false;schedule();}
 }
 return {start(){if(active)return;generation++;active=true;void tick();},stop(){generation++;active=false;if(timer!=null)clearTimer(timer);timer=null;},refresh:tick,get active(){return active;}};
}
