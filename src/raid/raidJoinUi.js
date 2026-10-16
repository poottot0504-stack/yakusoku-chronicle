export const RAID_JOIN_TIMEOUT_MS=12000;

export function raidJoinButtonState({loading=false,eligible=true,joined=false}={}){
 if(!eligible)return {disabled:true,label:'🔒 Lv10から参加可能'};
 if(loading)return {disabled:true,label:'⚔️ レイドに接続中…'};
 return {disabled:false,label:joined?'⚔️ レイドに再挑戦':'⚔️ レイドに挑戦'};
}

export function raidJoinLoadingMarkup(){
 return `<div class="raid-join-loading" role="status" aria-live="polite"><h2>⚔️ レイドに接続中…</h2><p>共有HPと参加情報をサーバーから取得しています。</p><p class="notice">そのままお待ちください。</p></div>`;
}

export function withRaidJoinTimeout(promise,ms=RAID_JOIN_TIMEOUT_MS){
 let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('レイド接続がタイムアウトしました。もう一度お試しください')),ms);});
 return Promise.race([Promise.resolve(promise),timeout]).finally(()=>clearTimeout(timer));
}
