export const HUNT_COUNT_APOLOGY_REWARD_ID='enhanceCrystal';
export const HUNT_COUNT_APOLOGY_QUANTITY=5;
export const HUNT_COUNT_APOLOGY_MAX_MATERIAL=999;

/** Always verify available space *before* creating the server claim. */
export function canReceiveHuntCountApology(state){
 const current=Number(state?.materials?.[HUNT_COUNT_APOLOGY_REWARD_ID]??0);
 const legacy=(state?.inventory??[]).filter(x=>x?.id===HUNT_COUNT_APOLOGY_REWARD_ID).reduce((n,x)=>n+Number(x?.qty??0),0);
 return Number.isSafeInteger(current)&&current>=0&&Number.isSafeInteger(legacy)&&legacy>=0&&current+legacy<=HUNT_COUNT_APOLOGY_MAX_MATERIAL-HUNT_COUNT_APOLOGY_QUANTITY;
}

export function isHuntCountApologyDelivered(state,receipt){
 return receipt?.id && state?.huntCountApologyReceiptId===receipt.id;
}

/** Receipt is a server-generated, account-bound claim, never a client-generated ID. */
export function grantHuntCountApology(state,receipt,slot){
 if(!receipt?.claimed || typeof receipt.id!=='string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(receipt.id) ||
    receipt.rewardId!==HUNT_COUNT_APOLOGY_REWARD_ID || Number(receipt.quantity)!==HUNT_COUNT_APOLOGY_QUANTITY ||
    Number(receipt.saveSlot)!==Number(slot))throw new Error('お詫び報酬の受取情報が一致しません');
 if(isHuntCountApologyDelivered(state,receipt))return false;
 if(!canReceiveHuntCountApology(state))throw new Error('強化結晶の所持上限999個に達します。5個分の空きを作ってからお受け取りください。');
 state.materials??={};
 const count=Number(state.materials[HUNT_COUNT_APOLOGY_REWARD_ID]??0);
 state.materials[HUNT_COUNT_APOLOGY_REWARD_ID]=count+HUNT_COUNT_APOLOGY_QUANTITY;
 state.huntCountApologyReceiptId=receipt.id;
 state.huntCountApologyReceived=true;
 return true;
}
