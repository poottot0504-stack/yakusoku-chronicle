import { migrateSave } from '../core/save-migration.js';
const PREFIX='yakusoku-chronicle:v4';
const LEGACY_PREFIX='yakusoku-chronicle:v3';
const storageOf=session=>session?.storage??globalThis.localStorage;
const owner=session=>session?.mode==='user'&&session.userId?`user:${session.userId}`:'guest';
const slotKey=(session,slot)=>`${PREFIX}:${owner(session)}:slot:${slot}`;
const legacyKey=session=>`${LEGACY_PREFIX}:${owner(session)}`;
const migrationKey=session=>`${PREFIX}:${owner(session)}:legacy-migrated`;
function validSlot(slot){const n=Number(slot);if(!Number.isInteger(n)||n<1||n>5)throw new Error('セーブスロットは1〜5です');return n;}
function recordFrom(raw){try{const p=JSON.parse(raw);return {save:migrateSave(p?.save_data??p),updatedAt:p?.updated_at??null};}catch{return null;}}
export function saveToSlot(session,slot,state,now=new Date().toISOString()){
 const storage=storageOf(session);if(!storage)throw new Error('保存先が利用できません');slot=validSlot(slot);const save=migrateSave({...state,lastSavedAt:now});storage.setItem(slotKey(session,slot),JSON.stringify({save_data:save,updated_at:now}));return {save,updatedAt:now,slot};
}
export function loadSlotRecord(session,slot){const storage=storageOf(session);if(!storage)return null;return recordFrom(storage.getItem(slotKey(session,validSlot(slot))));}
export function loadFromSlot(session,slot){return loadSlotRecord(session,slot)?.save??null;}
export function deleteSlot(session,slot){storageOf(session)?.removeItem(slotKey(session,validSlot(slot)));}
export function listSaveSlots(session){return Array.from({length:5},(_,i)=>{const slot=i+1,rec=loadSlotRecord(session,slot),hero=rec?.save?.characters?.find(c=>c.isHero)??rec?.save?.characters?.[0];return {slot,empty:!rec,heroName:hero?.name??null,heroLevel:hero?.level??null,currentJob:hero?.currentJob??null,cycle:rec?.save?.cycle??null,playTimeSeconds:rec?.save?.playTimeSeconds??0,updatedAt:rec?.updatedAt??null};});}
export function migrateLegacySaveToSlot1(session){
 const storage=storageOf(session);if(!storage||storage.getItem(migrationKey(session)))return {migrated:false};
 const raw=storage.getItem(legacyKey(session));if(!raw)return {migrated:false};
 if(loadSlotRecord(session,1)){storage.setItem(migrationKey(session),'1');return {migrated:false};}
 const rec=recordFrom(raw);if(!rec)return {migrated:false};
 saveToSlot(session,1,rec.save,rec.updatedAt??new Date().toISOString());storage.setItem(migrationKey(session),'1');return {migrated:true,slotId:1};
}
