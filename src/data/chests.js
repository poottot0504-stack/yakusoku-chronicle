export const CHESTS={
 normalChest:{id:'normalChest',type:'normal',respawnDays:1,rewards:[{kind:'gold',amount:50}]},
 lockedTrapChest:{id:'lockedTrapChest',type:'locked',keyType:'consumable',keyId:'chestKey',trap:{id:'poison',difficulty:.7},rewards:[{kind:'item',id:'potion',qty:2}]},
 legendaryChest:{id:'legendaryChest',type:'legendary',keyType:'permanent',keyId:'royalKey',rewards:[{kind:'item',id:'forgeCharm',qty:1}]},
 mimicChest:{id:'mimicChest',type:'mimic',mimic:true,rewards:[{kind:'material',id:'mimicCore',qty:1},{kind:'gold',amount:300}]}
};
