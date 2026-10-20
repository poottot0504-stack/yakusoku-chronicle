import { EQUIPMENT } from './equipment.js';
import { ECLIPSE_EVENT,ECLIPSE_TIERS,ECLIPSE_WEAPONS,ECLIPSE_ARMOR,ECLIPSE_MATERIALS,eclipseRecipeMaterials } from './eclipse-2026.js';
import { NORMAL_ENEMY_LIST } from './enemies.js';
import { NEW_MONSTERS,newMonsterGearId,newMonsterMaterialId } from './new-monsters.js';
const R={};let order=1;const add=(r)=>{R[r.id]={tier:1,displayOrder:order++,...r};};
const metals=[['copper','銅','copperOre','copperIngot',1],['iron','鉄','ironOre','ironIngot',2],['gold','金','goldOre','goldIngot',3],['platinum','プラチナ','platinumOre','platinumIngot',4],['mythril','ミスリル','mythrilOre','mythrilIngot',5],['star','星晶','starCrystal','starIngot',6]];
for(const [key,jp,ore,ingot,tier] of metals)add({id:`refine-${key}`,name:`${jp}インゴット`,category:'refine',tier,gold:20*tier,output:{kind:'material',itemId:ingot,quantity:1},materials:{[ore]:3},unlock:{type:'material',materialId:ore}});
const types=['oneHandSword','greatSword','dagger','fist','staff','greatStaff','spear','axe','bow','mace','dualBlades','katana','instrument','cards'];
const wname={oneHandSword:'剣',greatSword:'大剣',dagger:'短剣',fist:'ナックル',staff:'杖',greatStaff:'大杖',spear:'槍',axe:'斧',bow:'弓',mace:'メイス',dualBlades:'双剣',katana:'刀',instrument:'楽器',cards:'カード'};
const slots={shield:'盾',head:'兜',body:'鎧',arms:'小手',waist:'腰当て',legs:'具足'};
const jobArmorRecipeNames={
 magic:{head:'魔導帽',body:'魔導ローブ',arms:'魔導手袋',waist:'魔導腰帯',legs:'魔導靴'},
 thief:{head:'影フード',body:'盗賊服',arms:'盗賊手袋',waist:'盗賊の腰帯',legs:'盗賊ブーツ'},
 fighter:{head:'武闘鉢巻',body:'武闘着',arms:'手甲',waist:'武闘帯',legs:'脚絆'},
 archer:{head:'狩人帽',body:'狩人服',arms:'弓手手袋',waist:'狩人の腰帯',legs:'狩人ブーツ'}
};
for(const [key,jp,ore,ingot,tier] of metals){
 for(const type of types)add({id:`craft-${key}-${type}`,name:`${jp}の${wname[type]}`,category:'weapon',tier,gold:80*tier,output:{kind:'equipment',equipmentId:`${key}-${type}`,quantity:1},materials:{[ingot]:type==='greatSword'||type==='greatStaff'?3:2},unlock:{type:'material',materialId:ingot}});
 for(const [slot,label] of Object.entries(slots))add({id:`craft-${key}-${slot}`,name:`${jp}の${label}`,category:'armor',tier,gold:70*tier,output:{kind:'equipment',equipmentId:`${key}-${slot}`,quantity:1},materials:{[ingot]:slot==='body'?3:2},unlock:{type:'material',materialId:ingot}});
 for(const [group,names] of Object.entries(jobArmorRecipeNames))for(const [slot,label] of Object.entries(names))add({id:`craft-${key}-${group}-${slot}`,name:`${jp}の${label}`,category:'armor',tier,gold:70*tier,output:{kind:'equipment',equipmentId:`${key}-${group}-${slot}`,quantity:1},materials:{[ingot]:slot==='body'?3:2},unlock:{type:'material',materialId:ingot}});
 add({id:`craft-${key}-attack-ring`,name:`${jp}の攻撃指輪`,category:'ring',accessoryKind:'attack',tier,gold:60*tier,output:{kind:'equipment',equipmentId:`${key}-attack-ring`,quantity:1},materials:{[ingot]:1},unlock:{type:'material',materialId:ingot}});
 add({id:`craft-${key}-guard-bracelet`,name:`${jp}の守護腕輪`,category:'charm',accessoryKind:'defense',tier,gold:60*tier,output:{kind:'equipment',equipmentId:`${key}-guard-bracelet`,quantity:1},materials:{[ingot]:1},unlock:{type:'material',materialId:ingot}});
}
add({id:'craft-wolf-dagger',name:'狼牙の短剣',category:'weapon',tier:2,gold:350,output:{kind:'equipment',equipmentId:'wolf-dagger',quantity:1},materials:{copperIngot:1,'monster002-material':2},unlock:{type:'material',materialId:'monster002-material'}});
add({id:'craft-bat-bow',name:'夜翼の弓',category:'weapon',tier:2,gold:420,output:{kind:'equipment',equipmentId:'bat-bow',quantity:1},materials:{copperIngot:1,'monster003-material':2},unlock:{type:'material',materialId:'monster003-material'}});
add({id:'craft-wraith-staff',name:'霊魂の杖',category:'weapon',tier:3,gold:700,output:{kind:'equipment',equipmentId:'wraith-staff',quantity:1},materials:{ironIngot:1,'monster009-material':3},unlock:{type:'material',materialId:'monster009-material'}});
add({id:'craft-dragon-katana',name:'竜鱗の刀',category:'weapon',tier:4,gold:1400,output:{kind:'equipment',equipmentId:'dragon-katana',quantity:1},materials:{goldIngot:2,'monster010-rare':1},unlock:{type:'material',materialId:'monster010-rare'}});
add({id:'craft-golem-body',name:'岩巨人の鎧',category:'armor',tier:3,gold:800,output:{kind:'equipment',equipmentId:'golem-body',quantity:1},materials:{ironIngot:2,'monster008-material':3},unlock:{type:'material',materialId:'monster008-material'}});
add({id:'craft-golem-shield',name:'岩巨人の盾',category:'armor',tier:3,gold:650,output:{kind:'equipment',equipmentId:'golem-shield',quantity:1},materials:{ironIngot:1,'monster008-rare':1},unlock:{type:'material',materialId:'monster008-rare'}});
add({id:'craft-spirit-ring',name:'霊術の指輪',category:'ring',accessoryKind:'magic',tier:2,gold:450,output:{kind:'equipment',equipmentId:'spirit-ring',quantity:1},materials:{ironIngot:1,'monster009-material':2},unlock:{type:'material',materialId:'monster009-material'}});
add({id:'craft-arcane-necklace',name:'魔導のチャーム',category:'charm',accessoryKind:'magic',tier:3,gold:900,output:{kind:'equipment',equipmentId:'arcane-necklace',quantity:1},materials:{goldIngot:1,rareCore:1},unlock:{type:'material',materialId:'rareCore'}});
add({id:'craft-archmage-charm',name:'大魔導師のチャーム',category:'charm',accessoryKind:'magic',tier:5,gold:2400,output:{kind:'equipment',equipmentId:'archmage-charm',quantity:1},materials:{mythrilIngot:1,'monster089-rare':1},unlock:{type:'material',materialId:'monster089-rare'}});
add({id:'craft-wolf-anklet',name:'疾風の指輪',category:'ring',accessoryKind:'speed',tier:2,gold:400,output:{kind:'equipment',equipmentId:'wolf-anklet',quantity:1},materials:{ironIngot:1,'monster002-material':2},unlock:{type:'material',materialId:'monster002-material'}});
add({id:'craft-life-bangle',name:'生命のチャーム',category:'charm',accessoryKind:'hp',tier:2,gold:450,output:{kind:'equipment',equipmentId:'life-bangle',quantity:1},materials:{ironIngot:1,'monster005-material':2},unlock:{type:'material',materialId:'monster005-material'}});
// 2026-10-13 アーチャー／スナイパー装備
const JOB_RELEASE_AT=Date.parse('2026-10-12T15:00:00Z');
const jobGear=(r)=>add({...r,releaseAt:JOB_RELEASE_AT,releaseGroup:'archer-sniper-2026'});
jobGear({id:'craft-archer-hunter-bow',name:'狩人の弓',category:'weapon',tier:1,gold:180,output:{kind:'equipment',equipmentId:'archerHunterBow',quantity:1},materials:{copperIngot:1,'monster001-material':2},unlock:{type:'story'}});
jobGear({id:'craft-archer-iron-bow',name:'鉄弓',category:'weapon',tier:2,gold:420,output:{kind:'equipment',equipmentId:'archerIronBow',quantity:1},materials:{ironIngot:2},unlock:{type:'material',materialId:'ironIngot'}});
jobGear({id:'craft-archer-mythril-bow',name:'ミスリルボウ',category:'weapon',tier:5,gold:1800,output:{kind:'equipment',equipmentId:'archerMythrilBow',quantity:1},materials:{mythrilIngot:2,unionOre:1},unlock:{type:'material',materialId:'mythrilIngot'}});
jobGear({id:'craft-archer-star-bow',name:'星弓',category:'weapon',tier:6,gold:3600,output:{kind:'equipment',equipmentId:'archerStarBow',quantity:1},materials:{starIngot:2,lightCrystal:1},unlock:{type:'material',materialId:'starIngot'}});
for(const [id,name,equipmentId,slot,mats] of [
 ['hood','狩人のフード','archerHood','armor',{ironIngot:1,'monster001-material':2}],['light-armor','狩人の軽装','archerLightArmor','armor',{ironIngot:2,'monster001-material':2}],['gloves','狩人のグローブ','archerGloves','armor',{ironIngot:1,'monster001-material':2}],['belt','狩人のベルト','archerBelt','armor',{ironIngot:1,'monster001-material':1}],['boots','狩人のブーツ','archerBoots','armor',{ironIngot:1,'monster001-material':2}],['hawk-ring','鷹の指輪','archerHawkRing','ring',{ironIngot:1,unionOre:1}],['hunter-charm','狩人のチャーム','archerHunterCharm','charm',{ironIngot:1,lightCrystal:1}]
])jobGear({id:`craft-archer-${id}`,name,category:slot,tier:2,gold:500,output:{kind:'equipment',equipmentId,quantity:1},materials:mats,unlock:{type:'story'}});
for(const [id,name,equipmentId,category,mats] of [
 ['astra','天穿弓アストラ','sniperAstra','weapon',{starIngot:3,unionOre:3,lightCrystal:2,promiseOre:2}],
 ['hawk-hat','鷹眼の帽子','sniperHawkHat','armor',{mythrilIngot:2,unionOre:2,'monster089-rare':1}],
 ['battle-garb','必中の戦装束','sniperBattleGarb','armor',{mythrilIngot:3,lightCrystal:2,'monster089-rare':1}],
 ['bracers','神射の手甲','sniperBracers','armor',{mythrilIngot:2,unionOre:2,'monster089-rare':1}],
 ['belt','狙撃手の腰帯','sniperBelt','armor',{mythrilIngot:2,unionOre:1,lightCrystal:1}],
 ['boots','疾風のブーツ','sniperBoots','armor',{mythrilIngot:2,unionOre:1,lightCrystal:1}],
 ['ring','神射の指輪','sniperRing','ring',{starIngot:1,unionOre:2,lightCrystal:1}],
 ['star-charm','星穿ちのチャーム','sniperStarCharm','charm',{starIngot:1,lightCrystal:2,promiseOre:1}]
])jobGear({id:`craft-sniper-${id}`,name,category,tier:9,gold:9000,output:{kind:'equipment',equipmentId,quantity:1},materials:mats,unlock:{type:'material',materialId:'monster089-rare'}});

// 旧レシピIDは互換性のため維持
add({id:'ironSwordRecipe',name:'鉄の剣',category:'weapon',tier:2,gold:120,output:{kind:'equipment',equipmentId:'ironSword',quantity:1},materials:{ironIngot:2},unlock:{type:'material',materialId:'ironIngot'}});
add({id:'smallShieldRecipe',name:'小盾',category:'armor',tier:1,gold:100,output:{kind:'equipment',equipmentId:'smallShield',quantity:1},materials:{copperIngot:1},unlock:{type:'material',materialId:'copperIngot'}});
add({id:'leatherHeadRecipe',name:'革の帽子',category:'armor',tier:1,gold:80,output:{kind:'equipment',equipmentId:'leatherHead',quantity:1},materials:{'monster001-material':1},unlock:{type:'story'}});add({id:'leatherBodyRecipe',name:'革の服',category:'armor',tier:1,gold:140,output:{kind:'equipment',equipmentId:'leatherBody',quantity:1},materials:{'monster001-material':2},unlock:{type:'story'}});add({id:'leatherArmsRecipe',name:'革の腕当て',category:'armor',tier:1,gold:90,output:{kind:'equipment',equipmentId:'leatherArms',quantity:1},materials:{'monster001-material':1},unlock:{type:'story'}});add({id:'leatherLegsRecipe',name:'革の靴',category:'armor',tier:1,gold:90,output:{kind:'equipment',equipmentId:'leatherLegs',quantity:1},materials:{'monster001-material':1},unlock:{type:'story'}});add({id:'rareBladeRecipe',name:'伝説の剣',category:'weapon',tier:6,gold:5000,output:{kind:'equipment',equipmentId:'legendBlade',quantity:1},materials:{rareCore:1,starIngot:2},unlock:{type:'material',materialId:'rareCore'}});

const halloweenMaterials=['pumpkinShard','magicCandy','ghostCloth','moonCrystal'];
const halloweenTiers=[['i','I',1],['ii','II',2],['iii','III',3]];
const halloweenParts=[
 ['blade','パンプキンブレード','weapon'],['staff','幻月の杖','weapon'],['dagger','ゴーストダガー','weapon'],['fist','パンプキンナックル','weapon'],['bow','幻月の弓','weapon'],['instrument','幻月の竪琴','weapon'],
 ['ring','パンプキンリング','ring'],['charm','ゴーストチャーム','charm']
];
const halloweenWeaponParts=new Set(['blade','staff','dagger','fist','bow','instrument']);
for(const [tier,label,m] of halloweenTiers)for(const [part,name,category] of halloweenParts){
 const materials=halloweenWeaponParts.has(part)?{pumpkinShard:3*m,magicCandy:2*m}:part==='ring'?{pumpkinShard:2*m,moonCrystal:1*m}:part==='charm'?{ghostCloth:2*m,moonCrystal:1*m}:{ghostCloth:2*m,pumpkinShard:2*m,...(m>=2?{magicCandy:m}:{}),...(m>=3?{moonCrystal:2}:{})};
 add({id:`craft-halloween-${tier}-${part}`,name:`🎃 ${name} ${label}`,category,tier:6+m,gold:300*m,eventId:'halloween-2026',eventName:'幻月祭',eventStartsAt:Date.parse('2026-10-02T15:00:00Z'),eventEndsAt:Date.parse('2026-10-05T15:00:00Z'),output:{kind:'equipment',equipmentId:`halloween-${tier}-${part}`,quantity:1},materials,unlock:{type:'anyMaterial',materialIds:halloweenMaterials}});
}



// V58: 100 monster-material sets. Normal drops make weapon/body; rare drops make ring/charm.
for(const [index,enemy] of NORMAL_ENEMY_LIST.slice(0,101).entries()){
 const n=index+1,grade=Math.floor(index/10)+1,key=String(n).padStart(3,'0');
 const normalMaterial=enemy.materials?.normal,rareMaterial=enemy.materials?.rare;
 if(!normalMaterial||!rareMaterial)continue;
 const baseGold=90+grade*110;
 const addMonsterRecipe=(part,category,material,qty,gold)=>{
  const equipmentId=`monster-forge-${key}-${part}`,def=EQUIPMENT[equipmentId];
  add({id:`craft-${equipmentId}`,name:def.name,category,tier:grade,gold,materialGrade:grade,monsterMaterialRecipe:true,sourceMonsterId:enemy.id,output:{kind:'equipment',equipmentId,quantity:1},materials:{[material]:qty},unlock:{type:'material',materialId:material}});
 };
 addMonsterRecipe('weapon','weapon',normalMaterial,3,baseGold);
 addMonsterRecipe('body','armor',normalMaterial,3,baseGold);
 addMonsterRecipe('ring','ring',rareMaterial,1,baseGold+70);
 addMonsterRecipe('charm','charm',rareMaterial,1,baseGold+70);
}

// Craft fees are in base gold; craftingGoldCost applies the game's multipliers.
for(const monster of NEW_MONSTERS)for(const [part,gear] of Object.entries(monster.gear)){
 const equipmentId=newMonsterGearId(monster,part),category=part==='body'?'armor':part;
 const materials=Object.fromEntries(Object.entries(gear.mats).map(([kind,qty])=>[newMonsterMaterialId(monster,kind),qty]));
 add({id:`craft-${equipmentId}`,name:gear.name,category,tier:monster.materialGrade,gold:gear.gold,materialGrade:monster.materialGrade,monsterMaterialRecipe:true,sourceMonsterId:monster.id,output:{kind:'equipment',equipmentId,quantity:1},materials,unlock:{type:'anyMaterial',materialIds:Object.keys(materials)}});
}
export const RECIPES=R;

const endBands=[200,220,240,260,280,300];const endBandNames={200:'高級',220:'英雄',240:'伝説',260:'星界',280:'終焉',300:'約束'};const endMats=['memoryBark','blazeOre','nightRelic','thunderCrystal','riftShard','promiseOre'];
function endForgeMaterials(band,material,baseQty){const materials={[material]:baseQty};if(band>=260)materials.unionOre=band>=300?3:band>=280?2:1;if(band>=280)materials.lightCrystal=band>=300?2:1;return materials;}
for(const [i,band] of endBands.entries()){
 const material=endMats[Math.min(i,endMats.length-1)],cost=12000+i*9000;
 for(const type of types)add({id:`craft-end-${band}-forge-${type}`,name:`${endBandNames[band]}鍛造${wname[type]}`,category:'weapon',tier:10+i,gold:cost,output:{kind:'equipment',equipmentId:`end-${band}-forge-${type}`,quantity:1},materials:endForgeMaterials(band,material,4+i),unlock:{type:'material',materialId:material}});
 for(const [slot,label] of Object.entries(slots))add({id:`craft-end-${band}-forge-${slot}`,name:`${endBandNames[band]}鍛造${label}`,category:'armor',tier:10+i,gold:cost,output:{kind:'equipment',equipmentId:`end-${band}-forge-${slot}`,quantity:1},materials:endForgeMaterials(band,material,4+i),unlock:{type:'material',materialId:material}});
 for(const [group,names] of Object.entries(jobArmorRecipeNames))for(const [slot,label] of Object.entries(names))add({id:`craft-end-${band}-forge-${group}-${slot}`,name:`${endBandNames[band]}鍛造${label}`,category:'armor',tier:10+i,gold:cost,output:{kind:'equipment',equipmentId:`end-${band}-forge-${group}-${slot}`,quantity:1},materials:endForgeMaterials(band,material,4+i),unlock:{type:'material',materialId:material}});
 add({id:`craft-end-${band}-forge-ring`,name:`${endBandNames[band]}鍛造指輪`,category:'ring',tier:10+i,gold:cost,output:{kind:'equipment',equipmentId:`end-${band}-forge-ring`,quantity:1},materials:endForgeMaterials(band,material,3+i),unlock:{type:'material',materialId:material}});
 add({id:`craft-end-${band}-forge-charm`,name:`${endBandNames[band]}鍛造チャーム`,category:'charm',tier:10+i,gold:cost,output:{kind:'equipment',equipmentId:`end-${band}-forge-charm`,quantity:1},materials:endForgeMaterials(band,material,3+i),unlock:{type:'material',materialId:material}});
}

// Update 59: 幻月祭ジョブ別防具レシピ
const halloweenJobArmorGroups=['swordsman','mage','healer','thief','fighter','archer','bard'];
const halloweenJobArmorSlots=['head','body','arms','waist','legs'];
const halloweenJobArmorNames={
 swordsman:{head:'幻月騎士兜',body:'南瓜騎士鎧',arms:'幽夜の小手',waist:'幻月騎士の腰当て',legs:'月影の具足'},
 mage:{head:'魔月の帽子',body:'幻月魔導ローブ',arms:'星糖の手袋',waist:'魔月の腰帯',legs:'魔晶の靴'},
 healer:{head:'祈月のヴェール',body:'聖菓のローブ',arms:'月祈の手袋',waist:'祈月の腰帯',legs:'癒月の靴'},
 thief:{head:'幽影フード',body:'ゴーストジャケット',arms:'怪盗グローブ',waist:'幽影のベルト',legs:'月影ブーツ'},
 fighter:{head:'南瓜鉢巻',body:'幻月闘衣',arms:'キャンディ手甲',waist:'夜祭の武闘帯',legs:'夜祭脚絆'},
 archer:{head:'月狩り帽',body:'幻月狩装',arms:'星射ち手袋',waist:'月狩りのベルト',legs:'夜風ブーツ'},
 bard:{head:'月奏の羽帽子',body:'幻奏の衣',arms:'旋律の手袋',waist:'幻奏の腰飾り',legs:'舞月の靴'}
};
for(const [tier,label,m] of halloweenTiers)for(const group of halloweenJobArmorGroups)for(const slot of halloweenJobArmorSlots){
 const equipmentId=`halloween-${tier}-${group}-${slot}`;
 add({id:`craft-${equipmentId}`,name:`🎃 ${halloweenJobArmorNames[group][slot]} ${label}`,category:'armor',tier:6+m,gold:700*m,eventId:'halloween-2026',eventName:'幻月祭',eventStartsAt:Date.parse('2026-10-02T15:00:00Z'),eventEndsAt:Date.parse('2026-10-05T15:00:00Z'),output:{kind:'equipment',equipmentId,quantity:1},materials:{ghostCloth:2*m,pumpkinShard:2*m,...(m>=2?{magicCandy:m}:{}),...(m>=3?{moonCrystal:2}:{})},unlock:{type:'anyMaterial',materialIds:halloweenMaterials}});
}

// 五神の試練: レイド報酬生成・Lv100最強装備
const raidRecipe=(r)=>add({...r,eventId:'five-gods-raid',eventName:'五神の試練',eventStartsAt:Date.parse('2026-10-04T09:00:00Z'),unlock:{type:'story'}});
raidRecipe({id:'raid-refine-orichalcum',name:'💠 オリハルコン',category:'refine',tier:20,gold:0,output:{kind:'material',itemId:'orichalcum',quantity:1},materials:{orichalcumShard:5}});
raidRecipe({id:'raid-refine-orihal',name:'🔷 オリハル',category:'refine',tier:20,gold:0,output:{kind:'material',itemId:'orihal',quantity:1},materials:{orihalShard:5}});
for(const id of ['raid-eternalia','raid-astra-nova','raid-phantom-edge','raid-gaia-breaker','raid-artemis','raid-orpheus'])raidRecipe({id:`craft-${id}`,name:`👑 ${EQUIPMENT[id]?.name??id}`,category:'weapon',tier:20,gold:0,output:{kind:'equipment',equipmentId:id,quantity:1},materials:{orichalcum:2,orihal:2}});
for(const id of Object.keys(EQUIPMENT).filter(id=>/^raid-(swordsman|magic|fighter|thief|archer)-(head|body|arms|waist|legs)$/.test(id)))raidRecipe({id:`craft-${id}`,name:`👑 ${EQUIPMENT[id].name}`,category:'armor',tier:20,gold:0,output:{kind:'equipment',equipmentId:id,quantity:1},materials:{orihal:1}});
raidRecipe({id:'craft-raid-orichalcum-ring',name:'👑 神環オリハルコンリング',category:'ring',tier:20,gold:0,output:{kind:'equipment',equipmentId:'raid-orichalcum-ring',quantity:1},materials:{orichalcum:1}});
raidRecipe({id:'craft-raid-orihal-charm',name:'👑 星核のオリハルチャーム',category:'charm',tier:20,gold:0,output:{kind:'equipment',equipmentId:'raid-orihal-charm',quantity:1},materials:{orihal:1}});

// Compatibility materials are refined from actual slime drop IDs.
add({id:'refine-slime-shard',name:'旧・スライムの欠片 → スライム素材',category:'refine',gold:0,output:{kind:'material',itemId:'monster001-material',quantity:1},materials:{slimeShard:1},unlock:{type:'material',materialId:'slimeShard'}});
add({id:'refine-rare-core',name:'希少な魔核',category:'refine',gold:0,output:{kind:'material',itemId:'rareCore',quantity:1},materials:{'monster001-rare':1},unlock:{type:'material',materialId:'monster001-rare'}});

// Recipes appear when the corresponding special job is unlocked; starter pieces can be remade.
for(const d of Object.values(EQUIPMENT).filter(d=>d.specialJobGear&&!d.raidGear&&!d.legendJobGear)){
 const stage=d.id.split('-')[1],n=({novice:0,veteran:1,astral:2,celestial:3,eternal:4})[stage]??0;
 const mat=['ironIngot','mythrilIngot','starIngot','starIngot','orihal'][n];
 add({id:`craft-${d.id}`,name:d.name,category:d.slot==='accessory'?d.accessoryType:d.slot==='weapon'?'weapon':'armor',tier:[2,5,6,9,12][n],gold:[250,1000,3500,10000,25000][n],output:{kind:'equipment',equipmentId:d.id,quantity:1},materials:{[mat]:d.slot==='weapon'||d.slot==='body'?3:2},unlock:{type:'specialJob',jobId:d.specialJobGear}});
}

// Job-specific recipes preserve the ordinary raid material costs and unlock checks.
for(const d of Object.values(EQUIPMENT).filter(d=>d.specialJobGear&&(d.raidGear||d.legendJobGear))){
 const category=d.slot==='accessory'?d.accessoryType:d.slot==='weapon'?'weapon':'armor';
 const common={id:`craft-${d.id}`,name:d.name,category,tier:d.raidGear?20:9,output:{kind:'equipment',equipmentId:d.id,quantity:1},unlock:{type:'specialJob',jobId:d.specialJobGear}};
 if(d.raidGear){
  const materials=category==='weapon'?{orichalcum:2,orihal:2}:category==='ring'?{orichalcum:1}:{orihal:1};
  add({...common,gold:0,materials,eventId:'five-gods-raid',eventName:'五神の試練',eventStartsAt:Date.parse('2026-10-04T09:00:00Z')});
 }else add({...common,gold:category==='weapon'?5000:3000,materials:{starIngot:category==='weapon'||d.slot==='body'?3:2,rareCore:1}});
}

for(const [key,jp,ore,ingot,tier] of metals)for(const [type,label] of [['gunblade','銃剣'],['starGlobe','星天球']])add({id:`craft-${key}-${type}`,name:`${jp}の${label}`,category:'weapon',tier,gold:80*tier,output:{kind:'equipment',equipmentId:`${key}-${type}`,quantity:1},materials:{[ingot]:3},unlock:{type:'material',materialId:ingot}});



// V60: high-grade material refinement and job-exclusive equipment.
// Refining the material unlocks the corresponding equipment catalog.
for(const r of [
 {id:'refine-union-alloy',name:'ユニオン合金',tier:7,gold:180,output:{kind:'material',itemId:'unionAlloy',quantity:1},materials:{unionOre:3},unlock:{type:'material',materialId:'unionOre'}},
 {id:'refine-nova-core',name:'ノヴァコア',tier:8,gold:260,output:{kind:'material',itemId:'novaCore',quantity:1},materials:{lightCrystal:3},unlock:{type:'material',materialId:'lightCrystal'}},
 {id:'refine-blaze-alloy',name:'灼熱合金',tier:10,gold:420,output:{kind:'material',itemId:'blazeAlloy',quantity:1},materials:{blazeOre:3},unlock:{type:'material',materialId:'blazeOre'}},
 {id:'refine-thunder-alloy',name:'天雷合金',tier:12,gold:650,output:{kind:'material',itemId:'thunderAlloy',quantity:1},materials:{thunderCrystal:3},unlock:{type:'material',materialId:'thunderCrystal'}},
 {id:'refine-promise-alloy',name:'約束合金',tier:15,gold:1000,output:{kind:'material',itemId:'promiseAlloy',quantity:1},materials:{promiseOre:3},unlock:{type:'material',materialId:'promiseOre'}}
])add({...r,category:'refine'});
const HIGH_FORGE_RECIPE_TIERS=[
 {id:'union',materialId:'unionAlloy',tier:7,gold:3500},
 {id:'nova',materialId:'novaCore',tier:8,gold:6000},
 {id:'star',materialId:'starIngot',tier:9,gold:9500},
 {id:'blaze',materialId:'blazeAlloy',tier:10,gold:14500},
 {id:'thunder',materialId:'thunderAlloy',tier:12,gold:22000},
 {id:'promise',materialId:'promiseAlloy',tier:15,gold:34000}
];
const HIGH_FORGE_JOB_IDS=['swordsman','mage','thief','fighter','healer','archer','redMage','whiteMage','blackMage','darkKnight','pirateKing','sniper','paladin','bard','trickster','bishop','highWizard','gunbreaker','astrologian','berserker','dragoon','summoner'];
for(const tier of HIGH_FORGE_RECIPE_TIERS)for(const job of HIGH_FORGE_JOB_IDS)for(const part of ['weapon','body','ring','charm']){
 const equipmentId=`highforge-${tier.id}-${job}-${part}`,def=EQUIPMENT[equipmentId];
 const category=part==='body'?'armor':part;
 const quantity=part==='weapon'||part==='body'?3:2;
 add({id:`craft-${equipmentId}`,name:def?.name??equipmentId,category,tier:tier.tier,gold:tier.gold,highForgeRecipe:true,output:{kind:'equipment',equipmentId,quantity:1},materials:{[tier.materialId]:quantity},unlock:{type:'material',materialId:tier.materialId}});
}

add({id:'leatherWaistRecipe',name:'革の腰帯',category:'armor',tier:1,gold:90,output:{kind:'equipment',equipmentId:'leatherWaist',quantity:1},materials:{'monster001-material':1},unlock:{type:'story'}});

// Star-eclipse Halloween event: equipment recipes may be crafted after the event,
// but never before its actual opening. Receiving ingredients is handled separately.
const ECLIPSE_PARTS=[
 ...ECLIPSE_WEAPONS.map(w=>({part:w.id,category:'weapon'})),
 ...ECLIPSE_ARMOR.map(a=>({part:a.id,category:'armor'})),
 {part:'ring',category:'ring'},{part:'charm',category:'charm'}
];
for(const tier of ECLIPSE_TIERS)for(const {part,category} of ECLIPSE_PARTS){
 const equipmentId=`eclipse-${tier.id}-${part}`,def=EQUIPMENT[equipmentId];
 if(!def)throw new Error(`星蝕装備が見つかりません: ${equipmentId}`);
 const materials=eclipseRecipeMaterials(tier.id,part);
 add({id:`craft-${equipmentId}`,name:`🌘 ${def.name}`,category,tier:tier.id==='i'?7:12,gold:category==='weapon'?tier.gold:category==='armor'?Math.round(tier.gold*.75):Math.round(tier.gold*.6),eventId:ECLIPSE_EVENT.id,eventName:ECLIPSE_EVENT.name,eventStartsAt:ECLIPSE_EVENT.startsAt,eventEndsAt:ECLIPSE_EVENT.endsAt,output:{kind:'equipment',equipmentId,quantity:1},materials,unlock:{type:'anyMaterial',materialIds:Object.keys(ECLIPSE_MATERIALS)}});
}
