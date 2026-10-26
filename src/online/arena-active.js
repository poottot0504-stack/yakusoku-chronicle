// Unfinished arena battle checkpoint. No credentials, coin balance or gear.
import {arenaPendingKey} from './arena-recovery.js';
const PREFIX='yakusoku.arena.active.v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const arenaActiveKey=(owner,slot)=>PREFIX+'.'+arenaPendingKey(owner,slot).split('.').slice(-2).join('.');
function valid(record){
 return !!record&&typeof record==='object'&&!Array.isArray(record)&&
 UUID.test(record.matchId??'')&&['arena30','arena50','arena70'].includes(record.questId)&&
 Number.isInteger(record.seed)&&record.seed>=0&&record.seed<=0xffffffff&&
 Number.isSafeInteger(record.createdAt)&&record.createdAt>0&&
 Array.isArray(record.actions)&&record.actions.length<=400&&
 record.actions.every(a=>a&&typeof a==='object'&&!Array.isArray(a)&&
  typeof a.actorId==='string'&&a.actorId.length<=64&&
  ['attack','skill','defend','wait'].includes(a.type)&&
  (a.skillId===undefined||typeof a.skillId==='string'&&a.skillId.length<=80)&&
  (a.targetId===undefined||typeof a.targetId==='string'&&a.targetId.length<=80));
}
export function loadArenaActive(storage,owner,slot){
 const raw=storage.getItem(arenaActiveKey(owner,slot));
 if(raw===null)return null;
 if(raw.length>105000)throw new Error('保存した闘技大会の記録が大きすぎます');
 let value;
 try{value=JSON.parse(raw);}catch{throw new Error('保存した闘技大会の記録を読み込めません');}
 if(!valid(value))throw new Error('保存した闘技大会の記録が不正です');
 return value;
}
export function saveArenaActive(storage,owner,slot,record){
 if(!valid(record))throw new Error('闘技大会の記録が不正です');
 const old=loadArenaActive(storage,owner,slot);
 if(old&&old.matchId!==record.matchId)throw new Error('以前の闘技大会がまだ残っています');
 if(old&&record.actions.length<old.actions.length)throw new Error('闘技大会の記録を巻き戻せません');
 if(old&&JSON.stringify(record.actions.slice(0,old.actions.length))!==JSON.stringify(old.actions))
  throw new Error('闘技大会の確定した行動を変更できません');
 const raw=JSON.stringify(record);
 if(raw.length>105000)throw new Error('闘技大会の記録が大きすぎます');
 storage.setItem(arenaActiveKey(owner,slot),raw);
}
export function clearArenaActive(storage,owner,slot,matchId){
 const saved=loadArenaActive(storage,owner,slot);
 if(saved&&saved.matchId===matchId)storage.removeItem(arenaActiveKey(owner,slot));
}

/** Confirm existence without trusting potentially corrupted content. */
export function hasArenaActive(storage,owner,slot){
 return storage.getItem(arenaActiveKey(owner,slot))!==null;
}
/** Explicit user-confirmed forfeiture. Never edits balances or pending settlements. */
export function discardArenaActive(storage,owner,slot){
 storage.removeItem(arenaActiveKey(owner,slot));
}
