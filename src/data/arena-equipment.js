// 闘技大会限定の生産・強化装備。通常の鍛冶素材とは交換しない。
export const ARENA_EQUIPMENT=Object.freeze({
 'arena-bronze-saber':{
  id:'arena-bronze-saber',name:'闘技の青銅剣',slot:'weapon',weaponType:'oneHandSword',
  requiredLevel:30,rarity:'rare',attack:30,arenaExclusive:true,
  description:'闘技大会コインでのみ生産・強化できる片手剣。'
 },
 'arena-silver-mail':{
  id:'arena-silver-mail',name:'闘技の白銀鎧',slot:'body',
  requiredLevel:50,rarity:'rare',defense:52,maxHp:85,arenaExclusive:true,
  description:'闘技大会コインでのみ生産・強化できる鎧。'
 },
 'arena-gold-ring':{
  id:'arena-gold-ring',name:'闘技の黄金指輪',slot:'accessory',accessoryType:'ring',
  requiredLevel:70,rarity:'epic',attack:34,magic:34,arenaExclusive:true,
  description:'闘技大会コインでのみ生産・強化できる指輪。'
 }
});
export const ARENA_CRAFT_COSTS=Object.freeze({
 'arena-bronze-saber':15,'arena-silver-mail':10,'arena-gold-ring':12
});
export const ARENA_ENHANCE_COSTS=Object.freeze([2,3,3,4,5,5,6,8,9,10]);
export const ARENA_ENHANCE_LIMIT=ARENA_ENHANCE_COSTS.length;
