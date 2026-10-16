export const TRAINING_AREAS=[
 {id:'forgottenForest',name:'忘却の森',minLevel:200,maxLevel:220,icon:'🌲',materialId:'memoryBark'},
 {id:'burningCanyon',name:'灼熱の峡谷',minLevel:220,maxLevel:240,icon:'🔥',materialId:'blazeOre'},
 {id:'darkRuins',name:'常闇の廃都',minLevel:240,maxLevel:260,icon:'🌑',materialId:'nightRelic'},
 {id:'thunderTemple',name:'天雷の神殿',minLevel:260,maxLevel:280,icon:'⚡',materialId:'thunderCrystal'},
 {id:'finalRift',name:'終焉の狭間',minLevel:280,maxLevel:300,icon:'👁️',materialId:'riftShard'}
];
export function getTrainingAreas(state){return state.story?.trueEndingSeen||state.endgame?.unlocked?[...TRAINING_AREAS]:[];}
export function getTrainingAreaRecommendation(level){const lv=Math.max(200,Math.min(300,Number(level)||200));return TRAINING_AREAS.find(a=>lv>=a.minLevel&&(lv<a.maxLevel||a.maxLevel===300&&lv<=300))??TRAINING_AREAS.at(-1);}
export function getTrainingExpMultiplier(level,area){const lv=Number(level)||1;if(lv<=area.maxLevel)return 1;const over=lv-area.maxLevel;return Math.max(.2,1-over/80);}
export function makeTrainingEnemy(state,areaId){const area=TRAINING_AREAS.find(a=>a.id===areaId);if(!area||!getTrainingAreas(state).some(a=>a.id===areaId))throw new Error('この修練エリアはまだ解放されていません');const hero=state.characters?.find(c=>c.isHero)??state.characters?.[0],lv=Math.max(area.minLevel,Math.min(area.maxLevel,hero?.level??area.minLevel)),tier=TRAINING_AREAS.indexOf(area);const maxHp=Math.round(9000+(lv-190)*420+tier*9000);return {id:`training-${area.id}`,name:`${area.name}の異形`,level:lv,maxHp,hp:maxHp,maxMp:300,mp:300,stats:{attack:170+tier*38,defense:120+tier*30,magic:160+tier*40,speed:85+tier*18},ai:[{type:'attack'},{type:'attack',power:135}],enemyClass:'strong',exp:Math.round((16000+tier*6500)*getTrainingExpMultiplier(hero?.level??lv,area)),jobExp:9000+tier*3500,gold:7000+tier*4500,trainingAreaId:area.id,materialDrop:area.materialId};}
