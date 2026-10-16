export const RAID_STATUS_LABELS=Object.freeze({
 poison:'毒',burn:'火傷',paralysis:'麻痺',sleep:'睡眠',confusion:'混乱',freeze:'凍結',curse:'呪い'
});

const BOSS_STATUS_BASE_CHANCE=Object.freeze({
 poison:.12,burn:.10,paralysis:.04,sleep:.03,confusion:.04,freeze:.03,curse:.07
});
const BOSS_DOT_RATE=Object.freeze({poison:.002,burn:.0015,curse:.001});
const PARTY_DOT_RATE=Object.freeze({poison:.02,burn:.03,curse:.02});
const INCAPACITATING=new Set(['paralysis','sleep','freeze']);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const raidStatusLabel=id=>RAID_STATUS_LABELS[id]??String(id??'状態異常');

function active(list=[]){return list.filter(x=>x&&RAID_STATUS_LABELS[x.id]&&(x.turns??0)>0);}
function addOrRefresh(list,effect){
 const old=list.find(x=>x.id===effect.id);
 if(old){old.turns=Math.max(Number(old.turns??0),Number(effect.turns??1));old.strong=Boolean(old.strong||effect.strong);return {applied:true,refreshed:true,effect:old};}
 list.push(effect);return {applied:true,refreshed:false,effect};
}

export function getRaidBossStatuses(room={}){return active(room.bossStatusAilments??[]);}
export function getRaidPartyStatuses(actor={}){return active(actor.statusAilments??[]);}

export function tryInflictRaidBossStatus(room,actor,skill,rng=Math.random){
 const id=skill?.status;if(!room||!RAID_STATUS_LABELS[id])return {attempted:false,applied:false};
 room.bossStatusAilments??=[];room.bossStatusResistTurns??={};
 if((room.bossStatusResistTurns[id]??0)>0)return {attempted:true,applied:false,id,label:raidStatusLabel(id),reason:'resist'};
 const bonus=clamp(Number(actor?.statusSuccessBonus??actor?.masteryBonuses?.statusDebuffSuccessBonus??0),0,.08);
 const strong=skill?.strongStatus===true;
 const chance=clamp((BOSS_STATUS_BASE_CHANCE[id]??.03)+bonus+(strong?.08:0),0,.22);
 if(rng()>=chance)return {attempted:true,applied:false,id,label:raidStatusLabel(id),chance};
 const turns=INCAPACITATING.has(id)?1:id==='confusion'?2:strong?4:3;
 const result=addOrRefresh(room.bossStatusAilments,{id,turns,strong,raidOnly:true});
 return {attempted:true,applied:true,id,label:raidStatusLabel(id),chance,turns,refreshed:result.refreshed};
}

export function getRaidBossDotTick(room={}){
 const maxHp=Math.max(1,Number(room.maxHp??1));let damage=0;const details=[];
 for(const st of getRaidBossStatuses(room)){
  let rate=BOSS_DOT_RATE[st.id]??0;if(st.id==='poison'&&st.strong)rate=.003;
  if(rate<=0)continue;const amount=Math.max(1,Math.floor(maxHp*rate));damage+=amount;details.push({id:st.id,label:raidStatusLabel(st.id),damage:amount});
 }
 return {damage,details};
}

export function getRaidBossControl(room={},rng=Math.random){
 const list=getRaidBossStatuses(room);
 const stopped=list.find(x=>INCAPACITATING.has(x.id));
 if(stopped)return {blocked:true,id:stopped.id,label:raidStatusLabel(stopped.id),message:`${raidStatusLabel(stopped.id)}で動けない！`};
 const confused=list.find(x=>x.id==='confusion');
 if(confused&&rng()<.5)return {blocked:true,id:'confusion',label:'混乱',message:'混乱して攻撃できない！'};
 return {blocked:false};
}

export function tickRaidBossStatuses(room={}){
 room.bossStatusAilments??=[];room.bossStatusResistTurns??={};
 for(const st of room.bossStatusAilments)st.turns=Math.max(0,Number(st.turns??0)-1);
 for(const st of room.bossStatusAilments.filter(x=>(x.turns??0)<=0&&INCAPACITATING.has(x.id)))room.bossStatusResistTurns[st.id]=2;
 room.bossStatusAilments=room.bossStatusAilments.filter(x=>(x.turns??0)>0);
 for(const id of Object.keys(room.bossStatusResistTurns))room.bossStatusResistTurns[id]=Math.max(0,Number(room.bossStatusResistTurns[id]??0)-1);
 return room.bossStatusAilments;
}

// レイドボス側の状態異常技。
// weight が高いほど、そのボスがその状態異常を選びやすい。
export const RAID_BOSS_STATUS_SKILLS=Object.freeze({
 fenrir:[
  {kind:'statusSingle',name:'氷狼の凍牙',status:'freeze',statusChance:.46,damageScale:.78,magic:false,weight:3},
  {kind:'statusAoe',name:'狂月の咆哮',status:'confusion',statusChance:.30,damageScale:.62,magic:false,weight:1}
 ],
 ifrit:[
  {kind:'statusAoe',name:'煉獄の火印',status:'burn',statusChance:.48,damageScale:.68,magic:true,weight:3},
  {kind:'statusAoe',name:'炎獄の幻惑',status:'confusion',statusChance:.28,damageScale:.60,magic:true,weight:1}
 ],
 anima:[
  {kind:'statusAoe',name:'腐蝕の天毒',status:'poison',statusChance:.44,damageScale:.62,magic:true,weight:3},
  {kind:'statusSingle',name:'天雷の戒め',status:'paralysis',statusChance:.46,damageScale:.82,magic:true,weight:3},
  {kind:'statusSingle',name:'凍天の鎖',status:'freeze',statusChance:.32,damageScale:.76,magic:true,weight:1},
  {kind:'statusAoe',name:'灼天の烙印',status:'burn',statusChance:.32,damageScale:.64,magic:true,weight:1}
 ],
 chryps:[
  {kind:'statusAoe',name:'深海の呪潮',status:'curse',statusChance:.34,damageScale:.62,magic:true,weight:1},
  {kind:'statusSingle',name:'氷海の牢獄',status:'freeze',statusChance:.36,damageScale:.82,magic:true,weight:1},
  {kind:'statusAoe',name:'深海の幻惑',status:'confusion',statusChance:.30,damageScale:.58,magic:true,weight:1}
 ],
 lich:[
  {kind:'statusAoe',name:'冥府の呪詛',status:'curse',statusChance:.48,damageScale:.62,magic:true,weight:3},
  {kind:'statusSingle',name:'腐毒の指先',status:'poison',statusChance:.46,damageScale:.78,magic:true,weight:3}
 ]
});

export function chooseRaidBossStatusAction(bossId,rng=Math.random){
 const list=RAID_BOSS_STATUS_SKILLS[bossId]??RAID_BOSS_STATUS_SKILLS.anima;
 const total=list.reduce((n,x)=>n+Math.max(1,Number(x.weight??1)),0);
 let roll=rng()*total;
 for(const skill of list){roll-=Math.max(1,Number(skill.weight??1));if(roll<0){const out={...skill};delete out.weight;return out;}}
 const out={...list[list.length-1]};delete out.weight;return out;
}

export function tryInflictRaidPartyStatus(target,action,rng=Math.random,{guarding=false}={}){
 const id=action?.status;if(!target||!RAID_STATUS_LABELS[id]||(target.hp??0)<=0)return {attempted:false,applied:false};
 target.statusAilments??=[];target.raidStatusResistTurns??={};
 if((target.raidStatusResistTurns[id]??0)>0)return {attempted:true,applied:false,id,label:raidStatusLabel(id),reason:'resist'};
 const resistance=clamp(Number(target.statusResistance??target.masteryBonuses?.statusResistance??0),0,.8);
 let chance=clamp(Number(action.statusChance??.3)*(1-resistance),0,.8);if(guarding)chance*=.4;
 if(rng()>=chance)return {attempted:true,applied:false,id,label:raidStatusLabel(id),chance};
 const turns=INCAPACITATING.has(id)?1:id==='confusion'?2:3;
 const result=addOrRefresh(target.statusAilments,{id,turns,raidOnly:true});
 return {attempted:true,applied:true,id,label:raidStatusLabel(id),turns,chance,refreshed:result.refreshed};
}

export function getRaidActorControl(actor={},rng=Math.random){
 const list=getRaidPartyStatuses(actor);
 const stopped=list.find(x=>INCAPACITATING.has(x.id));
 if(stopped)return {blocked:true,id:stopped.id,label:raidStatusLabel(stopped.id),message:`${raidStatusLabel(stopped.id)}で動けない！`};
 const confused=list.find(x=>x.id==='confusion');
 if(confused&&rng()<.5)return {blocked:true,id:'confusion',label:'混乱',message:'混乱して行動できない！'};
 return {blocked:false};
}

export function tickRaidPartyStatuses(party=[]){
 const logs=[];const koIds=[];
 for(const actor of party){
  actor.statusAilments??=[];actor.raidStatusResistTurns??={};
  if((actor.hp??0)>0){
   for(const st of active(actor.statusAilments)){
    const rate=PARTY_DOT_RATE[st.id]??0;if(rate<=0)continue;
    const damage=Math.max(1,Math.floor(Math.max(1,Number(actor.maxHp??actor.hp??1))*rate));actor.hp=Math.max(0,Number(actor.hp??0)-damage);
    logs.push(`${actor.name}：${raidStatusLabel(st.id)} ${damage.toLocaleString()}ダメージ`);if(actor.hp<=0)koIds.push(actor.id);
   }
  }
  for(const st of actor.statusAilments)if(st?.raidOnly)st.turns=Math.max(0,Number(st.turns??0)-1);
  for(const st of actor.statusAilments.filter(x=>x?.raidOnly&&(x.turns??0)<=0&&INCAPACITATING.has(x.id)))actor.raidStatusResistTurns[st.id]=2;
  actor.statusAilments=actor.statusAilments.filter(x=>!x?.raidOnly||(x.turns??0)>0);
  for(const id of Object.keys(actor.raidStatusResistTurns))actor.raidStatusResistTurns[id]=Math.max(0,Number(actor.raidStatusResistTurns[id]??0)-1);
 }
 return {logs,koIds};
}

export function clearRaidOnlyStatuses(characters=[]){
 let changed=false;
 for(const actor of characters??[]){
  const before=(actor.statusAilments??[]).length;actor.statusAilments=(actor.statusAilments??[]).filter(x=>!x?.raidOnly);if(actor.statusAilments.length!==before)changed=true;
  if(actor.raidStatusResistTurns){delete actor.raidStatusResistTurns;changed=true;}
 }
 return changed;
}
