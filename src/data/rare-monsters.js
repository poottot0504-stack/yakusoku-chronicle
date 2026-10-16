const magic=(id,name,power=110,allTargets=false,element='none')=>({type:'skill',skill:{id,name,power,type:'magic',kind:'magic',element,allTargets,canCrit:false}});
const physical=(id,name,power=110,allTargets=false)=>({type:'skill',skill:{id,name,power,kind:'physical',allTargets}});
const buff=(id,name,attackPct=.18)=>({type:'skill',skill:{id,name,type:'buff',power:0,selfBuff:{attackPct},turns:3,selfTarget:true}});
const heal=(id,name,power=28)=>({type:'skill',skill:{id,name,type:'heal',power,selfTarget:true}});

export const RARE_MONSTER_LIST=[
 {id:'rare-cactenten',name:'サボテンテン',element:'fire',hp:10,escapeChance:.90,damageCap:1,evasion:.05,ai:[{type:'attack',power:90}]},
 {id:'rare-nocross',name:'ノクロス',element:'thunder',hp:50,escapeChance:.60,ai:[magic('nocrossBolt','ノクロスボルト',125),magic('nocrossWave','ノクロスウェーブ',90,true)]},
 {id:'rare-hitokiri-goborun',name:'人斬りゴボルン',element:'fire',hp:50,escapeChance:.55,ai:[{type:'attack',power:115},physical('goborunSlash','人斬り一閃',85,true)]},
 {id:'rare-jujutsu-goborun',name:'呪術ゴボルン',element:'dark',hp:50,escapeChance:.50,rareInstantDeath:{triggerChance:.05,allChance:.10,singleSuccess:.30,allSuccess:.10,singleName:'呪命',allName:'大呪命'},ai:[magic('curseBolt','呪弾',120,false,'dark'),magic('curseWave','呪界',82,true,'dark'),buff('curseFocus','呪力増幅',.20),{type:'skill',skill:{id:'curseBreak',name:'衰弱の呪い',power:65,type:'magic',kind:'magic',defenseDownPct:.15,allTargets:true}}]},
 {id:'rare-archer-goborun',name:'弓取りゴボルン',element:'light',hp:50,escapeChance:.60,ai:[{type:'attack',power:110},physical('arrowStorm','矢の雨',82,true)]},
 {id:'rare-metal-purun',name:'メタルぷるん',element:'thunder',hp:15,escapeChance:.80,damageCap:2,defenseBonus:120,ai:[{type:'attack',power:80}]},
 {id:'rare-phantom-nyark',name:'幻影ニャーク',element:'dark',hp:35,escapeChance:.75,evasion:.45,ai:[{type:'skill',skill:{id:'phantomClaw',name:'幻影連爪',power:72,kind:'physical',multiHit:2}}]},
 {id:'rare-time-clockun',name:'時喰いクロックン',element:'light',hp:45,escapeChance:.60,ai:[magic('timeNeedle','時の針',100),{type:'skill',skill:{id:'timeBind',name:'時縛り',power:55,type:'magic',kind:'magic',status:'paralysis'}}]},
 {id:'rare-star-luxia',name:'星霊ルクシア',element:'light',hp:40,escapeChance:.55,ai:[magic('luxRay','星光線',120,false,'light'),magic('luxNova','星光波',78,true,'light'),heal('starHeal','星の癒やし',32)]},
 {id:'rare-little-vorg',name:'ちび竜ヴォルグ',element:'fire',hp:60,escapeChance:.50,ai:[{type:'attack',power:120},magic('littleBreath','ちび竜ブレス',88,true,'fire'),buff('dragonSpirit','竜気',.22)]}
].map(x=>({...x,rareMonster:true,bestiaryCategory:'rare',gold:0,materials:null,description:'稀に出会えるモンスター。経験値がとにかくうまい！'}));
export const RARE_MONSTERS=Object.fromEntries(RARE_MONSTER_LIST.map(x=>[x.id,x]));
