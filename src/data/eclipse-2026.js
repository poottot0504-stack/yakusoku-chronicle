// 2026/10/31-11/01 (JST): 星蝕の異界門.
// This catalog is intentionally independent of event battle activation.
// Materials are only earned when the separate event battle/drops integration goes live.
export const ECLIPSE_EVENT=Object.freeze({
 id:'eclipse-gate-2026',
 name:'星蝕の異界門',
 announcementStart:Date.parse('2026-10-28T00:00:00+09:00'),
 banner:'./assets/events/eclipse-gate-2026.svg',
 startsAt:Date.parse('2026-10-31T00:00:00+09:00'),
 endsAt:Date.parse('2026-11-02T00:00:00+09:00')
});

export const ECLIPSE_MATERIALS=Object.freeze({
 eclipseShard:Object.freeze({id:'eclipseShard',name:'星蝕の欠片',icon:'🌘',event:true,description:'星蝕の異界門の魔物が落とす欠片。限定装備を生産するための素材。'}),
 riftStone:Object.freeze({id:'riftStone',name:'異界の魔石',icon:'🔮',event:true,description:'異界門の魔力を封じた石。星蝕の武器やチャームの素材。'}),
 wraithVeil:Object.freeze({id:'wraithVeil',name:'亡霊の霊布',icon:'👻',event:true,description:'幽界の魔物が落とす不思議な布。限定防具やチャームの素材。'}),
 voidCrystal:Object.freeze({id:'voidCrystal',name:'虚星の結晶',icon:'💠',event:true,description:'異界の強敵が宿す希少な結晶。上位の限定装備に使用。'}),
 noxCore:Object.freeze({id:'noxCore',name:'ノクスの心核',icon:'🌑',event:true,description:'星蝕の支配者・ノクスから得られる特別な素材。星蝕Ⅱ装備の一部に使用。'})
});

export const ECLIPSE_TIERS=Object.freeze([
 Object.freeze({id:'i',label:'Ⅰ',requiredLevel:1,rarity:'rare',weapon:26,armor:12,ring:9,charm:10,hp:45,mp:20,speed:2,gold:550}),
 Object.freeze({id:'ii',label:'Ⅱ',requiredLevel:1,rarity:'epic',weapon:92,armor:48,ring:27,charm:32,hp:180,mp:70,speed:8,gold:3800})
]);

// Rank I and II are both equippable at Job Lv 1, even after enhancement.
// Include advanced weapon types (gunblade and starGlobe) so none of the 20 jobs
// are left without an event weapon. The equipment job rules remain authoritative.
export const ECLIPSE_WEAPONS=Object.freeze([
 Object.freeze({id:'blade',type:'oneHandSword',name:'星蝕の剣',stat:'attack'}),
 Object.freeze({id:'greatSword',type:'greatSword',name:'断界の大剣',stat:'attack',twoHanded:true}),
 Object.freeze({id:'dagger',type:'dagger',name:'異界の短剣',stat:'attack',fast:true}),
 Object.freeze({id:'fist',type:'fist',name:'虚月の拳甲',stat:'attack',fast:true}),
 Object.freeze({id:'staff',type:'staff',name:'虚星の魔杖',stat:'magic'}),
 Object.freeze({id:'greatStaff',type:'greatStaff',name:'星蝕の大杖',stat:'magic'}),
 Object.freeze({id:'spear',type:'spear',name:'境界を貫く槍',stat:'attack'}),
 Object.freeze({id:'axe',type:'axe',name:'冥門の戦斧',stat:'attack'}),
 Object.freeze({id:'bow',type:'bow',name:'月蝕の弓',stat:'attack',fast:true}),
 Object.freeze({id:'mace',type:'mace',name:'幽光のメイス',stat:'magic'}),
 Object.freeze({id:'dualBlades',type:'dualBlades',name:'星影の双剣',stat:'attack',fast:true}),
 Object.freeze({id:'katana',type:'katana',name:'宵闇の太刀',stat:'attack'}),
 Object.freeze({id:'instrument',type:'instrument',name:'月下の竪琴',stat:'magic'}),
 Object.freeze({id:'cards',type:'cards',name:'星蝕の魔札',stat:'magic'}),
 Object.freeze({id:'gunblade',type:'gunblade',name:'断星の銃剣',stat:'attack'}),
 Object.freeze({id:'starGlobe',type:'starGlobe',name:'異界の星天球',stat:'magic'})
]);

export const ECLIPSE_ARMOR=Object.freeze([
 Object.freeze({id:'shield',slot:'shield',name:'異界守護の盾',defenseRatio:.9}),
 Object.freeze({id:'head',slot:'head',name:'星蝕の冠',defenseRatio:.8}),
 Object.freeze({id:'body',slot:'body',name:'異界の戦衣',defenseRatio:1.45}),
 Object.freeze({id:'arms',slot:'arms',name:'虚星の護手',defenseRatio:.85}),
 Object.freeze({id:'waist',slot:'waist',name:'宵闇の腰帯',defenseRatio:.88}),
 Object.freeze({id:'legs',slot:'legs',name:'月蝕の脚甲',defenseRatio:.95})
]);

export const ECLIPSE_EQUIPMENT={};
for(const tier of ECLIPSE_TIERS){
 const shared={requiredLevel:tier.requiredLevel,noEventLevelScaling:true,rarity:tier.rarity,eventLimited:true,eventId:ECLIPSE_EVENT.id,elementAffinity:'dark',description:'星蝕の異界門・ハロウィン特別編の限定装備。イベント終了後も獲得済み素材で生産可能。'};
 for(const w of ECLIPSE_WEAPONS){
  const id=`eclipse-${tier.id}-${w.id}`;
  ECLIPSE_EQUIPMENT[id]={...shared,id,name:`${w.name} ${tier.label}`,slot:'weapon',weaponType:w.type,...(w.twoHanded?{twoHanded:true}:{}),[w.stat]:tier.weapon,...(w.fast?{speed:tier.speed}:{})};
 }
 for(const a of ECLIPSE_ARMOR){
  const id=`eclipse-${tier.id}-${a.id}`;
  ECLIPSE_EQUIPMENT[id]={...shared,id,name:`${a.name} ${tier.label}`,slot:a.slot,defense:Math.round(tier.armor*a.defenseRatio),...(a.slot==='shield'?{shieldSize:'small'}:{}),...(a.slot==='body'?{maxHp:tier.hp}:{}),...(a.slot==='legs'?{speed:tier.speed}:{}),...(a.slot==='head'?{maxMp:tier.mp}: {})};
 }
 const ringId=`eclipse-${tier.id}-ring`;
 ECLIPSE_EQUIPMENT[ringId]={...shared,id:ringId,name:`星蝕の指輪 ${tier.label}`,slot:'accessory',accessoryType:'ring',attack:tier.ring,magic:tier.ring,speed:tier.speed};
 const charmId=`eclipse-${tier.id}-charm`;
 ECLIPSE_EQUIPMENT[charmId]={...shared,id:charmId,name:`異界守護のチャーム ${tier.label}`,slot:'accessory',accessoryType:'charm',defense:tier.charm,maxHp:tier.hp,maxMp:tier.mp};
}

// Forge materials are intentionally affordable over a 48-hour event.
// Boss cores are reserved for the strongest pieces, not every armor slot.
export function eclipseRecipeMaterials(tierId,part){
 const t=ECLIPSE_TIERS.find(x=>x.id===tierId);
 if(!t)throw new Error('未登録の星蝕装備ランクです');
 const high=tierId==='ii',weapon=ECLIPSE_WEAPONS.some(x=>x.id===part);
 if(weapon)return high?{eclipseShard:6,riftStone:4,voidCrystal:2,noxCore:1}:{eclipseShard:3,riftStone:2};
 if(part==='body')return high?{eclipseShard:4,wraithVeil:4,voidCrystal:2,noxCore:1}:{eclipseShard:2,wraithVeil:2};
 if(part==='ring')return high?{eclipseShard:3,voidCrystal:2,noxCore:1}:{eclipseShard:2,voidCrystal:1};
 if(part==='charm')return high?{riftStone:3,wraithVeil:3,voidCrystal:2,noxCore:1}:{riftStone:1,wraithVeil:2};
 return high?{eclipseShard:3,wraithVeil:3,voidCrystal:1}:{eclipseShard:2,wraithVeil:2};
}
