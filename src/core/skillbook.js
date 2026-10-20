import { JOBS } from '../data/jobs.js';
import { HIGH_LEVEL_SKILLS } from '../data/high-level-skills.js';
import { describeSkill } from './skill-description.js';
import { getSkillElement } from './elements.js';
export { describeSkill } from './skill-description.js';
const S=(level,id,name,mp,power,type='attack',extra={})=>({level,id,name,mp,power,type,...(type==='heal'?{flatHeal:power}:{}),...extra});
const BOOK={
 dragoon:[
  S(1,'wyrmPierce','竜牙突き',4,160,'attack',{defensePierce:.08}),
  S(10,'wingGuard','飛竜の構え',8,0,'buff',{selfBuff:{defensePct:.22},turns:3}),
  S(20,'skyLance','蒼天槍',12,220,'attack'),
  S(30,'thunderDive','雷竜の急降下',18,260,'attack',{element:'thunder'}),
  S(45,'twinFangDive','双竜牙',24,145,'attack',{multiHit:2}),
  S(60,'dragonRoar','竜王の咆哮',34,330,'attack',{allTargets:true}),
  S(80,'aerialAssault','飛天竜槍',48,500,'attack',{defensePierce:.15}),
  S(95,'meteorDive','流星竜墜',60,530,'attack',{allTargets:true}),
  S(100,'heavenWyrm','終槍・天翔龍牙',75,750,'attack',{defensePierce:.24})
 ],
 summoner:[
  S(1,'summonCarbuncle','召喚・カーバンクル',5,145,'magic',{kind:'magic',element:'light'}),
  S(10,'summonIfrit','召喚・イフリート',9,200,'magic',{kind:'magic',element:'fire'}),
  S(20,'summonShiva','召喚・シヴァ',14,230,'magic',{kind:'magic',element:'ice'}),
  S(30,'summonRamuh','召喚・ラムウ',18,255,'magic',{kind:'magic',element:'thunder',allTargets:true}),
  S(45,'summonLeviathan','召喚・リヴァイア',25,325,'magic',{kind:'magic',element:'water',allTargets:true}),
  S(60,'summonersPact','幻獣との契約',26,0,'buff',{selfBuff:{magicPct:.3},turns:3}),
  S(70,'summonPhoenix','召喚・フェニックス',32,240,'heal',{target:'all',fullHeal:false,highClear:true}),
  S(80,'summonOdin','召喚・オーディン',45,475,'magic',{kind:'magic',element:'dark'}),
  S(95,'summonBahamut','召喚・バハムート',60,570,'magic',{kind:'magic',element:'dark',allTargets:true}),
  S(100,'summonAstralFlare','終極召喚・星界龍光',75,690,'magic',{kind:'magic',element:'light',allTargets:true})
 ],
 gunbreaker:[S(1,'burstEdge','バーストエッジ',4,145),S(10,'cartridgeGuard','カートリッジガード',8,0,'buff',{selfBuff:{defensePct:.35},turns:3,description:'自分の防御を35%上昇・3ターン'}),S(20,'barrelPierce','バレルピアス',10,180,'attack',{defensePierce:.20}),S(30,'shellSweep','シェルスイープ',16,145,'attack',{allTargets:true}),S(45,'triggerChain','トリガーチェイン',22,90,'attack',{multiHit:3}),S(60,'auroraPulse','オーロラパルス',20,130,'heal',{clear:true}),S(80,'royalBreak','ロイヤルブレイク',38,390,'attack'),S(95,'limitRevolver','リミット・リボルバー',60,125,'attack',{multiHit:4})],
 astrologian:[S(1,'starRay','スターレイ',4,130,'magic',{kind:'magic',element:'light'}),S(1,'stellarMend','ステラヒール',5,55,'heal',{clear:true}),S(10,'celestialBlessing','星札の祝福',12,0,'buff',{target:'all',selfBuff:{attackPct:.12,magicPct:.12},turns:3,description:'味方全員の攻撃・魔法を12%上昇・3ターン'}),S(25,'stellarRain','星癒の雨',18,100,'heal',{target:'all',highClear:true}),S(40,'starReturn','星還り',28,30,'revive',{hpRatio:.3}),S(55,'astralJudgement','アストラルジャッジ',30,270,'magic',{kind:'magic',element:'light',allTargets:true}),S(75,'celestialVeil','星天の帳',30,0,'buff',{target:'all',selfBuff:{defensePct:.25},turns:3,description:'味方全員の防御を25%上昇・3ターン'}),S(95,'cosmicRebirth','コズミック・リバース',65,240,'heal',{target:'all',highClear:true})],
 swordsman:[S(1,'powerSlash','強斬り',3,125),S(5,'guardBreak','ガードブレイク',6,145),S(15,'crossSlash','クロススラッシュ',10,175),S(30,'braveEdge','ブレイブエッジ',16,220),S(50,'heroicBlade','英雄剣',25,285),S(80,'promiseBlade','約束の剣',42,390)],
 mage:[S(1,'fire','ファイア',4,140,'magic',{kind:'magic',element:'fire'}),S(5,'ice','ブリザド',6,160,'magic',{kind:'magic',element:'ice'}),S(15,'thunder','サンダー',9,185,'magic',{kind:'magic',element:'thunder'}),S(30,'aquaBurst','アクアバースト',14,225,'magic',{kind:'magic',element:'water'}),S(40,'lightRay','ライトレイ',18,260,'magic',{kind:'magic',element:'light'}),S(50,'flare','フレア',25,315,'magic',{kind:'magic',element:'fire'}),S(60,'darkMatter','ダークマター',31,355,'magic',{kind:'magic',element:'dark'}),S(80,'meteor','メテオ',48,430,'magic',{kind:'magic',element:'none'})],
 thief:[S(1,'quickStab','クイックスタブ',3,170),S(5,'poisonEdge','ポイズンエッジ',5,180,'attack',{status:'poison'}),S(15,'doubleFang','ダブルファング',8,205),S(30,'shadowRaid','シャドウレイド',14,240),S(50,'assassinEdge','アサシンエッジ',24,310,'attack',{critRateBonus:.25}),S(80,'phantomRush','ファントムラッシュ',40,410)],
 fighter:[S(1,'straight','ストレート',2,150),S(5,'roundhouse','ラウンドハウス',5,170),S(15,'ironFist','鉄拳',8,195),S(30,'risingDragon','昇竜撃',14,240),S(50,'meteorFist','メテオフィスト',24,315),S(80,'godFist','神拳・天衝',42,420)],
 archer:[S(1,'aimedShot','狙い撃ち',2,120),S(5,'doubleShot','二連射',4,75,'attack',{multiHit:2}),S(10,'poisonArrow','毒矢',5,110,'attack',{status:'poison'}),S(15,'vitalAim','急所狙い',6,150,'attack',{critRateBonus:.20}),S(20,'arrowVolley','五月雨撃ち',8,90,'attack',{allTargets:true}),S(30,'tripleShot','三連射',10,70,'attack',{multiHit:3}),S(40,'piercingArrow','貫通矢',12,190,'attack',{defensePierce:.25}),S(50,'eagleEye','鷹の眼',10,0,'buff',{selfBuff:{attackPct:.12,critRate:.12},turns:3}),S(70,'arrowRain','アローレイン',18,150,'attack',{allTargets:true}),S(90,'rapidShot','神速連射',24,85,'attack',{multiHit:4}),S(100,'starPiercer','星穿ち',30,380,'attack',{critRateBonus:.10})],
 healer:[S(1,'heal','ヒール',4,30,'heal',{flatHeal:30}),S(5,'lightBolt','ライトボルト',5,125,'magic',{kind:'magic',element:'light'}),S(15,'highHeal','ハイヒール',10,85,'heal'),S(30,'holy','ホーリー',16,210,'magic',{kind:'magic',element:'light'}),S(40,'resurrection','リザレクション',20,30,'revive',{hpRatio:.3}),S(50,'grandHeal','グランドヒール',25,150,'heal'),S(80,'divineRay','ディバインレイ',44,360,'magic',{kind:'magic',element:'light'})],

 blackMage:[S(1,'dark','ダーク',4,135,'magic',{kind:'magic',element:'dark'}),S(5,'poison','ポイズン',6,0,'magic',{kind:'magic',element:'dark',status:'poison'}),S(10,'darkness','ダークネス',9,180,'magic',{kind:'magic',element:'dark'}),S(15,'weak','ウィーク',10,0,'magic',{kind:'magic',element:'dark',debuff:{attack:-1,defense:-1}}),S(20,'curse','カース',12,120,'magic',{kind:'magic',element:'dark',status:'curse'}),S(30,'darkWave','ダークウェーブ',18,230,'magic',{kind:'magic',element:'dark',allTargets:true}),S(40,'venom','ベノム',22,160,'magic',{kind:'magic',element:'dark',status:'poison',strongStatus:true}),S(50,'blackHole','ブラックホール',30,310,'magic',{kind:'magic',element:'dark',allTargets:true,debuff:{speed:-1}}),S(70,'darkMatterBlack','ダークマター',42,430,'magic',{kind:'magic',element:'dark',debuff:{defense:-1}}),S(90,'abyss','アビス',60,560,'magic',{kind:'magic',element:'dark',allTargets:true,status:'curse'})],
 redMage:[S(1,'redEdge','紅蓮剣',5,145),S(10,'aquaEdge','水刃剣',8,170),S(25,'thunderEdge','雷鳴剣',12,210),S(40,'dualCast','二重詠唱',20,270,'magic',{kind:'magic'}),S(65,'arcaneEdge','アルカナエッジ',32,340),S(95,'chainMagic','連続魔',60,480,'magic',{kind:'magic'})],
 whiteMage:[S(1,'highHeal','ハイヒール',7,80,'heal'),S(10,'holy','ホーリー',10,170,'magic',{kind:'magic',element:'light'}),S(25,'areaHeal','エリアヒール',16,115,'heal'),S(45,'holyRain','ホーリーレイン',24,260,'magic',{kind:'magic',element:'light'}),S(75,'grandHeal','グランドヒール',34,190,'heal'),S(95,'lifeMiracle','生命の奇跡',80,260,'heal')],
 darkKnight:[S(1,'darkSlash','暗黒斬り',4,150),S(10,'bloodEdge','ブラッドエッジ',8,185),S(25,'darkWave','ダークウェーブ',14,220,'magic',{kind:'magic',element:'dark'}),S(45,'soulEater','ソウルイーター',20,275),S(70,'abyssBlade','魔剣・深淵',34,360),S(95,'abyssOverdrive','アビス・オーバードライブ',55,500)],
 pirateKing:[S(1,'quickCut','クイックカット',3,130),S(10,'twinRaid','ツインレイド',7,170),S(25,'pirateRush','パイレーツラッシュ',12,215),S(45,'criticalRaid','会心乱舞',20,290,'attack',{critRateBonus:.25}),S(70,'rebelSea','覇海・リベリオン',34,380),S(95,'plunder','略奪',50,450)],
 sniper:[S(1,'pinpointShot','ピンポイントショット',4,150),S(10,'armorPierce','アーマーピアス',8,180,'attack',{defenseDownPct:.15,bossDefenseDownPct:.05}),S(20,'doubleSnipe','ダブルスナイプ',12,105,'attack',{multiHit:2}),S(30,'sniperEagleEye','イーグルアイ',14,0,'buff',{selfBuff:{attackPct:.15,critRate:.15},turns:3}),S(45,'deadlyShot','デッドリーショット',20,300,'attack',{critRateBonus:.25}),S(60,'vitalBreak','バイタルブレイク',28,350,'attack',{defenseDownPct:.20,bossDefenseDownPct:.07}),S(75,'tripleSnipe','トリプルスナイプ',38,130,'attack',{multiHit:3}),S(90,'hawkEye','ホークアイ',45,0,'buff',{selfBuff:{attackPct:.22,critRate:.22},turns:3}),S(100,'lastBullet','ラスト・バレット',65,520,'attack',{critRateBonus:.30})],
 paladin:[S(1,'holySlash','ホーリースラッシュ',5,145),S(10,'shieldBash','シールドバッシュ',7,165),S(25,'saintHeal','セイントヒール',10,75,'heal'),S(45,'holyBreak','ホーリーブレイク',18,245),S(70,'divineBlade','ディバインブレード',32,350),S(95,'lastFortress','聖域・ラストフォートレス',60,200)],
 bard:[S(1,'sonicArrow','ソニックアロー',4,125),S(10,'healingSong','癒やしの旋律',7,55,'heal'),S(25,'discord','不協和音',11,175,'magic',{kind:'magic'}),S(45,'victoryMarch','勝利の行進',18,240),S(70,'soulRequiem','魂の鎮魂歌',30,330,'magic',{kind:'magic'}),S(95,'promiseChorus','約束の大合唱',60,210,'heal')],
 trickster:[S(1,'feint','フェイントカット',3,125),S(10,'poisonCard','ポイズンカード',6,155,'magic',{kind:'magic'}),S(25,'shuffleEdge','シャッフルエッジ',10,205),S(45,'jokerRaid','ジョーカーレイド',18,270,'attack',{critRateBonus:.2}),S(70,'chaosChain','カオスチェイン',30,350),S(95,'jokerReverse','ジョーカー・リバース',60,450)],
 bishop:[S(1,'saintHeal','セイントヒール',5,65,'heal'),S(10,'holyLight','ホーリーライト',7,150,'magic',{kind:'magic',element:'light'}),S(25,'resurrect','リザレクト',14,100,'heal'),S(45,'holyRain','ホーリーレイン',22,260,'magic',{kind:'magic',element:'light'}),S(70,'sacredJudge','セイクリッドジャッジ',34,350,'magic',{kind:'magic',element:'light'}),S(95,'heavenPact','天上の盟約',65,230,'heal')],
 highWizard:[S(1,'highFlare','ハイフレア',6,160,'magic',{kind:'magic',element:'fire'}),S(10,'highThunder','ハイサンダー',9,190,'magic',{kind:'magic',element:'thunder'}),S(25,'lux','ルクス',14,230,'magic',{kind:'magic',element:'light'}),S(45,'meteor','メテオ',24,300,'magic',{kind:'magic'}),S(70,'abyssNova','アビスノヴァ',38,390,'magic',{kind:'magic',element:'dark'}),S(95,'elementalCatastrophe','エレメンタル・カタストロフィ',70,540,'magic',{kind:'magic'})],
 berserker:[S(1,'wildBlow','ワイルドブロウ',2,145),S(10,'doubleCrash','ダブルクラッシュ',6,180),S(25,'grandSmash','グランドスマッシュ',11,230),S(45,'destroyBlow','デストロイブロウ',18,300),S(70,'beastRush','獣王乱舞',30,390),S(95,'ragnarokRage','ラグナロク・レイジ',55,540)]
};
for(const [job,skills] of Object.entries(HIGH_LEVEL_SKILLS))BOOK[job].push(...skills);
const HEALING_JOBS=new Set(['healer','whiteMage','paladin','bard','bishop']);
const HIGH_CLEAR_IDS=new Set(['highHeal','areaHeal','grandHeal','lifeMiracle','promiseChorus','heavenPact']);
const JOB_TIER_DAMAGE_MULTIPLIER={advanced:1.20,special:1.30};
// 2026-10-09: MP resource management rebalance. Early skills remain usable, while later/mastery skills cost progressively more.
function balancedMpCost(skill){
 const base=Math.max(0,Number(skill?.mp??0)),lv=Math.max(1,Number(skill?.level??1));
 if(base<=0)return 0;
 const mult=lv<=10?1.5:lv<=30?1.75:lv<=50?2:lv<=80?2.25:lv<=100?2.5:lv<=150?2.75:lv<=200?3:lv<=250?3.25:3.5;
 return Math.max(1,Math.ceil(base*mult));
}
function applyJobTierDamageBonus(jobId,skill){
 const s={...skill},tier=JOBS[jobId]?.unlock?.type,mult=JOB_TIER_DAMAGE_MULTIPLIER[tier]??1;
 if(mult>1&&(s.type==='attack'||s.type==='magic'||s.kind==='magic')&&Number(s.power??0)>0){s.basePower=s.power;s.power=Math.round(Number(s.power)*mult);s.jobTierDamageMultiplier=mult;}
 return s;
}
function enrichHealingSkill(jobId,skill){const s=applyJobTierDamageBonus(jobId,skill);s.baseMp=Number(s.mp??0);s.mp=balancedMpCost(s);s.attributeSourceDescription=s.description??'';if(s.type==='attack'||s.type==='magic'||s.kind==='magic')s.element=['dragoon','summoner'].includes(jobId)&&['fire','water','thunder','ice','light','dark'].includes(s.element)?s.element:getSkillElement(s);else s.element='none';if(s.type==='heal'&&HEALING_JOBS.has(jobId)){if(s.id==='highHeal')s.target='all';if(HIGH_CLEAR_IDS.has(s.id)||s.level>=75)s.highClear=true;else s.clear=true;}if(s.type==='heal'){if(s.target==='all'&&s.level>=50&&s.fullHeal!==false)s.fullHeal=true;else if(s.target!=='all')s.healRatio=s.level>=200?.8:s.level>=100?.7:s.level>=50?.6:s.level>=25?.5:s.level>=10?.4:.3;}s.description=describeSkill(s);s.generatedDescription=true;return s;}
// 特技・魔法の共有グループ。装備グループとは独立したルールです。
// 2026-10-08: 物理/魔法の2分割から、剣士系・魔法使い系・盗賊系・赤魔専用へ再編。
export const SKILL_SOURCE_GROUPS={
 swordsman:['swordsman','fighter','darkKnight','paladin','gunbreaker','berserker','dragoon'],
 mage:['mage','healer','whiteMage','blackMage','bard','bishop','astrologian','highWizard','summoner'],
 thief:['thief','archer','sniper','pirateKing','trickster'],
 redMage:['redMage','swordsman','mage','healer','whiteMage','blackMage','highWizard']
};
const SKILL_FAMILY_BY_JOB=new Map([
 ...SKILL_SOURCE_GROUPS.swordsman.map(job=>[job,'swordsman']),
 ...SKILL_SOURCE_GROUPS.mage.map(job=>[job,'mage']),
 ...SKILL_SOURCE_GROUPS.thief.map(job=>[job,'thief']),
 ['redMage','redMage']
]);
export function getSkillInheritanceFamily(job){return SKILL_FAMILY_BY_JOB.get(job)??null;}
export function getAllowedSkillSourceJobs(job){const family=getSkillInheritanceFamily(job);return family?[...(SKILL_SOURCE_GROUPS[family]??[])]:[];}
function canInheritSkill(current,source){return getAllowedSkillSourceJobs(current).includes(source);}
// Keep current-job IDs compatible with existing saved loadouts. Inherited
// variants are qualified by source job so equal IDs never change their effects.
export function getCharacterSkillCatalog(character){
 const current=character?.currentJob??'swordsman',allowed=getAllowedSkillSourceJobs(current);
 const jobs=[...(allowed.includes(current)?[current]:[]),...allowed.filter(job=>job!==current)].filter(job=>Number(character?.jobLevels?.[job]??(job===current?1:0))>=1);
 return jobs.flatMap(job=>(BOOK[job]??[]).filter(()=>canInheritSkill(current,job)).map(raw=>{
  const s=enrichHealingSkill(job,raw),inherited=job!==current;
  return {...s,sourceJob:job,originalId:s.id,
   id:inherited?`${job}::${s.id}`:s.id,
   name:inherited?`${s.name}（${JOBS[job]?.name??job}）`:s.name,
   learned:s.level<=Number(character?.jobLevels?.[job]??(job===current?1:0))};
 }));
}
export function getLearnedBattleSkills(character){return getCharacterSkillCatalog(character).filter(s=>s.learned);}
export function getSkillBook(jobId){return (BOOK[jobId]??[]).map(s=>enrichHealingSkill(jobId,s));}

export function skillMetricLabel(skill){if(!skill)return '';if(skill.type==='buff')return skill.description??(skill.target==='all'?'味方全員を強化':'自己強化');if(skill.type==='heal')return `回復力 ${skill.power??0} / ${skill.highClear?'ハイクリア（味方全員の状態異常解除）':'クリア（状態異常解除）'}`;if(skill.type==='revive')return `蘇生HP ${Math.round((skill.hpRatio??((skill.power??0)/100))*100)}%`;if(Number.isFinite(skill.power))return `威力：${skill.power}%`;return '';}

export const BATTLE_SKILL_LIMIT=10;
function defaultBattleSkillIds(character){const current=character?.currentJob??'swordsman',learned=getLearnedBattleSkills(character).filter(s=>s.level<=100),own=learned.filter(s=>s.sourceJob===current),pool=own.length?own:learned;return pool.slice(-BATTLE_SKILL_LIMIT).map(s=>s.id);}
export function getSelectedSkillIds(character){
 const job=character?.currentJob??'swordsman',ids=character?.battleSkillLoadouts?.[job];
 if(!Array.isArray(ids)||character?.battleSkillLoadoutManual?.[job]===false)return defaultBattleSkillIds(character);
 const learned=new Set(getLearnedBattleSkills(character).map(s=>s.id));
 return [...new Set(ids)].filter(id=>learned.has(id)).slice(0,BATTLE_SKILL_LIMIT);
}
export function getBattleSkills(character){const all=new Map(getLearnedBattleSkills(character).map(s=>[s.id,s]));return getSelectedSkillIds(character).map(id=>all.get(id)).filter(Boolean);}
const AUTO_ROLE_BY_JOB={
 healer:'healer',whiteMage:'healer',bishop:'healer',astrologian:'healer',
 bard:'support',paladin:'support',gunbreaker:'support',redMage:'redMage',summoner:'mage',dragoon:'physical',
 mage:'mage',blackMage:'mage',highWizard:'mage',
 swordsman:'physical',fighter:'physical',darkKnight:'physical',berserker:'physical',
 thief:'thief',archer:'thief',sniper:'thief',pirateKing:'thief',trickster:'thief'
};
const AUTO_BATTLE_SKILL_LIMIT=6;
const AUTO_PROFILE={
 healer:{offense:2,heal:2,revive:1,buff:1},
 support:{offense:3,heal:1,revive:0,buff:2},
 redMage:{offense:3,heal:1,revive:1,buff:1},
 mage:{offense:5,heal:0,revive:0,buff:1},
 physical:{offense:5,heal:0,revive:0,buff:1},
 thief:{offense:5,heal:0,revive:0,buff:1}
};
function autoOffenseScore(s){
 const hits=Math.max(1,Number(s.multiHit??1)),power=Math.max(0,Number(s.power??0));
 let score=power*hits;
 if(s.allTargets)score+=Math.max(140,power*.55);
 score+=Number(s.defensePierce??0)*520+Number(s.critRateBonus??0)*360+Number(s.defenseDownPct??0)*420+Number(s.bossDefenseDownPct??0)*300;
 if(s.status)score+=120;if(s.strongStatus)score+=90;if(s.debuff)score+=120;
 score+=Math.min(120,Number(s.level??0)*.35)-Math.max(0,Number(s.mp??0))*.65;
 return score;
}
function autoHealScore(s){
 let score=Math.max(0,Number(s.power??s.flatHeal??0));
 score+=Number(s.healRatio??0)*900;
 if(s.target==='all')score+=350;if(s.fullHeal)score+=1400;if(s.highClear)score+=260;else if(s.clear)score+=100;
 score+=Math.min(100,Number(s.level??0)*.3)-Math.max(0,Number(s.mp??0))*.5;
 return score;
}
function autoBuffScore(s){
 const b=s.selfBuff??{};let pct=0;for(const v of Object.values(b))if(Number.isFinite(Number(v)))pct+=Math.max(0,Number(v));
 return pct*1000+(s.target==='all'?300:0)+Math.max(0,Number(s.turns??0))*25+Math.min(100,Number(s.level??0)*.3)-Math.max(0,Number(s.mp??0))*.4;
}
function autoReviveScore(s){return 900+Number(s.hpRatio??((s.power??0)/100))*1200-Math.max(0,Number(s.mp??0))*.5;}
function autoGeneralScore(s,role){
 if(s.type==='heal')return autoHealScore(s)*(role==='healer'?1.15:role==='support'||role==='redMage'?1:.72);
 if(s.type==='revive')return autoReviveScore(s)*(role==='healer'||role==='redMage'?1.1:.7);
 if(s.type==='buff')return autoBuffScore(s)*(role==='support'?1.15:1);
 return autoOffenseScore(s);
}
function autoUniqueKey(s){return String(s.originalId??s.id).replace(/^.*::/,'');}
export function getRecommendedBattleSkillIds(character){
 const learned=getLearnedBattleSkills(character);if(!learned.length)return [];
 const role=AUTO_ROLE_BY_JOB[character?.currentJob]??'physical',profile=AUTO_PROFILE[role]??AUTO_PROFILE.physical;
 const chosen=[],keys=new Set();
 const add=s=>{if(!s||chosen.length>=AUTO_BATTLE_SKILL_LIMIT)return false;const key=autoUniqueKey(s);if(keys.has(key))return false;chosen.push(s);keys.add(key);return true;};
 const sorted=(arr,score)=>[...arr].sort((a,b)=>score(b)-score(a));
 const offense=learned.filter(s=>s.type==='attack'||s.type==='magic');
 const heals=learned.filter(s=>s.type==='heal');
 const revives=learned.filter(s=>s.type==='revive');
 const buffs=learned.filter(s=>s.type==='buff');
 const addTop=(arr,count,score)=>{for(const s of sorted(arr,score)){if(count<=0||chosen.length>=AUTO_BATTLE_SKILL_LIMIT)break;if(add(s))count--;}};
 // 役割技を先に確保。回復職・支援職が高威力技だけで埋まるのを防ぐ。
 addTop(revives,profile.revive,autoReviveScore);
 addTop(heals,profile.heal,autoHealScore);
 addTop(buffs,profile.buff,autoBuffScore);
 // 攻撃枠には、全体技と低燃費技を最低1つずつ優先して混ぜる。
 let offenseNeed=profile.offense;
 const bestAoe=sorted(offense.filter(s=>s.allTargets),autoOffenseScore)[0];if(offenseNeed>0&&add(bestAoe))offenseNeed--;
 const cheap=sorted(offense,(a)=>autoOffenseScore(a)/Math.max(3,Number(a.mp??0)+3))[0];if(offenseNeed>0&&add(cheap))offenseNeed--;
 addTop(offense,offenseNeed,autoOffenseScore);
 // 空き枠は現在ジョブの役割を考慮した総合点で埋める。
 addTop(learned,AUTO_BATTLE_SKILL_LIMIT-chosen.length,s=>autoGeneralScore(s,role));
 // おまかせ編成後は、上から「回復 → バフ・デバフ → 攻撃」。
 // 攻撃枠は低火力から高火力へ並べ、最下段を切り札にする。
 const autoMenuGroup=s=>{
  if(s.type==='heal'||s.type==='revive')return 0;
  const power=Math.max(0,Number(s.power??0))*Math.max(1,Number(s.multiHit??1));
  const pureDebuff=(s.type==='attack'||s.type==='magic')&&power<=0&&(s.debuff||s.status||Number(s.defenseDownPct??0)>0||Number(s.bossDefenseDownPct??0)>0);
  if(s.type==='buff'||pureDebuff)return 1;
  return 2;
 };
 const autoMenuScore=s=>{
  const group=autoMenuGroup(s);
  if(group===0){
   // 回復は通常回復を上、蘇生や大回復を下へ。
   return s.type==='revive'?100000+autoReviveScore(s):autoHealScore(s);
  }
  if(group===1)return autoGeneralScore(s,role);
  return autoOffenseScore(s);
 };
 return chosen.sort((a,b)=>{
  const ga=autoMenuGroup(a),gb=autoMenuGroup(b);
  if(ga!==gb)return ga-gb;
  // 攻撃だけは昇順。最も高火力な技が一番下に来る。
  if(ga===2)return autoMenuScore(a)-autoMenuScore(b);
  return autoMenuScore(b)-autoMenuScore(a);
 }).slice(0,AUTO_BATTLE_SKILL_LIMIT).map(s=>s.id);
}
export function getRecommendedBattleSkillSummary(character,ids=getRecommendedBattleSkillIds(character)){
 const all=new Map(getLearnedBattleSkills(character).map(s=>[s.id,s])),counts={攻撃:0,回復:0,蘇生:0,補助:0};
 for(const id of ids){const s=all.get(id);if(!s)continue;if(s.type==='heal')counts.回復++;else if(s.type==='revive')counts.蘇生++;else if(s.type==='buff')counts.補助++;else counts.攻撃++;}
 return Object.entries(counts).filter(([,n])=>n>0).map(([k,n])=>`${k}${n}`).join(' / ');
}

export function setBattleSkillLoadout(character,ids){
 if(!Array.isArray(ids)||ids.length>BATTLE_SKILL_LIMIT)throw new Error('セットできる特技・魔法は10個までです');
 if(new Set(ids).size!==ids.length)throw new Error('同じ特技・魔法は重複してセットできません');
 const learned=new Set(getLearnedBattleSkills(character).map(s=>s.id));if(ids.some(id=>!learned.has(id)))throw new Error('現在のジョブの系統に対応した、習得済みの特技・魔法だけセットできます');
 character.battleSkillLoadouts??={};character.battleSkillLoadoutManual??={};character.battleSkillLoadouts[character.currentJob]=[...ids];character.battleSkillLoadoutManual[character.currentJob]=true;return [...ids];
}
export function normalizeBattleSkillLoadouts(character){
 const source=character.battleSkillLoadouts??{},manual=character.battleSkillLoadoutManual??{};
 character.battleSkillLoadouts={};character.battleSkillLoadoutManual={};
 for(const job of Object.keys(BOOK)){
  if(!Object.hasOwn(source,job)&&job!==character.currentJob)continue;
  const proxy={...character,currentJob:job},learned=new Set(getLearnedBattleSkills(proxy).map(s=>s.id));
  const existing=Array.isArray(source[job]),filtered=existing?[...new Set(source[job])].filter(id=>learned.has(id)).slice(0,BATTLE_SKILL_LIMIT):[];
  // 旧ルールの技だけが残って全消去になる場合は、新グループから安全に初期セットへ移行する。
  const resetToDefault=existing&&source[job].length>0&&filtered.length===0;
  character.battleSkillLoadouts[job]=!existing||resetToDefault?defaultBattleSkillIds(proxy):filtered;
  character.battleSkillLoadoutManual[job]=existing&&!resetToDefault?manual[job]!==false:false;
 }
 return character;
}
