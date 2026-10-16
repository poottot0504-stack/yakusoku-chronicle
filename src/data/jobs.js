const J=(id,name,stats,weaponTypes,shield='standard',unlock={type:'basic'},mastery={})=>({id,name,stats,weaponTypes,shield,unlock,mastery});
export const ALL_JOBS=[
J('swordsman','剣士',{attack:5,defense:5,magic:2,speed:3},['oneHandSword','greatSword','spear'],'standard',{type:'basic'},{attackPct:.02}),
J('mage','魔法使い',{attack:2,defense:2,magic:5,speed:4},['staff','greatStaff','mace'],'staffOnly',{type:'basic'},{magicPct:.02}),
J('thief','盗賊',{attack:3,defense:3,magic:2,speed:5},['dagger','dualBlades'],'small',{type:'basic'},{speedPct:.02}),
J('fighter','格闘家',{attack:5,defense:3,magic:1,speed:5},['fist'],'none',{type:'basic'},{maxHpPct:.02}),
J('healer','ヒーラー',{attack:1,defense:2,magic:5,speed:4},['staff','greatStaff','mace'],'standard',{type:'basic'},{maxMpPct:.02}),
J('archer','アーチャー',{attack:4,defense:2,magic:2,speed:5},['bow'],'none',{type:'basic',releaseId:'archer-sniper-2026'},{critRateBonus:.03}),
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
J('berserker','ベルセルク',{attack:5,defense:2,magic:1,speed:4},['greatSword','axe','fist','katana'],'none',{type:'special'},{physicalCritMultiplierBonus:.10})
];
const EQUIPMENT_GROUPS={
 swordsman:['swordsman'], mage:['magic'], healer:['magic'], thief:['thief'], fighter:['fighter'], archer:['archer'],
 redMage:['swordsman','magic'], whiteMage:['magic'], blackMage:['magic'],
 darkKnight:['swordsman','fighter'], pirateKing:['thief','fighter'], sniper:['archer'],
 paladin:['swordsman','magic'], bard:['thief','archer','magic'], trickster:['thief','magic'],
 gunbreaker:['swordsman'], astrologian:['magic'], bishop:['magic'], highWizard:['magic'], berserker:['swordsman','fighter']
};
for(const job of ALL_JOBS)job.equipmentGroups=[...(EQUIPMENT_GROUPS[job.id]??[])];

export const JOBS=Object.fromEntries(ALL_JOBS.map(j=>[j.id,j]));
