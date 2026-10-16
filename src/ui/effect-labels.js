import { JOBS } from '../data/jobs.js';
import { getSkillBook } from '../core/skillbook.js';

const FIXED_EFFECT_LABELS={
  poison:'毒',burn:'火傷',paralysis:'麻痺',sleep:'睡眠',confusion:'混乱',freeze:'凍結',curse:'呪い',
  weak:'能力低下',armorBreak:'防御低下',focus:'集中',curseFocus:'呪力増幅',dragonSpirit:'竜気'
};

const SKILL_EFFECT_LABELS={};
for(const jobId of Object.keys(JOBS)){
  for(const skill of getSkillBook(jobId)){
    if(skill?.type==='buff'&&skill?.id&&skill?.name)SKILL_EFFECT_LABELS[skill.id]=skill.name;
  }
}

export function effectLabel(id){
  const raw=String(id??'');
  const base=raw.includes('::')?raw.split('::').at(-1):raw;
  return FIXED_EFFECT_LABELS[base]??SKILL_EFFECT_LABELS[base]??'状態変化';
}
