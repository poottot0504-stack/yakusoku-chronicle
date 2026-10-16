const GUARANTEED_STATUS_MAGIC_JOBS=new Set(['mage','healer']);
export function statusCastChance(actor={},skill={}){
 if(!skill?.status)return null;
 if(actor?.side==='ally'&&GUARANTEED_STATUS_MAGIC_JOBS.has(actor?.currentJob)&&skill?.type==='magic')return 1;
 if(actor?.side==='enemy')return actor?.isBoss?.18:.35;
 return null;
}
