const J=(id,name,stats,weaponTypes,shield='standard',unlock={type:'basic'},mastery={})=>({id,name,stats,weaponTypes,shield,unlock,mastery});
export const ALL_JOBS=[
J('swordsman','剣士',{attack:5,defense:5,magic:2,speed:3},['oneHandSword','greatSword','spear'],'standard',{type:'basic'},{attackPct:.02}),
J('mage','魔法使い',{attack:2,defense:2,magic:5,speed:4},['staff','greatStaff','mace'],'staffOnly',{type:'basic'},{magicPct:.02}),
J('thief','盗賊',{attack:3,defense:3,magic:2,speed:5},['dagger','dualBlades'],'small',{type:'basic'},{speedPct:.02}),
J('fighter','格闘家',{attack:5,defense:3,magic:1,speed:5},['fist'],'none',{type:'basic'},{maxHpPct:.02}),
J('shielder','盾士',{attack:3,defense:6,magic:1,speed:2},['oneHandSword','spear','mace'],'standard',{type:'basic'},{defensePct:.04}),
J('healer','ヒーラー',{attack:1,defense:2,magic:5,speed:4},['staff','greatStaff','mace'],'standard',{type:'basic'},{maxMpPct:.02}),
J('archer','アーチャー',{attack:4,defense:2,magic:2,speed:5},['bow'],'none',{type:'basic',releaseId:'archer-sniper-2026'},{critRateBonus:.03}),
J('greatShielder','大盾士',{attack:4,defense:8,magic:1,speed:2},['oneHandSword','spear','mace'],'standard',{type:'advanced',requires:{shielder:30}},{defensePct:.08}),
J('redMage','赤魔道士',{attack:5,defense:3,magic:5,speed:4},['oneHandSword','dagger','staff','greatStaff'],'standard',{type:'advanced',requires:{swordsman:30,mage:30}},{magicSwordDamagePct:.10}),
J('whiteMage','白魔道士',{attack:2,defense:4,magic:5,speed:3},['staff','greatStaff','mace'],'standard',{type:'advanced',requires:{mage:30,healer:30}},{healingPct:.10}),
J('blackMage','黒魔術師',{attack:1,defense:2,magic:6,speed:4},['staff','greatStaff'],'staffOnly',{type:'advanced',requires:{mage:30}},{darkDamagePct:.10}),
J('darkKnight','暗黒騎士',{attack:5,defense:4,magic:3,speed:3},['oneHandSword','greatSword','axe','katana'],'standard',{type:'advanced',requires:{swordsman:30,fighter:30}},{hpCostDamagePct:.10}),
J('pirateKing','海賊王',{attack:5,defense:3,magic:3,speed:5},['dagger','oneHandSword','axe','bow'],'small',{type:'advanced',requires:{thief:30,fighter:30}},{stealSuccessBonus:.10}),
J('sniper','スナイパー',{attack:6,defense:2,magic:2,speed:5},['bow'],'none',{type:'advanced',requires:{archer:30},releaseId:'archer-sniper-2026'},{critRateBonus:.10}),
J('paladin','パラディン',{attack:4,defense:5,magic:4,speed:2},['oneHandSword','greatSword','spear','mace'],'standard',{type:'special'},{coverDamageReduction:.15}),
J('bard','吟遊詩人',{attack:3,defense:3,magic:5,speed:5},['bow','dagger','staff','oneHandSword','instrument'],'standard',{type:'special'},{songDurationBonus:1}),
J('trickster','トリックスター',{attack:3,defense:2,magic:5,speed:5},['dagger','bow','staff','oneHandSword','cards'],'small',{type:'special'},{statusDebuffSuccessBonus:.10}),
J('bishop','ビショップ',{attack:2,defense:4,magic:5,speed:3},['staff','greatStaff','mace'],'standard',{type:'special'},{statusResistance:.05}),
J('highWizard','ハイウィザード',{attack:1,defense:2,magic:5,speed:4},['staff','greatStaff'],'staffOnly',{type:'special'},{attackMagicDamagePct:.10}),
J('gunbreaker','ガンブレイカー',{attack:5,defense:5,magic:1,speed:3},['gunblade','oneHandSword'],'none',{type:'special'},{defensePct:.03}),
J('astrologian','占星術師',{attack:1,defense:3,magic:5,speed:4},['starGlobe','staff','cards'],'none',{type:'special'},{maxMpPct:.03}),
J('berserker','ベルセルク',{attack:5,defense:2,magic:1,speed:4},['greatSword','axe','fist','katana'],'none',{type:'special'},{physicalCritMultiplierBonus:.10}),
J('dragoon','竜騎士',{attack:6,defense:4,magic:2,speed:5},['spear','greatSword','oneHandSword'],'standard',{type:'special',requires:{paladin:30}},{physicalCritMultiplierBonus:.04}),
J('summoner','召喚士',{attack:1,defense:2,magic:6,speed:4},['staff','greatStaff','cards','starGlobe'],'none',{type:'special',requires:{blackMage:30}},{maxMpPct:.04})
];
const EQUIPMENT_GROUPS={
 shielder:['swordsman','magic','thief','fighter','archer'],greatShielder:['swordsman','magic','thief','fighter','archer'],
 swordsman:['swordsman'], mage:['magic'], healer:['magic'], thief:['thief'], fighter:['fighter'], archer:['archer'],
 redMage:['swordsman','magic'], whiteMage:['magic'], blackMage:['magic'],
 darkKnight:['swordsman','fighter'], pirateKing:['thief','fighter'], sniper:['archer'],
 paladin:['swordsman','magic'], bard:['thief','archer','magic'], trickster:['thief','magic'],
 gunbreaker:['swordsman'], astrologian:['magic'], bishop:['magic'], highWizard:['magic'], berserker:['swordsman','fighter'],
 dragoon:['swordsman'], summoner:['magic']
};
for(const job of ALL_JOBS)job.equipmentGroups=[...(EQUIPMENT_GROUPS[job.id]??[])];

export const JOBS=Object.fromEntries(ALL_JOBS.map(j=>[j.id,j]));

// Innate passives apply only while the job is equipped. Modest bonuses avoid
// stacking with permanent mastery, equipment and temporary battle buffs.
export const JOB_PASSIVES=Object.freeze({
 shielder:{stat:'defense',rate:.06,name:'守りの心得'},
 greatShielder:{stat:'defense',rate:.08,name:'不落の要塞'},
 swordsman:{stat:'attack',rate:.03,name:'剣の心得'},
 mage:{stat:'magic',rate:.03,name:'魔力の素養'},
 thief:{stat:'speed',rate:.03,name:'軽快な足取り'},
 fighter:{stat:'attack',rate:.025,name:'闘気'},
 healer:{stat:'defense',rate:.03,name:'守護の祈り'},
 archer:{stat:'speed',rate:.025,name:'狩人の集中'},
 redMage:{stat:'magic',rate:.025,name:'魔剣の共鳴'},
 whiteMage:{stat:'defense',rate:.035,name:'白き加護'},
 blackMage:{stat:'magic',rate:.035,name:'深淵の知恵'},
 darkKnight:{stat:'attack',rate:.03,name:'暗黒の闘志'},
 pirateKing:{stat:'speed',rate:.03,name:'海賊の機転'},
 sniper:{stat:'attack',rate:.035,name:'狙撃の極意'},
 paladin:{stat:'defense',rate:.04,name:'聖騎士の守り'},
 bard:{stat:'speed',rate:.025,name:'旅の旋律'},
 trickster:{stat:'speed',rate:.03,name:'道化の身軽さ'},
 bishop:{stat:'defense',rate:.035,name:'聖堂の庇護'},
 highWizard:{stat:'magic',rate:.04,name:'大魔導の叡智'},
 gunbreaker:{stat:'defense',rate:.035,name:'銃剣の構え'},
 astrologian:{stat:'magic',rate:.025,name:'星読みの才'},
 berserker:{stat:'attack',rate:.04,name:'狂戦士の本能'},
 dragoon:{stat:'attack',rate:.035,name:'竜槍の極意'},
 summoner:{stat:'magic',rate:.04,name:'幻獣との盟約'}
});
export function getJobPassive(jobId){return JOB_PASSIVES[jobId]??null;}

const PASSIVE_STAT_LABELS=Object.freeze({attack:'攻撃',defense:'防御',magic:'魔法',speed:'素早さ'});
/** UI description of the active-job-only passive; uses the same values as combat. */
export function describeJobPassive(jobId){
 const passive=getJobPassive(jobId);
 if(!passive)return '';
 return `${passive.name}（${PASSIVE_STAT_LABELS[passive.stat]}＋${Math.round(passive.rate*1000)/10}%）`;
}

/** Keep normal battles and raid formulas consistent without mutating saved stats. */
export function applyJobPassiveToStat(character,stat,value){
 const passive=getJobPassive(character?.currentJob);
 return passive?.stat===stat?Math.round(value*(1+passive.rate)):value;
}
