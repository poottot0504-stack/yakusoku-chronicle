const LABEL={gunblade:'銃剣',starGlobe:'星天球',oneHandSword:'片手剣',greatSword:'大剣',dagger:'短剣',fist:'拳',staff:'杖',greatStaff:'大杖',spear:'槍',axe:'斧',bow:'弓',mace:'メイス',dualBlades:'双剣',katana:'刀',instrument:'楽器',cards:'カード'};
export function awardWeaponProficiency(character,{weaponType,usedWeaponAction=false,battleMode='normal',active=true,alive=true}){
 if(!active||!alive||battleMode==='rematch')return 0;
 character.weaponProficiency??={};character.titles??=[];const gain=1+(usedWeaponAction?1:0);const before=character.weaponProficiency[weaponType]??0;const after=Math.min(100,before+gain);character.weaponProficiency[weaponType]=after;
 if(after===100&&before<100){const title=`${LABEL[weaponType]??weaponType}の達人`;if(!character.titles.includes(title))character.titles.push(title);}return after-before;
}
export function getWeaponProficiencyBonus(character,weaponType){return Math.min(100,character.weaponProficiency?.[weaponType]??0)/1000;}
