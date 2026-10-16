// One shared atlas per family keeps deployment file counts small.
export const JOB_ART_IDS=['swordsman','mage','thief','fighter','healer','archer','redMage','whiteMage','blackMage','darkKnight','pirateKing','sniper','paladin','bard','trickster','bishop','highWizard','berserker','gunbreaker','astrologian'];
export const REGIONS=['field','forest','coast','cave','snow','desert','swamp','volcano','ruins','abyss'];
const SHEETS={jobs:[6,3],normal:[4,4],story:[5,2],oaths:[5,3],extra:[5,4],raid:[3,2],fenrir:[1,1],chryps:[1,1],highWizardFemale:[1,1],specialJobs:[2,2]};
const ASPECTS={jobs:.75,normal:1.3042,story:1,oaths:1,extra:1,raid:1,fenrir:1,chryps:1,highWizardFemale:.75,specialJobs:.75};
const EXTRA_CROPS=[
 [0,0,275,312],[275,0,275,305],[551,0,272,305],[822,0,342,305],[1164,0,238,303],
 [0,320,275,279],[275,319,284,279],[562,310,257,288],[820,305,344,292],[1165,310,237,288],
 [0,605,286,247],[286,605,260,246],[551,606,271,245],[823,605,285,246],[1165,605,237,249],
 [0,858,280,264],[280,858,278,264],[560,858,249,264],[820,855,275,267],[1120,857,282,265]
];
const SPECIAL_CROPS=[[0,45,555,625],[555,45,531,625],[0,700,560,710],[565,700,521,710]];
const descriptor=(sheet,index)=>{const crop=sheet==='specialJobs'?SPECIAL_CROPS[index]:sheet==='extra'?EXTRA_CROPS[index]:sheet==='oaths'&&index===12?[646,643,531,328]:null;return {sheet,index,aspect:sheet==='specialJobs'?.75:crop?crop[2]/crop[3]:ASPECTS[sheet],cols:SHEETS[sheet][0],rows:SHEETS[sheet][1],crop};};
export const BOSS_ART={};
REGIONS.forEach((region,i)=>{BOSS_ART[`storyBoss-${region}`]=descriptor('story',i);BOSS_ART[`storyBoss-ngp-${region}`]=descriptor('story',i);BOSS_ART[`${region}Boss`]=descriptor('story',i);});
for(let i=0;i<13;i++)BOSS_ART[`oath-${13-i}`]=descriptor('oaths',i);
['trial-paladin','trial-bard','trial-trickster','trial-bishop','trial-highWizard','trial-berserker','firstFinal','blacksmith','trueFinal','eidel','legend-trial-hero','legend-trial-mira','legend-trial-ren','legend-trial-sora','legend-trial-gald','legend-trial-luna','legend-trial-kai','legend-trial-noa','event-halloween-pumpkin-king','event-training-master'].forEach((id,i)=>BOSS_ART[id]=descriptor('extra',i));
export const RAID_ART_IDS=['anima','ifrit','chryps','fenrir','lich'];
export const STATUS_LABELS={poison:'毒',burn:'火傷',paralysis:'麻痺',sleep:'睡眠',confusion:'混乱',freeze:'凍結',curse:'呪い'};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
BOSS_ART['trial-gunbreaker']=descriptor('specialJobs',2);
BOSS_ART['trial-astrologian']=descriptor('specialJobs',3);
const jobArt=job=>['gunbreaker','astrologian'].includes(job)?descriptor('specialJobs',job==='gunbreaker'?0:1):job==='highWizard'?descriptor('highWizardFemale',0):descriptor('jobs',Math.max(0,JOB_ART_IDS.indexOf(job)));
export function actorArt(actor={}){
 if(actor.side==='ally')return jobArt(actor.currentJob);
 if(actor.raidBoss&&['fenrir','chryps'].includes(actor.bossId??actor.id))return descriptor(actor.bossId??actor.id,0);
 if(actor.raidBoss)return descriptor('raid',Math.max(0,RAID_ART_IDS.indexOf(actor.bossId??actor.id)));
 const id=actor.artId??actor.bestiaryId??actor.id??'';
 if(BOSS_ART[id])return BOSS_ART[id];
 const known=Object.keys(BOSS_ART).sort((a,b)=>b.length-a.length).find(k=>id.startsWith(k+'-w'));
 if(known)return BOSS_ART[known];
 if(id.startsWith('event-training-')){const job=id.slice(15).split('-w')[0];return {...jobArt(job),mirror:true};}
 const events={'event-halloween-pumpkin-slime':13,'event-halloween-ghost-wolf':14,'event-halloween-candy-mimic':15,'event-halloween-moon-wraith':8};
 for(const [key,n]of Object.entries(events))if(id.startsWith(key))return descriptor('normal',n);
 if(id.startsWith('stormSiren'))return descriptor('normal',10);
 if(id.startsWith('mimic'))return descriptor('normal',11);
 const match=id.match(/^monster(\d+)/);if(match)return {...descriptor('normal',(Number(match[1])-1)%10),tint:Math.floor((Number(match[1])-1)/10)*12};
 const rare={'rare-cactenten':3,'rare-nocross':8,'rare-hitokiri-goborun':3,'rare-jujutsu-goborun':3,'rare-archer-goborun':3,'rare-metal-purun':12,'rare-phantom-nyark':1,'rare-time-clockun':7,'rare-star-luxia':8,'rare-little-vorg':9};
 for(const [key,n]of Object.entries(rare))if(id.startsWith(key))return {...descriptor('normal',n),tint:45};
 if(id.startsWith('slime'))return descriptor('normal',0);
 const n=['スライム','ウルフ','バット','ゴブリン','ボア','ホーネット','リザード','ゴーレム','レイス','ドラゴネット'].findIndex(x=>String(actor.name).includes(x));
 return descriptor('normal',Math.max(0,n));
}
export function liveStatuses(actor={}){return (actor.hp??1)>0&&!actor.escaped?(actor.statusAilments??[]).filter(x=>STATUS_LABELS[x.id]&&(x.turns==null||x.turns>0)):[];}
function effects(actor){return liveStatuses(actor).map((s,i)=>`<span class="sprite-effect fx-${s.id}" style="--effect-delay:${i*.15}s" aria-hidden="true"><i></i><i></i><i></i>${s.id==='sleep'?'<b>Zzz</b>':s.id==='confusion'?'<b>★</b>':''}</span>`).join('');}
export function backgroundIndex(state={},actors=[]){const ids=actors.map(a=>a.bestiaryId??a.id??'').join(' ');if(ids.includes('event-halloween'))return 10;if(ids.includes('event-training'))return 11;if(actors.some(a=>a.mashoBoss))return 3;if(actors.some(a=>a.raidBoss))return 9;const region=actors.find(a=>a.side==='enemy'&&a.regionId)?.regionId??state.adventure?.regionId;return Math.max(0,REGIONS.indexOf(region));}
// Three transparent cells in one shared image preserve the approved pixel design.
function elementalSeal(element){
 const cell={fire:0,thunder:1,ice:2}[element];
 const particles=[[-38,-24],[-18,-40],[28,-35],[40,-14],[-29,10],[25,16]];
 return `<span class="action-vfx pixel-seal seal-${element}" data-seal-element="${element}" aria-hidden="true"><span class="pixel-seal-art"><img src="./assets/battle/pixel-magic-seals.png" alt="" width="2172" height="724" draggable="false" style="left:${-cell*100}%"></span>${particles.map(([x,y],i)=>`<i class="pixel-seal-mote" style="--mote-x:${x}px;--mote-y:${y}px;--mote-delay:${i*35}ms"></i>`).join('')}</span>`;
}
function actionEffect(event,damage,magicColor){
 const element=event.element==='lightning'?'thunder':event.element;
 if(damage>0&&event.kind==='magic'&&['fire','thunder','ice'].includes(element))return elementalSeal(element);

 return `<span style="--magic-color:${magicColor}" class="action-vfx vfx-${damage<0?'heal':event.kind==='magic'?'magic':'physical'}" aria-hidden="true"><i></i><i></i><i></i></span>`;
}
function sprite(actor,activeId,event={},action={}){
 const art=actorArt(actor),statuses=liveStatuses(actor),ko=(actor.hp??1)<=0,damage=Number(event.amount??0);
 const statusText=statuses.map(s=>STATUS_LABELS[s.id]).join('・');
 const isBoss=actor.isBoss||actor.raidBoss;
 const imageStyle=art.sheet==='highWizardFemale'?'width:92%;height:92%;left:4%;top:3%;':art.crop?`width:${(art.sheet==='specialJobs'?1086:art.sheet==='oaths'?1619:1402)/art.crop[2]*100}%;height:${(art.sheet==='specialJobs'?1448:art.sheet==='oaths'?971:1122)/art.crop[3]*100}%;left:${-art.crop[0]/art.crop[2]*100}%;top:${-art.crop[1]/art.crop[3]*100}%;`:'';
 const magicColor=({fire:'#ff9562',ice:'#8ce6ff',water:'#70caff',thunder:'#fff17b',lightning:'#fff17b',wind:'#a2ffd2',earth:'#e6b874',light:'#fff2ae',dark:'#c19aff'})[event.element]??'#bca6ff';
 const filter=art.tint?`filter:hue-rotate(${art.tint}deg);`:'';
 return `<div class="scene-actor ${actor.side} ${isBoss?'scene-boss':''} ${ko?'scene-ko':''} ${ko&&damage>0?'scene-finishing':''} ${actor.escaped?'scene-escaped':''} ${activeId===actor.id?'scene-active':''} ${damage>0?'scene-hit':damage<0?'scene-healed':''} ${action.actorId===actor.id?'scene-performing':''}" data-scene-actor="${esc(actor.id)}" data-art-key="${art.sheet}:${art.index}" style="--sprite-aspect:${art.aspect};--sprite-cols:${art.cols};--sprite-rows:${art.rows};--sprite-x:${art.index%art.cols};--sprite-y:${Math.floor(art.index/art.cols)};${filter}">
 <span class="actor-shadow" aria-hidden="true"></span><span class="sprite-viewport ${art.mirror?'sprite-mirror':''}"><img src="./assets/battle/${art.sheet}.png${art.sheet==='highWizardFemale'?'?v=50':''}" style="${imageStyle}" alt="${esc(actor.name)}${actor.side==='ally'?'（ジョブの姿）':''}" width="1536" height="1024" draggable="false"></span>
 ${effects(actor)}${actor.guarding&&!ko?'<span class="sprite-guard" aria-hidden="true"></span>':''}
 ${damage?`<span class="scene-number ${damage<0?'is-heal':''}">${damage<0?'+':''}${Math.abs(damage)}</span>${actionEffect(event,damage,magicColor)}`:''}
 <span class="scene-name">${esc(actor.name)}</span>${statusText?`<span class="scene-status">${statusText}</span>`:ko?'<span class="scene-status">戦闘不能</span>':''}</div>`;
}
export function battleStageMarkup(state={},battle={}){
 const actors=battle.actors??[],bg=backgroundIndex(state,actors),enemy=actors.filter(a=>a.side==='enemy'),ally=actors.filter(a=>a.side==='ally');
 const action=battle.visualAction??{};
 const events=Object.fromEntries((battle.visualEvents??[]).map(x=>[x.id,x]));
 return `<div class="battle-stage" data-battle-stage data-background="${bg}" style="--bg-x:${(bg%3)*50}%;--bg-y:${Math.floor(bg/3)*100/3}%" aria-label="戦闘シーン"><svg class="battle-landscape" viewBox="${(bg%3)*512} ${Math.floor(bg/3)*256} 512 256" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="./assets/battle/backgrounds.png" width="1536" height="1024"/></svg>${action.label?`<div class="scene-action-banner" role="status">${esc(action.actorName)}：${esc(action.label)}</div>`:''}<div class="scene-enemies" style="--count:${Math.max(1,enemy.length)}">${enemy.map(a=>sprite(a,battle.awaitingActorId,events[a.id],action)).join('')}</div><div class="scene-allies" style="--count:${Math.max(1,ally.length)}">${ally.map(a=>sprite(a,battle.awaitingActorId,events[a.id],action)).join('')}</div></div>`;
}
export function raidStageMarkup(room,party,activeId){return battleStageMarkup({}, {actors:[{id:'raid-scene-boss',bossId:room.bossId,name:room.boss?.name??'レイドボス',hp:room.currentHp,side:'enemy',raidBoss:true,isBoss:true},...party.map(a=>({...a,side:'ally'}))],awaitingActorId:activeId,visualAction:room.visualAction,visualEvents:room.visualEvents??[]});}
export function captureBattleHp(battle){return Object.fromEntries((battle?.actors??[]).map(a=>[a.id,a.hp??0]));}
export function battleHpChanges(before,battle){return (battle?.actors??[]).map(a=>({id:a.id,amount:(before[a.id]??a.hp)-a.hp})).filter(e=>e.amount!==0);}
