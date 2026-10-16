export function deathWarningText(action={},party=[]){
 action??={};
 if(action.allTargets||action.kind==='wipe')return '即死攻撃が来る！ 全員を狙っているようだ！！ 行動選択で防御をして！';
 const target=party.find(a=>a.id===action.targetId);
 return `即死攻撃が来る！ ${target?.name??action.targetName??'仲間1人'}を狙っているようだ！ 行動選択で防御をして！`;
}
