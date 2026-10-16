export function bossAreaAttack(name='全体強襲',power=80,{kind='physical',element='none'}={}){
 return {type:'skill',skill:{id:'bossAreaAttack',name,power,kind,element,allTargets:true,canCrit:false}};
}
