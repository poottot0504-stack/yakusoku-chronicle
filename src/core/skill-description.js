const stat={attackPct:'攻撃',magicPct:'魔法',defensePct:'防御',critRate:'会心率',speedPct:'素早さ'};
const status={poison:'毒',burn:'火傷',sleep:'睡眠',confusion:'混乱',paralysis:'麻痺',freeze:'凍結',curse:'呪い'};
const element={fire:'火',ice:'氷',thunder:'雷',water:'水',light:'光',dark:'闇',none:'無'};
const num=v=>Number(v).toLocaleString('ja-JP');
export function describeSkill(skill,{raid=false}={}){
 if(!skill)return '';
 const s=skill,out=[];
 if(s.autoPassive)return String(s.autoDescription??s.description??'自動発動する特性');
 if(s.type==='heal'){
  const targets=s.target==='all'?'生存中の味方全員':'味方1人';
  out.push(`${targets}のHPを${s.fullHeal?'全回復':s.healRatio!=null?`最大HPの${Math.round(s.healRatio*100)}％回復`:Number.isFinite(s.flatHeal)?`${num(s.flatHeal)}回復`:'魔法に応じて回復'}。最大HPを超えて回復しません。`);
  if(!raid&&!s.fullHeal)out.push('呪い状態では回復量が半減します。');
  if(s.reviveFallenRatio)out.push(`戦闘不能の味方全員を最大HPの${Math.round(s.reviveFallenRatio*100)}％で蘇生。`);
  if(s.highClear)out.push('生存中の味方全員の状態異常を解除。');else if(s.clear)out.push(`${s.target==='all'&&!raid?'選択された味方1人':'回復対象'}の状態異常を解除。`);
 }else if(s.type==='revive')out.push(`戦闘不能の味方1人を、最大HPの${Math.round((s.hpRatio??.3)*100)}％で蘇生。`);
 else if(s.type==='buff'){
  out.push(`${s.target==='all'?'生存中の味方全員':'自分'}の${Object.entries(s.selfBuff??{}).filter(([k,v])=>v!==0&&(!raid||['attackPct','magicPct','defensePct'].includes(k))).map(([k,v])=>`${stat[k]??k}を${Math.round(v*100)}${k==='critRate'?'ポイント':'％'}上昇`).join('、')}。${s.turns??3}ターン持続（使用ターンを含む）。`);
  if(raid){out.push('レイドの既存の能力強化を上書きします。');if(s.selfBuff?.critRate)out.push('レイドでは会心率補正は適用されません。');}else if(s.selfBuff?.attackPct&&s.selfBuff.magicPct==null)out.push(`魔法も${Math.round(s.selfBuff.attackPct*100)}％上昇します。`);
  if(!raid)out.push('同じ技の効果は重複しません。');
 }else{
  const attr=(s.element&&s.element!=='none')?`${element[s.element]??s.element}属性の`:'';
  out.push(`${s.allTargets?'敵全体':'敵1体'}に${attr}${s.kind==='magic'||s.type==='magic'?'魔法':'物理'}攻撃。`);
  const hits=s.multiHit??1;out.push(`威力${s.power??100}％${hits>1?`×${hits}回（合計${(s.power??100)*hits}％）`:''}。`);
  if(s.defensePierce)out.push(`対象の防御計算を${Math.round(s.defensePierce*100)}％無視。`);
  if(s.critRateBonus)out.push(`${raid?'通常戦闘では':''}会心率＋${Math.round(s.critRateBonus*100)}ポイント。`);
  if(s.status)out.push(`${raid?'通常戦闘では':''}${status[s.status]??s.status}を確率で付与（${s.strongStatus?5:3}ターン、耐性で変動）。`);
  if(s.debuff)out.push(`${raid?'通常戦闘では':''}${Object.entries(s.debuff).map(([k,v])=>`${({attack:'攻撃',defense:'防御',magic:'魔法',speed:'素早さ'})[k]??k}${v}`).join('・')}を確率で付与（3ターン）。`);
  if(s.defenseDownPct)out.push(`${raid?'通常戦闘では':''}防御${Math.round(s.defenseDownPct*100)}％低下を確率で付与（ボスは${Math.round((s.bossDefenseDownPct??s.defenseDownPct*.35)*100)}％、3ターン）。`);
  if(raid&&(s.status||s.debuff||s.defenseDownPct))out.push('レイドでは追加効果を支援貢献として加算します。');
 }
 return out.join('');
}
