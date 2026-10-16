export const CHARACTER_TEMPLATES = [
  {id:'hero',name:'アレン',isHero:true,currentJob:'swordsman',favoredJob:'swordsman',maxHp:120,maxMp:34,stats:{attack:5,defense:5,magic:2,speed:3},uniqueSkillId:'promiseBlade'},
  {id:'mira',name:'ミラ',currentJob:'mage',favoredJob:'mage',maxHp:88,maxMp:62,stats:{attack:2,defense:2,magic:5,speed:4},uniqueSkillId:'starFlare'},
  {id:'ren',name:'レン',currentJob:'thief',favoredJob:'thief',maxHp:100,maxMp:42,stats:{attack:3,defense:3,magic:2,speed:5},uniqueSkillId:'phantomEdge'},
  {id:'sora',name:'ソラ',currentJob:'healer',favoredJob:'healer',maxHp:94,maxMp:68,stats:{attack:1,defense:2,magic:5,speed:4},uniqueSkillId:'gentleLight'},
  {id:'gald',name:'ガルド',currentJob:'fighter',favoredJob:'fighter',maxHp:136,maxMp:28,stats:{attack:5,defense:3,magic:1,speed:5},uniqueSkillId:'meteorFist'},
  {id:'luna',name:'ルナ',currentJob:'mage',favoredJob:'mage',maxHp:86,maxMp:66,stats:{attack:2,defense:2,magic:5,speed:4},uniqueSkillId:'moonPrism'},
  {id:'kai',name:'カイ',currentJob:'swordsman',favoredJob:'swordsman',maxHp:126,maxMp:32,stats:{attack:5,defense:5,magic:2,speed:3},uniqueSkillId:'guardianCross'},
  {id:'noa',name:'ノア',currentJob:'thief',favoredJob:'thief',maxHp:98,maxMp:46,stats:{attack:3,defense:3,magic:2,speed:5},uniqueSkillId:'luckySeven'}
];

export function createDefaultRoster(){
  return CHARACTER_TEMPLATES.map((c,i)=>({...c,level:1,hp:c.maxHp,mp:c.maxMp,jobLevels:{[c.currentJob]:1},learnedSkills:i===3?['heal']:[]}));
}
