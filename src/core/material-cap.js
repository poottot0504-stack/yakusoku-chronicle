// The inventory allows up to 9,999 of each crafting material. Old saves and
// unclaimed marketplace returns can legitimately exceed the limit; never
// reduce existing holdings during migrations or when awarding capped drops.
export const MATERIAL_STACK_LIMIT=9_999;

const validQuantity=n=>Number.isSafeInteger(n)&&n>=0;

export function totalMaterialQuantity(state,id){
 const stored=Number(state?.materials?.[id]??0);
 const legacy=(state?.inventory??[]).filter(x=>x?.id===id).reduce((n,x)=>n+Number(x?.qty??0),0);
 return stored+legacy;
}

export function materialCapacity(state,id){
 const total=totalMaterialQuantity(state,id);
 if(!validQuantity(total))return 0;
 return Math.max(0,MATERIAL_STACK_LIMIT-total);
}

// Normal rewards honor the limit without cutting down inventory previously
// returned by the market. Marketplace returns are handled separately and
// must always deliver their full escrowed quantity, even if this is >9,999.
export function addMaterial(state,id,rawQuantity=1){
 const quantity=Number(rawQuantity);
 if(!validQuantity(quantity))throw new Error('素材の数量が不正です');
 const original=Number(state?.materials?.[id]??0);
 if(!validQuantity(original))throw new Error('所持素材の数量が不正です');
 const gained=Math.min(quantity,materialCapacity(state,id));
 if(gained>0){state.materials??={};state.materials[id]=original+gained;}
 return gained;
}
