import { getBattleSkills, getSkillInheritanceFamily, getAllowedSkillSourceJobs, getSkillBook, getCharacterSkillCatalog, getSelectedSkillIds, skillMetricLabel, BATTLE_SKILL_LIMIT } from '../core/skillbook.js';
import { JOBS } from '../data/jobs.js';
import { getSkillPresets,getSkillPresetName,SKILL_PRESET_COUNT } from '../core/skill-presets.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const SKILL_FAMILY_TEXT={
 swordsman:'剣士系（剣士・格闘家・暗黒騎士・パラディン・竜騎士・ガンブレイカー・ベルセルク）',
 mage:'魔法使い系（魔法使い・ヒーラー・白魔道士・黒魔術師・召喚士・吟遊詩人・ビショップ・占星術師・ハイウィザード）',
 thief:'盗賊系（盗賊・アーチャー・スナイパー・海賊王・トリックスター）',
 redMage:'赤魔道士専用＋継承可能（剣士・魔法使い・ヒーラー・白魔道士・黒魔術師・ハイウィザード）'
};

export function skillsMarkup(state,characterId){
 const c=state.characters.find(x=>x.id===characterId);if(!c)return '';
 const selected=getBattleSkills(c),lv=c.jobLevels?.[c.currentJob]??1,next=getSkillBook(c.currentJob).find(s=>s.level>lv);
 return `<section class="panel"><div class="section-title"><h2>特技・魔法</h2><span>セット ${selected.length}/${BATTLE_SKILL_LIMIT}</span></div><button class="wide-button" data-character-skills="${esc(c.id)}">${esc(c.name)}の特技・魔法リスト</button><p class="notice">${next?`次の習得：ジョブLv${next.level} ${esc(next.name)}`:'このジョブの特技・魔法はすべて習得済みです。'}</p></section>`;
}
export function skillLoadoutMarkup(state,characterId){
 const c=state.characters.find(x=>x.id===characterId);if(!c)return '<p>キャラクターが見つかりません。</p>';
 if(['shielder','greatShielder'].includes(c.currentJob)){
  const escText=esc;
  const level=c.jobLevels?.[c.currentJob]??1;
  const milestones=getSkillBook(c.currentJob);
  return `<section class="panel shield-skill-list" data-no-pixel-icon><button data-skill-list-back>← 前の画面へ戻る</button><h2>🛡️ ${escText(c.name)}：${escText(JOBS[c.currentJob]?.name??'盾士')}の守護特性</h2><p class="notice">戦闘コマンドはほかのジョブと同じです。肩代わりや掛け声など、下の守護特性は職業Lvに応じて自動発動します。</p><div class="skill-catalog">${milestones.map(v=>`<article class="skill-catalog-row ${level>=v.level?'is-set':'is-locked'}"><h4>${escText(v.name)}（Lv${v.level}）</h4><p class="skill-description">${escText(v.description??'')}</p><small>${level>=v.level?'習得済み・自動発動':'未習得'}</small></article>`).join('')}</div></section>`;
 }
 const lv=c.jobLevels?.[c.currentJob]??1,all=getCharacterSkillCatalog(c),ids=getSelectedSkillIds(c),selected=new Set(ids),full=ids.length>=BATTLE_SKILL_LIMIT;
 const allowedJobs=getAllowedSkillSourceJobs(c.currentJob),jobOrder=[...(allowedJobs.includes(c.currentJob)?[c.currentJob]:[]),...allowedJobs.filter(id=>id!==c.currentJob)];
 const categories=jobOrder.map(jobId=>({jobId,skills:all.filter(s=>s.sourceJob===jobId)})).filter(group=>group.skills.length),hasCurrentCategory=categories.some(group=>group.jobId===c.currentJob);
 const skillCard=s=>{const learned=s.learned,on=selected.has(s.id),jobName=JOBS[s.sourceJob]?.name??s.sourceJob,suffix=`（${jobName}）`,displayName=s.sourceJob!==c.currentJob&&String(s.name).endsWith(suffix)?String(s.name).slice(0,-suffix.length):s.name;return `<article class="skill-catalog-row ${on?'is-set':''} ${learned?'':'is-locked'}" data-skill-row="${esc(s.id)}"><div class="skill-catalog-title"><h4>${esc(displayName)}</h4><b>MP ${s.mp}</b></div><small>習得：ジョブLv${s.level} ／ ${learned?'習得済み':'未習得'}</small><p class="skill-description">${esc(s.description)}</p><button data-toggle-battle-skill="${esc(s.id)}" data-skill-character="${esc(c.id)}" aria-pressed="${on}" ${!learned||(!on&&full)?'disabled':''}>${on?'✓ セット中・解除':!learned?`ジョブLv${s.level}で習得`:full?'10枠使用中':'＋ セットする'}</button></article>`;};
 const categoryMarkup=categories.map(({jobId,skills},index)=>{const learnedCount=skills.filter(s=>s.learned).length,jobLv=Number(c.jobLevels?.[jobId]??0),isOpen=jobId===c.currentJob||(!hasCurrentCategory&&index===0);return `<details class="skill-job-category" ${isOpen?'open':''}><summary><span><b>${esc(JOBS[jobId]?.name??jobId)}</b><small>ジョブLv${jobLv}</small></span><em>${learnedCount}/${skills.length} 習得</em></summary><div class="skill-catalog">${skills.map(skillCard).join('')}</div></details>`;}).join('');
 const presets=getSkillPresets(state),presetCards=presets.map((preset,index)=>{const no=index+1,summary=preset?`${JOBS[preset.originJob]?.name??'旧ジョブ'}・${preset.skills.length}個${preset.sourceCharacterName?' / '+preset.sourceCharacterName:''}`:'未保存';return `<div class="skill-preset-row"><div class="skill-preset-detail"><b>${esc(getSkillPresetName(state,no))}</b><small>${esc(summary)}</small></div><div class="skill-preset-actions"><button type="button" data-skill-preset-rename="${no}" data-skill-character="${esc(c.id)}" aria-label="セット${no}の名前を変更">名前変更</button><button type="button" data-skill-preset-save="${no}" data-skill-character="${esc(c.id)}">保存</button><button type="button" data-skill-preset-apply="${no}" data-skill-character="${esc(c.id)}" ${preset?'':'disabled'}>呼び出す</button></div></div>`;}).join('');
 const family=getSkillInheritanceFamily(c.currentJob),familyText=SKILL_FAMILY_TEXT[family]??'現在のジョブに対応した系統';
 return `<section class="skill-loadout-screen"><button class="wide-button" data-skill-list-back>← 前の画面へ戻る</button><header class="panel skill-loadout-header"><div><h2>${esc(c.name)}の特技・魔法リスト</h2><p>${esc(JOBS[c.currentJob]?.name??c.currentJob)}・ジョブLv${lv}</p></div><strong class="skill-slot-counter" role="status">セット ${ids.length} / ${BATTLE_SKILL_LIMIT}</strong><p><b>${esc(familyText)}</b>で習得した技から最大10個セットできます。ジョブ別カテゴリーを開いて技を選べます。通常戦闘・レイドで使えます。変更は自動保存され、キャラ・ジョブごとに記憶します。</p><button class="wide-button" data-auto-battle-skills="${esc(c.id)}">おまかせ編成</button><p class="notice">現在ジョブの役割・威力・回復・補助・消費MPを見て、必要な特技・魔法を自動で最大6個選びます。</p><p>${full?'10枠使用中です。入れ替えるには、先に1つ解除してください。':'新しい上位技は、習得後に各ジョブのカテゴリーからセットしてください。'}</p></header>
 <section class="panel skill-presets-panel"><h3>スキル構成の保存・呼び出し</h3><p class="notice">全${SKILL_PRESET_COUNT}セットは仲間同士で共用できます。「保存」は現在のスキル構成でその番号を上書きします。「呼び出す」は現在の仲間に適用します。未習得・現在の職業で使用不可の技は除外され、使える技が1つもない場合は変更しません。</p><div class="skill-preset-list">${presetCards}</div></section>
 <section class="panel"><h3>セット中</h3><div class="selected-skill-list">${ids.map(id=>{const s=all.find(x=>x.id===id);return s?`<button data-toggle-battle-skill="${esc(id)}" data-skill-character="${esc(c.id)}" aria-label="${esc(s.name)}を解除"><span>${esc(s.name)}</span><span class="selected-skill-description">${esc(s.description||'効果説明なし')}</span><small>MP ${s.mp} ／ 解除 ×</small></button>`:'';}).join('')||'<p>セット中の技はありません。下のリストから選んでください。</p>'}</div></section>
 <section class="panel skill-catalog-panel"><div class="skill-catalog-heading"><h3>習得リスト</h3><small>ジョブLv300まで</small></div><p class="notice">ジョブ名をタップすると、そのジョブで覚える特技・魔法を開閉できます。</p><div class="skill-job-categories">${categoryMarkup}</div></section></section>`;
}
