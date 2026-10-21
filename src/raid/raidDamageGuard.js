// Mirror the conservative, verified per-action raid budget. The server remains
// authoritative and continues to reject requests outside its own trusted cap.
// This prevents normal high-multiplier skills from showing 0 shared-HP damage
// solely because the client submitted a number beyond that accepted budget.
const integer=(value,fallback=1)=>{const n=Number(value);return Number.isFinite(n)?Math.max(1,Math.floor(n)):fallback;};
export function estimatedRaidDamageCeiling(actor={},verifiedLevel=null){
 const local=integer(actor?.level),trusted=Number(verifiedLevel);
 const level=Math.min(local,Number.isFinite(trusted)&&trusted>0?integer(trusted):local);
 const job=integer(actor?.jobLevels?.[actor?.currentJob]??1);
 const threshold=level>=150&&job>=100?200000:level>=120&&job>=75?130000:level>=80&&job>=50?85000:30000;
 return Math.min(240000,Math.max(30000,6000+400*Math.min(200,level)+120*Math.min(200,job),threshold));
}
export function prepareRaidDamageSubmission(payload={},actor={},verifiedLevel=null){
 const raw=Number(payload?.damage??0);
 const requested=Number.isFinite(raw)?Math.max(0,Math.floor(raw)):0;
 // The server independently verifies the job level. Until it returns a
 // verified value, calculating a limit from the local job level can produce
 // rejected offensive skills (and misleading MP refunds).
 const safeActor={...actor,jobLevels:{...(actor?.jobLevels??{}),[actor?.currentJob??'swordsman']:1}};
 const safeCeiling=Math.max(1,Math.floor(estimatedRaidDamageCeiling(safeActor,verifiedLevel)*.9));
 const submitted=Math.min(requested,safeCeiling);
 return {payload:{...payload,damage:submitted},requested,submitted,adjusted:requested>submitted,safeCeiling};
}
