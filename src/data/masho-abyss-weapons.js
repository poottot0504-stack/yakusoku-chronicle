// 第21〜25階層共通の低確率ドロップ。旧装備IDを維持し既存セーブに反映する。
// エルガンシオは格闘家・ベルセルク向けの拳甲。既存の吟遊詩人は楽器として引き続き装備可能。
const weapons=[
 ['sword','永訣のクラウクライス','oneHandSword','attack'],
 ['staff','荊冠のデストレーター','staff','magic'],
 ['dagger','代償のネイディ・ギア','dagger','attack'],
 ['bow','亡国のクピドバイン','bow','attack'],
 ['instrument','斬罪のエルガンシオ','fist','attack']
];
export const MASHO_ABYSS_WEAPONS=Object.fromEntries(weapons.map(([key,name,weaponType,power])=>{
 const id=`masho-abyss-${key}`;
 return [id,{id,name,slot:'weapon',weaponType,...(key==='instrument'?{alternateWeaponTypes:['instrument']}:{}) ,twoHanded:false,requiredLevel:150,rarity:'legendary',[power]:400,description:`魔障の洞窟・第21〜25階層の希少武器。装備条件：ジョブLv150。${key==='instrument'?'格闘家・ベルセルクは拳甲、吟遊詩人は楽器として装備可能。':''}フリーマーケット出品可。`}];
}));
