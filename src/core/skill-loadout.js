import { SKILLS } from '../data/skills.js';import { getJob } from './jobs.js';
export function getInheritanceSlotCount(level){if(level>=200)return 5;if(level>=150)return 4;if(level>=100)return 3;if(level>=60)return 2;if(level>=30)return 1;return 0;}
export function setInheritedSkills(character,skillIds){
 if(skillIds.length>getInheritanceSlotCount(character.level)) throw new Error('継承枠が足りません');
 for(const id of skillIds){if(!character.learnedSkills?.includes(id))throw new Error('未習得スキルです');if(SKILLS[id]?.inheritAllowed===false)throw new Error('継承不可のスキルです');}
 character.inheritedSkills=[...skillIds];return character.inheritedSkills;
}
export function applyJobMastery(character,jobId){
 character.masteredJobs??=[];character.masteryBonuses??={};character.titles??=[];
 if(character.masteredJobs.includes(jobId))return false;
 const job=getJob(jobId);if(!job)throw new Error('不明なジョブです');
 character.masteredJobs.push(jobId);
 for(const [k,v] of Object.entries(job.mastery??{})) character.masteryBonuses[k]=(character.masteryBonuses[k]??0)+v;
 character.titles.push(`${job.name}マスター`);return true;
}
