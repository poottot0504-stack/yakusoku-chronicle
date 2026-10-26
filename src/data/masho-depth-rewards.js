// 魔障の洞窟・第26〜28階層の限定報酬。
// Existing equipment IDs remain unchanged. The hero-only weapon checks the
// original protagonist flag rather than the character's editable display name.
export const MASHO_DEPTH_BOSSES=Object.freeze({
 26:{id:'masho26-yggdravain',name:'翠晶樹皇ユグドラヴェイン',element:'water',hpRatio:10,attackRatio:1.5,description:'翠晶を宿す古代樹の皇'},
 27:{id:'masho27-volgrad',name:'獄炎獣王ヴォルグラード',element:'fire',hpRatio:12,attackRatio:1.6,description:'獄炎に身を包む角獣の王'},
 28:{id:'masho28-graciel',name:'氷晶神竜グラシエル',element:'ice',hpRatio:14,attackRatio:1.7,description:'最深層を守る氷晶の神竜'}
});
export const MASHO_DEPTH_REWARD_BY_FLOOR=Object.freeze({
 26:'masho-26-eternal-tree-blessing',
 27:'masho-27-infernal-eclipse-ring',
 28:'masho-28-final-claussolas'
});
export const MASHO_DEPTH_EQUIPMENT=Object.freeze({
 'masho-26-eternal-tree-blessing':{
  id:'masho-26-eternal-tree-blessing',name:'悠久樹の祝福',slot:'accessory',accessoryType:'charm',
  requiredLevel:150,rarity:'legendary',defense:130,maxHp:350,maxMp:140,elementResist:{water:.08},
  mashoDepthFloor:26,turnRegenRatio:.01,
  description:'第26階層の希少報酬。全職装備可能。戦闘中、毎ターン終了時に最大HPと最大MPをそれぞれ1％回復。'
 },
 'masho-27-infernal-eclipse-ring':{
  id:'masho-27-infernal-eclipse-ring',name:'獄炎の蝕戒',slot:'accessory',accessoryType:'ring',
  requiredLevel:150,rarity:'legendary',attack:180,magic:180,elementResist:{fire:.08},
  mashoDepthFloor:27,armorShredPerHit:.001,armorShredMaxStacks:10,
  description:'第27階層の希少報酬。全職装備可能。通常攻撃・特技・攻撃魔法の命中で敵の防御力を確実に0.1％減少。最大10回（合計1％）。'
 },
 'masho-28-final-claussolas':{
  id:'masho-28-final-claussolas',name:'終極のクラウソラス',slot:'weapon',weaponType:'oneHandSword',
  requiredLevel:150,rarity:'legendary',attack:450,magic:450,maxHp:220,
  elementResist:{ice:.1},mashoDepthFloor:28,heroOnly:true,
  description:'第28階層の希少報酬。主人公本人（名前変更後も可）だけが全職業で装備可能。攻撃力と魔法力が同じだけ上昇する。'
 }
});
