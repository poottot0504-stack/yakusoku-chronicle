import { ALL_JOBS, JOBS, describeJobPassive } from '../data/jobs.js';
import { canChangeJob } from '../core/jobs.js';
import { getSpecialJobTrials } from '../core/special-jobs.js';
import { getNpcsForLocation } from '../core/npcs.js';
import { npcCardsMarkup } from './npcs.js';
import { getJobReleaseStatus } from '../core/job-release.js';
import { isShieldGuardJob } from '../core/shielder-guard.js';

function advancedRequirementText(job){
  if(!['advanced','special'].includes(job.unlock?.type)||!job.unlock?.requires) return '';
  const parts=Object.entries(job.unlock.requires ?? {}).map(([jobId,lv])=>`${JOBS[jobId]?.name ?? jobId} Lv${lv}`);
  return parts.length?`転職条件：${parts.join(' ＋ ')}`:'転職条件：条件なし';
}

export function jobsMarkup(state,characterId,now=Date.now()){
  const c=state.characters.find(x=>x.id===characterId);
  if(!c)return '';
  const trials=getSpecialJobTrials(state),templeNpcs=getNpcsForLocation(state,'jobs'),released=getJobReleaseStatus(now).released;
  const visibleJobs=ALL_JOBS.filter(j=>released||j.unlock?.releaseId!=='archer-sniper-2026');
  return `<section class="panel"><div class="section-title"><h2>🔯 転職</h2><span>${c.name}</span></div><p class="notice job-help">上位職は基本職の職業Lv条件を満たすと解放されます。固有パッシブは現在のジョブのものだけ、戦闘中に自動発動します。未解放のジョブも効果を確認できます。</p><div>${visibleJobs.map(j=>{const ok=canChangeJob(state,c,j.id,now);const condition=['gunbreaker','astrologian'].includes(j.id)?`基礎値 攻${j.stats.attack}・防${j.stats.defense}・魔${j.stats.magic}・速${j.stats.speed}／初回職業Lv1・解放は下の試練へ`:advancedRequirementText(j);return `<button class="job-row" data-job-id="${j.id}" ${ok?'':'disabled'}><span class="job-name-block"><strong>${j.name}${c.currentJob===j.id?'（現在のジョブ）':''}</strong><small class="job-condition">✨ パッシブ：${describeJobPassive(j.id)}${c.currentJob===j.id?'【発動中】':''}</small>${condition?`<small class="job-condition">${condition}</small>`:''}${isShieldGuardJob(j.id)?'<small class="job-condition">🛡️ 隣接味方を半分肩代わり ／ Lv70 掛け声 ／ Lv300 全ダメージ肩代わり</small>':''}</span><span class="job-level">Lv${c.jobLevels?.[j.id]??0}</span><small class="job-lock">${ok?'':'🔒'}</small></button>`}).join('')}</div></section>${npcCardsMarkup(state,templeNpcs,'転職神殿の人々')}<section class="panel"><h2>👑 特殊ジョブ試練</h2><p class="notice">各試練は担当NPCから受注してください。街にいる試練官もいます。</p><div class="trial-grid">${trials.map(t=>`<article class="trial-card ${t.unlocked?'unlocked':''}"><div><strong>${t.name}</strong><small>${t.trialName}</small></div><p>${t.hint}</p><p class="trial-progress">進捗：${t.progressText??''}</p><small>${t.unlocked?'✓ 解放済み':t.ready?'担当NPCに話しかけよう':'条件未達成'}</small></article>`).join('')}</div></section>`;
}
