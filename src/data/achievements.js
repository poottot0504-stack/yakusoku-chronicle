const totalDefeats=s=>Object.values(s.bestiary??{}).reduce((n,x)=>n+(x?.defeats??0),0);
const encountered=s=>Object.values(s.bestiary??{}).filter(x=>(x?.encounters??0)>0).length;
const maxLevel=s=>Math.max(0,...(s.characters??[]).map(c=>c.level??0));
const maxJob=s=>Math.max(0,...(s.characters??[]).flatMap(c=>Object.values(c.jobLevels??{})));
const completedRegions=s=>(s.adventure?.completedRegions??[]).length;
const invQty=(s,id)=>(s.inventory??[]).find(x=>x.id===id)?.qty??0;
const matKinds=s=>Object.values(s.materials??{}).filter(q=>q>0).length;
const enhanced=s=>(s.equipmentInventory??[]).filter(x=>(x.enhanceLevel??0)>0).length;
const maxEnhance=s=>Math.max(0,...(s.equipmentInventory??[]).map(x=>x.enhanceLevel??0));
const unlockedSpecial=s=>(s.unlockedSpecialJobs??[]).length;
const questDone=s=>Object.values(s.quests??{}).filter(x=>x?.status==='completed').length;
const A=(id,name,category,description,condition,reward={})=>({id,name,category,description,condition,reward});

const list=[
 A('journey-start','旅立ち','story','冒険を始める',s=>(s.characters??[]).length>0,{gold:100}),
 A('hidden-first','最初の勝利','hidden','初めて戦闘に勝利する',s=>(s.achievementEvents?.firstWin??0)>=1,{gold:100,title:'はじまりの一歩'}),
 A('chapter-1','風が運ぶ約束','story','1地域を攻略する',s=>completedRegions(s)>=1,{gold:300}),
 A('chapter-3','三つの足跡','story','3地域を攻略する',s=>completedRegions(s)>=3,{gold:800}),
 A('chapter-5','旅の折り返し','story','5地域を攻略する',s=>completedRegions(s)>=5,{gold:1500}),
 A('chapter-8','約束を追う者','story','8地域を攻略する',s=>completedRegions(s)>=8,{gold:3000}),
 A('chapter-10','十の地を越えて','story','10地域を攻略する',s=>completedRegions(s)>=10,{title:'十界の旅人'}),
 A('first-ending','ひとつの結末','story','エンディングを見る',s=>!!s.story?.firstEndingSeen,{gold:5000}),
 A('true-ending','約束の果て','story','真エンディングを見る',s=>!!s.story?.trueEndingSeen,{title:'約束を果たした者'}),
 A('cycle-2','もう一度、約束を','story','2周目へ進む',s=>(s.cycle??1)>=2,{gold:8000}),
 A('cycle-3','三度目の旅','story','3周目へ進む',s=>(s.cycle??1)>=3,{title:'時巡りの旅人'}),

 A('battle-1','最初の勝利','battle','魔物を1体倒す',s=>totalDefeats(s)>=1,{gold:100,title:'はじまりの一歩'}),
 A('battle-10','駆け出し討伐者','battle','魔物を10体倒す',s=>totalDefeats(s)>=10,{gold:500}),
 A('battle-50','歴戦の足音','battle','魔物を50体倒す',s=>totalDefeats(s)>=50,{gold:1500}),
 A('battle-100','百戦錬磨','battle','魔物を100体倒す',s=>totalDefeats(s)>=100,{title:'百戦錬磨'}),
 A('battle-300','戦場の記憶','battle','魔物を300体倒す',s=>totalDefeats(s)>=300,{gold:10000}),
 A('bestiary-10','魔物観察入門','battle','10種類の魔物と遭遇する',s=>encountered(s)>=10,{gold:600}),
 A('bestiary-30','魔物研究家','battle','30種類の魔物と遭遇する',s=>encountered(s)>=30,{gold:2000}),
 A('rare-encounter','見たことのないモンスターと出会った','battle','レアモンスターと遭遇する',s=>Object.values(s.bestiary??{}).some(x=>x?.rareEncountered),{title:'希少種の目撃者'}),
 A('boss-5','ボスハンター','battle','5地域を攻略する',s=>completedRegions(s)>=5,{gold:2500}),
 A('low-hp','紙一重の勝利','battle','瀕死勝利を経験する',s=>(s.specialJobProgress?.berserker?.lowHpWins??0)>=1,{gold:700}),

 A('level-10','冒険者Lv10','growth','誰かがLv10に到達',s=>maxLevel(s)>=10,{gold:300}),
 A('level-20','冒険者Lv20','growth','誰かがLv20に到達',s=>maxLevel(s)>=20,{gold:700}),
 A('level-30','冒険者Lv30','growth','誰かがLv30に到達',s=>maxLevel(s)>=30,{gold:1200}),
 A('level-50','冒険者Lv50','growth','誰かがLv50に到達',s=>maxLevel(s)>=50,{gold:3000}),
 A('level-80','冒険者Lv80','growth','誰かがLv80に到達',s=>maxLevel(s)>=80,{gold:6000}),
 A('level-100','冒険者Lv100','growth','誰かがLv100に到達',s=>maxLevel(s)>=100,{title:'極致へ至る者'}),
 A('job-10','職人見習い','growth','職業Lv10に到達',s=>maxJob(s)>=10,{gold:300}),
 A('job-30','転職の心得','growth','職業Lv30に到達',s=>maxJob(s)>=30,{gold:1000}),
 A('job-50','熟練の技','growth','職業Lv50に到達',s=>maxJob(s)>=50,{gold:2500}),
 A('special-1','特別な道','growth','特殊ジョブを1つ解放',s=>unlockedSpecial(s)>=1,{gold:3000}),
 A('special-3','三つの秘技','growth','特殊ジョブを3つ解放',s=>unlockedSpecial(s)>=3,{gold:6000}),
 A('special-all','六つの試練','growth','特殊ジョブを6つ解放',s=>unlockedSpecial(s)>=6,{title:'試練を越えし者'}),

 A('item-10','収集家の芽','collection','素材を10種類所持',s=>matKinds(s)>=10,{gold:500}),
 A('item-20','素材収集家','collection','素材を20種類所持',s=>matKinds(s)>=20,{gold:1500}),
 A('equipment-10','装備コレクター','collection','装備を10個所持',s=>(s.equipmentInventory??[]).length>=10,{gold:1000}),
 A('equipment-30','武具庫','collection','装備を30個所持',s=>(s.equipmentInventory??[]).length>=30,{gold:3000}),
 A('enhance-1','初めての強化','collection','装備を強化する',s=>enhanced(s)>=1,{gold:300}),
 A('enhance-5','鍛冶の手応え','collection','+5装備を作る',s=>maxEnhance(s)>=5,{gold:1200}),
 A('forge-master','鍛冶の極み','collection','+10装備を作る',s=>maxEnhance(s)>=10,{title:'鍛冶の極み'}),
 A('quest-1','人助けの第一歩','collection','クエストを1件達成',s=>questDone(s)>=1,{gold:300}),
 A('quest-10','街の頼れる冒険者','collection','クエストを10件達成',s=>questDone(s)>=10,{title:'街の頼れる冒険者'}),
 A('score-3','旋律の欠片','collection','楽譜を3種類集める',s=>['score-wind','score-forest','score-moon'].every(id=>invQty(s,id)>0),{gold:1800}),
 A('score-all','失われた旋律','collection','楽譜5種類を集める',s=>['score-wind','score-forest','score-moon','score-hero','score-ancient'].every(id=>invQty(s,id)>0),{title:'旋律の収集家'}),
 A('crystal-3','魔晶の輝き','collection','魔晶石を3種類集める',s=>['crystal-flame','crystal-tide','crystal-star'].every(id=>invQty(s,id)>0),{gold:1800}),

 A('halloween-material','幻月祭へようこそ','event','幻月祭素材を手に入れる',s=>['pumpkinShard','magicCandy','ghostCloth','moonCrystal'].some(id=>(s.materials?.[id]??invQty(s,id))>0),{gold:500}),
 A('halloween-gear','幻月の装い','event','幻月祭装備を手に入れる',s=>(s.equipmentInventory??[]).some(x=>String(x.equipmentId).startsWith('halloween-')),{gold:1200}),
 A('halloween-plus5','祭装備の極み','event','幻月祭装備を+5にする',s=>(s.equipmentInventory??[]).some(x=>String(x.equipmentId).startsWith('halloween-')&&(x.enhanceLevel??0)>=5),{title:'幻月祭の鍛冶師'}),
 A('event-bard','月夜の演奏家','event','幻月の竪琴を手に入れる',s=>(s.equipmentInventory??[]).some(x=>String(x.equipmentId).includes('halloween-')&&String(x.equipmentId).endsWith('-instrument')),{gold:1500}),
 A('event-full-set','祭りの正装','event','幻月祭装備を4個以上所持',s=>(s.equipmentInventory??[]).filter(x=>String(x.equipmentId).startsWith('halloween-')).length>=4,{gold:2500}),

 A('hidden-rich','？？？','hidden','所持金100000G',s=>(s.gold??0)>=100000,{title:'黄金の旅人'}),
 A('hidden-million','？？？','hidden','所持金1000000G',s=>(s.gold??0)>=1000000,{title:'百万長者'}),
 A('hidden-guard','？？？','hidden','防御を5回行う',s=>(s.specialJobProgress?.paladin?.guardActions??0)>=5,{gold:777}),
 A('hidden-revive','？？？','hidden','仲間を2回蘇生する',s=>(s.specialJobProgress?.bishop?.revives??0)>=2,{gold:777}),
 A('hidden-elements','？？？','hidden','4属性を使用する',s=>(s.specialJobProgress?.highWizard?.elementsUsed??0)>=4,{gold:777}),
 A('hidden-chapels','？？？','hidden','聖堂を2か所訪れる',s=>(s.specialJobProgress?.bishop?.chapels??0)>=2,{title:'祈りの旅人'}),
 A('hidden-play-1h','？？？','hidden','1時間遊ぶ',s=>(s.playTimeSeconds??0)>=3600,{gold:1000}),
 A('hidden-play-10h','？？？','hidden','10時間遊ぶ',s=>(s.playTimeSeconds??0)>=36000,{title:'時を忘れた冒険者'})
];

export const ACHIEVEMENTS=Object.fromEntries(list.map(a=>[a.id,a]));
