import { ECLIPSE_EVENT, ECLIPSE_MATERIALS } from '../data/eclipse-2026.js';
import { addMaterial } from './material-cap.js';
import { ECLIPSE_ENEMIES } from '../data/eclipse-enemies.js';
import { getItemDef } from './items.js';
import { syncRecipeUnlocks } from './crafting.js';
import { recordObservedDrop } from './bestiary.js';
import { updateQuestProgress } from './quests.js';

const ECLIPSE_WAVE_IDS=Object.freeze([
 [ECLIPSE_ENEMIES.slime.id,ECLIPSE_ENEMIES.mimic.id],
 [ECLIPSE_ENEMIES.wraith.id,ECLIPSE_ENEMIES.dragonet.id],
 [ECLIPSE_ENEMIES.nox.id]
]);
const GUARANTEED=Object.freeze([
 Object.freeze({eclipseShard:2,riftStone:1}),
 Object.freeze({wraithVeil:2,voidCrystal:1}),
 Object.freeze({eclipseShard:1,riftStone:1,voidCrystal:1,noxCore:1})
]);

// Material guarantees pay out only for a genuine complete event wave that
// started inside the event window. Incomplete/rematch/after-event inputs earn 0.
export function awardEclipseWaveBonus(state,enemies=[],wave=1,startedAt=Date.now()){
 const index=Number(wave)-1;
 const required=ECLIPSE_WAVE_IDS[index];
 const now=Number(startedAt);
 if(!required||!Number.isFinite(now)||now<ECLIPSE_EVENT.startsAt||now>=ECLIPSE_EVENT.endsAt)return [];
 if(enemies.length!==required.length||enemies.some(e=>!e?.eclipseEvent||e.rematch))return [];
 const IDs=new Set(enemies.map(e=>String(e.bestiaryId??e.id)));
 if(IDs.size!==required.length||required.some(id=>!IDs.has(id)))return [];
 state.materials??={};
 const added=[];
 for(const [id,qty] of Object.entries(GUARANTEED[index])){
  if(!ECLIPSE_MATERIALS[id])throw new Error('未登録の星蝕素材です');
  const gain=addMaterial(state,id,qty);
  if(gain<=0)continue;
  const source=enemies.find(e=>e.materials?.normal===id||e.materials?.rare===id)??enemies[0];
  recordObservedDrop(state,source.bestiaryId,id);
  updateQuestProgress(state,{type:'collect',id,amount:gain});
  added.push({id,name:getItemDef(id).name,qty:gain});
 }
 added.unlockedRecipes=syncRecipeUnlocks(state,startedAt);
 return added;
}
