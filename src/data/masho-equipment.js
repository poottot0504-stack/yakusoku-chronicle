import { ALL_JOBS } from './jobs.js';
export const MASHO_PARTS=['weapon','shield','head','body','arms','waist','legs','ring','charm'];
const labels={shield:'護符',head:'冠',body:'戦衣',arms:'手甲',waist:'腰帯',legs:'靴',ring:'指輪',charm:'チャーム'};
const weapons={shielder:['oneHandSword','護剣'],greatShielder:['oneHandSword','鉄壁剣'],swordsman:['oneHandSword','剣'],mage:['staff','魔杖'],thief:['dagger','短剣'],fighter:['fist','拳甲'],healer:['staff','癒杖'],archer:['bow','弓'],redMage:['oneHandSword','魔法剣'],whiteMage:['staff','聖杖'],blackMage:['staff','黒杖'],darkKnight:['oneHandSword','暗黒剣'],pirateKing:['axe','海賊斧'],sniper:['bow','狙撃弓'],paladin:['oneHandSword','聖剣'],bard:['instrument','竪琴'],trickster:['cards','幻札'],bishop:['staff','司教杖'],highWizard:['staff','大魔杖'],gunbreaker:['gunblade','銃剣'],astrologian:['starGlobe','星天球'],berserker:['axe','狂戦斧'],dragoon:['spear','飛竜槍'],summoner:['greatStaff','幻獣杖']};
export const MASHO_EQUIPMENT={};
for(const job of ALL_JOBS)for(const tier of [1,2,3])for(const part of MASHO_PARTS){
 const id=`masho-${tier}-${job.id}-${part}`,magic=job.stats.magic>job.stats.attack,hybrid=job.id==='redMage',power=magic?'magic':'attack';
 const slot=['ring','charm'].includes(part)?'accessory':part;
 const d={id,name:`${tier===3?'深魔障':`魔障${tier===1?'Ⅰ':'Ⅱ'}`}・${job.name}の${part==='weapon'?weapons[job.id][1]:labels[part]}`,slot,requiredLevel:100,rarity:tier===3?'legendary':'epic',allowedJobs:[job.id],mashoGear:true,mashoTier:tier,mashoSet:'masho',description:'魔障シリーズ9部位で全能力＋10（上位シリーズ混在可）。フリーマーケット出品可。'};
 if(part==='weapon'){Object.assign(d,{weaponType:weapons[job.id][0],twoHanded:false,[power]:[0,70,95,360][tier],speed:[0,4,6,24][tier]});if(hybrid)d.magic=d.attack;}
 else if(part==='ring'){Object.assign(d,{accessoryType:'ring',attack:[0,12,17,90][tier],magic:[0,12,17,90][tier],speed:[0,4,6,30][tier]});}
 else if(part==='charm'){Object.assign(d,{accessoryType:'charm',defense:[0,10,13,100][tier],maxHp:[0,45,65,450][tier],maxMp:[0,20,30,150][tier]});}
 else{Object.assign(d,{defense:(magic?[0,16,22,150]:[0,22,30,150])[tier]+(part==='body'?(magic?[0,3,5,35]:[0,5,8,35])[tier]:0),[power]:[0,5,7,45][tier],maxHp:magic?[0,10,20,90][tier]:[0,20,28,220][tier],maxMp:magic?[0,10,18,100][tier]:[0,4,6,30][tier],...(part==='legs'?{speed:[0,3,5,35][tier]}:{})});if(part==='shield')Object.assign(d,{shieldSize:'small',mashoOffhand:true});}
 MASHO_EQUIPMENT[id]=d;
}
