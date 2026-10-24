import { MASHO_ABYSS_WEAPONS,MASHO_ABYSS_SPELLBOOK } from './masho-abyss-weapons.js';
import { FESTIVAL_EQUIPMENT } from './hunt-festival.js';
import { MASHO_EQUIPMENT } from './masho-equipment.js';
import { SHIELDER_SHIELDS } from './shielder-equipment.js';
import { ECLIPSE_EQUIPMENT } from './eclipse-2026.js';
import { OATHBREAKER_DATA } from './oathbreakers.js';
import { NORMAL_ENEMY_LIST } from './enemies.js';
import { NEW_MONSTERS,newMonsterGearId } from './new-monsters.js';
export const WEAPON_TYPES=['oneHandSword','greatSword','dagger','fist','staff','greatStaff','spear','axe','bow','mace','dualBlades','katana','instrument','cards'];

// 装備属性耐性。新しい装備を E(...) で追加すれば、自動で最低1種類の耐性が付きます。
// 個別調整したい装備だけ extra.elementResist={fire:.10} のように上書きしてください。
const EQUIPMENT_RESIST_ELEMENTS=['fire','water','thunder','ice','light','dark'];
const EQUIPMENT_RESIST_KEYWORDS={
 fire:['イフリート','紅蓮','灼熱','煉獄','火炎','炎','火'],
 water:['クリュプス','深海','海流','蒼潮','潮','水'],
 thunder:['天雷','雷鳴','轟雷','雷'],
 ice:['フェンリル','白銀','氷海','凍','氷','雪'],
 light:['アニマ','聖光','聖','星界','星晶','星','天','約束','オリハル'],
 dark:['リッチ','深魔障','魔障','冥','幽','霊','闇','影','夜']
};
const stableResistanceElement=id=>EQUIPMENT_RESIST_ELEMENTS[[...String(id??'')].reduce((n,ch)=>n+ch.charCodeAt(0),0)%EQUIPMENT_RESIST_ELEMENTS.length];
function equipmentResistanceElement(id,name,extra={}){
 if(EQUIPMENT_RESIST_ELEMENTS.includes(extra.elementAffinity))return extra.elementAffinity;
 if(extra.sourceMonsterId){
  const source=NORMAL_ENEMY_LIST.find(x=>x.id===extra.sourceMonsterId);
  if(EQUIPMENT_RESIST_ELEMENTS.includes(source?.element))return source.element;
 }
 const text=`${id??''} ${name??''}`;
 for(const element of EQUIPMENT_RESIST_ELEMENTS)if((EQUIPMENT_RESIST_KEYWORDS[element]??[]).some(word=>text.includes(word)))return element;
 return stableResistanceElement(id);
}
function equipmentResistanceValue(slot,extra={}){
 // 9部位を同属性で固めても極端になりすぎないよう、1部位あたりは小さめに設定。
 let pct=slot==='shield'?3:slot==='body'?3:slot==='accessory'?2:slot==='weapon'?1:2;
 pct+=Math.min(2,Math.floor(Math.max(1,Number(extra.requiredLevel??1))/100));
 pct+=({epic:1,legendary:2})[extra.rarity]??0;
 if(extra.raidGear)pct+=1;
 if(extra.mashoGear)pct+=1;
 if(extra.endgameQuality==='forge')pct+=1;
 return Math.min(10,pct);
}
function equipmentElementResist(id,name,slot,extra={}){
 if(extra.elementResist&&typeof extra.elementResist==='object')return extra.elementResist;
 const element=equipmentResistanceElement(id,name,extra),pct=equipmentResistanceValue(slot,extra);
 return {[element]:pct/100};
}
const E=(id,name,slot,extra={})=>({id,name,slot,rarity:'common',requiredLevel:1,elementResist:equipmentElementResist(id,name,slot,extra),...extra});
export const EQUIPMENT={
 ironSword:E('ironSword','鉄の剣','weapon',{weaponType:'oneHandSword',attack:11}),noviceStaff:E('noviceStaff','見習いの杖','weapon',{weaponType:'staff',magic:8}),bronzeDagger:E('bronzeDagger','青銅の短剣','weapon',{weaponType:'dagger',attack:8,speed:2}),trainingFist:E('trainingFist','修練のナックル','weapon',{weaponType:'fist',attack:9}),oakMace:E('oakMace','樫のメイス','weapon',{weaponType:'mace',attack:3,magic:6}),hunterBow:E('hunterBow','狩人の弓','weapon',{weaponType:'bow',attack:5}),greatSword:E('greatSword','大剣','weapon',{weaponType:'greatSword',twoHanded:true,attack:10}),legendBlade:E('legendBlade','伝説の剣','weapon',{weaponType:'oneHandSword',requiredLevel:50,rarity:'legendary',attack:50}),cards:E('cards','旅人のカード','weapon',{weaponType:'cards',magic:3}),smallShield:E('smallShield','小盾','shield',{shieldSize:'small',defense:3}),towerShield:E('towerShield','大盾','shield',{shieldSize:'large',defense:6}),travelerCharm:E('travelerCharm','旅人のチャーム','accessory',{accessoryType:'charm',unique:true,maxHp:10}),heroLegendSword:E('heroLegendSword','勇者の伝説剣','weapon',{weaponType:'oneHandSword',requiredLevel:190,rarity:'legendary',dedicatedLegendary:true,attack:100}),leatherHead:E('leatherHead','革の帽子','head',{defense:1}),leatherBody:E('leatherBody','革の服','body',{defense:2}),leatherArms:E('leatherArms','革の腕当て','arms',{defense:1}),leatherWaist:E('leatherWaist','革の腰帯','waist',{defense:1}),leatherLegs:E('leatherLegs','革の靴','legs',{defense:1})
};
export const LEGENDARY_EQUIPMENT_BY_CHARACTER=Object.freeze({hero:'heroLegendSword',mira:'miraLegendStaff',ren:'renLegendDagger',sora:'soraLegendMace',gald:'galdLegendFist',luna:'lunaLegendStaff',kai:'kaiLegendSword',noa:'noaLegendDagger'});
const CHARACTER_LEGENDS=[
 ['hero','heroLegendSword','勇者の伝説剣','oneHandSword',{attack:100}],
 ['mira','miraLegendStaff','星詠みの伝説杖','staff',{magic:100}],
 ['ren','renLegendDagger','幻影の伝説短剣','dagger',{attack:100}],
 ['sora','soraLegendMace','癒光の伝説メイス','mace',{magic:100}],
 ['gald','galdLegendFist','流星の伝説拳','fist',{attack:100}],
 ['luna','lunaLegendStaff','月影の伝説杖','staff',{magic:100}],
 ['kai','kaiLegendSword','守護の伝説剣','oneHandSword',{attack:100}],
 ['noa','noaLegendDagger','幸運の伝説短剣','dagger',{attack:100}]
];
for(const [ownerCharacterId,id,name,weaponType,stats] of CHARACTER_LEGENDS)EQUIPMENT[id]=E(id,name,'weapon',{weaponType,requiredLevel:100,rarity:'legendary',dedicatedLegendary:true,ownerCharacterId,...stats});
const metals=[['copper','銅',1],['iron','鉄',2],['gold','金',3],['platinum','プラチナ',4],['mythril','ミスリル',5],['star','星晶',6]];
const weaponNames={oneHandSword:'剣',greatSword:'大剣',dagger:'短剣',fist:'ナックル',staff:'杖',greatStaff:'大杖',spear:'槍',axe:'斧',bow:'弓',mace:'メイス',dualBlades:'双剣',katana:'刀',instrument:'楽器',cards:'カード'};
const magicTypes=new Set(['staff','greatStaff','instrument','cards']);
for(const [key,jp,tier] of metals)for(const type of WEAPON_TYPES){const id=`${key}-${type}`;const power=3+tier*4;EQUIPMENT[id]=E(id,`${jp}の${weaponNames[type]}`,'weapon',{weaponType:type,...(magicTypes.has(type)?{magic:power}:{attack:power}),...(type==='dagger'||type==='dualBlades'?{speed:tier}:{}),...(type==='dualBlades'?{allowedJobs:['thief']}:{}) ,...(type==='greatSword'?{twoHanded:true}:{}),requiredLevel:Math.max(1,(tier-1)*15)});}
const armorNames={shield:'盾',head:'兜',body:'鎧',arms:'小手',waist:'腰当て',legs:'具足'};
const JOB_ARMOR_NAMES={
 magic:{head:'魔導帽',body:'魔導ローブ',arms:'魔導手袋',waist:'魔導腰帯',legs:'魔導靴'},
 thief:{head:'影フード',body:'盗賊服',arms:'盗賊手袋',waist:'盗賊の腰帯',legs:'盗賊ブーツ'},
 fighter:{head:'武闘鉢巻',body:'武闘着',arms:'手甲',waist:'武闘帯',legs:'脚絆'},
 archer:{head:'狩人帽',body:'狩人服',arms:'弓手手袋',waist:'狩人の腰帯',legs:'狩人ブーツ'}
};
for(const [key,jp,tier] of metals){
 for(const [slot,label] of Object.entries(armorNames)){const id=`${key}-${slot}`;EQUIPMENT[id]=E(id,`${jp}の${label}`,slot,{defense:2+tier*3,requiredLevel:Math.max(1,(tier-1)*15),armorGroup:'swordsman',...(slot==='legs'?{speed:Math.floor(tier/2)}:{})});}
 for(const [group,names] of Object.entries(JOB_ARMOR_NAMES))for(const [slot,label] of Object.entries(names)){
   const id=`${key}-${group}-${slot}`,base=2+tier*3,extra=group==='magic'?{magic:Math.ceil(tier/2),maxMp:tier*2}:group==='thief'?{speed:Math.ceil(tier/2)}:group==='fighter'?{attack:Math.ceil(tier/2),maxHp:tier*3}:{speed:Math.floor((tier+1)/2)};
   const defense=Math.max(1,base-(group==='magic'?2:group==='thief'||group==='archer'?1:0));
   EQUIPMENT[id]=E(id,`${jp}の${label}`,slot,{defense,requiredLevel:Math.max(1,(tier-1)*15),armorGroup:group,...extra});
 }
}
for(const [key,jp,tier] of metals){EQUIPMENT[`${key}-attack-ring`]=E(`${key}-attack-ring`,`${jp}の攻撃指輪`,'accessory',{accessoryType:'ring',attack:1+tier*2,requiredLevel:Math.max(1,(tier-1)*15)});EQUIPMENT[`${key}-guard-bracelet`]=E(`${key}-guard-bracelet`,`${jp}の守護チャーム`,'accessory',{accessoryType:'charm',defense:1+tier*2,requiredLevel:Math.max(1,(tier-1)*15)});}
EQUIPMENT['wolf-dagger']=E('wolf-dagger','狼牙の短剣','weapon',{weaponType:'dagger',attack:10,speed:4});EQUIPMENT['bat-bow']=E('bat-bow','夜翼の弓','weapon',{weaponType:'bow',attack:12,speed:2});EQUIPMENT['wraith-staff']=E('wraith-staff','霊魂の杖','weapon',{weaponType:'staff',magic:15});EQUIPMENT['dragon-katana']=E('dragon-katana','竜鱗の刀','weapon',{weaponType:'katana',attack:24});EQUIPMENT['golem-body']=E('golem-body','岩巨人の鎧','body',{defense:18});EQUIPMENT['golem-shield']=E('golem-shield','岩巨人の盾','shield',{shieldSize:'large',defense:14});
EQUIPMENT['spirit-ring']=E('spirit-ring','霊術の指輪','accessory',{accessoryType:'ring',magic:6});EQUIPMENT['arcane-necklace']=E('arcane-necklace','魔導のチャーム','accessory',{accessoryType:'charm',magic:10,maxMp:10});EQUIPMENT['archmage-charm']=E('archmage-charm','大魔導師のチャーム','accessory',{accessoryType:'charm',magic:15,maxMp:20});EQUIPMENT['wolf-anklet']=E('wolf-anklet','疾風の指輪','accessory',{accessoryType:'ring',speed:6});EQUIPMENT['life-bangle']=E('life-bangle','生命のチャーム','accessory',{accessoryType:'charm',maxHp:40});


// V58: monster-material forge catalog. Every normal monster contributes one full four-piece set.
// Monster-material equipment uses lore-style names instead of raw enemy tier labels such as "ゴーレム・4".
// The first word reflects the region/grade, while the second half expresses each monster family's motif.
const MONSTER_GEAR_EPITHETS=['翠風','森影','蒼潮','黒晶','白銀','黄昏','瘴月','紅蓮','古代','深淵'];
const MONSTER_GEAR_FAMILIES=[
 {weaponType:'mace',weapon:'粘晶メイス',body:'流晶鎧',ring:'粘晶指輪',charm:'生命雫チャーム'},
 {weaponType:'dagger',weapon:'狼牙短剣',body:'月狼軽鎧',ring:'狼牙指輪',charm:'月影チャーム'},
 {weaponType:'bow',weapon:'夜翼弓',body:'夜翼装束',ring:'宵影指輪',charm:'夜翔チャーム'},
 {weaponType:'oneHandSword',weapon:'戦鬼剣',body:'戦鬼鎧',ring:'鬼牙指輪',charm:'戦鬼チャーム'},
 {weaponType:'spear',weapon:'猛牙槍',body:'猛牙重鎧',ring:'猛牙指輪',charm:'猛進チャーム'},
 {weaponType:'dualBlades',weapon:'毒針双剣',body:'毒蜂装甲',ring:'毒針指輪',charm:'蜂王チャーム'},
 {weaponType:'axe',weapon:'硬鱗斧',body:'硬鱗鎧',ring:'鱗牙指輪',charm:'古鱗チャーム'},
 {weaponType:'fist',weapon:'岩砕拳',body:'巨岩鎧',ring:'岩核指輪',charm:'守岩チャーム'},
 {weaponType:'staff',weapon:'幽魂杖',body:'幽冥法衣',ring:'幽魂指輪',charm:'冥護チャーム'},
 {weaponType:'katana',weapon:'竜牙刀',body:'竜鱗鎧',ring:'竜血指輪',charm:'竜心チャーム'}
];
const monsterGearName=(grade,family,part)=>`${MONSTER_GEAR_EPITHETS[Math.max(0,Math.min(MONSTER_GEAR_EPITHETS.length-1,grade-1))]}の${MONSTER_GEAR_FAMILIES[family][part]}`;
const monsterRarity=grade=>grade>=9?'legendary':grade>=6?'epic':grade>=3?'rare':'common';
const monsterRequiredLevel=grade=>1+(grade-1)*10;
for(const [index,enemy] of NORMAL_ENEMY_LIST.slice(0,101).entries()){
 const n=index+1,grade=Math.floor(index/10)+1,key=String(n).padStart(3,'0'),family=index%10;
 const familyGear=MONSTER_GEAR_FAMILIES[family],weaponType=familyGear.weaponType;
 const magicWeapon=magicTypes.has(weaponType),requiredLevel=monsterRequiredLevel(grade),rarity=monsterRarity(grade);
 const weaponPower=6+grade*6,armorDefense=6+grade*5,ringPower=2+grade*2,charmDefense=3+grade*2;
 const base={requiredLevel,rarity,materialGrade:grade,sourceMonsterId:enemy.id,monsterMaterialGear:true};
 const weaponExtra={...base,weaponType,...(magicWeapon?{magic:weaponPower}:{attack:weaponPower}),...(weaponType==='dagger'||weaponType==='dualBlades'?{speed:Math.ceil(grade/3)}:{}),...(weaponType==='greatSword'?{twoHanded:true}:{})};
 EQUIPMENT[`monster-forge-${key}-weapon`]=E(`monster-forge-${key}-weapon`,monsterGearName(grade,family,'weapon'),'weapon',weaponExtra);
 EQUIPMENT[`monster-forge-${key}-body`]=E(`monster-forge-${key}-body`,monsterGearName(grade,family,'body'),'body',{...base,defense:armorDefense,maxHp:grade*6});
 EQUIPMENT[`monster-forge-${key}-ring`]=E(`monster-forge-${key}-ring`,monsterGearName(grade,family,'ring'),'accessory',{...base,accessoryType:'ring',...(magicWeapon?{magic:ringPower}:{attack:ringPower}),speed:Math.ceil(grade/4)});
 EQUIPMENT[`monster-forge-${key}-charm`]=E(`monster-forge-${key}-charm`,monsterGearName(grade,family,'charm'),'accessory',{...base,accessoryType:'charm',defense:charmDefense,maxHp:10+grade*8,maxMp:grade*3});
}

// New normal-monster craft equipment: data-only, no additional equipment images.
for(const monster of NEW_MONSTERS)for(const [part,gear] of Object.entries(monster.gear)){
 const id=newMonsterGearId(monster,part),slot=part==='ring'||part==='charm'?'accessory':part==='body'?'body':'weapon';
 EQUIPMENT[id]=E(id,gear.name,slot,{requiredLevel:monster.requiredLevel,rarity:monster.rarity,sourceMonsterId:monster.id,monsterMaterialGear:true,fixedRequiredJobLevel:true,materialGrade:monster.materialGrade,...(slot==='accessory'?{accessoryType:part}:{}),...(gear.weaponType?{weaponType:gear.weaponType}:{}),...gear.stats,...(gear.elementResist?{elementResist:gear.elementResist}:{})});
}
EQUIPMENT['promise-memory']=E('promise-memory','約束の思い出','accessory',{accessoryType:'ring',unique:true,rarity:'legendary',requiredLevel:80,maxHp:50,maxMp:20,attack:8,magic:8});
EQUIPMENT['ranking-apology-star-ring']=E('ranking-apology-star-ring','星晶の指輪','accessory',{accessoryType:'ring',unique:true,rarity:'legendary',requiredLevel:1,attack:10,defense:10,magic:10,speed:10});

// アーチャー／スナイパー専用装備（2026-10-13解放）
Object.assign(EQUIPMENT,{
 archerHunterBow:E('archerHunterBow','狩人の弓','weapon',{weaponType:'bow',attack:8,speed:1,allowedJobs:['archer','sniper']}),
 archerIronBow:E('archerIronBow','鉄弓','weapon',{weaponType:'bow',attack:14,speed:1,requiredLevel:15,allowedJobs:['archer','sniper']}),
 archerMythrilBow:E('archerMythrilBow','ミスリルボウ','weapon',{weaponType:'bow',attack:28,speed:3,requiredLevel:40,rarity:'rare',allowedJobs:['archer','sniper']}),
 archerStarBow:E('archerStarBow','星弓','weapon',{weaponType:'bow',attack:42,speed:4,requiredLevel:65,rarity:'rare',allowedJobs:['archer','sniper']}),
 archerHood:E('archerHood','狩人のフード','head',{defense:5,speed:2,requiredLevel:10,allowedJobs:['archer','sniper']}),
 archerLightArmor:E('archerLightArmor','狩人の軽装','body',{defense:10,speed:2,requiredLevel:10,allowedJobs:['archer','sniper']}),
 archerGloves:E('archerGloves','狩人のグローブ','arms',{defense:5,attack:3,requiredLevel:10,allowedJobs:['archer','sniper']}),
 archerBelt:E('archerBelt','狩人のベルト','waist',{defense:5,speed:2,requiredLevel:10,allowedJobs:['archer','sniper']}),
 archerBoots:E('archerBoots','狩人のブーツ','legs',{defense:5,speed:3,requiredLevel:10,allowedJobs:['archer','sniper']}),
 archerHawkRing:E('archerHawkRing','鷹の指輪','accessory',{accessoryType:'ring',attack:5,speed:2,requiredLevel:20,allowedJobs:['archer','sniper']}),
 archerHunterCharm:E('archerHunterCharm','狩人のチャーム','accessory',{accessoryType:'charm',defense:4,maxHp:20,requiredLevel:20,allowedJobs:['archer','sniper']}),
 sniperAstra:E('sniperAstra','天穿弓アストラ','weapon',{weaponType:'bow',attack:82,speed:6,requiredLevel:90,rarity:'legendary',allowedJobs:['sniper']}),
 sniperHawkHat:E('sniperHawkHat','鷹眼の帽子','head',{defense:22,speed:6,requiredLevel:80,rarity:'rare',allowedJobs:['sniper']}),
 sniperBattleGarb:E('sniperBattleGarb','必中の戦装束','body',{defense:30,speed:5,requiredLevel:80,rarity:'rare',allowedJobs:['sniper']}),
 sniperBracers:E('sniperBracers','神射の手甲','arms',{defense:20,attack:8,requiredLevel:80,rarity:'rare',allowedJobs:['sniper']}),
 sniperBelt:E('sniperBelt','狙撃手の腰帯','waist',{defense:18,speed:5,requiredLevel:80,rarity:'rare',allowedJobs:['sniper']}),
 sniperBoots:E('sniperBoots','疾風のブーツ','legs',{defense:20,speed:8,requiredLevel:80,rarity:'rare',allowedJobs:['sniper']}),
 sniperRing:E('sniperRing','神射の指輪','accessory',{accessoryType:'ring',attack:14,speed:4,requiredLevel:85,rarity:'rare',allowedJobs:['sniper']}),
 sniperStarCharm:E('sniperStarCharm','星穿ちのチャーム','accessory',{accessoryType:'charm',defense:12,maxHp:70,maxMp:20,requiredLevel:85,rarity:'rare',allowedJobs:['sniper']})
});

export function createEquipmentInstance(equipmentId,instanceId=`eq-${crypto.randomUUID?.()??Math.random().toString(36).slice(2)}`){return {instanceId,equipmentId,enhanceLevel:0,trueEvolved:false};}

// 真ED後装備。必要LvはキャラクターLvではなく職業Lvとして判定される。
const ENDGAME_BANDS=[200,220,240,260,280,300];
const ENDGAME_NAMES={200:'高級',220:'英雄',240:'伝説',260:'星界',280:'終焉',300:'約束'};
const ENDGAME_JOB_REQ={200:100,220:110,240:120,260:130,280:140,300:150};
for(const [bi,band] of ENDGAME_BANDS.entries()){
 const req=ENDGAME_JOB_REQ[band],base=58+bi*18;
 for(const type of WEAPON_TYPES){const magic=magicTypes.has(type);for(const quality of ['shop','forge']){const q=quality==='forge'?1.18:1,id=`end-${band}-${quality}-${type}`,power=Math.round(base*q);EQUIPMENT[id]=E(id,`${ENDGAME_NAMES[band]}${quality==='forge'?'鍛造':''}の${weaponNames[type]}`,'weapon',{weaponType:type,requiredLevel:req,endgameBand:band,endgameQuality:quality,rarity:bi>=4?'legendary':'rare',...(magic?{magic:power}:{attack:power}),...(type==='greatSword'?{twoHanded:true}:{})});}}
 for(const slot of ['shield','head','body','arms','waist','legs'])for(const quality of ['shop','forge']){const q=quality==='forge'?1.18:1,id=`end-${band}-${quality}-${slot}`;EQUIPMENT[id]=E(id,`${ENDGAME_NAMES[band]}${quality==='forge'?'鍛造':''}の${armorNames[slot]}`,slot,{requiredLevel:req,endgameBand:band,endgameQuality:quality,defense:Math.round((40+bi*14)*q),armorGroup:'swordsman',...(slot==='shield'?{shieldSize:'large'}:{})});}
 for(const [group,names] of Object.entries(JOB_ARMOR_NAMES))for(const [slot,label] of Object.entries(names))for(const quality of ['shop','forge']){
   const q=quality==='forge'?1.18:1,id=`end-${band}-${quality}-${group}-${slot}`,baseDefense=40+bi*14;
   const extra=group==='magic'?{magic:Math.round((10+bi*4)*q),maxMp:Math.round((20+bi*8)*q)}:group==='thief'?{speed:Math.round((5+bi*2)*q)}:group==='fighter'?{attack:Math.round((8+bi*3)*q),maxHp:Math.round((60+bi*25)*q)}:{speed:Math.round((4+bi*2)*q)};
   const defense=Math.round((baseDefense-(group==='magic'?8:group==='thief'||group==='archer'?5:0))*q);
   EQUIPMENT[id]=E(id,`${ENDGAME_NAMES[band]}${quality==='forge'?'鍛造':''}の${label}`,slot,{requiredLevel:req,endgameBand:band,endgameQuality:quality,rarity:bi>=4?'legendary':'rare',defense,armorGroup:group,...extra});
 }
 for(const quality of ['shop','forge']){const q=quality==='forge'?1.18:1;EQUIPMENT[`end-${band}-${quality}-ring`]=E(`end-${band}-${quality}-ring`,`${ENDGAME_NAMES[band]}${quality==='forge'?'鍛造':''}の指輪`,'accessory',{accessoryType:'ring',requiredLevel:req,endgameBand:band,endgameQuality:quality,attack:Math.round((12+bi*5)*q),magic:Math.round((12+bi*5)*q)});EQUIPMENT[`end-${band}-${quality}-charm`]=E(`end-${band}-${quality}-charm`,`${ENDGAME_NAMES[band]}${quality==='forge'?'鍛造':''}のチャーム`,'accessory',{accessoryType:'charm',requiredLevel:req,endgameBand:band,endgameQuality:quality,defense:Math.round((14+bi*5)*q),maxHp:Math.round((80+bi*45)*q),maxMp:Math.round((30+bi*15)*q)});}
}


// 2026ハロウィン限定装備。必要LvはキャラクターLvではなく職業Lv。
const HALLOWEEN_TIERS=[
 ['i','I',30,{weapon:15,armor:10,ring:5,charm:5,hp:20,mp:8}],
 ['ii','II',100,{weapon:45,armor:28,ring:10,charm:12,hp:60,mp:20}],
 ['iii','III',200,{weapon:90,armor:52,ring:20,charm:24,hp:140,mp:45}]
];
for(const [key,label,requiredLevel,p] of HALLOWEEN_TIERS){
 const eventSpeed=key==='iii'?4:key==='ii'?2:1;
 EQUIPMENT[`halloween-${key}-blade`]=E(`halloween-${key}-blade`,`🎃 パンプキンブレード ${label}`,'weapon',{weaponType:'oneHandSword',requiredLevel,rarity:'rare',attack:p.weapon,eventLimited:true,eventJobGroup:'swordsman'});
 EQUIPMENT[`halloween-${key}-staff`]=E(`halloween-${key}-staff`,`🌙 幻月の杖 ${label}`,'weapon',{weaponType:'staff',requiredLevel,rarity:'rare',magic:p.weapon,eventLimited:true,eventJobGroup:'mage'});
 EQUIPMENT[`halloween-${key}-dagger`]=E(`halloween-${key}-dagger`,`👻 ゴーストダガー ${label}`,'weapon',{weaponType:'dagger',requiredLevel,rarity:'rare',attack:p.weapon,speed:eventSpeed,eventLimited:true,eventJobGroup:'thief'});
 EQUIPMENT[`halloween-${key}-fist`]=E(`halloween-${key}-fist`,`🎃 パンプキンナックル ${label}`,'weapon',{weaponType:'fist',requiredLevel,rarity:'rare',attack:p.weapon,eventLimited:true,eventJobGroup:'fighter'});
 EQUIPMENT[`halloween-${key}-bow`]=E(`halloween-${key}-bow`,`🌙 幻月の弓 ${label}`,'weapon',{weaponType:'bow',requiredLevel,rarity:'rare',attack:p.weapon,speed:eventSpeed,eventLimited:true,eventJobGroup:'archer'});
 EQUIPMENT[`halloween-${key}-instrument`]=E(`halloween-${key}-instrument`,`🎵 幻月の竪琴 ${label}`,'weapon',{weaponType:'instrument',requiredLevel,rarity:'rare',magic:p.weapon,speed:eventSpeed,eventLimited:true,eventJobGroup:'bard'});
 EQUIPMENT[`halloween-${key}-spellbook`]=E(`halloween-${key}-spellbook`,`🌙 幻月の召喚魔本 ${label}`,'spellbook',{weaponType:'spellbook',allowedJobs:['summoner'],requiredLevel,rarity:'rare',magic:Math.round(p.weapon*.8),maxMp:p.mp*3,eventLimited:true,eventJobGroup:'summoner'});
 EQUIPMENT[`halloween-${key}-head`]=E(`halloween-${key}-head`,`👻 ゴーストハット ${label}`,'head',{requiredLevel,rarity:'rare',defense:p.armor,eventLimited:true});
 EQUIPMENT[`halloween-${key}-body`]=E(`halloween-${key}-body`,`🎃 パンプキンコート ${label}`,'body',{requiredLevel,rarity:'rare',defense:p.armor+2,eventLimited:true});
 EQUIPMENT[`halloween-${key}-arms`]=E(`halloween-${key}-arms`,`🍬 キャンディグローブ ${label}`,'arms',{requiredLevel,rarity:'rare',defense:p.armor,eventLimited:true});
 EQUIPMENT[`halloween-${key}-legs`]=E(`halloween-${key}-legs`,`🌙 幻月のブーツ ${label}`,'legs',{requiredLevel,rarity:'rare',defense:p.armor,speed:key==='iii'?4:key==='ii'?2:1,eventLimited:true});
 EQUIPMENT[`halloween-${key}-ring`]=E(`halloween-${key}-ring`,`🎃 パンプキンリング ${label}`,'accessory',{accessoryType:'ring',requiredLevel,rarity:'rare',attack:p.ring,magic:p.ring,eventLimited:true});
 EQUIPMENT[`halloween-${key}-charm`]=E(`halloween-${key}-charm`,`👻 ゴーストチャーム ${label}`,'accessory',{accessoryType:'charm',requiredLevel,rarity:'rare',defense:p.charm,maxHp:p.hp,maxMp:p.mp,eventLimited:true});
}

for(const [i,o] of OATHBREAKER_DATA.entries()){const type=i%2===0?'ring':'charm';EQUIPMENT[`oathgear-${o.id}`]=E(`oathgear-${o.id}`,`${o.name}の${type==='ring'?'背約指輪':'背約チャーム'}`,'accessory',{accessoryType:type,requiredLevel:150,rarity:'legendary',endgameBand:250,endgameQuality:'boss',unique:true,attack:type==='ring'?34+i*2:0,magic:type==='ring'?30+i*2:0,defense:type==='charm'?32+i*2:0,maxHp:type==='charm'?180+i*15:0,speed:Math.floor(i/3),specialEffect:o.style});}

// Update 59: 幻月祭・ジョブ別防具。イベント装備はすべて+5が最大。
const HALLOWEEN_JOB_ARMOR={
 swordsman:{label:'剣士',jobs:['swordsman','redMage','darkKnight','paladin'],names:{head:'幻月騎士兜',body:'南瓜騎士鎧',arms:'幽夜の小手',waist:'幻月騎士の腰当て',legs:'月影の具足'},extra:(m)=>({defense:m*3})},
 mage:{label:'魔法使い',jobs:['mage','redMage','whiteMage','blackMage','highWizard'],names:{head:'魔月の帽子',body:'幻月魔導ローブ',arms:'星糖の手袋',waist:'魔月の腰帯',legs:'魔晶の靴'},extra:(m)=>({magic:m*3,maxMp:m*5})},
 healer:{label:'ヒーラー',jobs:['healer','whiteMage','bishop'],names:{head:'祈月のヴェール',body:'聖菓のローブ',arms:'月祈の手袋',waist:'祈月の腰帯',legs:'癒月の靴'},extra:(m)=>({magic:m*2,defense:m,maxMp:m*4})},
 thief:{label:'盗賊',jobs:['thief','pirateKing','trickster','bard'],names:{head:'幽影フード',body:'ゴーストジャケット',arms:'怪盗グローブ',waist:'幽影のベルト',legs:'月影ブーツ'},extra:(m)=>({speed:m*2,attack:m})},
 fighter:{label:'格闘家',jobs:['fighter','darkKnight','pirateKing','berserker'],names:{head:'南瓜鉢巻',body:'幻月闘衣',arms:'キャンディ手甲',waist:'夜祭の武闘帯',legs:'夜祭脚絆'},extra:(m)=>({attack:m*2,maxHp:m*8})},
 archer:{label:'アーチャー',jobs:['archer','sniper','bard'],names:{head:'月狩り帽',body:'幻月狩装',arms:'星射ち手袋',waist:'月狩りのベルト',legs:'夜風ブーツ'},extra:(m)=>({attack:m,speed:m*2})},
 bard:{label:'吟遊詩人',jobs:['bard'],names:{head:'月奏の羽帽子',body:'幻奏の衣',arms:'旋律の手袋',waist:'幻奏の腰飾り',legs:'舞月の靴'},extra:(m)=>({magic:m*2,speed:m*2,maxMp:m*3})}
};
for(const [tier,label,m] of [['i','I',1],['ii','II',2],['iii','III',3]])for(const [group,cfg] of Object.entries(HALLOWEEN_JOB_ARMOR))for(const slot of ['head','body','arms','waist','legs']){
 const id=`halloween-${tier}-${group}-${slot}`,base=6+m*4+(slot==='body'?2:0);
 EQUIPMENT[id]=E(id,`🎃 ${cfg.names[slot]} ${label}`,slot,{requiredLevel:m===1?1:m===2?15:30,rarity:'rare',defense:base,eventLimited:true,eventJobGroup:group,allowedJobs:cfg.jobs,...cfg.extra(m)});
}

// 五神の試練: 強化段階で必要Lvが上昇するイベント装備
const raidE=(id,name,slot,extra={})=>EQUIPMENT[id]=E(id,name,slot,{requiredLevel:100,rarity:'legendary',raidGear:true,eventLimited:true,...extra});
for(const [id,name,type,stats] of [
 ['raid-eternalia','約束の聖剣エターナリア','oneHandSword',{attack:145,defense:18}],['raid-astra-nova','星界杖アストラ・ノヴァ','staff',{magic:155,maxMp:35}],['raid-phantom-edge','幻影刃ファントムエッジ','dagger',{attack:125,speed:32}],['raid-gaia-breaker','神拳ガイアブレイカー','fist',{attack:150,maxHp:60}],['raid-artemis','天弓アルテミス','bow',{attack:132,speed:28}],['raid-orpheus','神奏器オルフェウス','instrument',{magic:138,speed:22}]
])raidE(id,name,'weapon',{weaponType:type,noEnhance:true,...stats});
const raidSets={
 swordsman:['神鋼',{defense:58,attack:12,maxHp:45}],magic:['星詠',{defense:40,magic:18,maxMp:35}],fighter:['闘神',{defense:45,attack:16,speed:8,maxHp:50}],thief:['幻影',{defense:42,attack:10,speed:18}],archer:['幻影',{defense:42,attack:10,speed:18}]
};
const raidSlots={head:'兜',body:'鎧',arms:'小手',waist:'腰当て',legs:'具足'};
for(const [group,[name,stats]] of Object.entries(raidSets))for(const [slot,label] of Object.entries(raidSlots))raidE(`raid-${group}-${slot}`,`${name}の${label}`,slot,{armorGroup:group,...stats});
raidE('raid-summoner-spellbook','神典オリハルの契約書','spellbook',{weaponType:'spellbook',allowedJobs:['summoner'],magic:115,maxMp:400,noEnhance:true});
raidE('raid-orichalcum-ring','神環オリハルコンリング','accessory',{accessoryType:'ring',attack:18,defense:18,magic:18,speed:18,maxHp:50});
raidE('raid-orihal-charm','星核のオリハルチャーム','accessory',{accessoryType:'charm',attack:12,defense:20,magic:20,speed:12,maxHp:70,maxMp:30});

// v51: exclusive special-job gear. Both jobs use two-handed signature weapons.
WEAPON_TYPES.push('gunblade','starGlobe');

// V60: high-grade refined-material job gear.
// Unlock path: raw material -> refined material -> job-exclusive weapon / body armor / ring / charm.
const HIGH_FORGE_JOB_STYLES={
 shielder:{weaponType:'oneHandSword',weapon:'護りの短剣',armor:'守護甲',focus:'attack',tank:true},
 greatShielder:{weaponType:'oneHandSword',weapon:'要塞剣',armor:'大盾甲',focus:'attack',tank:true},
 swordsman:{weaponType:'oneHandSword',weapon:'聖剣',armor:'剣聖装',focus:'attack'},
 mage:{weaponType:'greatStaff',weapon:'大魔杖',armor:'魔導衣',focus:'magic'},
 thief:{weaponType:'dualBlades',weapon:'双影刃',armor:'影装',focus:'attack',agile:true},
 fighter:{weaponType:'fist',weapon:'闘拳',armor:'闘神衣',focus:'attack'},
 healer:{weaponType:'mace',weapon:'癒聖杖',armor:'癒聖衣',focus:'magic'},
 archer:{weaponType:'bow',weapon:'天弓',armor:'狩天装',focus:'attack',agile:true},
 redMage:{weaponType:'oneHandSword',weapon:'紅魔剣',armor:'紅魔衣',focus:'hybrid'},
 whiteMage:{weaponType:'staff',weapon:'白聖杖',armor:'白聖衣',focus:'magic'},
 blackMage:{weaponType:'greatStaff',weapon:'黒魔杖',armor:'黒魔衣',focus:'magic'},
 darkKnight:{weaponType:'greatSword',weapon:'暗黒大剣',armor:'暗黒甲',focus:'attack'},
 pirateKing:{weaponType:'axe',weapon:'覇海斧',armor:'海王装',focus:'attack',agile:true},
 sniper:{weaponType:'bow',weapon:'神射弓',armor:'神射装',focus:'attack',agile:true},
 paladin:{weaponType:'spear',weapon:'聖槍',armor:'聖騎甲',focus:'attack',tank:true},
 bard:{weaponType:'instrument',weapon:'神奏器',armor:'星奏衣',focus:'magic',agile:true},
 trickster:{weaponType:'cards',weapon:'幻星札',armor:'幻戯装',focus:'magic',agile:true},
 bishop:{weaponType:'mace',weapon:'司教杖',armor:'聖堂衣',focus:'magic',tank:true},
 highWizard:{weaponType:'greatStaff',weapon:'極大魔杖',armor:'大魔導衣',focus:'magic'},
 gunbreaker:{weaponType:'gunblade',weapon:'神銃剣',armor:'銃士甲',focus:'attack',tank:true},
 astrologian:{weaponType:'starGlobe',weapon:'星天球',armor:'星詠衣',focus:'magic'},
 berserker:{weaponType:'axe',weapon:'狂神斧',armor:'狂戦甲',focus:'attack'},
 dragoon:{weaponType:'spear',weapon:'天竜槍',armor:'飛竜甲',focus:'attack',agile:true},
 summoner:{weaponType:'greatStaff',weapon:'幻獣杖',armor:'幻契衣',focus:'magic'}
};
const HIGH_FORGE_TIERS=[
 {id:'union',label:'ユニオン',requiredLevel:100,rarity:'rare',weapon:80,armor:32,ring:14,charm:16,hp:80,mp:28},
 {id:'nova',label:'ノヴァ',requiredLevel:140,rarity:'rare',weapon:105,armor:40,ring:18,charm:20,hp:110,mp:40},
 {id:'star',label:'星晶',requiredLevel:180,rarity:'epic',weapon:135,armor:50,ring:24,charm:26,hp:150,mp:55},
 {id:'blaze',label:'灼熱',requiredLevel:220,rarity:'epic',weapon:175,armor:62,ring:31,charm:34,hp:210,mp:75},
 {id:'thunder',label:'天雷',requiredLevel:260,rarity:'legendary',weapon:225,armor:78,ring:40,charm:44,hp:285,mp:100},
 {id:'promise',label:'約束',requiredLevel:300,rarity:'legendary',weapon:290,armor:98,ring:52,charm:58,hp:380,mp:135}
];
for(const tier of HIGH_FORGE_TIERS)for(const [job,cfg] of Object.entries(HIGH_FORGE_JOB_STYLES)){
 const common={requiredLevel:tier.requiredLevel,rarity:tier.rarity,allowedJobs:[job],highForgeGear:true,highForgeTier:tier.id,description:`精錬素材から鍛造された${job}専用の${tier.label}シリーズ。装備条件はジョブLv${tier.requiredLevel}。`};
 const isMagic=cfg.focus==='magic',hybrid=cfg.focus==='hybrid';
 const weaponStats=hybrid?{attack:Math.round(tier.weapon*.82),magic:Math.round(tier.weapon*.82)}:isMagic?{magic:tier.weapon}:{attack:tier.weapon};
 if(cfg.agile)weaponStats.speed=Math.max(3,Math.round(tier.ring*.35));
 EQUIPMENT[`highforge-${tier.id}-${job}-weapon`]=E(`highforge-${tier.id}-${job}-weapon`,`${tier.label}・${cfg.weapon}`,'weapon',{...common,weaponType:cfg.weaponType,twoHanded:['greatSword','greatStaff','starGlobe'].includes(cfg.weaponType),...weaponStats});
 const bodyStats={defense:tier.armor+(cfg.tank?10:0),maxHp:cfg.focus==='attack'?Math.round(tier.hp*.55):Math.round(tier.hp*.3),maxMp:isMagic?Math.round(tier.mp*.55):hybrid?Math.round(tier.mp*.35):0};
 if(isMagic)bodyStats.magic=Math.max(4,Math.round(tier.ring*.45));else if(hybrid){bodyStats.attack=Math.max(3,Math.round(tier.ring*.3));bodyStats.magic=Math.max(3,Math.round(tier.ring*.3));}else bodyStats.attack=Math.max(4,Math.round(tier.ring*.4));
 if(cfg.agile)bodyStats.speed=Math.max(2,Math.round(tier.ring*.22));
 EQUIPMENT[`highforge-${tier.id}-${job}-body`]=E(`highforge-${tier.id}-${job}-body`,`${tier.label}・${cfg.armor}`,'body',{...common,...bodyStats});
 const ringStats=hybrid?{attack:tier.ring-2,magic:tier.ring-2}:isMagic?{magic:tier.ring}:{attack:tier.ring};if(cfg.agile)ringStats.speed=Math.max(2,Math.round(tier.ring*.35));
 EQUIPMENT[`highforge-${tier.id}-${job}-ring`]=E(`highforge-${tier.id}-${job}-ring`,`${tier.label}・${cfg.armor}の指輪`,'accessory',{...common,accessoryType:'ring',...ringStats});
 const charmStats={defense:tier.charm,maxHp:cfg.focus==='attack'?tier.hp:Math.round(tier.hp*.65),maxMp:isMagic?tier.mp:hybrid?Math.round(tier.mp*.65):Math.round(tier.mp*.3)};
 if(cfg.tank)charmStats.defense+=Math.round(tier.charm*.25);
 EQUIPMENT[`highforge-${tier.id}-${job}-charm`]=E(`highforge-${tier.id}-${job}-charm`,`${tier.label}・${cfg.armor}のチャーム`,'accessory',{...common,accessoryType:'charm',...charmStats});
}

const SPECIAL_GEAR_NAMES={
 gunbreaker:{weapon:'銃剣',head:'銃士のバイザー',body:'銃士の戦闘外套',arms:'銃士の手甲',waist:'弾帯',legs:'銃士のブーツ',ring:'撃鉄の指輪',charm:'守護弾のチャーム'},
 astrologian:{weapon:'星天球',head:'星詠みの冠',body:'星詠みのローブ',arms:'星詠みの手袋',waist:'星詠みの腰帯',legs:'星詠みの靴',ring:'星運の指輪',charm:'天球のチャーム'},
 dragoon:{weapon:'竜槍',head:'飛竜の兜',body:'竜鱗の鎧',arms:'竜騎の手甲',waist:'竜騎の腰帯',legs:'天翔の脚甲',ring:'飛竜の指輪',charm:'竜脈のチャーム'},
 summoner:{weapon:'幻獣杖',head:'星召の冠',body:'幻獣の法衣',arms:'幻符の手袋',waist:'召喚師の腰帯',legs:'星紋の靴',ring:'契約の指輪',charm:'幻獣のチャーム'}
};
export const SPECIAL_GEAR_TIERS=[['novice','見習い',1,0],['veteran','熟練',30,1],['astral','星晶',65,2],['celestial','天極',100,3],['eternal','約束',150,4]];
for(const [job,names] of Object.entries(SPECIAL_GEAR_NAMES))for(const [tier,label,requiredLevel,n] of SPECIAL_GEAR_TIERS)for(const [part,name] of Object.entries(names)){
 const id=`${job}-${tier}-${part}`,slot=['ring','charm'].includes(part)?'accessory':part,magic=['astrologian','summoner'].includes(job);
 const extra=part==='weapon'?{weaponType:({gunbreaker:'gunblade',astrologian:'starGlobe',dragoon:'spear',summoner:'greatStaff'})[job],twoHanded:job!=='dragoon',[magic?'magic':'attack']:[9,25,43,76,145][n]}:
 part==='ring'?{accessoryType:'ring',[magic?'magic':'attack']:[2,6,11,20,35][n]}:
 part==='charm'?{accessoryType:'charm',defense:[2,5,10,18,30][n],[magic?'maxMp':'maxHp']:[10,25,45,80,140][n]}:
 {defense:([3,10,20,35,65][n])+(part==='body'?[2,5,8,15,25][n]:0),[magic?'maxMp':'maxHp']:[3,8,15,25,45][n]};
 EQUIPMENT[id]=E(id,`${label}の${name}`,slot,{requiredLevel,allowedJobs:[job],specialJobGear:job,rarity:n>=3?'legendary':n>=1?'rare':'common',...extra});
}

// v52: complete craftable legendary and raid sets for the two special jobs.
// Secondary summoner-only weapon. Unlike staffs, this occupies the dedicated book slot.
export const SUMMONER_SPELLBOOK_TIERS=Object.freeze([
 ['novice','見習いの精霊魔本',1,9,30,'common'],
 ['veteran','熟練の契約魔本',30,23,85,'rare'],
 ['astral','星晶の幻獣魔本',65,42,155,'rare'],
 ['celestial','天極の召喚魔典',100,75,280,'legendary'],
 ['eternal','約束の万象魔本',150,120,480,'legendary']
]);
for(const [tier,name,requiredLevel,magic,maxMp,rarity] of SUMMONER_SPELLBOOK_TIERS){
 const id=`summoner-${tier}-spellbook`;
 EQUIPMENT[id]=E(id,name,'spellbook',{weaponType:'spellbook',allowedJobs:['summoner'],specialJobGear:'summoner',requiredLevel,rarity,magic,maxMp,description:'召喚士の専用魔本枠に装備して魔力と最大MPを上げる。'});
}
for(const job of ['gunbreaker','astrologian'])for(const tier of ['legend','raid'])for(const [part,baseName] of Object.entries(SPECIAL_GEAR_NAMES[job])){
 const magic=job==='astrologian',raid=tier==='raid',id=`${tier}-${job}-${part}`,slot=['ring','charm'].includes(part)?'accessory':part;
 const names=magic?{legend:'伝説星天球ステラ・オラクル',raid:'星導天球セレスティア'}:{legend:'伝説銃剣レガリア',raid:'神銃剣ヴァンガード'};
 const stats=part==='weapon'?{weaponType:magic?'starGlobe':'gunblade',twoHanded:true,[magic?'magic':'attack']:raid?(magic?155:145):100,...(magic?{maxMp:raid?35:20}:{defense:raid?18:10})}:
 part==='ring'?{accessoryType:'ring',[magic?'magic':'attack']:raid?25:18,speed:raid?12:8}:
 part==='charm'?{accessoryType:'charm',defense:raid?20:14,[magic?'maxMp':'maxHp']:magic?(raid?55:35):(raid?100:70)}:
 {defense:raid?(magic?40:58):(magic?28:40),[magic?'magic':'attack']:raid?(magic?18:12):(magic?10:8),[magic?'maxMp':'maxHp']:magic?(raid?35:20):(raid?45:30)};
 EQUIPMENT[id]=E(id,part==='weapon'?names[tier]:`${raid?(magic?'星導':'神銃'):'伝説'}の${baseName}`,slot,{requiredLevel:100,rarity:'legendary',allowedJobs:[job],specialJobGear:job,...(raid?{raidGear:true,eventLimited:true,...(part==='weapon'?{noEnhance:true}:{})}:{legendJobGear:true}),...stats});
}

// Signature weapons for every existing ore tier; armor uses each job's shared armor group.
for(const [key,jp,tier] of metals)for(const [job,type,label] of [['gunbreaker','gunblade','銃剣'],['astrologian','starGlobe','星天球']]){
 const id=`${key}-${type}`;
 EQUIPMENT[id]=E(id,`${jp}の${label}`,'weapon',{weaponType:type,twoHanded:true,allowedJobs:[job],requiredLevel:Math.max(1,(tier-1)*15),[job==='astrologian'?'magic':'attack']:3+tier*4});
}

Object.assign(EQUIPMENT,MASHO_EQUIPMENT);
// MASHO_EQUIPMENT は別ファイル生成のため E(...) を通らない。魔障装備は闇耐性として補完する。
for(const d of Object.values(MASHO_EQUIPMENT))if(!d.elementResist)d.elementResist=equipmentElementResist(d.id,d.name,d.slot,{...d,elementAffinity:'dark'});


// 2026-10-09 装備必要職業Lvの全体調整。既存セーブの装備IDと強化値は維持する。
// 装備の性能・耐性・ドロップ・素材・必要ゴールドには手を加えない。
const REBALANCED_HIGH_FORGE_LEVELS={union:80,nova:110,star:140,blaze:170,thunder:200,promise:230};
const REBALANCED_ENDGAME_LEVELS={200:80,220:90,240:100,260:110,280:120,300:130};
function balancedEquipmentLevel(d){
 const original=Math.max(1,Math.floor(Number(d.requiredLevel??1)||1));
 if(d.fixedRequiredJobLevel)return original;
 if(original===1)return 1;
 if(d.highForgeGear)return REBALANCED_HIGH_FORGE_LEVELS[d.highForgeTier]??original;
 if(d.id?.startsWith('oathgear-'))return 120;
 if(d.endgameBand&&REBALANCED_ENDGAME_LEVELS[d.endgameBand])return REBALANCED_ENDGAME_LEVELS[d.endgameBand];
 if(d.mashoGear)return ({1:55,2:75,3:95})[d.mashoTier]??original;
 if(d.id?.startsWith('halloween-')){
   const tier=d.id.split('-')[1];
   // 職業専用ハロウィン防具は元から低Lvなので、必要Lvを上げない。
   if(original<=30&&d.allowedJobs)return Math.max(1,Math.ceil(original*.8));
   return ({i:15,ii:35,iii:50})[tier]??original;
 }
 if(d.raidGear)return 90;
 if(d.specialJobGear)return ({30:25,65:50,100:80,150:120})[original]??Math.min(original,Math.round(original*.8));
 // ショップ・通常鍛冶・魔物素材・伝説・特殊ドロップを緩やかに統一調整。
 if(original<=20)return Math.max(1,Math.ceil(original*.8));
 return Math.max(1,Math.round(original*.8/5)*5);
}
for(const def of Object.values(EQUIPMENT)){
 const before=Math.max(1,Number(def.requiredLevel??1));
 def.requiredLevel=Math.max(1,Math.min(before,balancedEquipmentLevel(def)));
 if(def.highForgeGear&&typeof def.description==='string'){
   def.description=def.description.replace(/装備条件はジョブLv\d+/,`装備条件はジョブLv${def.requiredLevel}`);
 }
}


// 2026-10-09 鍛冶屋で生産できる装備の追加レベル緩和。
// 装備性能・素材・生産費用・解放時期・イベント強化条件は変更しない。
// すべて前回の全装備調整を適用した後に、対象装備のみ必要職業Lvをさらに下げる。
const FORGE_METAL_LEVELS={copper:1,iron:8,gold:18,platinum:25,mythril:35,star:45};
const FORGE_MONSTER_LEVELS={1:1,2:5,3:10,4:15,5:22,6:30,7:38,8:46,9:54,10:62};
const FORGE_HIGH_LEVELS={union:60,nova:85,star:110,blaze:135,thunder:160,promise:185};
const FORGE_ENDGAME_LEVELS={200:65,220:75,240:85,260:95,280:105,300:115};
const FORGE_SPECIAL_LEVELS={1:1,25:18,50:35,80:60,120:90};
function lowerCraftedEquipmentLevel(def){
 const before=Math.max(1,Number(def.requiredLevel??1));
 // イベント・レイド装備の必要Lvと +1〜+5 ごとの増加は既存調整を維持。
 if(def.eventLimited)return before;
 if(def.highForgeGear)return FORGE_HIGH_LEVELS[def.highForgeTier]??before;
 if(def.endgameQuality==='forge')return FORGE_ENDGAME_LEVELS[def.endgameBand]??before;
 if(def.monsterMaterialGear)return FORGE_MONSTER_LEVELS[def.materialGrade]??before;
 if(def.specialJobGear&&FORGE_SPECIAL_LEVELS[before]!=null)return FORGE_SPECIAL_LEVELS[before];
 const metal=/^(copper|iron|gold|platinum|mythril|star)-/.exec(def.id??'');
 if(metal)return FORGE_METAL_LEVELS[metal[1]];
 // 狩人・狙撃手の専用生産装備、既存の伝説剣なども必要Lvを緩和。
 if(/^(archer|sniper)/.test(def.id??'')||def.id==='legendBlade'){
   if(before<=1)return 1;
   return before<=20?Math.max(1,Math.ceil(before*.65)):Math.max(1,Math.round(before*.8/5)*5);
 }
 return before;
}
for(const def of Object.values(EQUIPMENT)){
 const before=Math.max(1,Number(def.requiredLevel??1));
 def.requiredLevel=Math.max(1,Math.min(before,lowerCraftedEquipmentLevel(def)));
 if(def.highForgeGear&&typeof def.description==='string'){
   def.description=def.description.replace(/装備条件はジョブLv\d+/,`装備条件はジョブLv${def.requiredLevel}`);
 }
}

Object.assign(EQUIPMENT,FESTIVAL_EQUIPMENT);

Object.assign(EQUIPMENT,MASHO_ABYSS_WEAPONS);
for(const def of Object.values(SHIELDER_SHIELDS))EQUIPMENT[def.id]=E(def.id,def.name,def.slot,def);
EQUIPMENT[MASHO_ABYSS_SPELLBOOK.id]=MASHO_ABYSS_SPELLBOOK;

// Limited 2026 eclipse gear follows normal equip, resistance, upgrade and save rules.
for(const def of Object.values(ECLIPSE_EQUIPMENT))EQUIPMENT[def.id]=E(def.id,def.name,def.slot,def);

// 2026-10-15 全装備の緩やかな基礎能力向上。既存品・未入手品の両方に適用。
// ゲームデータとセーブに倍率を二重記録しないため、読み込み時だけ一度計算する。
// 強化Lv、イベント報酬、耐性、装備条件、セットボーナスは変更しない。
export const EQUIPMENT_BALANCE_REVISION = '2026-10-15-balanced-buff';
for(const gear of Object.values(EQUIPMENT)) {
 if(!['weapon','spellbook','shield','head','body','arms','waist','legs','accessory'].includes(gear.slot))continue;
 const lv=Number(gear.requiredLevel??1);
 const rate=lv<=30?.15:lv<=100?.12:lv<=200?.10:.08;
 for(const key of ['attack','defense','magic','speed','maxHp','maxMp']) {
   const old=Number(gear[key]??0);
   if(!Number.isFinite(old)||old<=0)continue;
   // Avoid outsized initiative shifts for small speed bonuses.
   if(key==='speed'&&old<4)continue;
   gear[key]=old+Math.max(1,Math.round(old*rate));
 }
}
