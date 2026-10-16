import { JOBS } from '../data/jobs.js';
import { normalizeEquipmentForJob } from './equipment.js';
import { getJobReleaseStatus } from './job-release.js';

export function getJob(jobId){ return JOBS[jobId] ?? null; }
export function canChangeJob(state,character,jobId,now=Date.now()){
  const job=getJob(jobId); if(!job) return false;
  if(job.unlock?.releaseId==='archer-sniper-2026'&&!getJobReleaseStatus(now).released)return false;
  if(job.unlock.type==='basic') return true;
  if(job.unlock.type==='special') return state.unlockedSpecialJobs?.includes(jobId) ?? false;
  return Object.entries(job.unlock.requires ?? {}).every(([id,lv])=>(character.jobLevels?.[id]??0)>=lv);
}
export function changeJob(state,characterId,jobId){
  const c=state.characters.find(x=>x.id===characterId); if(!c) throw new Error('キャラクターが見つかりません');
  if(state.battleActive || state.specialEventActive) throw new Error('今は転職できません');
  if(!canChangeJob(state,c,jobId)) throw new Error('転職条件を満たしていません');
  if(!(jobId in c.jobLevels)) c.jobLevels[jobId]=1;
  c.currentJob=jobId;
  const before={...c.equipment};
  state.lastJobChangeUnequipped=[];
  for(const [slot,ref] of Object.entries(before)){if(['accessory1','accessory2'].includes(slot)||!ref)continue;const inst=typeof ref==='object'?ref:state.equipmentInventory?.find(x=>x.instanceId===ref);state.lastJobChangeUnequipped.push(inst?.equipmentId??ref);c.equipment[slot]=null;}
  normalizeEquipmentForJob(state,c,{preserveAccessories:true});
  return c;
}
