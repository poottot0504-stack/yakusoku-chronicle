import { migrateSave } from '../core/save-migration.js';
import { saveLocalGame } from '../save/local-save.js';

export async function loadCloudGame(session,cloud){
 if(session?.mode!=='user'||!session.userId||!cloud?.load)return null;
 const row=await cloud.load(session.userId);if(!row)return null;
 return {source:'cloud',save:migrateSave(row.save_data??row.saveData??row),updatedAt:row.updated_at??row.updatedAt??null};
}
export function resolveSaveConflict(local,remote){
 if(!local&&!remote)return null;if(!local)return {source:'cloud',save:migrateSave(remote.save),updatedAt:remote.updatedAt??null};if(!remote)return {source:'local',save:migrateSave(local.save),updatedAt:local.updatedAt??null};
 const lt=Date.parse(local.updatedAt??0)||0,rt=Date.parse(remote.updatedAt??0)||0;const chosen=lt>=rt?local:remote;return {source:chosen===local?'local':'cloud',save:migrateSave(chosen.save),updatedAt:chosen.updatedAt??null};
}
export async function persistGame(session,{reason='manual',cloud=null}={}){
 const state=migrateSave(session?.state??{});const local=saveLocalGame(session,state);let cloudSaved=false,syncPending=false,error=null;
 if(session?.mode==='user'&&session.userId&&cloud?.save){try{await cloud.save({userId:session.userId,saveVersion:state.saveVersion,saveData:state,updatedAt:local.updatedAt,reason});cloudSaved=true;}catch(e){syncPending=true;error=e;}}
 return {localSaved:true,cloudSaved,syncPending,error,save:state,updatedAt:local.updatedAt};
}
