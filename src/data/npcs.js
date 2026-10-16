const GUILD_SIDE_QUEST_IDS=Array.from({length:150},(_,i)=>`guild-side-${String(i+1).padStart(3,'0')}`);
export const NPCS={
 leonhart:{id:'leonhart',name:'銃剣教官レオンハルト',icon:'⚔️',location:'jobs',role:'銃剣の試練官',questIds:['trial-gunbreaker'],dialogue:'引き金を引く覚悟と、仲間を守る剣を示せ。鉄銃の守護者が待っている。'},
 selene:{id:'selene',name:'星詠みの導師セレーネ',icon:'🔮',location:'jobs',role:'星天の試練官',questIds:['trial-astrologian'],dialogue:'星々は運命を決めません。仲間を導くあなたの力を、星天の観測者に示してください。'},
 guildMaster:{id:'guildMaster',name:'ギルドマスター・レオン',icon:'📋',location:'town',role:'冒険者ギルド',questIds:GUILD_SIDE_QUEST_IDS,dialogue:'依頼は一つずつだ。達成したら次の仕事を任せよう。'},
 gantz:{id:'gantz',name:'鍛冶師ガンツ',icon:'🔨',location:'town',role:'鍛冶師',questIds:['board-herbs'],dialogue:'いい装備には、いい鉱石が要るんだ。'},
 elio:{id:'elio',name:'旅人エリオ',icon:'🧳',location:'town',role:'旅人',questIds:['npc-chain-1','npc-chain-2'],dialogue:'旅の途中で少し困ったことがあってね。'},
 noah:{id:'noah',name:'雨宿りの旅人ノア',icon:'☔',location:'field',weather:'rain',role:'旅人',questIds:['field-rain'],dialogue:'この雨では身動きが取れない……。'},
 lycia:{id:'lycia',name:'記憶の案内人リシア',icon:'✨',location:'town',role:'記憶の案内人',questIds:['personal-h'],dialogue:'あなたの中に眠る約束の記憶を辿りましょう。'},
 aldo:{id:'aldo',name:'聖堂騎士アルド',icon:'🛡️',location:'jobs',role:'試練官',questIds:['trial-paladin'],dialogue:'守る強さを示した者だけが聖騎士の門をくぐれる。'},
 fine:{id:'fine',name:'放浪詩人フィーネ',icon:'🎵',location:'town',role:'吟遊詩人',questIds:['trial-bard'],dialogue:'失われた旋律を集めたなら、最後の一節を奏でよう。'},
 zig:{id:'zig',name:'謎の道化師ジグ',icon:'🎭',location:'town',role:'道化師',questIds:['trial-trickster'],dialogue:'鍵も罠も運命も、開けてみなきゃ分からない。'},
 celes:{id:'celes',name:'大司教セレス',icon:'⛪',location:'jobs',role:'大司教',questIds:['trial-bishop'],dialogue:'救いの手を重ねた者に、天の試練を授けましょう。'},
 orphe:{id:'orphe',name:'大賢者オルフェ',icon:'🔮',location:'jobs',role:'大賢者',questIds:['trial-high-wizard'],dialogue:'六つの属性と六晶を知る者よ、塔の頂へ。'},
 valga:{id:'valga',name:'歴戦の戦士バルガ',icon:'🪓',location:'town',role:'戦士',questIds:['trial-berserker'],dialogue:'瀕死の淵でも立つ者だけが狂戦士を名乗れる。'}
};
