// A single browser tab must never overlap inventory-changing market actions.
// This is UX / race protection, not a substitute for server-side authorization.
export function createMarketOperationGuard({
  isLocked=()=>false,
  onBusy=()=>{},
  onSettled=()=>{}
}={}){
  let busy=false;
  return {
    get busy(){return busy;},
    async run(operation){
      if(busy||isLocked()){
        onBusy();
        return false;
      }
      busy=true;
      try{
        return await operation();
      }finally{
        busy=false;
        onSettled();
      }
    }
  };
}
