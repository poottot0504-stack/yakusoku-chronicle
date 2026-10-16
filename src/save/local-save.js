import { migrateSave } from '../core/save-migration.js';
const PREFIX='yakusoku-chronicle:v3';
const storageOf=session=>session?.storage??globalThis.localStorage;
export function localStorageKey(session={}){return session.mode==='user'&&session.userId?`${PREFIX}:user:${session.userId}`:`${PREFIX}:guest`;}
export function saveLocalGame(session,state,now=new Date().toISOString()){
 const storage=storageOf(session);if(!storage)throw new Error('保存先が利用できません');
 const save=migrateSave(state);storage.setItem(localStorageKey(session),JSON.stringify({save_data:save,updated_at:now}));return {save,updatedAt:now};
}
export function loadLocalRecord(session){
 const storage=storageOf(session);if(!storage)return null;const raw=storage.getItem(localStorageKey(session));if(!raw)return null;
 try{const parsed=JSON.parse(raw);const payload=parsed?.save_data??parsed;return {save:migrateSave(payload),updatedAt:parsed?.updated_at??null};}catch{return null;}
}
export function loadLocalGame(session){return loadLocalRecord(session)?.save??null;}
