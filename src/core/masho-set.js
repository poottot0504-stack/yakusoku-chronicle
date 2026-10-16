import { EQUIPMENT } from '../data/equipment.js';
const slots=['weapon','shield','head','body','arms','waist','legs','accessory1','accessory2'];
export function getMashoSetCount(state,character){
 if((character.jobLevels?.[character.currentJob]??1)<100)return 0;
 const seen=new Set();return slots.reduce((n,slot)=>{const ref=character.equipment?.[slot],inst=typeof ref==='object'?ref:state.equipmentInventory?.find(x=>x.instanceId===ref),d=EQUIPMENT[inst?.equipmentId];
 const expected=slot==='accessory1'?'ring':slot==='accessory2'?'charm':slot;
 if(!d?.mashoGear||!d.allowedJobs.includes(character.currentJob)||(d.slot==='accessory'?d.accessoryType:d.slot)!==expected||seen.has(inst.instanceId))return n;
 seen.add(inst.instanceId);return n+1;},0);
}
