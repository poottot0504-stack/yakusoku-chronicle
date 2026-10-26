// 闘技大会の固定編成。通常の育成・所持品・継承スキルとは独立。
// Skills come from the existing job's real skillbook, capped at quest level.
// Shield class has passive-only job skills at these levels, so the arena supplies
// 4 explicit, independently balanced ACTIVE moves for the fixed defender.
import {getSkillBook} from '../core/skillbook.js';

export const ARENA_RANKS=Object.freeze([
 {grade:'S',maxTurns:3,coins:5},
 {grade:'A',maxTurns:6,coins:3},
 {grade:'B',maxTurns:10,coins:2},
 {grade:'C',maxTurns:100,coins:1}
]);
const guardianSkills=Object.freeze([
 {id:'arena-greatshield-smash',level:1,name:'シールドクラッシュ',mp:16,power:190,type:'attack',kind:'physical',description:'大盾を叩きつける単体物理攻撃'},
 {id:'arena-greatshield-stance',level:30,name:'大盾防御',mp:18,power:0,type:'buff',selfBuff:{defensePct:.35},turns:3,description:'自分の防御＋35%（3ターン）'},
 {id:'arena-greatshield-aegis',level:50,name:'鉄壁の構え',mp:32,power:0,type:'buff',target:'all',selfBuff:{defensePct:.2},turns:3,description:'味方全員の防御＋20%（3ターン）'},
 {id:'arena-greatshield-breaker',level:70,name:'城壁破砕',mp:28,power:300,type:'attack',kind:'physical',defensePierce:.18,description:'敵の防御を18%貫通する単体物理攻撃'}
]);
function fighter(slot,job,weapon,level){
 const skills=getSkillBook(job).filter(s=>s.level<=level&&!s.autoPassive)
  .map(s=>({...s,description:s.description??'闘技大会の固定特技'}));
 if(job==='greatShielder')skills.push(...guardianSkills.filter(s=>s.level<=level).map(s=>({...s})));
 return {slot,job,weapon,skills};
}
export const ARENA_QUESTS=Object.freeze({
 arena30:{
  id:'arena30',name:'闘技大会・青銅の試練',level:30,
  description:'赤魔道士・魔法使い・トリックスター・ビショップの連携で、岩甲の魔獣を討伐する。',
  roster:[
   fighter('アレン','redMage','ironSword',30),
   fighter('ミラ','mage','noviceStaff',30),
   fighter('レン','trickster','bronzeDagger',30),
   fighter('ソラ','bishop','oakMace',30)
  ],
  // Existing first-story boss pixel atlas, actual griffin silhouette.
  enemy:{id:'arena30-stonebeast',name:'岩甲のグリフォン',artId:'storyBoss-field',element:'earth',maxHp:1700,attack:94,defense:84,magic:75,speed:47}
 },
 arena50:{
  id:'arena50',name:'闘技大会・白銀の試練',level:50,
  description:'パラディン・ハイウィザード・吟遊詩人・ビショップの連携で雷獣を倒す。',
  roster:[
   fighter('アレン','paladin','gold-oneHandSword',50),
   fighter('ミラ','highWizard','gold-staff',50),
   fighter('レン','bard','gold-dagger',50),
   fighter('ソラ','bishop','gold-mace',50)
  ],
  // Existing fifth-story boss pixel atlas, wolf silhouette.
  enemy:{id:'arena50-thunderbeast',name:'雷牙のガルディオン',artId:'storyBoss-snow',element:'thunder',maxHp:3500,attack:170,defense:124,magic:142,speed:75}
 },
 arena70:{
  id:'arena70',name:'闘技大会・黄金の試練',level:70,
  description:'竜騎士・召喚士・大盾士・占星術師で黄金の古竜に挑む。',
  roster:[
   fighter('アレン','dragoon','platinum-oneHandSword',70),
   fighter('ミラ','summoner','platinum-staff',70),
   fighter('レン','greatShielder','towerShield',70),
   fighter('ソラ','astrologian','platinum-staff',70)
  ],
  // Existing eighth-story boss pixel atlas, dragon silhouette.
  enemy:{id:'arena70-old-dragon',name:'黄金の古竜ゼルディア',artId:'storyBoss-volcano',element:'dark',maxHp:7800,attack:265,defense:185,magic:240,speed:108}
 }
});
// Ruleset 1 is kept for matches already issued before the balance patch and
// for browsers still running the previous assets. The server owns the ruleset.
export const ARENA_LEGACY_BOSS_STATS=Object.freeze({
 arena30:Object.freeze({maxHp:1450,attack:80,defense:75,magic:65,speed:44}),
 arena50:Object.freeze({maxHp:2950,attack:145,defense:110,magic:125,speed:70}),
 arena70:Object.freeze({maxHp:6400,attack:235,defense:165,magic:205,speed:100})
});
export const ARENA_BALANCE_VERSION=2;
export function arenaFixedEquipment(template,level){
 const tier=level===30?'iron':level===50?'gold':level===70?'platinum':null;
 if(!tier)throw new Error('闘技大会の固定レベルが不正です');
 // Preserve the same armor families used by those jobs in the normal game.
 const group=['mage','healer','highWizard','bishop','summoner','astrologian'].includes(template.job)
  ?'magic':['trickster','bard'].includes(template.job)?'thief':null;
 const gear={weapon:template.weapon};
 if(template.job==='shielder'||template.job==='greatShielder')gear.shield='towerShield';
 for(const slot of ['head','body','arms','waist','legs'])gear[slot]=tier+'-'+(group?group+'-':'')+slot;
 gear.accessory1=tier+'-attack-ring';
 gear.accessory2=tier+'-guard-bracelet';
 return gear;
}
export const ARENA_QUEST_IDS=Object.freeze(Object.keys(ARENA_QUESTS));
