import { getDailyTravelBonus } from './daily-travel-bonus.js';

// Scrolls consume actual foreground playtime, not time while the game is closed.
// Older save files stored a wall-clock expiration number; migrate once on load.
export const BOOST_SCROLLS = Object.freeze({
 characterExpScroll: {kind:'characterExp', name:'キャラクター経験値2倍の書'},
 jobExpScroll: {kind:'jobExp', name:'ジョブ経験値2倍の書'},
 goldScroll: {kind:'gold', name:'ゴールド2倍の書'},
 dropScroll: {kind:'drop', name:'ドロップアイテム2倍の書'}
});
export const BOOST_SCROLL_DROP_RATE = .001; // Each of the four scrolls rolls independently at 0.1% per eligible story monster.
const DURATIONS = [1,2,3];
const MAX_SCROLL_MS = 3*3600000;

function remainingFromEntry(entry,now=Date.now()) {
 if(entry && typeof entry==='object') {
  const value=Number(entry.remainingMs);
  return Number.isFinite(value)?Math.max(0,Math.min(MAX_SCROLL_MS,Math.floor(value))):0;
 }
 // Previous versions stored the Unix-millisecond expiration timestamp.
 const expiry=Number(entry??0);
 return Number.isFinite(expiry)?Math.max(0,Math.min(MAX_SCROLL_MS,expiry-now)):0;
}
export function normalizeBoostScrolls(raw={},now=Date.now()) {
 return Object.fromEntries(Object.values(BOOST_SCROLLS).map(({kind})=>
  [kind,{remainingMs:remainingFromEntry(raw?.[kind],now)}]));
}
export function remainingBoostMs(state,kind,now=Date.now()) {
 return remainingFromEntry(state?.boostScrolls?.[kind],now);
}
export function isBoostScrollActive(state,kind,now=Date.now()) {
 return remainingBoostMs(state,kind,now)>0;
}
export function advanceBoostPlaytime(state,elapsedMs) {
 const elapsed=Math.max(0,Math.floor(Number(elapsedMs)||0));
 if(!elapsed||!state?.boostScrolls)return 0;
 for(const {kind} of Object.values(BOOST_SCROLLS)) {
  const remaining=remainingBoostMs(state,kind);
  if(remaining>0)state.boostScrolls[kind]={remainingMs:Math.max(0,remaining-elapsed)};
 }
 return elapsed;
}
export const BOOST_IDLE_TIMEOUT_MS = 5*60*1000;
// Count until the last interaction plus five minutes, unless a battle is running.
// This lets lengthy automated battles consume time without treating an idle town screen as gameplay.
export function eligibleBoostPlaytimeMs({from,now,lastInputAt,inCombat=false,idleMs=BOOST_IDLE_TIMEOUT_MS}={}) {
 if(!Number.isFinite(from)||!Number.isFinite(now)||now<=from)return 0;
 const until=inCombat?now:Math.min(now,Number(lastInputAt||0)+idleMs);
 return Math.max(0,Math.floor(until-from));
}
export function scrollDurationLabel(ms) {
 const totalSeconds=Math.max(0,Math.ceil(ms/1000));
 const hours=Math.floor(totalSeconds/3600),minutes=Math.floor(totalSeconds%3600/60),seconds=totalSeconds%60;
 return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
export function useBoostScroll(state,itemId,{now=Date.now(),rng=Math.random}={}) {
 const book=BOOST_SCROLLS[itemId];
 if(!book)throw new Error('使用できない書です');
 if(isBoostScrollActive(state,book.kind,now))throw new Error('同じ種類の書の効果がまだ継続中です');
 const stack=(state.inventory??[]).find(item=>item.id===itemId&&item.qty>0);
 if(!stack)throw new Error('書を所持していません');
 const roll=Number(rng());const hours=DURATIONS[Math.max(0,Math.min(2,Math.floor((Number.isFinite(roll)?roll:0)*3)))];
 state.boostScrolls??={};
 state.boostScrolls[book.kind]={remainingMs:hours*3600000};
 stack.qty-=1;
 return {name:book.name,kind:book.kind,hours,remainingMs:hours*3600000};
}
// Same-type daily bonuses and scroll/event boosts do not multiply each other.
// The regular story/difficulty multipliers are still handled by the caller.
export function getBattleBoostMultiplier(state,kind,{now=Date.now(),eventMultiplier=1,includeDaily=true}={}) {
 const daily=getDailyTravelBonus(now);
 const key=kind==='characterExp'?'characterExpMultiplier':kind==='jobExp'?'jobExpMultiplier':kind==='drop'?'monsterMaterialDropMultiplier':'goldMultiplier';
 return Math.max(1,Number(eventMultiplier)||1,includeDaily&&daily.active?Number(daily[key]??1):1,isBoostScrollActive(state,kind,now)?2:1);
}
export function applyBoostedBattleGold(state,amount,now=Date.now(),{includeDaily=true}={}) {
 return Math.max(0,Math.floor(Math.max(0,Number(amount)||0)*getBattleBoostMultiplier(state,'gold',{now,includeDaily})));
}
