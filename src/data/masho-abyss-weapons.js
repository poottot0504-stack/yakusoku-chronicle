// 第21〜25階層共通の低確率ドロップ。装備可能ジョブは既存の武器種ルールに従う。
const weapons=[
 ['sword','永訣のクラウクライス','oneHandSword','attack'],
 ['staff','荊冠のデストレーター','staff','magic'],
 ['dagger','代償のネイディ・ギア','dagger','attack'],
 ['bow','亡国のクピドバイン','bow','attack'],
 ['instrument','斬罪のエルガンシオ','instrument','attack']
];
export const MASHO_ABYSS_WEAPONS=Object.fromEntries(weapons.map(([key,name,weaponType,power])=>{
 const id=`masho-abyss-${key}`;
 return [id,{id,name,slot:'weapon',weaponType,twoHanded:false,requiredLevel:150,rarity:'legendary',[power]:400,description:'魔障の洞窟・第21〜25階層の希少武器。装備条件：ジョブLv150。フリーマーケット出品可。'}];
}));
