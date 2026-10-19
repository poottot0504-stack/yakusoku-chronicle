// Five Halloween event monsters reuse the game's existing pixel-art atlases.
// Never mark the fourth enemy as a global rareMonster: those skip ordinary drops.
export const ECLIPSE_ENEMIES=Object.freeze({
 slime:Object.freeze({id:'event-eclipse-slime',name:'星蝕のスライム',element:'dark',event:true,eclipseEvent:true,enemyClass:'normal',materials:{normal:'eclipseShard',rare:'riftStone'}}),
 mimic:Object.freeze({id:'event-eclipse-mimic',name:'異界のミミック',element:'dark',event:true,eclipseEvent:true,enemyClass:'normal',materials:{normal:'riftStone',rare:'eclipseShard'}}),
 wraith:Object.freeze({id:'event-eclipse-wraith',name:'宵闇のレイス',element:'dark',event:true,eclipseEvent:true,enemyClass:'strong',materials:{normal:'wraithVeil',rare:'voidCrystal'}}),
 dragonet:Object.freeze({id:'event-eclipse-dragonet',name:'星喰いドラゴネット',element:'dark',event:true,eclipseEvent:true,enemyClass:'strong',materials:{normal:'voidCrystal',rare:'riftStone'}}),
 nox:Object.freeze({id:'event-eclipse-nox',name:'星蝕の支配者・ノクス',element:'dark',event:true,eclipseEvent:true,enemyClass:'boss',isBoss:true,materials:{normal:'voidCrystal',rare:'noxCore'}})
});
export const ECLIPSE_ENEMY_LIST=Object.freeze(Object.values(ECLIPSE_ENEMIES));
