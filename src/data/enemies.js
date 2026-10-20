import { STORY_CHAPTERS } from './story.js';
import { NEW_MONSTERS,newMonsterMaterialId } from './new-monsters.js';
import { HALLOWEEN_ENEMY_LIST } from './events.js';
import { ECLIPSE_ENEMY_LIST } from './eclipse-enemies.js';
import { RARE_MONSTER_LIST } from './rare-monsters.js';
import { elementProfile, regionElement, normalizeElement } from '../core/elements.js';
const regions=['field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss'];
const names=['スライム','ウルフ','バット','ゴブリン','ボア','ホーネット','リザード','ゴーレム','レイス','ドラゴネット'];
const list=[];
for(let r=0;r<10;r++)for(let i=0;i<10;i++){
 const n=r*10+i+1;const id=`monster${String(n).padStart(3,'0')}`;
 list.push({id,name:`${names[i]}${r?`・${r+1}`:''}`,regionId:regions[r],weight:10,level:1+r*10+i,enemyClass:r>=7?'strong':'normal',materials:{normal:`${id}-material`,rare:`${id}-rare`},...elementProfile(regionElement(regions[r])),skills:[]});
}
list[0]={...list[0],id:'slime',name:'スライム'};
list[24]={...list[24],id:'stormSiren',name:'嵐歌のセイレーン',regionId:'coast',rare:true,weight:1,conditions:{time:'night',weather:'rain',storyFlag:'rareGate',itemId:'moonToken'}};
// Keep the chapter 8 volcano Golem: the Mimic is an EXTRA rare ruins encounter.
list.push({...list[77],id:'mimic',name:'ミミック',regionId:'ruins',rare:true,weight:.5,materials:{normal:'ミミックの欠片',rare:'ミミックの魔核'}});
for(const monster of NEW_MONSTERS)list.push({id:monster.id,name:monster.name,regionId:monster.regionId,allRegions:true,weight:monster.weight,level:monster.level,enemyClass:'normal',materials:Object.fromEntries(['normal','uncommon','rare'].map(kind=>[kind,newMonsterMaterialId(monster,kind)])),materialNames:monster.materialNames,materialChances:{normal:.28,uncommon:.12,rare:.03},combatScale:monster.combatScale,ai:monster.ai,...elementProfile(monster.element)});
const storyBosses=STORY_CHAPTERS.map((chapter,index)=>({
 id:`storyBoss-${chapter.regionId}`,
 name:chapter.bossName,
 regionId:chapter.regionId,
 level:(index+1)*10,
 cycle:1,
 enemyClass:'boss',
 bestiaryCategory:'storyBoss',
 isBoss:true,
 ...elementProfile(normalizeElement(chapter.bossElement)==='none'?regionElement(chapter.regionId):normalizeElement(chapter.bossElement)),
 skills:['全体強襲']
}));
const newGamePlusStoryBosses=STORY_CHAPTERS.map((chapter,index)=>({
 id:`storyBoss-ngp-${chapter.regionId}`,
 name:chapter.bossName,
 regionId:chapter.regionId,
 level:110+index*10,
 cycle:2,
 enemyClass:'boss',
 bestiaryCategory:'storyBoss',
 isBoss:true,
 enhanced:true,
 ...elementProfile(normalizeElement(chapter.bossElement)==='none'?regionElement(chapter.regionId):normalizeElement(chapter.bossElement)),
 skills:['全体強襲']
}));
export const NORMAL_ENEMY_LIST=list;
export const STORY_BOSS_LIST=[...storyBosses,...newGamePlusStoryBosses];
export const STORY_BOSS_FIRST_LIST=storyBosses;
export const STORY_BOSS_NGP_LIST=newGamePlusStoryBosses;
export const ENEMY_LIST=[...NORMAL_ENEMY_LIST,...STORY_BOSS_LIST];
export { RARE_MONSTER_LIST };
export const ENEMIES=Object.fromEntries([...ENEMY_LIST,...HALLOWEEN_ENEMY_LIST,...ECLIPSE_ENEMY_LIST,...RARE_MONSTER_LIST].map(e=>[e.id,e]));
