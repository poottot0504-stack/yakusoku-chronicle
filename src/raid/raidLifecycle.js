import {getRaidWindow,getNextRaidStart} from './raidRules.js';
export const RAID_DEFEATS_STORAGE_KEY='yakusoku.raid.defeatedWindows.v1';
export function restoreRaidDefeats(state,storage){
 let saved={};try{saved=JSON.parse(storage?.getItem(RAID_DEFEATS_STORAGE_KEY)??'{}')??{};}catch{}
 state.raid??={};state.raid.defeatedWindows={...saved,...(state.raid.defeatedWindows??{})};
 return state.raid.defeatedWindows;
}
export function rememberRaidDefeat(state,snapshot={}, {storage,now=Date.now()}={}){
 if(snapshot?.currentHp!==0||!snapshot?.bossId)return false;
 const at=Number(snapshot.capturedAt);
 // Never assign an undated saved defeat to the currently open session.
 const slot=snapshot.slotKey??(Number.isFinite(at)?getRaidWindow(at)?.id:null);
 if(!/^\d{4}-\d{2}-\d{2}-(evening|night)$/.test(slot??''))return false;
 const cleared=restoreRaidDefeats(state,storage),fresh=!cleared[slot];cleared[slot]=true;
 try{storage?.setItem(RAID_DEFEATS_STORAGE_KEY,JSON.stringify(cleared));}catch{}
 return fresh;
}
export function isRaidWindowDefeated(state,now=Date.now()){
 const slot=getRaidWindow(now)?.id;if(!slot)return false;
 return Boolean(state.raid?.defeatedWindows?.[slot]||(state.raid?.liveSnapshot?.slotKey===slot&&state.raid.liveSnapshot.currentHp===0));
}
export function raidWaitingMarkup(now=Date.now()){
 const d=new Date(getNextRaidStart(now)+9*3600000);
 return `<section class="panel raid-event-panel"><h3>🏆 この回のレイドボスは討伐済みです</h3><p>次の開催までお待ちください。</p><p>次回：${d.getUTCMonth()+1}月${d.getUTCDate()}日 ${d.getUTCHours()}:00（日本時間）</p></section>`;
}
export function raidRewardKey(snapshot={}){
 const sessionId=snapshot?.sessionId??'';
 const roomId=snapshot?.roomId??'';
 return sessionId&&roomId?`${sessionId}:${roomId}`:'';
}

export function isRaidTimedOutSnapshot(snapshot){
 return !snapshot?.active&&!snapshot?.bossId;
}

export function shouldGrantRaidReward(reward={}){return reward?.newlyClaimed!==false;}

export function storeRaidSnapshot(state,snapshot,{storage,now=Date.now()}={}){
 if(!snapshot||typeof snapshot!=='object')return;
 rememberRaidDefeat(state,snapshot,{storage,now});
 state.raid??={};
 // Snapshots are complete server responses. Merging can carry a defeated HP,
 // room ID or joined flag from the previous session into the next one.
 state.raid.liveSnapshot={...snapshot,capturedAt:now};
 return state.raid.liveSnapshot;
}
