import { ENEMIES } from './enemies.js';
export const recordedJobLevel=(character,jobId)=>{
 const direct=Number(character?.jobLevels?.[jobId]);
 if(Number.isFinite(direct))return direct;
 const legacyCandidates=[
  character?.jobs?.[jobId]?.level,
  character?.jobLevelHistory?.[jobId],
  character?.jobHistory?.[jobId]?.level,
  character?.currentJob===jobId?character?.jobLevel:undefined
 ];
 for(const value of legacyCandidates){const n=Number(value);if(Number.isFinite(n))return n;}
 return 0;
};
export const findTrainedCharacter=(state,a,b)=>(state?.characters??[]).find(c=>Number(c?.level??1)>=30&&recordedJobLevel(c,a)>=30&&recordedJobLevel(c,b)>=20)??null;
const trained=(state,a,b)=>!!findTrainedCharacter(state,a,b);
export const SPECIAL_JOB_QUESTS={
 gunbreaker:{jobId:'gunbreaker',finalQuestId:'trial-gunbreaker',npcId:'leonhart',name:'硝煙の誓い',locationLabel:'転職神殿',prerequisiteText:'同じ仲間がキャラLv30・剣士Lv30・格闘家Lv20',prereq:(_p,state)=>trained(state,'swordsman','fighter'),description:'銃剣教官の試練を受け、鉄銃の守護者を倒して仲間を守る力を示す。',reward:{equipmentIds:['weapon','head','body','arms','waist','legs','ring','charm'].map(p=>`gunbreaker-novice-${p}`)}},
 astrologian:{jobId:'astrologian',finalQuestId:'trial-astrologian',npcId:'selene',name:'星々の導き',locationLabel:'転職神殿',prerequisiteText:'同じ仲間がキャラLv30・魔法使いLv30・ヒーラーLv20',prereq:(_p,state)=>trained(state,'mage','healer'),description:'星詠みの導師の試練を受け、星天の観測者を倒して星の導きをつかむ。',reward:{equipmentIds:['weapon','head','body','arms','waist','legs','ring','charm'].map(p=>`astrologian-novice-${p}`)}},
 paladin:{jobId:'paladin',finalQuestId:'trial-paladin',npcId:'aldo',name:'パラディン試練',locationLabel:'転職神殿',prerequisiteText:'防御行動5回＋聖騎士の紋章',prereq:p=>p?.guardActions>=5&&p?.hasEmblem},
 bard:{jobId:'bard',finalQuestId:'trial-bard',npcId:'fine',name:'吟遊詩人試練',locationLabel:'街の広場',prerequisiteText:'失われた楽譜3種',prereq:p=>(p?.scores??0)>=3},
 trickster:{jobId:'trickster',finalQuestId:'trial-trickster',npcId:'zig',name:'トリックスター試練',locationLabel:'街の路地',prerequisiteText:'鍵宝箱・罠・ミミック累積5回',prereq:p=>(p?.lockedChests??0)+(p?.traps??0)+(p?.mimics??0)>=5},
 bishop:{jobId:'bishop',finalQuestId:'trial-bishop',npcId:'celes',name:'ビショップ試練',locationLabel:'転職神殿',prerequisiteText:'聖堂2か所＋蘇生2回',prereq:p=>(p?.chapels??0)>=2&&(p?.revives??0)>=2},
 highWizard:{jobId:'highWizard',finalQuestId:'trial-high-wizard',npcId:'orphe',name:'ハイウィザード試練',locationLabel:'転職神殿',prerequisiteText:'4属性使用＋魔晶石3種',prereq:p=>(p?.elementsUsed??0)>=4&&(p?.crystals??0)>=3},
 berserker:{jobId:'berserker',finalQuestId:'trial-berserker',npcId:'valga',name:'ベルセルク試練',locationLabel:'街の訓練場',prerequisiteText:'瀕死勝利2回＋指定強敵撃破',prereq:p=>(p?.lowHpWins??0)>=2&&p?.strongEnemyDefeated}
};
const specialQuest=x=>({id:x.finalQuestId,name:x.name,source:'npc',npcId:x.npcId,locationLabel:x.locationLabel,specialJob:x.jobId,prerequisiteText:x.prerequisiteText,description:x.description??'特殊ジョブを解放するための最終試練。',targetLabel:'👑 試練の守護者',conditionText:'試練の守護者を撃破し、依頼主へ報告する',goal:{type:'completeTrial',id:x.jobId,amount:1},reward:x.reward??{}});
const BASE_QUESTS={
 'board-herbs':{id:'board-herbs',name:'鉄鉱石を集めて',source:'npc',npcId:'gantz',locationLabel:'街の鍛冶屋前',description:'鍛冶屋からの依頼。装備の材料に使う鉄鉱石が不足しているようだ。',targetLabel:'⛏️ 鉄鉱石',conditionText:'鉄鉱石を3個入手する',goal:{type:'collect',id:'ironOre',amount:3},reward:{gold:150}},
 'npc-chain-1':{id:'npc-chain-1',name:'旅人の頼み',source:'npc',npcId:'elio',locationLabel:'街の広場',description:'道に迷った旅人が助けを求めている。旅人に話しかけて事情を聞こう。',targetLabel:'🧳 旅人エリオ',conditionText:'旅人エリオに話しかける',goal:{type:'talk',id:'traveler',amount:1},reward:{gold:100}},
 'npc-chain-2':{id:'npc-chain-2',name:'旅人の続き',source:'npc',npcId:'elio',locationLabel:'街の広場',requires:['npc-chain-1'],description:'旅人の行く手にスライムが現れた。安全に進めるよう討伐しよう。',targetLabel:'👹 スライム',conditionText:'スライムを1体討伐する',goal:{type:'defeat',id:'slime',amount:1},reward:{gold:200}},
 'field-rain':{id:'field-rain',name:'雨中の救援',source:'npc',npcId:'noah',locationLabel:'雨天時のフィールド',temporary:true,description:'激しい雨の中、動けなくなった旅人がいる。雨が止む前に救助しよう。',targetLabel:'☔ 雨宿りの旅人ノア',conditionText:'雨中の旅人を1回救助する',goal:{type:'rescue',amount:1},reward:{gold:250}},
 'personal-h':{id:'personal-h',name:'主人公の約束',source:'npc',npcId:'lycia',locationLabel:'街の記憶碑付近',personal:true,characterId:'h',description:'アレンが交わした大切な約束。その記憶をたどり、物語を進めよう。',targetLabel:'✨ 約束の記憶',conditionText:'「主人公の約束」イベントを進める',goal:{type:'story',id:'promise',amount:1},reward:{gold:500}},
 ...Object.fromEntries(Object.values(SPECIAL_JOB_QUESTS).map(x=>[x.finalQuestId,specialQuest(x)]))
};

const SIDE_MATERIALS=['copperOre','ironOre','goldOre','platinumOre','mythrilOre','unionOre','lightCrystal','starCrystal'];
const SIDE_MATERIAL_NAMES={copperOre:'銅鉱石',ironOre:'鉄鉱石',goldOre:'金鉱石',platinumOre:'プラチナ鉱石',mythrilOre:'ミスリル鉱石',unionOre:'ユニオン鉱石',lightCrystal:'ノヴァクリスタル',starCrystal:'星晶石'};
const SIDE_MONSTERS=['slime',...Array.from({length:99},(_,i)=>i+2===25?'stormSiren':i+2===78?'mimic':`monster${String(i+2).padStart(3,'0')}`)];
const RING_REWARDS=['copper-attack-ring','iron-attack-ring','gold-attack-ring','platinum-attack-ring','mythril-attack-ring','star-attack-ring'];
const CHARM_REWARDS=['copper-guard-bracelet','iron-guard-bracelet','gold-guard-bracelet','platinum-guard-bracelet','mythril-guard-bracelet','star-guard-bracelet'];
export const GENERATED_SIDE_QUEST_IDS=Array.from({length:150},(_,i)=>`guild-side-${String(i+1).padStart(3,'0')}`);
const generatedSideQuests=Object.fromEntries(GENERATED_SIDE_QUEST_IDS.map((id,i)=>{
 const n=i+1,defeat=i%2===0,targetId=defeat?SIDE_MONSTERS[i%SIDE_MONSTERS.length]:SIDE_MATERIALS[i%SIDE_MATERIALS.length],amount=defeat?1+(i%4):2+(i%5),rewardType=['gold','material','ring','charm'][i%4];
 let reward;
 if(rewardType==='gold')reward={kind:'gold',gold:250+n*20};
 else if(rewardType==='material')reward={kind:'material',materialId:SIDE_MATERIALS[(i+2)%SIDE_MATERIALS.length],qty:1+Math.floor(i/30)};
 else if(rewardType==='ring')reward={kind:'ring',equipmentId:RING_REWARDS[Math.min(RING_REWARDS.length-1,Math.floor(i/25))]};
 else reward={kind:'charm',equipmentId:CHARM_REWARDS[Math.min(CHARM_REWARDS.length-1,Math.floor(i/25))]};
 return [id,{id,name:`冒険者ギルド依頼 ${String(n).padStart(3,'0')}`,source:'npc',npcId:'guildMaster',locationLabel:'街・冒険者ギルド',generatedSideQuest:true,requires:i?[GENERATED_SIDE_QUEST_IDS[i-1]]:[],description:defeat?'各地の魔物を討伐し、旅人の安全を確保してほしい。':'鍛冶と補給に必要な素材を集めてほしい。',targetLabel:defeat?`魔物：${ENEMIES[targetId]?.name??targetId}`:`素材：${SIDE_MATERIAL_NAMES[targetId]??targetId}`,conditionText:defeat?`${ENEMIES[targetId]?.name??targetId}を${amount}体討伐する`:`${SIDE_MATERIAL_NAMES[targetId]??targetId}を${amount}個入手する`,goal:{type:defeat?'defeat':'collect',id:targetId,amount},reward}];
}));
export const QUESTS={...BASE_QUESTS,...generatedSideQuests};
