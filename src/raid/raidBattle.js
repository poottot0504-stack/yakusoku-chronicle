import { deathWarningText } from '../ui/death-warning.js';
import {raidStageMarkup} from '../ui/battle-art.js';
import { JOBS, applyJobPassiveToStat } from '../data/jobs.js';
import { getRaidBossStats } from './raidRules.js?v=raid-balance-20261014';
import { elementProfileLabel } from '../core/elements.js';
import { chooseRaidBossStatusAction, raidStatusLabel } from './raidStatus.js';
export const RAID_ACTIONS={attack:{label:'⚔️ 攻撃'},guard:{label:'🛡️ 防御'},heal:{label:'💖 回復'},support:{label:'✨ 支援'}};

// Every job has an explicit raid identity. Multipliers affect raid only.
export const RAID_JOB_PROFILES={
 gunbreaker:{role:'tank',power:'attack',damage:1.05,guard:1.50,heal:.75,support:2},
 astrologian:{role:'healer',power:'magic',damage:.80,guard:.90,heal:1.65,support:3},
 swordsman:{role:'physical',power:'attack',damage:1.00,guard:1.15,heal:.70,support:1},
 mage:{role:'magic',power:'magic',damage:1.00,guard:.85,heal:.90,support:1},
 thief:{role:'physical',power:'attack',speedWeight:.25,damage:.95,guard:.80,heal:.65,support:1},
 fighter:{role:'physical',power:'attack',damage:1.10,guard:1.05,heal:.60,support:1},
 healer:{role:'healer',power:'magic',damage:.75,guard:.90,heal:1.45,support:1},
 archer:{role:'physical',power:'attack',speedWeight:.10,damage:1.05,guard:.80,heal:.65,support:1},
 redMage:{role:'hybrid',power:'hybrid',damage:1.00,guard:.95,heal:1.00,support:1},
 whiteMage:{role:'healer',power:'magic',damage:.80,guard:1.00,heal:1.75,support:2},
 blackMage:{role:'magic',power:'magic',damage:1.25,guard:.75,heal:.70,support:1},
 darkKnight:{role:'physical',power:'attack',damage:1.20,guard:1.05,heal:.55,support:1,enrage:.30},
 pirateKing:{role:'physical',power:'attack',speedWeight:.15,damage:1.05,guard:.90,heal:.65,support:2},
 sniper:{role:'physical',power:'attack',speedWeight:.10,damage:1.20,guard:.75,heal:.55,support:1},
 paladin:{role:'tank',power:'attack',damage:.85,guard:1.80,heal:.90,support:2},
 bard:{role:'support',power:'magic',speedWeight:.15,damage:.75,guard:.85,heal:.90,support:3},
 trickster:{role:'support',power:'magic',speedWeight:.15,damage:.80,guard:.75,heal:.70,support:3},
 bishop:{role:'healer',power:'magic',damage:.75,guard:1.05,heal:1.90,support:2},
 highWizard:{role:'magic',power:'magic',damage:1.35,guard:.70,heal:.65,support:1},
 berserker:{role:'physical',power:'attack',damage:1.25,guard:.65,heal:.45,support:1,enrage:.50}
};

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const profileFor=hero=>RAID_JOB_PROFILES[hero?.currentJob]??RAID_JOB_PROFILES.swordsman;
const hpEnrage=(hero,p)=>{if(!p.enrage)return 1;const max=Math.max(1,hero?.maxHp??hero?.hp??1),ratio=Math.max(0,Math.min(1,(hero?.hp??max)/max));return 1+p.enrage*(1-ratio);};
const raidPhaseLabel=ratio=>ratio<=.25?'⚠️ 最終フェーズ +30%':ratio<=.50?'🔥 強化フェーズ +15%':'通常フェーズ';
const jobLabel=jobId=>JOBS?.[jobId]?.name??jobId??'冒険者';
export function raidEffectMarkup(effects=[]){return (effects??[]).filter(e=>(e?.turns??0)>0).map(e=>`<span class="effect-chip">${esc(raidStatusLabel(e.id))}${e.turns!=null?`（残り${esc(e.turns)}ターン）`:''}</span>`).join('');}

function meterPercent(now,max){return Math.max(0,Math.min(100,Math.round((Math.max(0,Number(now??0))/Math.max(1,Number(max??1)))*100)));}
function partyCardMarkup(member,activeActorId){
 const hp=Number(member?.hp??0),maxHp=Number(member?.maxHp??hp),mp=Number(member?.mp??0),maxMp=Number(member?.maxMp??mp);
 const active=member?.id===activeActorId?' is-active':'';
 return `<article class="combatant raid-party-card${active}" data-raid-party-card="${esc(member?.id??'')}">
   <div class="combatant-head"><h3>${esc(member?.name??'仲間')}</h3><span>Lv${Math.max(1,Number(member?.level??1))}</span></div>
   <div class="raid-party-job"><b>${esc(jobLabel(member?.currentJob))}</b> <span>Lv${Math.max(1,Number(member?.jobLevels?.[member?.currentJob]??1))}</span></div>
   <div class="bar-label"><span>HP</span><b data-raid-party-hp-text="${esc(member?.id??'')}">${hp}/${maxHp}</b></div>
   <div class="meter hp-bar"><i data-raid-party-hp-fill="${esc(member?.id??'')}" style="width:${meterPercent(hp,maxHp)}%"></i></div>
   <div class="bar-label"><span>MP</span><b data-raid-party-mp-text="${esc(member?.id??'')}">${mp}/${maxMp}</b></div>
   <div class="meter mp-bar"><i data-raid-party-mp-fill="${esc(member?.id??'')}" style="width:${meterPercent(mp,maxMp)}%"></i></div>
   <div class="effect-row" data-raid-party-effects="${esc(member?.id??'')}">${raidEffectMarkup(member?.statusAilments??[])}</div>
 </article>`;
}
function raidActionButtons(){
 return `<nav class="battle-commands raid-command-bar" data-raid-actions>
   <button data-raid-action="attack"><span>⚔️</span><span>たたかう</span></button>
   <button data-raid-open-skills><span>✨</span><span>特技・魔法</span></button>
   <button data-raid-open-items><span>🧪</span><span>アイテム</span></button>
   <button data-raid-action="guard"><span>🛡️</span><span>防御</span></button>
   <button data-raid-exit><span>💨</span><span>にげる</span></button>
 </nav>`;
}
function raidLogMarkup(lines=[]){
 const recent=(Array.isArray(lines)&&lines.length?lines:['⚔️ レイドバトル開始！']).slice(-8);
 return recent.map(line=>`<div>${esc(line)}</div>`).join('');
}

export function raidPowerStat(hero={},action='attack',statBonus={}){
 const job=hero?.currentJob??'swordsman',p=profileFor(hero),atk=Math.max(1,applyJobPassiveToStat(hero,'attack',(hero?.stats?.attack??1)+(statBonus?.attack??0))),mag=Math.max(1,applyJobPassiveToStat(hero,'magic',(hero?.stats?.magic??1)+(statBonus?.magic??0))),spd=Math.max(0,applyJobPassiveToStat(hero,'speed',(hero?.stats?.speed??0)+(statBonus?.speed??0)));
 if(job==='redMage'){
  if(action==='magic'||action==='chainMagic')return {kind:'magic',value:mag};
  if(action==='magicSword')return {kind:'hybrid',value:Math.round((atk+mag)/2)};
  return {kind:'physical',value:atk};
 }
 const kind=p.power==='magic'?'magic':'physical';
 const base=kind==='magic'?mag:atk;
 return {kind,value:Math.round(base+spd*(p.speedWeight??0))};
}

export function raidActionPayload(type,hero,bossStats={defense:0},statBonus={}){
 const p=profileFor(hero),lv=Math.max(1,hero?.level??1),jobLv=hero?.jobLevels?.[hero?.currentJob]??1,mag=Math.max(1,applyJobPassiveToStat(hero,'magic',(hero?.stats?.magic??1)+(statBonus?.magic??0))),powerInfo=raidPowerStat(hero,type,statBonus),power=powerInfo.value,base=lv+jobLv+power*4,physicalDefense=Math.max(0,bossStats?.defense??0),magicDefense=Math.max(0,bossStats?.magicDefense??bossStats?.magicAttack??0),effectiveDefense=powerInfo.kind==='magic'?magicDefense:powerInfo.kind==='hybrid'?(physicalDefense+magicDefense)/2:physicalDefense,mitigation=300/(300+effectiveDefense),rage=hpEnrage(hero,p);
 const hit=m=>Math.max(1,Math.round(base*m*mitigation*p.damage*rage));
 const guard=Math.max(1,Math.floor((lv+jobLv)*2.2*p.guard));
 const healing=Math.max(1,Math.floor((lv+jobLv+mag*2)*2*p.heal));
 switch(type){
  case'magicSword':return {type,damage:Math.max(1,Math.round(base*2.0*mitigation*rage))};
  case'magic':return {type,damage:Math.max(1,Math.round(base*1.8*mitigation*rage))};
  case'chainMagic':return {type,damage:Math.max(1,Math.round(base*2.4*mitigation*rage)),supportActions:1,supportValue:150};
  case'guard':return {type,damage:0,defensePrevented:guard};
  case'heal':return {type,damage:hit(.18),healing};
  case'support':return {type,damage:hit(.35),supportActions:p.support,supportValue:p.support*150};
  default:return {type:'attack',damage:hit(1.8)};
 }
}

export function effectiveRaidHealing(hero={},amount=0){const hp=Math.max(0,Number(hero?.hp??0)),max=Math.max(hp,Number(hero?.maxHp??hp));return Math.max(0,Math.min(Math.max(0,Math.floor(amount)),max-hp));}
export function chooseRaidBossAttack(bossId,hpRatio,rng=Math.random,party=[]){const r=rng();if(hpRatio<=.25&&r<.12)return {kind:'wipe',name:'終焉の刻',telegraph:true};if(r<.18){const alive=party.filter(a=>a.hp>0),target=alive[Math.min(alive.length-1,Math.floor(rng()*alive.length))];return {kind:'death',name:'死の宣告',telegraph:true,targetId:target?.id,targetName:target?.name};}if(r<.40)return chooseRaidBossStatusAction(bossId,rng);if(r<.65)return {kind:'aoe',name:'五神の震撃'};return {kind:'single',name:'強襲'};}

export function raidBattleMarkup(room,hero={},pendingBossAction=null,party=[],battleLog=[],turnInfo={}){
 const hp=Math.max(0,room.currentHp??0),max=Math.max(1,room.maxHp??1),pct=Math.max(0,Math.min(100,hp/max*100));
 const partyMembers=(Array.isArray(party)&&party.length?party:[hero]).slice(0,4);
 const executing=turnInfo?.executing===true;
 const activeActorId=executing?null:(turnInfo?.currentActorId??partyMembers.find(x=>(x?.hp??0)>0)?.id??hero?.id);
 const activeActor=executing?null:(partyMembers.find(x=>x.id===activeActorId)??hero);
 const total=Math.max(1,Number(turnInfo?.total??(partyMembers.filter(x=>(x?.hp??0)>0).length||1))),index=Math.min(total,Number(turnInfo?.index??0)+1);
 const telegraph=pendingBossAction?.telegraph===true;
 const timedOut=turnInfo?.endedReason==='timeout';

 return `<section class="battle-ui raid-battle-modal">
   <header class="battle-header"><span>⚔ 戦闘</span>${turnInfo.autoEnabled?`<button type="button" class="battle-auto-stop" data-auto-stop data-no-pixel-icon aria-label="この戦闘のオートプレイを停止"${turnInfo.autoStopped?' disabled':''}>${turnInfo.autoStopped?'手動':'■ ストップ'}</button>`:''}<strong>レイドバトル</strong></header><aside class="battle-death-warning" data-raid-telegraph role="alert" ${telegraph&&hp>0&&!timedOut?'':'hidden'}><b>⚠️ ${esc(room.boss?.name??'ボス')}が力を溜めている！</b><span>${esc(deathWarningText(pendingBossAction,partyMembers))}</span></aside>
   <div class="battle-field raid-battle-field">
     <div class="enemy-party raid-enemy-party">
       <article class="combatant enemy raid-boss-card raid-boss-hp-only">
         <div class="combatant-head"><h3>${esc(room.boss?.name??'レイドボス')}</h3></div>
         <div class="battle-element">${esc(elementProfileLabel(room.boss??{}))}</div>
         <div class="bar-label"><span>共有HP</span><b data-raid-hp-text>${hp.toLocaleString()} / ${max.toLocaleString()}</b></div>
         <div class="raid-hp-track"><i data-raid-hp-fill style="width:${pct}%"></i></div>
         <div class="effect-row" data-raid-boss-effects>${raidEffectMarkup(room?.bossStatusAilments??[])}</div>
       </article>
     </div>
     ${raidStageMarkup(room,partyMembers,activeActorId)}
     <div class="ally-party raid-ally-party">${partyMembers.map(member=>partyCardMarkup(member,activeActorId)).join('')}</div>
   </div>
   <div class="raid-result-status">

     <div class="raid-inline-status" data-raid-reward-status>一定条件を満たすと特別報酬を自動受取します。</div>

     <div class="raid-defeated" data-raid-defeated ${hp<=0&&!timedOut?'':'hidden'}><b>🏆 レイドボス討伐！</b></div>
     ${timedOut?`<div class="raid-timeout" data-raid-timeout><b>${esc(room.boss?.name??'レイドボス')}は逃げ出した…</b></div>`:''}
   </div>
   ${timedOut?'<div class="turn-owner">戦闘終了</div><div class="raid-after-actions"><button data-raid-exit>閉じる</button></div>':hp>0&&executing?'<div class="turn-owner raid-executing" data-raid-turn-owner>⚔️ 行動実行中…</div>':hp>0&&activeActor?`<div class="turn-owner" data-raid-turn-owner>行動選択 ${index}/${total}　▶ ${esc(activeActor?.name??'仲間')}</div>${raidActionButtons()}`:`<div class="turn-owner">討伐完了</div><div class="raid-after-actions"><p>次の開催までお待ちください。</p><button data-raid-exit>閉じる</button></div>`}
 </section>`;
}

export function calculateRaidBossDamage(stats,target={},kind='single'){const magical=kind==='magic'||kind==='magicAoe',source=magical?stats.magicAttack:stats.attack,defense=Math.max(0,target?.defense??0),aoe=kind==='aoe'||kind==='magicAoe',mult=aoe?1.125:1.5;return Math.max(1,Math.round(source*(300/(300+defense))*mult));}
export function currentRaidBossStats(room){return getRaidBossStats(room?.bossId,(room?.currentHp??1)/Math.max(1,room?.maxHp??1));}
