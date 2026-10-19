import { ENEMY_LIST } from '../data/enemies.js';
import { ECLIPSE_MATERIALS } from '../data/eclipse-2026.js';
import { getCharacterResourceCaps } from './combat-stats.js';

export const ITEMS={
 herb:{id:'herb',name:'薬草',icon:'🌿',target:'ally',consumable:true,description:'仲間1人のHPを40回復',heal:40},
 potion:{id:'potion',name:'ポーション',icon:'🧪',target:'ally',consumable:true,description:'仲間1人のHPを大きく回復',healRatio:.45,minHeal:50},
 highPotion:{id:'highPotion',name:'ハイポーション',icon:'🧪',target:'ally',consumable:true,description:'HPを50回復',heal:50},
 megaPotion:{id:'megaPotion',name:'メガポーション',icon:'💖',target:'ally',consumable:true,description:'HPを全回復',fullHp:true},
 ether:{id:'ether',name:'エーテル',icon:'🔷',target:'ally',consumable:true,description:'MPを30回復',mpHeal:30},
 highEther:{id:'highEther',name:'ハイエーテル',icon:'💠',target:'ally',consumable:true,description:'MPを50回復',mpHeal:50},
 turboEther:{id:'turboEther',name:'エーテルターボ',icon:'✨',target:'ally',consumable:true,description:'MPを全回復',fullMp:true},
 elixir:{id:'elixir',name:'エリクサー',icon:'🌈',target:'ally',consumable:true,description:'HPとMPを全回復',fullHp:true,fullMp:true},
 antidote:{id:'antidote',name:'解毒薬',icon:'🌿',target:'ally',consumable:true,description:'毒を治す',cure:['poison']},
 eyeDrops:{id:'eyeDrops',name:'目薬',icon:'👁️',target:'ally',consumable:true,description:'暗闇を治す',cure:['blind']},
 wakeUp:{id:'wakeUp',name:'眠気覚まし',icon:'☕',target:'ally',consumable:true,description:'睡眠を治す',cure:['sleep']},
 phoenixTail:{id:'phoenixTail',name:'フェニックスの尾',icon:'🔥',target:'ally',canTargetKo:true,consumable:true,description:'戦闘不能からHP・MP全回復で復活',reviveFull:true},
 smokeBomb:{id:'smokeBomb',name:'煙玉',icon:'💨',target:'enemy',consumable:true,description:'戦闘から逃げやすくなる'},
 characterExpScroll:{id:'characterExpScroll',name:'キャラクター経験値2倍の書',icon:'📗',consumable:true,boostKind:'characterExp',description:'使用時に1〜3時間がランダム決定。プレイ中だけ時間が減る。キャラクター経験値2倍。旅ボーナスや2倍イベントと重複しない。'},
 jobExpScroll:{id:'jobExpScroll',name:'ジョブ経験値2倍の書',icon:'📘',consumable:true,boostKind:'jobExp',description:'使用時に1〜3時間がランダム決定。プレイ中だけ時間が減る。ジョブ経験値2倍。旅ボーナスや2倍イベントと重複しない。'},
 goldScroll:{id:'goldScroll',name:'ゴールド2倍の書',icon:'📙',consumable:true,boostKind:'gold',description:'使用時に1〜3時間がランダム決定。プレイ中だけ時間が減る。戦闘ゴールド2倍。旅ボーナスと重複しない。'},
 dropScroll:{id:'dropScroll',name:'ドロップアイテム2倍の書',icon:'📕',consumable:true,boostKind:'drop',description:'使用時に1〜3時間がランダム決定。プレイ中だけ時間が減る。ストーリーの素材・鉱石と魔障の洞窟の装備ドロップ率が2倍。旅ボーナスと重複しない。'},
 enhanceCrystal:{id:'enhanceCrystal',name:'強化結晶',icon:'💎',description:'装備+11・+12強化に使用。ストーリーボス／魔障の洞窟1〜10階層から入手。フリーマーケット出品可。'},
 advancedEnhanceCrystal:{id:'advancedEnhanceCrystal',name:'上級強化結晶',icon:'🔷',description:'装備+13・+14強化に使用。魔障の洞窟11〜20階層から入手。フリーマーケット出品可。'},
 ultimateEnhanceCrystal:{id:'ultimateEnhanceCrystal',name:'究極強化結晶',icon:'✨',description:'装備+15強化に使用。魔障の洞窟21〜25階層／レイドS・A報酬から入手。フリーマーケット出品可。'},
 forgeCharm:{id:'forgeCharm',name:'強化護符',icon:'🧿',description:'+8〜+10の装備強化を100%成功させる護符（+11以降は使用不可）'},
 moonHerb:{id:'moonHerb',name:'月光草',icon:'🌙',description:'月明かりを宿した珍しい薬草'},
 shadowCard:{id:'shadowCard',name:'影の札',icon:'🎴',description:'闇の力が封じられた不思議な札'},
 pumpkinShard:{id:'pumpkinShard',name:'かぼちゃの欠片',icon:'🎃',description:'幻月祭の魔物から採れるハロウィン装備素材'},
 magicCandy:{id:'magicCandy',name:'魔法のキャンディ',icon:'🍬',description:'不思議な魔力を帯びた甘いイベント素材'},
 ghostCloth:{id:'ghostCloth',name:'幽霊布',icon:'👻',description:'触れるとひんやりする半透明のイベント素材'},
 moonCrystal:{id:'moonCrystal',name:'幻月石',icon:'🌙',description:'幻月の光を閉じ込めた希少なイベント素材'},
 orichalcum:{id:'orichalcum',name:'オリハルコン',icon:'💠',event:true,description:'五神の試練Sランク報酬。最強装備の素材'},
 orihal:{id:'orihal',name:'オリハル',icon:'🔷',event:true,description:'五神の試練Aランク報酬。最強装備の素材'},
 orichalcumShard:{id:'orichalcumShard',name:'オリハルコンのかけら',icon:'✨',event:true,description:'鍛冶屋でオリハルコンに精錬できる'},
 orihalShard:{id:'orihalShard',name:'オリハルのかけら',icon:'✦',event:true,description:'鍛冶屋でオリハルに精錬できる'},
 'score-wind':{id:'score-wind',name:'風の楽譜',icon:'🎵',keyItem:true,description:'はじまりの平原の守護者が残す楽譜。吟遊詩人の試練に関わる。'},
 'score-forest':{id:'score-forest',name:'森風の楽譜',icon:'🎵',keyItem:true,description:'ささやきの森の守護者が残す楽譜。吟遊詩人の試練に関わる。'},
 'score-moon':{id:'score-moon',name:'月夜の楽譜',icon:'🎵',keyItem:true,description:'蒼月海岸の守護者が残す楽譜。3種集めると吟遊詩人の前提条件を満たせる。'},
 'score-hero':{id:'score-hero',name:'英雄の楽譜',icon:'🎵',keyItem:true,description:'忘却遺跡の強敵が残す希少な楽譜。コレクション用。'},
 'score-ancient':{id:'score-ancient',name:'古代の楽譜',icon:'🎵',keyItem:true,description:'深淵の奥で見つかる希少な楽譜。コレクション用。'},
 'crystal-flame':{id:'crystal-flame',name:'紅炎の魔晶石',icon:'💎',keyItem:true,description:'黄砂荒野の守護者が残す魔晶石。ハイウィザードの試練に関わる。'},
 'crystal-tide':{id:'crystal-tide',name:'蒼氷の魔晶石',icon:'💎',keyItem:true,description:'白銀高原の守護者が残す魔晶石。ハイウィザードの試練に関わる。'},
 'crystal-star':{id:'crystal-star',name:'星影の魔晶石',icon:'💎',keyItem:true,description:'瘴気湿原の守護者が残す魔晶石。3種集めると魔晶石条件を満たせる。'},
 copperOre:{id:'copperOre',name:'銅鉱石',icon:'🟤',description:'銅を含む扱いやすい鉱石。📍主な採掘場所：はじまりの平原'},
 ironOre:{id:'ironOre',name:'鉄鉱石',icon:'⛏️',description:'鍛冶に使える一般的な鉱石。📍主な採掘場所：はじまりの平原'},
 goldOre:{id:'goldOre',name:'金鉱石',icon:'🟡',description:'金色に輝く価値の高い鉱石。📍主な採掘場所：蒼月海岸'},
 platinumOre:{id:'platinumOre',name:'プラチナ鉱石',icon:'⚪',description:'白銀色に輝く上質な鉱石。📍主な採掘場所：白銀高原'},
 copperIngot:{id:'copperIngot',name:'銅インゴット',icon:'🧱',description:'銅鉱石を精錬した鍛冶素材'},
 ironIngot:{id:'ironIngot',name:'鉄インゴット',icon:'🧱',description:'鉄鉱石を精錬した鍛冶素材'},
 goldIngot:{id:'goldIngot',name:'金インゴット',icon:'🧱',description:'金鉱石を精錬した鍛冶素材'},
 platinumIngot:{id:'platinumIngot',name:'プラチナインゴット',icon:'🧱',description:'プラチナ鉱石を精錬した鍛冶素材'},
 mythrilIngot:{id:'mythrilIngot',name:'ミスリルインゴット',icon:'💎',description:'ミスリル鉱石を精錬した鍛冶素材'},
 starIngot:{id:'starIngot',name:'星晶インゴット',icon:'💠',description:'星晶石を精錬した最高級の鍛冶素材'},
 mythrilOre:{id:'mythrilOre',name:'ミスリル鉱石',icon:'💎',description:'淡い光を放つ希少な鉱石。📍主な採掘場所：黄砂荒野'},
 unionOre:{id:'unionOre',name:'ユニオン鉱石',icon:'🟣',description:'複数の金属質が結びついた高位装備用の希少鉱石。📍主な採掘場所：瘴気湿原'},
 lightCrystal:{id:'lightCrystal',name:'ノヴァクリスタル',icon:'💎',description:'爆発的な星光を宿す高位装備用の結晶。旧ライトクリスタルと同じ素材として扱われます。📍主な採掘場所：炎獄火山'},
 unionAlloy:{id:'unionAlloy',name:'ユニオン合金',icon:'🟪',description:'ユニオン鉱石を精錬した高密度合金。ジョブ専用装備の素材'},
 novaCore:{id:'novaCore',name:'ノヴァコア',icon:'🌠',description:'ノヴァクリスタルを精錬して安定化した星光核。ジョブ専用装備の素材'},
 blazeAlloy:{id:'blazeAlloy',name:'灼熱合金',icon:'🔥',description:'灼熱鉱を精錬した高熱耐性合金。ジョブ専用装備の素材'},
 thunderAlloy:{id:'thunderAlloy',name:'天雷合金',icon:'⚡',description:'天雷結晶を精錬した雷属性の高位合金。ジョブ専用装備の素材'},
 promiseAlloy:{id:'promiseAlloy',name:'約束合金',icon:'✦',description:'約束鉱を極限まで精錬した最高位の鍛冶素材'},
 starCrystal:{id:'starCrystal',name:'星晶石',icon:'💠',description:'星の力を宿した希少な結晶。📍主な採掘場所：忘却遺跡'},
 slimeShard:{id:'slimeShard',name:'旧・スライムの欠片',icon:'🟢',description:'旧バージョンの互換素材。鍛冶屋の素材精錬で「スライム素材」に変換できます'},
 rareCore:{id:'rareCore',name:'希少な魔核',icon:'🔮',description:'強い魔物がまれに残す魔力の核'},
 mimicCore:{id:'mimicCore',name:'ミミックの魔核',icon:'🔮',description:'ミミックの体内で育った魔力の核'},
 chestKey:{id:'chestKey',name:'宝箱の鍵',icon:'🗝️',description:'鍵付き宝箱を開けるための鍵'},
 royalKey:{id:'royalKey',name:'王家の鍵',icon:'🔑',description:'王家に伝わる特別な鍵'},
 moonToken:{id:'moonToken',name:'月の証',icon:'🌙',description:'月夜に輝く特別な証'},
 mythrilPick:{id:'mythrilPick',name:'ミスリルのつるはし',icon:'⛏️',description:'希少な鉱石を採掘できる丈夫な道具'},
 firstPromise:{id:'firstPromise',name:'最初の約束',icon:'📜',description:'ヴァルゼインが遺した大事なもの'},promiseChronicleFragment:{id:'promiseChronicleFragment',name:'約束のクロニクルのかけら',icon:'✨',description:'12個集めると失われた約束を復元できる'},promiseChronicle:{id:'promiseChronicle',name:'約束のクロニクル',icon:'📖',description:'エイデルのHPが50%以下の時だけ使える特別なアイテム'},
 memoryBark:{id:'memoryBark',name:'忘却樹の樹皮',icon:'🌲',description:'Lv200帯の鍛冶素材'},blazeOre:{id:'blazeOre',name:'灼熱鉱',icon:'🔥',description:'Lv220帯の鍛冶素材'},nightRelic:{id:'nightRelic',name:'常闇の遺物',icon:'🌑',description:'Lv240帯の鍛冶素材'},thunderCrystal:{id:'thunderCrystal',name:'天雷結晶',icon:'⚡',description:'Lv260帯の鍛冶素材'},riftShard:{id:'riftShard',name:'狭間の欠片',icon:'👁️',description:'Lv280帯の鍛冶素材'},promiseOre:{id:'promiseOre',name:'約束鉱',icon:'✦',description:'Lv300帯の最高級鍛冶素材'},
 'promise-memory':{id:'promise-memory',name:'約束の思い出',icon:'💍',description:'すべての魔物との戦いを記した指輪'},
 ...ECLIPSE_MATERIALS
};

function enemyMaterialDef(id){
 for(const enemy of ENEMY_LIST){
  if(enemy.materials?.normal===id)return {id,name:`${enemy.name}の素材`,icon:'🎁',description:`${enemy.name}から手に入る素材`};
  if(enemy.materials?.rare===id)return {id,name:`${enemy.name}の希少素材`,icon:'💎',description:`${enemy.name}がまれに落とす希少素材`};
 }
 return null;
}

export function getItemDef(id){
 if(ITEMS[id])return ITEMS[id];
 const monsterMaterial=enemyMaterialDef(id);
 if(monsterMaterial)return monsterMaterial;
 if(typeof id==='string'&&/[ぁ-んァ-ヶ一-龯々]/.test(id))return {id,name:id,icon:'🎁',description:'冒険で手に入れた素材'};
 return {id,name:'冒険素材',icon:'🎁',description:'冒険で手に入れた素材'};
}
export function getUsableInventory(state){return (state.inventory??[]).filter(x=>(x.qty??0)>0&&ITEMS[x.id]?.target==='ally').map(x=>({...x,...getItemDef(x.id)}));}
function resourceCaps(character,caps={}){return {maxHp:caps.maxHP??caps.maxHp??character?.maxHp??1,maxMp:caps.maxMP??caps.maxMp??character?.maxMp??0};}
export function canUseItemOn(def,character,caps){
 if(!def||!character)return false;
 if(def.reviveFull)return character.hp<=0;
 if(character.hp<=0)return false;
 const {maxHp,maxMp}=resourceCaps(character,caps);
 return !!(((def.fullHp||def.heal||def.healRatio)&&character.hp<maxHp)||((def.fullMp||def.mpHeal)&&character.mp<maxMp)||(def.cure?.length&&(character.statusAilments??[]).some(a=>def.cure.includes(a.id))));
}
function applyRecoveryItem(def,c,caps){
 if(!c||(c.hp<=0&&!def.canTargetKo))throw new Error('対象に使えません');
 if(def.reviveFull&&c.hp>0)throw new Error('戦闘不能の仲間に使います');
 if(!canUseItemOn(def,c,caps))throw new Error('今は使う必要がありません');
 const {maxHp,maxMp}=resourceCaps(c,caps),beforeHp=c.hp,beforeMp=c.mp;
 if(def.reviveFull){c.hp=maxHp;c.mp=maxMp;}
 else{
  if(def.fullHp)c.hp=maxHp;
  else if(def.heal)c.hp=Math.min(maxHp,c.hp+def.heal);
  else if(def.healRatio)c.hp=Math.min(maxHp,c.hp+Math.max(def.minHeal??0,Math.floor(maxHp*def.healRatio)));
  if(def.fullMp)c.mp=maxMp;else if(def.mpHeal)c.mp=Math.min(maxMp,c.mp+def.mpHeal);
 }
 if(def.cure?.length)c.statusAilments=(c.statusAilments??[]).filter(a=>!def.cure.includes(a.id));
 return {healed:Math.max(0,c.hp-beforeHp),mpRestored:Math.max(0,c.mp-beforeMp)};
}
function consumableStack(state,itemId){const stack=state.inventory?.find(x=>x.id===itemId&&(x.qty??0)>0);if(!stack)throw new Error('アイテムがありません');const def=ITEMS[itemId];if(!def||def.target!=='ally')throw new Error('ここでは使えません');return {stack,def};}
export function useFieldItem(state,itemId,characterId){const {stack,def}=consumableStack(state,itemId);const c=state.characters.find(x=>x.id===characterId);const result=applyRecoveryItem(def,c,getCharacterResourceCaps(state,c));stack.qty--;return {item:def,character:c,...result};}
export function useBattleItem(state,itemId,battleActor){const {stack,def}=consumableStack(state,itemId);const result=applyRecoveryItem(def,battleActor);stack.qty--;return {item:def,character:battleActor,...result};}

const ORE_IDS=new Set(['copperOre','ironOre','goldOre','platinumOre','mythrilOre','unionOre','lightCrystal','starCrystal','blazeOre','promiseOre']);
const EVENT_IDS=new Set(['pumpkinShard','magicCandy','ghostCloth','moonCrystal','orichalcum','orihal','orichalcumShard','orihalShard']);
const KEY_IDS=new Set(['firstPromise','promiseChronicleFragment','promiseChronicle','royalKey','moonToken']);
export function getItemCategory(id){const d=getItemDef(id);if(KEY_IDS.has(id)||d.keyItem)return 'key';if(EVENT_IDS.has(id)||d.event)return 'event';if(ORE_IDS.has(id))return 'ore';if(d.consumable||d.target)return 'consumable';return 'material';}
export function filterItemsByCategory(items=[],category='all'){return category==='all'?items:items.filter(x=>getItemCategory(x.id)===category);}
export const ITEM_CATEGORY_LABELS={all:'すべて',consumable:'消費',material:'素材',ore:'鉱石',event:'イベント',key:'だいじなもの'};
