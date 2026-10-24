// Shielder / Great Shielder special shields. Shared with existing forge slots.
// Normal crafted shields unlock through existing material loot and refining.
export const SHIELDER_SHIELD_DEFS=Object.freeze([
 {id:'shielder-bronze-guard',name:'守り手の青銅盾',requiredLevel:1,defense:9,maxHp:12,rarity:'common',craft:{copperIngot:2,'monster001-material':2},tier:1,gold:180},
 {id:'shielder-iron-wall',name:'鉄壁の構え盾',requiredLevel:15,defense:19,maxHp:28,rarity:'common',craft:{ironIngot:3,'monster008-material':2},tier:2,gold:500},
 {id:'shielder-knight-guard',name:'騎士の誓盾',requiredLevel:30,defense:35,maxHp:55,rarity:'rare',craft:{ironIngot:3,'monster008-rare':1,rareCore:1},tier:3,gold:1300},
 {id:'shielder-guardian-wall',name:'守護の大盾',requiredLevel:50,defense:57,maxHp:90,rarity:'rare',craft:{goldIngot:3,unionOre:2,rareCore:1},tier:5,gold:2600},
 {id:'shielder-sacred-aegis',name:'聖騎の大盾',requiredLevel:80,defense:90,maxHp:150,rarity:'epic',craft:{mythrilIngot:3,lightCrystal:2,unionAlloy:1},tier:7,gold:5600},
 {id:'shielder-royal-wall',name:'王壁の盾',requiredLevel:120,defense:135,maxHp:225,rarity:'epic',craft:{mythrilIngot:4,unionAlloy:2,promiseOre:2},tier:9,gold:9800},
 {id:'shielder-grangard',name:'要塞盾グランガード',requiredLevel:180,defense:210,maxHp:370,rarity:'legendary',craft:{starIngot:4,promiseAlloy:2,rareCore:2},tier:12,gold:16000},
 {id:'shielder-masho-protector',name:'魔障の守護盾',requiredLevel:100,defense:175,maxHp:260,rarity:'legendary',mashoFloor:15,dropRate:.008,coverDamageReduction:.05},
 {id:'shielder-abyss-bulwark',name:'深淵の大盾',requiredLevel:100,defense:230,maxHp:350,rarity:'legendary',mashoFloor:20,dropRate:.005,coverDamageReduction:.08},
 {id:'shielder-final-aegis',name:'終護のイージス',requiredLevel:100,defense:320,maxHp:500,rarity:'legendary',mashoFloor:25,dropRate:.002,coverDamageReduction:.10}
]);
export const SHIELDER_SHIELDS=Object.fromEntries(SHIELDER_SHIELD_DEFS.map(def=>{
 const {craft,dropRate,mashoFloor,tier,gold,...stats}=def;
 const gear={...stats,slot:'shield',shieldSize:'large',
  allowedJobs:['shielder','greatShielder'],
  description:mashoFloor?`魔障の洞窟${mashoFloor}階以降で低確率ドロップ。肩代わりダメージを${Math.round(stats.coverDamageReduction*100)}％軽減。`:
    '盾士・大盾士用に鍛造された盾。HPと防御力が上昇する。',
  ...(mashoFloor?{mashoShieldDrop:true,mashoDropFloor:mashoFloor}:{})};
 return [def.id,gear];
}));
export const SHIELDER_CRAFTING_SHIELDS=SHIELDER_SHIELD_DEFS.filter(x=>x.craft);
export const SHIELDER_CAVE_SHIELDS=SHIELDER_SHIELD_DEFS.filter(x=>x.mashoFloor);
