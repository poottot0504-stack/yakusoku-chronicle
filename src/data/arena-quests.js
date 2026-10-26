// 闘技大会の初期試作。ここは通常育成データから完全に独立した固定編成。
// All participants are standardized to the quest's level, equipment and skills.
const S=(id,name,mp,power,kind='physical',extra={})=>({id,name,mp,power,type:'attack',kind,description:'闘技大会の固定特技',...extra});
const H=(id,name,mp,power)=>({id,name,mp,power,type:'heal',description:'味方1人のHPを回復'});
const fighter=(slot,job,weapon,skills=[])=>({slot,job,weapon,skills});
export const ARENA_RANKS=Object.freeze([
 {grade:'S',maxTurns:3,coins:5},
 {grade:'A',maxTurns:6,coins:3},
 {grade:'B',maxTurns:10,coins:2},
 {grade:'C',maxTurns:100,coins:1}
]);
export const ARENA_QUESTS=Object.freeze({
 'arena30':{
  id:'arena30',name:'闘技大会・青銅の試練',level:30,description:'基礎技と回復の組み合わせで、岩甲の魔獣を討伐する。',
  roster:[
   fighter('アレン','swordsman','ironSword',[S('arena-brave30','ブレイブエッジ',12,215)]),
   fighter('ミラ','mage','noviceStaff',[S('arena-thunder30','サンダー',9,200,'magic',{element:'thunder'})]),
   fighter('レン','thief','bronzeDagger',[S('arena-shadow30','シャドウレイド',11,220)]),
   fighter('ソラ','healer','oakMace',[H('arena-heal30','ヒール',6,75),S('arena-holy30','ホーリー',12,160,'magic',{element:'light'})])
  ],
  enemy:{id:'arena30-stonebeast',name:'岩甲のグリフォン',artId:'storyBoss-field',element:'earth',maxHp:1450,attack:80,defense:75,magic:65,speed:44}
 },
 'arena50':{
  id:'arena50',name:'闘技大会・白銀の試練',level:50,description:'盾士を中心とした編成で、雷獣の猛攻を攻略する。',
  roster:[
   fighter('アレン','swordsman','gold-oneHandSword',[S('arena-edge50','英雄剣',20,275)]),
   fighter('ミラ','mage','gold-staff',[S('arena-flare50','フレア',24,300,'magic',{element:'fire'})]),
   fighter('レン','shielder','smallShield',[S('arena-bash50','盾撃',9,180)]),
   fighter('ソラ','healer','gold-mace',[H('arena-heal50','ハイヒール',10,155),S('arena-holy50','ホーリー',15,210,'magic',{element:'light'})])
  ],
  enemy:{id:'arena50-thunderbeast',name:'雷牙のガルディオン',artId:'storyBoss-mountain',element:'thunder',maxHp:2950,attack:145,defense:110,magic:125,speed:70}
 },
 'arena70':{
  id:'arena70',name:'闘技大会・黄金の試練',level:70,description:'火力と防御を使い分けて、古代竜に挑む。',
  roster:[
   fighter('アレン','swordsman','platinum-oneHandSword',[S('arena-edge70','剛剣・天断',27,330)]),
   fighter('ミラ','mage','platinum-staff',[S('arena-flare70','蒼炎の大魔法',30,340,'magic',{element:'fire'})]),
   fighter('レン','thief','platinum-dagger',[S('arena-shadow70','瞬影連閃',23,300)]),
   fighter('ソラ','healer','platinum-mace',[H('arena-heal70','聖光の治癒',18,220),S('arena-holy70','神聖光',24,280,'magic',{element:'light'})])
  ],
  enemy:{id:'arena70-old-dragon',name:'黄金の古竜ゼルディア',artId:'storyBoss-abyss',element:'dark',maxHp:6400,attack:235,defense:165,magic:205,speed:100}
 }
});
// Full fixed equipment list: mainhand, offhand where applicable, five armor
// pieces, ring and charm. All equipment is simulated; none is borrowed.
export function arenaFixedEquipment(template,level){
 const tier=level===30?'iron':level===50?'gold':level===70?'platinum':null;
 if(!tier)throw new Error('闘技大会の固定レベルが不正です');
 const group=['mage','healer'].includes(template.job)?'magic':template.job==='thief'?'thief':null;
 const gear={weapon:template.weapon};
 if(template.job==='shielder'||template.job==='greatShielder')gear.shield='towerShield';
 for(const slot of ['head','body','arms','waist','legs'])gear[slot]=tier+'-'+(group?group+'-':'')+slot;
 gear.accessory1=tier+'-attack-ring';
 gear.accessory2=tier+'-guard-bracelet';
 return gear;
}
export const ARENA_QUEST_IDS=Object.freeze(Object.keys(ARENA_QUESTS));
