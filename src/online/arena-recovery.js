// Prototype-only. Save retry intents, never reward balances or authentication tokens.
// A pending record is scoped to a Supabase Auth user and save slot; server still
// validates user, match ownership and all coin mutations on every request.
const PREFIX='yakusoku.arena.pending.v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUESTS=new Set(['arena30','arena50','arena70']);
const ITEMS=new Set(['arena-guardian-shield','arena-arcane-spellbook','arena-gold-ring','arena-guardian-charm']);

export function arenaPendingKey(ownerId,saveSlot){
 if(!UUID.test(String(ownerId??'')))throw new Error('闘技大会のログイン確認が必要です');
 if(!Number.isInteger(saveSlot)||saveSlot<1||saveSlot>5)throw new Error('闘技大会のセーブスロットが不正です');
 return PREFIX+'.'+ownerId.toLowerCase()+'.'+saveSlot;
}
function validRecord(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 if(!Number.isSafeInteger(value.createdAt)||value.createdAt<=0)return false;
 if(value.kind==='claim'){
  return UUID.test(value.matchId??'')&&QUESTS.has(value.questId)&&
   Array.isArray(value.actions)&&value.actions.length<=400&&
   value.actions.every(a=>a&&typeof a==='object'&&!Array.isArray(a)&&
     typeof a.actorId==='string'&&a.actorId.length<=64&&
     ['attack','skill','defend','wait'].includes(a.type)&&
     (a.skillId===undefined||typeof a.skillId==='string'&&a.skillId.length<=80)&&
     (a.targetId===undefined||typeof a.targetId==='string'&&a.targetId.length<=80));
 }
 if(value.kind==='craft')return ITEMS.has(value.itemId)&&UUID.test(value.requestId??'');
 if(value.kind==='enhance')return UUID.test(value.itemId?.replace(/^arena-/,'')??'')&&UUID.test(value.requestId??'');
 return false;
}
function encoded(record){
 if(!validRecord(record))throw new Error('闘技大会の再試行データが不正です');
 const str=JSON.stringify(record);
 if(str.length>105000)throw new Error('闘技大会の戦闘記録が大きすぎます');
 return str;
}
export function loadArenaPending(storage,ownerId,saveSlot){
 const key=arenaPendingKey(ownerId,saveSlot);
 const raw=storage.getItem(key);
 if(raw===null)return null;
 if(raw.length>105000)throw new Error('闘技大会の保存データが大きすぎます');
 let record;
 try{record=JSON.parse(raw);}catch{throw new Error('闘技大会の保存データを読み込めません');}
 encoded(record);
 return record;
}
export function saveArenaPending(storage,ownerId,saveSlot,record){
 const key=arenaPendingKey(ownerId,saveSlot),next=encoded(record),old=loadArenaPending(storage,ownerId,saveSlot);
 if(old&&JSON.stringify(old)!==next)throw new Error('未完了の闘技大会処理があります。先に再試行してください');
 // If storage fails, do not initiate the server mutation without a retry record.
 storage.setItem(key,next);
 return record;
}
export function clearArenaPending(storage,ownerId,saveSlot,record){
 const key=arenaPendingKey(ownerId,saveSlot),old=loadArenaPending(storage,ownerId,saveSlot);
 if(!old)return;
 if(JSON.stringify(old)!==encoded(record))throw new Error('別の闘技大会処理が進行中です');
 storage.removeItem(key);
}
