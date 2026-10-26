// 闘技大会の限定生産装備は盾・魔本・指輪・チャームの4種類のみ。
// Wallet balance (arena.coins) is separate from market items/materials.
export const ARENA_COIN_ID='arena-coin';
export const ARENA_EQUIPMENT=Object.freeze({
 'arena-guardian-shield':{
  id:'arena-guardian-shield',name:'闘技の守護盾',slot:'shield',shieldSize:'large',
  requiredLevel:30,rarity:'rare',defense:42,maxHp:75,arenaExclusive:true,
  description:'闘技コインでのみ生産・強化できる守護の大盾。'
 },
 'arena-arcane-spellbook':{
  id:'arena-arcane-spellbook',name:'闘技の秘術魔本',slot:'spellbook',weaponType:'spellbook',
  requiredLevel:50,rarity:'rare',magic:58,maxMp:90,arenaExclusive:true,
  description:'召喚士専用の闘技魔本。闘技コインで生産・強化できる。'
 },
 'arena-gold-ring':{
  id:'arena-gold-ring',name:'闘技の黄金指輪',slot:'accessory',accessoryType:'ring',
  requiredLevel:70,rarity:'epic',attack:34,magic:34,arenaExclusive:true,
  description:'闘技コインで生産・強化できる指輪。'
 },
 'arena-guardian-charm':{
  id:'arena-guardian-charm',name:'闘技の守護チャーム',slot:'accessory',accessoryType:'charm',
  requiredLevel:70,rarity:'epic',defense:30,maxHp:120,arenaExclusive:true,
  description:'闘技コインで生産・強化できるチャーム。'
 }
});
export const ARENA_CRAFT_COSTS=Object.freeze({
 'arena-guardian-shield':12,
 'arena-arcane-spellbook':15,
 'arena-gold-ring':12,
 'arena-guardian-charm':10
});
export const ARENA_ENHANCE_COSTS=Object.freeze([2,3,3,4,5,5,6,8,9,10]);
export const ARENA_ENHANCE_LIMIT=ARENA_ENHANCE_COSTS.length;
