const THEMES={
 field:'poison',forest:'sleep',coast:'confusion',cave:'paralysis',snow:'freeze',desert:'burn',swamp:'poison',volcano:'burn',ruins:'curse',abyss:'curse'
};
const NAMES=[[/毒|蜂|蟲|沼|ベノム|ポイズン/,'poison'],[/炎|火|灼|竜|ドラゴ|パンプキン/,'burn'],[/雷|嵐|時|機械/,'paralysis'],[/眠|夢|羊/,'sleep'],[/幻|歌|セイレーン|混沌/,'confusion'],[/氷|雪|零|凍/,'freeze'],[/呪|霊|レイス|魔|闇|冥|アビス|エイデル/,'curse']];
const LABEL={poison:'毒撃',burn:'灼熱撃',paralysis:'しびれ撃',sleep:'まどろみ',confusion:'惑乱撃',freeze:'氷結撃',curse:'呪詛撃'};
export function thematicStatus(enemy={}){
 const text=`${enemy.id??''} ${enemy.name??''}`;for(const [re,id] of NAMES)if(re.test(text))return id;
 if(enemy.regionId&&THEMES[enemy.regionId])return THEMES[enemy.regionId];
 const ids=['poison','burn','paralysis','sleep','confusion','freeze','curse'];let h=0;for(const c of text)h=(h*31+c.charCodeAt(0))>>>0;return ids[h%ids.length];
}
export function ensureEnemyStatusAi(enemy={}){
 const ai=Array.isArray(enemy.ai)&&enemy.ai.length?[...enemy.ai]:[{type:'attack'}];
 if(ai.some(x=>x?.skill?.status))return ai;
 const status=thematicStatus(enemy);
 const statusMove={type:'skill',skill:{id:`enemy-${status}`,name:LABEL[status],power:enemy.isBoss?92:78,type:'magic',kind:'magic',status}};
 while(ai.length<3)ai.push({type:'attack',power:ai.length===1?108:100});
 const repeats=Math.max(0,Math.round((enemy.statusMoveWeight??1)*2));for(let i=0;i<repeats;i++)ai.push(statusMove);return ai;
}
