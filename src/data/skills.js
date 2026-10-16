const skill=(id,name,mp,inheritAllowed=true,extra={})=>({id,name,mp,inheritAllowed,...extra});
export const SKILLS={
  steal:skill('steal','盗む',3,true,{type:'steal'}),
  plunder:skill('plunder','略奪',15,false,{type:'plunder'}),
  heal:skill('heal','ヒール',5,true,{type:'heal',power:30}),
  resurrection:skill('resurrection','リザレクション',20,true,{type:'revive',hpRatio:.3}),
  grandResurrection:skill('grandResurrection','グランドリザレクション',60,false,{type:'revive',hpRatio:1}),
  lastFortress:skill('lastFortress','聖域・ラストフォートレス',100,false,{oncePerBattle:true}),
  promiseChorus:skill('promiseChorus','約束の大合唱',100,false,{oncePerBattle:true}),
  jokerReverse:skill('jokerReverse','ジョーカー・リバース',100,false,{oncePerBattle:true}),
  elementalCatastrophe:skill('elementalCatastrophe','エレメンタル・カタストロフィ',100,false,{oncePerBattle:true}),
  ragnarokRage:skill('ragnarokRage','ラグナロク・レイジ',100,false,{oncePerBattle:true})
};
