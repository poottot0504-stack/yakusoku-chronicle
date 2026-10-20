// Permanent normal monsters; only the monsters have battle art (never equipment).
const s=(id,name,power,kind='physical',more={})=>({type:'skill',skill:{id,name,power,kind,type:kind==='magic'?'magic':'attack',...more}});
const g=(name,stats,mats,gold,extras={})=>({name,stats,mats,gold,...extras});
export const NEW_MONSTERS=Object.freeze([
{
 id:'chronicle-forest-boar',name:'苔角猪王',sprite:'forest-boar',regionId:'forest',level:18,element:'water',weight:8,requiredLevel:5,rarity:'common',materialGrade:2,combatScale:{hp:1.25,attack:1.20,magic:.70},
 materialNames:{normal:'苔角の大牙',uncommon:'深森の剛毛',rare:'古樹の角片'},
 ai:[{type:'attack'},s('forest-boar-charge','猛猪突進',132),s('forest-boar-antlers','樹角薙ぎ',91,'physical',{allTargets:true})],
 gear:{
 weapon:g('苔角槍グランボア',{attack:20,speed:1},{normal:3,uncommon:2,rare:1},600,{weaponType:'spear'}),
 body:g('樹猪の毛皮鎧',{defense:17,maxHp:30},{uncommon:5,normal:2},500),
 ring:g('深森の牙輪',{attack:7,maxHp:10},{normal:2,rare:1},300),
 charm:g('ボアスピリットチャーム',{defense:8,maxHp:30},{uncommon:2,rare:1},300)
}},
{
 id:'chronicle-ice-cat',name:'氷晶霊猫',sprite:'ice-cat',regionId:'snow',level:48,element:'ice',weight:8,requiredLevel:22,rarity:'rare',materialGrade:5,combatScale:{hp:.85,magic:1.15,speed:1.25},
 materialNames:{normal:'氷晶の爪',uncommon:'白霜の毛並み',rare:'霊氷石'},
 ai:[{type:'attack'},s('ice-cat-claws','氷晶裂爪',84,'physical',{multiHit:2}),s('ice-cat-breath','霜の息',93,'magic',{allTargets:true,status:'freeze'})],
 gear:{
 weapon:g('氷牙クレセント',{attack:34,speed:6},{normal:4,rare:1},1800,{weaponType:'dagger'}),
 body:g('霜獣の白衣',{defense:27,speed:3,maxHp:30},{uncommon:5,normal:2},1600),
 ring:g('氷晶の指環',{attack:8,speed:8},{normal:2,rare:1},1000),
 charm:g('フロストキャットチャーム',{defense:12,maxMp:24},{uncommon:3,rare:1},1000,{elementResist:{ice:.06}})
}},
{
 id:'chronicle-gold-scorpion',name:'金殻蠍',sprite:'gold-scorpion',regionId:'desert',level:58,element:'fire',weight:8,requiredLevel:30,rarity:'epic',materialGrade:6,combatScale:{attack:1.10,defense:1.35,speed:.80},
 materialNames:{normal:'金殻の甲片',uncommon:'灼鉤の尾針',rare:'蠍魔鉱'},
 ai:[{type:'attack'},s('gold-scorpion-sting','毒尾撃',118,'physical',{status:'poison'}),s('gold-scorpion-shell','硬殻防御',0,'physical',{type:'buff',selfBuff:{defensePct:.22},turns:3,selfTarget:true})],
 gear:{
 weapon:g('金鉤クローザ',{attack:45,defense:4},{uncommon:3,normal:3,rare:1},2400,{weaponType:'fist'}),
 body:g('金殻の重甲',{defense:42,maxHp:50},{normal:6,uncommon:2},2000),
 ring:g('蠍王の硬輪',{attack:7,defense:12},{uncommon:2,rare:1},1300),
 charm:g('デザートスティングチャーム',{defense:15,maxHp:65},{normal:3,rare:1},1300,{elementResist:{fire:.06}})
}},
{
 id:'chronicle-blueflame-bat',name:'蒼炎コウモリ',sprite:'blueflame-bat',regionId:'swamp',level:68,element:'fire',weight:8,requiredLevel:38,rarity:'epic',materialGrade:7,combatScale:{hp:.80,magic:1.20,speed:1.30},
 materialNames:{normal:'蒼炎の羽膜',uncommon:'妖紫の爪',rare:'夜魂の火種'},
 ai:[{type:'attack'},s('blueflame-fire','蒼火弾',126,'magic'),s('blueflame-screech','幻惑の超音波',76,'magic',{status:'confusion',allTargets:true})],
 gear:{
 weapon:g('蒼焔ウィングエッジ',{attack:49,speed:5},{normal:3,uncommon:3,rare:1},3000,{weaponType:'dagger'}),
 body:g('夜翼のローブ',{defense:33,magic:9,maxMp:25},{normal:5,uncommon:2},2600),
 ring:g('蒼火の魔輪',{magic:16,speed:5},{uncommon:3,rare:1},1500),
 charm:g('宵闇の灯翼符',{magic:10,maxMp:60},{normal:3,rare:1},1500,{elementResist:{dark:.05}})
}},
{
 id:'chronicle-ghost-lantern',name:'怨灯のランタン霊',sprite:'ghost-lantern',regionId:'ruins',level:88,element:'dark',weight:8,requiredLevel:54,rarity:'legendary',materialGrade:9,combatScale:{hp:.90,attack:.75,magic:1.30},
 materialNames:{normal:'怨灯の燐火',uncommon:'呪鎖の欠片',rare:'幽玻璃の灯芯'},
 ai:[{type:'attack'},s('ghost-lantern-curse','怨灯の呪火',116,'magic',{status:'curse'}),s('ghost-lantern-drain','魂吸い',106,'magic',{status:'curse'})],
 gear:{
 weapon:g('幽灯の魔杖',{magic:64,maxMp:30},{normal:5,uncommon:3,rare:1},4200,{weaponType:'staff'}),
 body:g('呪灯の法衣',{defense:46,magic:14,maxMp:40},{uncommon:5,normal:3},3600),
 ring:g('燐火の呪環',{magic:22,maxMp:18},{normal:3,rare:1},2000),
 charm:g('ゴーストランタンチャーム',{defense:19,maxHp:70,maxMp:70},{uncommon:3,rare:1},2000,{elementResist:{dark:.07}})
}}
]);
export const newMonsterMaterialId=(monster,kind)=>`${monster.id}-${kind}`;
export const newMonsterGearId=(monster,part)=>`${monster.id}-${part}`;
