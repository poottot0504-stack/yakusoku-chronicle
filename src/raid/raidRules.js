export const RAID_START_AT=Date.parse('2026-10-04T09:00:00Z');
export const RAID_BOSSES=[
 {id:'anima',name:'アニマ',subtitle:'天の裁き',element:'light',banner:'assets/raid/anima.webp',stats:{attack:504,defense:400,magicAttack:720,magicDefense:600,speed:360}},
 {id:'ifrit',name:'イフリート',subtitle:'煉獄の炎',element:'fire',banner:'assets/raid/ifrit.webp',stats:{attack:720,defense:450,magicAttack:624,magicDefense:520,speed:312}},
 {id:'chryps',name:'クリュプス',subtitle:'深海の暴威',element:'water',banner:'assets/raid/chryps.webp',stats:{attack:576,defense:600,magicAttack:660,magicDefense:550,speed:264}},
 {id:'fenrir',name:'フェンリル',subtitle:'終焉の咆哮',element:'ice',banner:'assets/raid/fenrir.webp',stats:{attack:696,defense:380,magicAttack:420,magicDefense:350,speed:720}},
 {id:'lich',name:'リッチ',subtitle:'死の支配者',element:'dark',banner:'assets/raid/lich.webp',stats:{attack:420,defense:420,magicAttack:780,magicDefense:650,speed:384}}
];
const jstParts=ms=>{const d=new Date(ms+9*3600000);return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,day:d.getUTCDate(),h:d.getUTCHours(),min:d.getUTCMinutes()};};
export function getRaidWindow(now=Date.now()){if(now<RAID_START_AT)return null;const p=jstParts(now);let period=null,startHour=0,endHour=0;if(p.h>=18&&p.h<20){period='evening';startHour=18;endHour=20;}else if(p.h>=21){period='night';startHour=21;endHour=24;}else return null;const key=`${p.y}-${String(p.m).padStart(2,'0')}-${String(p.day).padStart(2,'0')}-${period}`;const endJst=Date.UTC(p.y,p.m-1,p.day,endHour,0,0)-9*3600000;return {id:key,period,endsAt:endJst};}
export const isRaidActive=(now=Date.now())=>!!getRaidWindow(now);
export function getNextRaidStart(now=Date.now()){
 if(now<RAID_START_AT)return RAID_START_AT;
 const p=jstParts(now),day=Date.UTC(p.y,p.m-1,p.day)-9*3600000;
 return [day+18*3600000,day+21*3600000,day+42*3600000].find(time=>time>now);
}
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function createEncounter(sessionId){const h=hash(sessionId);const boss=RAID_BOSSES[h%RAID_BOSSES.length];const future=String(sessionId)>='2026-10-16';const maxHp=future?10000000+(hash(sessionId+'-hp')%2000001):3000000+(hash(sessionId+'-hp')%1000001);return {sessionId,bossId:boss.id,boss,maxHp,currentHp:maxHp};}
export function currentEncounter(now=Date.now()){const w=getRaidWindow(now);return w?{...createEncounter(w.id),endsAt:w.endsAt}:null;}

export function getRaidBossStats(bossId,hpRatio=1){const boss=RAID_BOSSES.find(b=>b.id===bossId)??RAID_BOSSES[0];const ratio=Math.max(0,Math.min(1,Number(hpRatio)||0));const mult=ratio<=.25?1.30:ratio<=.50?1.15:1;return Object.fromEntries(Object.entries(boss.stats).map(([k,v])=>[k,Math.round(v*mult)]));}
