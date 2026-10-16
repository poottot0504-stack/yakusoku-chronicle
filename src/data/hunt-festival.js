export const HUNT_FESTIVAL=Object.freeze({id:'chronicle-hunt-202610',goal:2500,maxGoal:100000,milestones:Object.freeze([2500,5000,10000,50000,100000]),announce:Date.parse('2026-10-14T00:00:00+09:00'),start:Date.parse('2026-10-16T00:00:00+09:00'),end:Date.parse('2026-10-20T00:00:00+09:00')});
export const HUNT_FESTIVAL_BONUSES=Object.freeze({
 5000:Object.freeze({goal:5000,gold:1_000_000,materials:Object.freeze([Object.freeze({id:'orihal',qty:2})]),label:'💰 100万G ＋ 🔷 オリハル ×2'}),
 10000:Object.freeze({goal:10000,gold:5_000_000,materials:Object.freeze([Object.freeze({id:'orichalcum',qty:2})]),label:'💰 500万G ＋ 💠 オリハルコン ×2'}),
 50000:Object.freeze({goal:50000,gold:10_000_000,materials:Object.freeze([Object.freeze({id:'orichalcum',qty:5}),Object.freeze({id:'enhanceCrystal',qty:5})]),label:'💰 1,000万G ＋ 💠 オリハルコン ×5 ＋ 💎 強化結晶 ×5'}),
 100000:Object.freeze({goal:100000,gold:30_000_000,materials:Object.freeze([Object.freeze({id:'orichalcum',qty:10}),Object.freeze({id:'enhanceCrystal',qty:10})]),label:'💰 3,000万G ＋ 💠 オリハルコン ×10 ＋ 💎 強化結晶 ×10'})
});
export const FESTIVAL_WEAPONS={oneHandSword:'剣',greatSword:'大剣',dagger:'短剣',fist:'拳甲',staff:'杖',greatStaff:'大杖',spear:'槍',axe:'斧',bow:'弓',mace:'メイス',dualBlades:'双剣',katana:'刀',instrument:'竪琴',cards:'カード',gunblade:'銃剣',starGlobe:'星天球'};
export const FESTIVAL_EQUIPMENT={};
const base={requiredLevel:1,rarity:'epic',festivalGear:true,description:'クロニクル大討伐祭・2,500体達成記念装備。ジョブLv1から装備可能。'};
for(const [type,name] of Object.entries(FESTIVAL_WEAPONS)){
 const magic=['staff','greatStaff','mace','instrument','cards','starGlobe'].includes(type);
 const id='hunt2026-weapon-'+type;
 FESTIVAL_EQUIPMENT[id]={...base,id,name:'共闘の'+name,slot:'weapon',weaponType:type,twoHanded:false,[magic?'magic':'attack']:50,...(type==='oneHandSword'?{magic:30}:{})};
}
for(const [part,name,stats] of [['shield','護符',{defense:30}],['head','冠',{defense:25,maxMp:25}],['body','戦衣',{defense:50,maxHp:50}],['arms','手甲',{defense:25,attack:10,magic:10}],['waist','腰帯',{defense:25,maxHp:50}],['legs','靴',{defense:25,speed:15}],['ring','指輪',{attack:25,magic:25}],['charm','チャーム',{maxHp:100,maxMp:50}]]){
 const id='hunt2026-'+part;
 FESTIVAL_EQUIPMENT[id]={...base,id,name:'共闘の'+name,slot:['ring','charm'].includes(part)?'accessory':part,...(['ring','charm'].includes(part)?{accessoryType:part}:{}),...(part==='shield'?{festivalOffhand:true,shieldSize:'small'}:{}),...stats};
}
