export const JOB_ANNOUNCEMENT_START=Date.parse('2026-09-30T15:00:00Z');
export const JOB_RELEASE_AT=Date.parse('2026-10-12T15:00:00Z');
export function getJobReleaseStatus(now=Date.now()){const t=Number(now);if(t<JOB_ANNOUNCEMENT_START)return {phase:'hidden',announced:false,released:false};if(t<JOB_RELEASE_AT)return {phase:'announced',announced:true,released:false};return {phase:'released',announced:true,released:true};}
