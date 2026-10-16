import {SPECIAL_JOB_QUESTS,QUESTS} from '../data/quests.js';
import {STORY_BY_REGION} from '../data/story.js';
import {JOBS} from '../data/jobs.js';
import {LEGENDARY_EQUIPMENT_BY_CHARACTER} from '../data/equipment.js';
import {OATHBREAKERS} from './oathbreakers.js';
import {canCraftPromiseChronicle} from './promise-chronicle.js';
import {ENEMY_LIST} from '../data/enemies.js';
import {ACHIEVEMENTS} from '../data/achievements.js';
const owned=(s,id)=>s.equipmentInventory?.some(x=>x.equipmentId===id);
export function getAdventureGuide(state){
 const story=state.story??{},end=state.endgame??{},hero=state.characters?.find(c=>c.isHero)??state.characters?.[0],lv=hero?.level??1;
 const first=!!story.firstEndingSeen||(state.cycle??1)>=2,truth=!!story.trueEndingSeen,saved=end.eidelEnding==='saved'||end.complete===true;
 const row=(id,name,done,ready,hint,target='endgame',visible=true)=>({id,name:visible||done?name:'？？？',done:!!done,ready:!done&&!!ready,hint:visible||done?hint:'物語を進めると詳細が分かります。',target});
 const storyRows=[row('first','第一エンディング',first,true,'各地域で3勝し、出現したボスを倒して物語を進めよう。','adventure'),row('second','2周目への旅立ち',(state.cycle??1)>=2,first,'第一エンディング画面から2周目を始めよう。','ending',first),row('smith','伝説の鍛冶師',story.blacksmithDefeated,(state.cycle??1)>=2&&lv>=195,'2周目で主人公Lv195を目指し、最終試練へ。','endgame',first),row('true','真エンディング',truth,(state.cycle??1)>=2&&lv>=200&&story.blacksmithDefeated,'伝説の鍛冶師を倒し、主人公Lv200で最後の試練へ。','endgame',first)];
 const special=Object.values(SPECIAL_JOB_QUESTS).map(q=>{const rec=state.quests?.[q.finalQuestId],done=state.unlockedSpecialJobs?.includes(q.jobId)||rec?.status==='completed',ready=q.prereq(state.specialJobProgress?.[q.jobId]??{},state);return row(q.jobId,JOBS[q.jobId].name,done,ready,rec?.status==='ready'?`${q.locationLabel}の依頼主へ報告しよう。`:rec?.status==='accepted'?`受注済みの試練を突破し、依頼主へ報告しよう。`:`${q.locationLabel}：${q.prerequisiteText}`,['bard','trickster','berserker'].includes(q.jobId)?'town':'jobs');});
 const legends=Object.entries(LEGENDARY_EQUIPMENT_BY_CHARACTER).map(([id,equipmentId])=>row(id,`${state.characters?.find(c=>c.id===id)?.name??'仲間'}の伝説武器`,story.legendaryTrialsCompleted?.includes(id)||owned(state,equipmentId),(state.cycle??1)>=2&&lv>=190,'主人公Lv190から最終試練の「伝説装備試練」に挑戦。','endgame',first));
 const clears=end.oathbreakerClears??{},firstThree=OATHBREAKERS.slice(0,3).every(o=>clears[o.id]),nextFour=OATHBREAKERS.slice(3,7).every(o=>clears[o.id]);
 const oaths=OATHBREAKERS.map((o,i)=>row(o.id,o.name,clears[o.id],truth&&(i<3||firstThree&&(i<7||nextFour)),truth?'最終試練から挑戦。最初の3体、その次の4体を倒すと先へ進める。':'真エンディングの先に、新たな試練が待っている。','endgame',truth&&(i<3||firstThree&&(i<7||nextFour))));
 const allOaths=OATHBREAKERS.every(o=>clears[o.id]),promise=canCraftPromiseChronicle(state);
 const finale=[row('eidel','エイデル撃破',!!end.eidelEnding||saved,truth&&allOaths,truth?'十三の背約者をすべて倒し、最後の扉へ。':'真エンディングの先で最後の扉を探そう。','endgame',truth&&allOaths),row('saved','失われた約束の救済',saved,truth&&allOaths,truth&&allOaths?(promise.already?'エイデルのHPを半分以下にし、どうぐから「約束のクロニクル」を使おう。':promise.ok?'鍛冶屋 → 装備生産 → 指輪で「失われた約束を復元する」を選ぼう。':'背約者からかけら12個と「最初の約束」を集めよう。'):'最後の戦いには、もうひとつの結末がある。','endgame',truth&&allOaths)];
 const groups=[{id:'story',name:'物語',rows:storyRows},{id:'jobs',name:'特殊ジョブ',rows:special},{id:'legends',name:'伝説装備試練',rows:legends},{id:'oaths',name:'隠しボス',rows:oaths},{id:'finale',name:'最後の結末',rows:finale}];
 for(const g of groups){g.total=g.rows.length;g.done=g.rows.filter(r=>r.done).length;}
 const total=groups.reduce((n,g)=>n+g.total,0),done=groups.reduce((n,g)=>n+g.done,0);
 const quests=Object.values(QUESTS).filter(q=>!q.specialJob&&!q.temporary&&!q.eventId),achievements=Object.values(ACHIEVEMENTS).filter(a=>a.category!=='event');
 const extras=[{name:'通常クエスト',done:quests.filter(q=>state.quests?.[q.id]?.status==='completed').length,total:quests.length,target:'quests'},{name:'魔物図鑑・通常種の討伐',done:ENEMY_LIST.filter(e=>(state.bestiary?.[e.id]?.defeats??0)>0).length,total:ENEMY_LIST.length,target:'bestiary'},{name:'常設実績',done:achievements.filter(a=>state.achievements?.[a.id]?.unlocked).length,total:achievements.length,target:'achievements'}];
 const report=special.find(r=>!r.done&&r.hint.includes('依頼主へ報告しよう。')&&state.quests?.[SPECIAL_JOB_QUESTS[r.id].finalQuestId]?.status==='ready');
 let next=report??[...storyRows,...legends,...oaths,...finale].find(r=>!r.done&&r.ready)??special.find(r=>!r.done&&r.ready)??[...storyRows,...legends,...oaths,...finale,...special].find(r=>!r.done)??null;
 if(next?.id==='first'){
  const id=state.adventure?.regionId??'field',chapter=STORY_BY_REGION[id],wins=state.adventure?.regionWins?.[id]??0,cleared=state.adventure?.completedRegions?.includes(id);
  next={...next,hint:cleared?'ワールドマップで次の地域を選ぼう。入場Lvが足りなければ現在の地域で育成しよう。':wins>=3?`冒険画面の「ボス戦」から${chapter?.bossName??'地域のボス'}に挑もう。`:`現在の地域であと${Math.max(0,3-wins)}勝するとボス戦が解放されます。`};
 }
 return {groups,extras,total,done,next,saved,endingAvailable:!!end.eidelEnding||saved,percent:Math.floor(done/total*100)};
}
