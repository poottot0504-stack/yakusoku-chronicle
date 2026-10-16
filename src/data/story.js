export const STORY_CHAPTERS = [
 {regionId:'field',chapter:1,title:'風が運ぶ約束',subtitle:'はじまりの平原',bossName:'翠風のグリフォン',bossElement:'thunder',intro:'王都リュミエールを離れたアレンたちは、砕けた「約束の星」を追う。最初の欠片は、風の魔物が守っている。'},
 {regionId:'forest',chapter:2,title:'森に眠る声',subtitle:'ささやきの森',bossName:'古樹王エルダートレント',bossElement:'water',intro:'森の奥から聞こえる声。それは忘れられた約束を知る精霊の呼び声だった。'},
 {regionId:'coast',chapter:3,title:'蒼月の航路',subtitle:'蒼月海岸',bossName:'海皇リヴァイア',bossElement:'water',intro:'月光が海に道を描く夜、三つ目の欠片が海底神殿で脈動する。'},
 {regionId:'cave',chapter:4,title:'鉄と記憶の坑道',subtitle:'古鉱洞',bossName:'鋼殻機兵ギガント',bossElement:'dark',intro:'古代の鉱洞には、星を鍛えた民の記憶が残されていた。'},
 {regionId:'snow',chapter:5,title:'白銀の誓い',subtitle:'白銀高原',bossName:'氷牙王フェンリル',bossElement:'ice',intro:'吹雪の向こうで、仲間たちはそれぞれの約束と向き合う。'},
 {regionId:'desert',chapter:6,title:'砂時計の王国',subtitle:'黄砂荒野',bossName:'砂王アヌビス',bossElement:'fire',intro:'時を閉じ込めた砂の都。止まった時計を動かす鍵は、星の欠片だった。'},
 {regionId:'swamp',chapter:7,title:'毒沼の灯火',subtitle:'瘴気湿原',bossName:'瘴姫モルガナ',bossElement:'dark',intro:'瘴気に覆われた村で、消えかけた灯を守る戦いが始まる。'},
 {regionId:'volcano',chapter:8,title:'炎獄の鼓動',subtitle:'炎獄火山',bossName:'焔竜ヴァルガス',bossElement:'fire',intro:'大地の鼓動が火山を揺らす。星の欠片は竜の心臓と共鳴していた。'},
 {regionId:'ruins',chapter:9,title:'忘却の王都',subtitle:'忘却遺跡',bossName:'記憶喰らいノクス',bossElement:'dark',intro:'誰も名を覚えていない王都。その玉座に、旅の真実が待っている。'},
 {regionId:'abyss',chapter:10,title:'約束のクロニクル',subtitle:'約束の深淵',bossName:'終焉の王',bossElement:'dark',intro:'十の欠片が揃う時、深淵への門が開く。約束を終わらせるか、未来へつなぐか。'}
];
export const STORY_BY_REGION=Object.fromEntries(STORY_CHAPTERS.map(x=>[x.regionId,x]));
