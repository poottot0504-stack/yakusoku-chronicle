const rows=[
 [13,'ノーザン','双短剣・高速連撃','断絶の閃光'],[12,'ホース','長槍・突進','穿界の一閃'],[11,'パーク','弓・状態異常','静寂の矢'],[10,'アクア','水氷魔法・MP吸収','零海葬'],[9,'アクセル','二丁魔導銃・高速攻撃','魔弾・終止符'],[8,'ハーヴィ','鎌・毒・呪い・吸収','冥府刈り'],[7,'トライバル','戦斧・超物理火力','大地断砕'],[6,'ブランフォード','魔導書・強化解除','無頁の宣告'],[5,'クラウザー','巨大剣・カウンター','反逆断頭'],[4,'チェラム','聖杖・回復・結界','聖域崩壊'],[3,'レオンハート','剣盾・防御型','獅子心絶命剣'],[2,'レクセウス','拳・超肉弾戦','天壊拳'],[1,'ヴァルゼイン','大剣・十三人最上位','背約の終極']
];
const elements={13:'thunder',12:'light',11:'dark',10:'water',9:'thunder',8:'dark',7:'fire',6:'light',5:'fire',4:'light',3:'water',2:'thunder',1:'dark'};
export const OATHBREAKER_DATA=rows.map(([rank,name,style,instantDeathName],i)=>({id:`oath-${rank}`,rank,name,style,instantDeathName,level:250,powerTier:i+1,element:elements[rank]}));
