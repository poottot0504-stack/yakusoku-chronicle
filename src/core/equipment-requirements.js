// 必要職業Lvの共通判定。通常装備は強化値で変わらず、イベント装備だけ+1〜+5で上昇。
export function getRequiredJobLevel(def,instanceOrLevel=0){
 const base=Math.max(1,Math.floor(Number(def?.requiredLevel??1)||1));
 if(!def?.eventLimited||def.noEnhance)return base;
 const raw=typeof instanceOrLevel==='number'?instanceOrLevel:instanceOrLevel?.enhanceLevel??0;
 const enhancement=Math.max(0,Math.min(5,Math.floor(Number(raw)||0)));
 let perLevel=5;
 if(def.raidGear)perLevel=6;
 else if(String(def.id??'').startsWith('halloween-')){
   const tier=String(def.id).split('-')[1];
   perLevel=({i:5,ii:7,iii:10})[tier]??5;
 }
 return base+enhancement*perLevel;
}
