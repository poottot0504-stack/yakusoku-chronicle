import { getItemDef } from '../core/items.js';

export function formatRaidReward(reward){
 if(!reward||typeof reward!=='object')return '';
 const id=String(reward.itemId??'');
 const name=getItemDef(id)?.name??'冒険素材';
 const item=name==='冒険素材'&&id?name+'（'+id+'）':name;
 const qty=Math.max(1,Math.floor(Number(reward.qty??1)||1));
 const rank=String(reward.rank??'?');
 const exp=Math.max(0,Math.floor(Number(reward.exp??0)||0));
 const bonus=reward.bonusMaterialId==='ultimateEnhanceCrystal'?' ＋究極強化結晶×1':'';
 return '🎁 '+rank+'ランク報酬：'+item+' ×'+qty+' ／ 経験値 '+exp.toLocaleString('ja-JP')+bonus;
}
