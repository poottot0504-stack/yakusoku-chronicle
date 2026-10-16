// 約束のクロニクル 属性システム
//
// 敵追加: element:'fire' のように属性を1つ指定してください。
// weaknesses を省略すると ELEMENT_WEAKNESS_MAP から自動計算します。
// 個別弱点が必要な敵だけ weaknesses:['water','light'] のように上書きできます。
export const ELEMENTS=Object.freeze(['fire','water','thunder','ice','light','dark','none']);
export const ELEMENT_LABELS=Object.freeze({fire:'火',water:'水',thunder:'雷',ice:'氷',light:'光',dark:'闇',none:'無'});
export const ELEMENT_WEAKNESS_MULTIPLIER=1.5;
export const ELEMENT_WEAKNESS_MAP=Object.freeze({
 fire:Object.freeze(['water']),
 water:Object.freeze(['thunder']),
 thunder:Object.freeze(['ice']),
 ice:Object.freeze(['fire']),
 light:Object.freeze(['dark']),
 dark:Object.freeze(['light']),
 none:Object.freeze([])
});

// 通常モンスターは地域テーマで自動付与。新地域はここへ追加。
export const REGION_ELEMENT_BY_ID=Object.freeze({
 field:'thunder',forest:'water',coast:'water',cave:'dark',snow:'ice',
 desert:'fire',swamp:'dark',volcano:'fire',ruins:'light',abyss:'dark'
});

// 技属性は「名前または作者が記述した説明文」に属性語がある場合だけ付与。
// 旧 element フィールドだけでは属性扱いにしない。
const ELEMENT_KEYWORDS=Object.freeze({
 fire:['火属性','ファイア','フレア','インフェルノ','プロミネンス','炎','火炎','紅蓮','煉獄','焔','灼熱'],
 ice:['氷属性','ブリザド','ブリザード','フリーズ','氷','凍結','凍','絶零','零海'],
 thunder:['雷属性','サンダー','雷','雷鳴','天雷','轟天','電撃','稲妻'],
 water:['水属性','アクア','ウォーター','水','水刃','水流','激流','海流'],
 light:['光属性','ライトレイ','ライトボルト','ライト','ホーリー','聖光','星光','光線','光槍','ルクス'],
 dark:['闇属性','ダークマター','ダーク','暗黒','闇','深淵','冥府','冥界','冥獄','常闇','アビス','ブラックホール']
});

export function normalizeElement(value){return ELEMENTS.includes(value)?value:'none';}
export const elementLabel=value=>ELEMENT_LABELS[normalizeElement(value)]??'無';
export function inferElementFromText(...parts){
 const text=parts.filter(Boolean).join(' ');if(!text)return 'none';let best=null;
 for(const [element,words] of Object.entries(ELEMENT_KEYWORDS))for(const word of words){const index=text.indexOf(word);if(index<0)continue;if(!best||index<best.index||(index===best.index&&word.length>best.word.length))best={element,index,word};}
 return best?.element??'none';
}
export function getSkillElement(skill={}){
 const sourceDescription=skill.attributeSourceDescription??(skill.generatedDescription?'':skill.description??'');
 return inferElementFromText(skill.name??'',sourceDescription);
}
export function applySkillElement(skill={}){return {...skill,element:getSkillElement(skill)};}
export function getWeaknessElements(target={}){
 if(Array.isArray(target.weaknesses))return [...new Set(target.weaknesses.map(normalizeElement).filter(x=>x!=='none'))];
 return [...(ELEMENT_WEAKNESS_MAP[normalizeElement(target.element)]??[])];
}
export function elementProfile(element='none',weaknesses){
 const own=normalizeElement(element),weak=Array.isArray(weaknesses)?weaknesses:getWeaknessElements({element:own});
 return {element:own,weaknesses:[...new Set(weak.map(normalizeElement).filter(x=>x!=='none'))]};
}
export function regionElement(regionId){return normalizeElement(REGION_ELEMENT_BY_ID[regionId]??'dark');}
export function getElementMultiplier(element,target={}){
 const attackElement=normalizeElement(element);if(attackElement==='none')return 1;
 if(target.elementMultipliers&&Number.isFinite(Number(target.elementMultipliers[attackElement])))return Number(target.elementMultipliers[attackElement]);
 if(getWeaknessElements(target).includes(attackElement))return Number(target.weaknessMultiplier??ELEMENT_WEAKNESS_MULTIPLIER);
 const resist=Math.min(.75,Math.max(0,Number(target.elementResist?.[attackElement]??0)));return 1-resist;
}
export function isWeaknessHit(element,target={}){return getElementMultiplier(element,target)>1;}
export function elementProfileLabel(target={}){const own=normalizeElement(target.element),weak=getWeaknessElements(target);return `属性：${elementLabel(own)}${weak.length?` / 弱点：${weak.map(elementLabel).join('・')}`:''}`;}
