// Job mastery skills: Lv120 / 150 / 200 / 250 / 300.
const attack=(name,mp,power,extra={})=>({name,mp,power,type:'attack',...extra});
const magic=(name,mp,power,element,extra={})=>({name,mp,power,type:'magic',kind:'magic',element,...extra});
const heal=(name,mp,amount,extra={})=>({name,mp,power:amount,flatHeal:amount,type:'heal',target:'all',highClear:true,...extra});
const buff=(name,mp,values,target='all')=>({name,mp,power:0,type:'buff',target,selfBuff:{...(values.attackPct!=null&&values.magicPct==null?{magicPct:0}:{}),...values},turns:3});
const revive=(name,mp,ratio)=>({name,mp,power:ratio*100,type:'revive',hpRatio:ratio});
const rows={
 dragoon:[
  attack('竜穿・ヴァーティカル',55,560,{defensePierce:.22}),
  attack('雷霆のドラゴンダイブ',75,680,{allTargets:true,element:'thunder'}),
  attack('竜王の五連槍',95,225,{multiHit:5}),
  buff('天翔の竜気',110,{attackPct:.55,defensePct:.2},'self'),
  attack('終式・天龍星墜',155,1220,{allTargets:true,defensePierce:.18})
 ],
 summoner:[
  magic('幻獣降臨・イフリート',80,880,'fire',{allTargets:true}),
  magic('幻獣降臨・シヴァ',95,1040,'ice',{allTargets:true}),
  magic('幻獣降臨・ラムウ',115,1280,'thunder',{allTargets:true}),
  buff('幻獣王の加護',125,{magicPct:.80,defensePct:.18},'self'),
  magic('終極召喚・バハムート零式',165,1550,'light',{allTargets:true})
 ],
 swordsman:[attack('覇王斬',55,520),attack('天断・旋空剣',70,600,{allTargets:true}),attack('王威の連剣',90,230,{multiHit:3}),buff('剣聖の闘志',95,{attackPct:.6},'self'),attack('終式・約束の聖剣',135,1050)],
 mage:[magic('インフェルノ',60,530,'fire'),magic('天雷の嵐',75,620,'thunder',{allTargets:true}),magic('絶零の魔陣',95,730,'ice',{allTargets:true}),magic('虚空崩壊',115,860,'dark',{allTargets:true}),magic('終極・星界メテオ',150,1080,'none',{allTargets:true})],
 thief:[attack('影縫いの牙',55,510,{defensePierce:.3}),attack('幻影乱舞',70,160,{multiHit:4}),attack('夜王の刃',90,730,{defensePierce:.4}),buff('影王の集中',95,{attackPct:.6},'self'),attack('終式・千影一閃',135,220,{multiHit:5})],
 fighter:[attack('天崩拳',55,550),attack('震天脚',70,650,{allTargets:true}),attack('四神連拳',90,220,{multiHit:4}),buff('闘神覚醒',95,{attackPct:.65,defensePct:.25},'self'),attack('終式・星砕き',140,250,{multiHit:5})],
 healer:[heal('聖光の大癒',60,800),magic('天上の光槍',75,540,'light'),revive('再生の祈り',85,.65),heal('生命の聖域',110,3000),heal('終式・世界樹の祝福',155,8000)],
 archer:[attack('天穹穿ち',55,530,{defensePierce:.25}),attack('流星の矢雨',70,630,{allTargets:true}),attack('五連・天翔矢',90,160,{multiHit:5}),buff('天空の狩人',95,{attackPct:.6},'self'),attack('終式・星天貫通',135,1120,{defensePierce:.45})],
 redMage:[magic('紅蓮の双詠',60,280,'fire',{multiHit:2}),attack('光刃・アルカナ',75,680),heal('紅き生命の環',90,1800),buff('紅蓮の盟約',105,{attackPct:.4,magicPct:.4}),magic('終式・双星の連続魔',150,280,'light',{multiHit:4})],
 whiteMage:[heal('白天の祈り',60,1000),magic('聖天の裁き',75,580,'light',{allTargets:true}),revive('白翼の再誕',90,.8),buff('白天の結界',105,{defensePct:.45}),heal('終式・生命の大奇跡',160,9000)],
 blackMage:[magic('冥獄の炎',65,650,'dark'),magic('黒天の崩壊',80,740,'dark',{allTargets:true}),magic('深淵三重詠唱',100,290,'dark',{multiHit:3}),magic('無明の大渦',120,980,'dark',{allTargets:true}),magic('終極・冥界創世',155,1200,'dark',{allTargets:true})],
 darkKnight:[attack('冥王剣',60,630),magic('暗黒の大潮',75,710,'dark',{allTargets:true}),attack('魂断ちの魔剣',95,850,{defensePierce:.35}),buff('深淵の覇気',100,{attackPct:.65,magicPct:.35},'self'),attack('終式・常闇の断界',150,1200)],
 pirateKing:[attack('覇海の一撃',55,570),attack('大海の砲刃',70,660,{allTargets:true}),attack('海王四連撃',90,210,{multiHit:4}),buff('覇海の号令',100,{attackPct:.4,defensePct:.25}),attack('終式・七海の覇王',140,1150,{defensePierce:.3})],
 sniper:[attack('天眼の一射',65,650,{defensePierce:.3}),attack('双星狙撃',80,390,{multiHit:2}),attack('絶穿の銀弾',100,900,{defensePierce:.45}),buff('神眼集中',110,{attackPct:.7},'self'),attack('終式・最果ての一矢',150,1300,{defensePierce:.5})],
 paladin:[attack('聖王の剣',60,550),buff('聖城の守護',75,{defensePct:.5}),heal('守護者の祈り',95,2400),attack('聖光の大断罪',110,780,{allTargets:true}),attack('終式・不滅の聖剣',145,1100,{defensePierce:.25})],
 bard:[magic('星渡りの詩',55,510,'none'),heal('生命樹の旋律',70,1200),buff('英雄たちの凱歌',90,{attackPct:.4,magicPct:.4}),magic('天響のレクイエム',110,840,'light',{allTargets:true}),buff('終式・永遠の大合唱',145,{attackPct:.55,magicPct:.55,defensePct:.45})],
 trickster:[magic('運命の切札',60,580,'dark'),attack('四重の幻刃',75,180,{multiHit:4}),magic('星札の大乱舞',95,820,'light',{allTargets:true}),buff('道化王の奇策',105,{attackPct:.45,magicPct:.45}),magic('終式・世界を返す札',150,1150,'dark',{allTargets:true})],
 bishop:[heal('聖堂の大祝福',60,1100,{fullHeal:false}),magic('天門の審判',75,580,'light',{allTargets:true}),revive('完全蘇生の祈り',110,1),buff('天使の大結界',115,{defensePct:.55}),heal('終式・天上の救済',160,8500,{reviveFallenRatio:.3})],
 highWizard:[magic('天火・プロミネンス',65,650,'fire',{allTargets:true}),magic('轟天・サンダーノヴァ',80,750,'thunder',{allTargets:true}),magic('絶零・ブリザードノヴァ',100,860,'ice',{allTargets:true}),buff('大魔導の覚醒',110,{magicPct:.75},'self'),magic('終極・星界の大魔陣',160,1250,'light',{allTargets:true})],
 gunbreaker:[attack('バースト・ペネトレイト',60,640,{defensePierce:.3}),buff('不屈の砲刃',75,{defensePct:.6,attackPct:.25},'self'),attack('クアッド・リボルバー',100,210,{multiHit:4}),heal('オーロラ・リザレイ',110,3000),attack('終式・ゼロバースト',150,250,{multiHit:5})],
 astrologian:[heal('星天の大癒',60,1200),magic('星界の大審判',80,610,'light',{allTargets:true}),buff('運命星の加護',100,{attackPct:.35,magicPct:.35,defensePct:.35}),revive('星巡りの再誕',110,.85),heal('終式・宇宙の祝福',160,8500)],
 berserker:[attack('滅神の一撃',60,680),attack('暴嵐の大斧',80,780,{allTargets:true}),attack('破界の狂刃',100,960,{defensePierce:.4}),buff('狂戦神の覚醒',110,{attackPct:.85},'self'),attack('終式・神滅ラグナロク',155,280,{multiHit:5})]
};
export const HIGH_LEVEL_SKILLS=Object.fromEntries(Object.entries(rows).map(([job,skills])=>[job,skills.map((skill,i)=>({...skill,level:[120,150,200,250,300][i],id:`${job}-master-${[120,150,200,250,300][i]}`}))]));
