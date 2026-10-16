export const HALLOWEEN_EVENT={
 id:'halloween-2026',
 name:'幻月祭 ～パンプキンキングの夜～',
 announcementStart:Date.parse('2026-09-30T15:00:00Z'),
 startsAt:Date.parse('2026-10-02T15:00:00Z'),
 endsAt:Date.parse('2026-10-05T15:00:00Z'),
 characterExpMultiplier:2.5,
 dropRateMultiplier:1.5,
 banner:'./assets/halloween-2026.webp'
};

export const HALLOWEEN_ENEMIES={
 pumpkinSlime:{id:'event-halloween-pumpkin-slime',name:'パンプキンスライム',element:'fire',event:true,enemyClass:'normal',materials:{normal:'pumpkinShard',rare:'magicCandy'}},
 ghostWolf:{id:'event-halloween-ghost-wolf',name:'ゴーストウルフ',element:'dark',event:true,enemyClass:'normal',materials:{normal:'ghostCloth',rare:'moonCrystal'}},
 candyMimic:{id:'event-halloween-candy-mimic',name:'キャンディミミック',element:'light',event:true,enemyClass:'strong',materials:{normal:'magicCandy',rare:'moonCrystal'}},
 moonWraith:{id:'event-halloween-moon-wraith',name:'幻月のレイス',element:'dark',event:true,enemyClass:'strong',materials:{normal:'ghostCloth',rare:'moonCrystal'}},
 pumpkinKing:{id:'event-halloween-pumpkin-king',name:'幻月のパンプキンキング',element:'fire',event:true,enemyClass:'boss',isBoss:true,materials:{normal:'pumpkinShard',rare:'moonCrystal'}}
};
export const HALLOWEEN_ENEMY_LIST=Object.values(HALLOWEEN_ENEMIES);
export const HALLOWEEN_ENEMY_BY_ID=Object.fromEntries(HALLOWEEN_ENEMY_LIST.map(x=>[x.id,x]));

export const TRAINING_FESTIVAL={
 id:'training-festival-2026',name:'英雄の修練祭',
 announcementStart:Date.parse('2026-10-04T15:00:00Z'),
 startsAt:Date.parse('2026-10-09T15:00:00Z'),endsAt:Date.parse('2026-10-12T15:00:00Z'),
 characterExpMultiplier:1,jobExpMultiplier:2,dropRateMultiplier:2.5,banner:'./assets/training-festival-2026.png'
};
export const TRAINING_FESTIVAL_ENEMIES={
 swordsman:{id:'event-training-swordsman',name:'剣の達人',element:'fire',enemyClass:'strong',materials:{normal:'pumpkinShard',rare:'moonCrystal'}},
 mage:{id:'event-training-mage',name:'魔法の達人',element:'thunder',enemyClass:'strong',materials:{normal:'magicCandy',rare:'moonCrystal'}},
 thief:{id:'event-training-thief',name:'影の達人',element:'dark',enemyClass:'strong',materials:{normal:'ghostCloth',rare:'magicCandy'}},
 fighter:{id:'event-training-fighter',name:'拳の達人',element:'fire',enemyClass:'strong',materials:{normal:'pumpkinShard',rare:'ghostCloth'}},
 healer:{id:'event-training-healer',name:'癒しの達人',element:'light',enemyClass:'strong',healer:true,materials:{normal:'magicCandy',rare:'moonCrystal'}},
 master:{id:'event-training-master',name:'伝説の教官',element:'light',enemyClass:'boss',isBoss:true,materials:{normal:'pumpkinShard',rare:'moonCrystal'}}
};

export const TWIN_STAR_FESTIVAL={
 id:'twin-star-festival-2026',name:'双星の成長祭',
 announcementStart:Date.parse('2026-10-20T15:00:00Z'),
 startsAt:Date.parse('2026-10-22T15:00:00Z'),endsAt:Date.parse('2026-10-26T15:00:00Z'),
 characterExpMultiplier:2,jobExpMultiplier:2,banner:'./assets/twin-star-festival-2026.png'
};
