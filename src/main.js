import './ui/viewport.js';
import {marketMarkup,marketListingFormMarkup} from './ui/market.js';
import {formatMarketPriceField,parseMarketPrice} from './market/price-format.js';
import {listMarketCandidates,serializeMarketItem,removeMarketItem,applyMarketReturn,isValidMarketPrice,unlockMarketIfEligible} from './market/market-model.js';
import { createFestivalApi } from './online/hunt-festival-api.js';
import { createFestivalKillRecorder } from './online/hunt-festival-record.js';
import { reserveFestivalBattle,buildRecordedFestivalVictory,festivalBattleType } from './online/hunt-festival-security.js';
import { normalizeAutoSettings, chooseAutoAction } from './core/auto-play.js';
import { festivalView,festivalMarkup,festivalTitleMarkup,festivalDetailsMarkup,festivalRewardMarkup,festivalArchiveMarkup } from './ui/hunt-festival.js';
import { grantFestivalReward,grantFestivalBonus,nextFestivalBoundary } from './core/hunt-festival.js';
import { HUNT_FESTIVAL } from './data/hunt-festival.js';
import { hasFirstClear } from './core/progression-caps.js';
import { createMashoEnemy, settleMashoVictory, canEnterMashoFloor } from './core/masho-cave.js';
import { createMashoRun, recordMashoRunVictory, mashoRunCanContinue, mashoRunSummary, setMashoResultVisibility, toggleMashoNextTen } from './core/masho-chain.js';
import { mashoCaveMarkup } from './ui/masho-cave.js';
import { arenaMarkup } from './ui/arena.js';
import { createArenaSession,arenaSessionSkills,normalizeArenaProgress } from './core/arena.js';
import { arenaSeededRandom } from './core/arena-proof.js';
import { applyAuthoritativeArenaProfile,suspendUnverifiedArenaAssets,recordArenaServerReceipt } from './core/arena-authority.js';
import { loadArenaPending,saveArenaPending,clearArenaPending } from './online/arena-recovery.js';
import { loadArenaActive,saveArenaActive,clearArenaActive } from './online/arena-active.js';
import { replayArenaCheckpoint } from './core/arena-replay.js';
import { ensureYakusokuSession } from './online/supabase-auth.js';
import { createArenaApi } from './online/arena-api.js';
import { deathWarningText } from './ui/death-warning.js';
import { frameDuration, renderMotionFrame, updateBattleView, captureNumberTails, appendNumberTails } from './ui/battle-motion.js';
import { adventureGuideMarkup, eidelEndingMarkup } from './ui/adventure-guide.js';
import {raidStageMarkup} from './ui/battle-art.js';
import { installPixelIconRenderer } from './ui/pixel-icons.js?v=stable-fallback-2';
import { createNewGame, getActiveParty } from './state/game-state.js';
import { createDefaultRoster } from './data/characters.js';
import { listSaveSlots,saveToSlot,loadFromSlot,loadSlotRecord,deleteSlot,migrateLegacySaveToSlot1 } from './save/save-slots.js';
import { ensureAdventureState, getUnlockedRegions, travelToRegion, makeEncounterEnemy, makeEncounterGroup, makeRegionBoss, canChallengeBoss, recordAdventureVictory, mergeLatestLevelUps, usePotion, syncBattlePartyToState, getAdventureBattleParty, makeBestiaryRematchEnemy, makeEndgameBoss, makeLegendaryTrialEnemy } from './core/adventure.js';
import { createBattle, startTurn, finishTurn, getPendingActor, resolveAction, attemptEscape, undoPlannedAction } from './core/battle.js';
import { isShieldGuardJob,shieldJobLevel } from './core/shielder-guard.js';
import { getBattleSkills, skillMetricLabel, getSelectedSkillIds, setBattleSkillLoadout, getRecommendedBattleSkillIds, getRecommendedBattleSkillSummary, describeSkill } from './core/skillbook.js';
import { saveSkillPreset,applySkillPreset,getSkillPresetName,renameSkillPreset } from './core/skill-presets.js';
import { isGameUpdateAvailable,fetchLatestGameBuild } from './core/game-update.js';
import { restAtInn, handlePartyWipe, getInnPrice } from './core/inn.js';
import { bankBalance, depositGold, withdrawGold } from './core/bank.js';
import { getShopInventory, buyItem } from './core/shop.js';
import { sell, sellEquipmentInstance, getSellPrice, getSellDefinition, getSellWarning, getSellableQuantity } from './core/selling.js';
import { changeJob } from './core/jobs.js';
import { setActiveParty,movePartyMember,shiftPartyMember } from './core/party.js';
import { equipItem,equipRecommendedEquipment,unequipAllEquipment,toggleEquipmentLock } from './core/equipment.js';
import { enhanceEquipment,getEnhancedStats } from './core/forge.js';
import { craftItem } from './core/crafting.js';
import { gatherAtPoint, getGatherPointForState } from './core/gathering.js';
import { startAdventureNewGamePlus } from './core/adventure.js';
import { ensureSpecialJobProgress, createSpecialTrialEnemy, completeSpecialTrial, recordSpecialProgress, grantSpecialBossKeyItem } from './core/special-jobs.js';
import { partyMarkup } from './ui/party.js';
import { statusMarkup } from './ui/status.js';
import { jobsMarkup } from './ui/jobs.js';
import { skillsMarkup, skillLoadoutMarkup } from './ui/skills.js?v=skill-presets-20261021';
import { equipmentMarkup } from './ui/equipment.js';
import { equipmentCandidateVisible } from './ui/equipment-search.js';
import { characterSwitcherMarkup } from './ui/character-switcher.js';
import { wirePartyDockDrag } from './ui/party-dock-drag.js';
import { captureHorizontalScroll, restoreHorizontalScroll } from './ui/horizontal-scroll.js';
import { bestiaryMarkup } from './ui/bestiary.js';
import { createBestiaryRematch } from './core/bestiary.js';
import { questsMarkup } from './ui/quests.js';
import { achievementsMarkup } from './ui/achievements.js';
import { forgeMarkup } from './ui/forge.js?v=equipped-by-20261010';
import { battleMarkup } from './ui/battle.js';
import { adventureMarkup, townMarkup, endingMarkup, endgameMarkup } from './ui/adventure.js?v=hunt-count-apology-20261016-eclipse-20261020';
import { QUESTS } from './data/quests.js';
import { acceptQuestFromNpc, reportQuestToNpc, updateQuestProgress, getVisibleQuestDefinitions } from './core/quests.js';
import { npcConversationMarkup } from './ui/npcs.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { recordAchievementEvent, evaluateAchievements } from './core/achievements.js';
import { JOBS } from './data/jobs.js';
import { completeLegendaryTrial, handleBossVictory } from './core/new-game-plus.js';
import { evolveLegendaryToTrue } from './core/forge.js';
import { setDifficulty } from './core/difficulty.js';
import { renameCharacter, resetCharacterName } from './core/character-name.js';
import { itemsMarkup } from './ui/items.js';
import { shopMarkup, sellShopMarkup } from './ui/shop.js';
import { getItemDef, useFieldItem, getUsableInventory, useBattleItem, canUseItemOn } from './core/items.js';
import { EQUIPMENT } from './data/equipment.js';
import { addMaterial } from './core/material-cap.js';
import { awardBattleDrops, mergeDropTotals, formatDropLines } from './core/drops.js?v=material2x-raid10-20261009-eclipse20261020';
import { awardEclipseWaveBonus } from './core/eclipse-rewards.js';
import { makeTrainingEnemy, TRAINING_AREAS } from './core/training-boundary.js';
import { makeGuildHuntEnemy } from './core/guild-hunts.js';
import { createOathbreakerEnemy, settleOathbreakerVictory } from './core/oathbreakers.js';
import { createEidelEnemy, settleEidelVictory } from './core/eidel.js';
import { craftPromiseChronicle, usePromiseChronicle } from './core/promise-chronicle.js';
import { formatPlayTime, addElapsedPlayTime } from './core/play-time.js';
import { isTwinStarFestivalActive, isHalloweenActive, makeHalloweenWave, getNextHalloweenWave, recordHalloweenWaveEncounters, halloweenCharacterExpMultiplier, isTrainingFestivalActive, makeTrainingFestivalWave, getNextTrainingFestivalWave, getNextEventBoundary, getEclipseEventStatus, makeEclipseWave, getNextEclipseWave } from './core/events.js?v=training-easier-20261010-eclipse20261020';
import { HALLOWEEN_EVENT, TRAINING_FESTIVAL, TWIN_STAR_FESTIVAL } from './data/events.js';
import { ECLIPSE_EVENT } from './data/eclipse-2026.js';
import { twinStarFestivalDetailsMarkup, titleEventNoticeMarkup, halloweenEventDetailsMarkup, trainingFestivalDetailsMarkup, jobReleaseDetailsMarkup, eclipseEventDetailsMarkup } from './ui/events.js?v=market-reopen-20261014-eclipse-20261020-battles-lv50-new-jobs-title-20261020-jobdetail-clean-20261020';
import { raidDetailsMarkup } from './ui/raid.js?v=material2x-raid10-20261009';
import { prepareRaidDamageSubmission } from './raid/raidDamageGuard.js';
import { formatRaidReward } from './raid/raidRewardDisplay.js';
import { createRaidApi,getRaidPlayerId } from './raid/raidApi.js';
import { raidJoinButtonState,raidJoinLoadingMarkup,withRaidJoinTimeout } from './raid/raidJoinUi.js?v=material2x-raid10-20261009';
import { captureProgressionSnapshot,buildProgressionAuditEvents,createProgressionAuditApi } from './online/progression-audit.js';
import { raidBattleMarkup,raidActionPayload,chooseRaidBossAttack,currentRaidBossStats,raidEffectMarkup } from './raid/raidBattle.js?v=raid-balance-20261014';
import { getSkillElement, getElementMultiplier } from './core/elements.js';
import { createRaidTurnState,planRaidPartyAction,currentRaidTurnActor,applyRaidSkillEffect,applyRaidItemEffect,applyRaidBossAction } from './raid/raidPartyTurn.js';
import { tryInflictRaidBossStatus,getRaidBossDotTick,getRaidBossControl,tickRaidBossStatuses,getRaidActorControl,tickRaidPartyStatuses,clearRaidOnlyStatuses } from './raid/raidStatus.js';
import { RAID_BOSSES, getRaidWindow, getNextRaidStart } from './raid/raidRules.js?v=raid-balance-20261014';
import { RAID_RANK_THRESHOLDS, raidExperienceForRank } from './raid/raidContribution.js';
import { createRaidPoller } from './raid/raidRealtime.js';
import { storeRaidSnapshot,raidRewardKey,isRaidTimedOutSnapshot,shouldGrantRaidReward, rememberRaidDefeat, restoreRaidDefeats, isRaidWindowDefeated, raidWaitingMarkup } from './raid/raidLifecycle.js';
import { getEquipmentStatBonus, getCharacterResourceCaps } from './core/combat-stats.js';
import { getRareBattleRewards } from './core/rare-monsters.js';
import { awardCharacterExp } from './core/progression.js';
import { getNextDailyTravelBonusBoundary } from './core/daily-travel-bonus.js';
import { applyBoostedBattleGold,useBoostScroll,isBoostScrollActive,advanceBoostPlaytime,remainingBoostMs,scrollDurationLabel,eligibleBoostTickMs } from './core/boost-scrolls.js?v=mobile-scroll-clock-20261020';
import { startPlayerStatsHeartbeat, PLAYER_STATS_STORAGE_KEY } from './core/player-stats.js';
import { createAccountApi } from './online/account-api.js';
import { createRankingApologyApi,grantRankingApologyReward,wasRankingApologyDelivered,markRankingApologyDelivered } from './core/ranking-apology.js';
import { rankingApologyLoadingMarkup,rankingApologyConversationMarkup } from './ui/ranking-apology.js';
import { createHuntCountApologyApi } from './online/hunt-count-apology-api.js';
import { canReceiveHuntCountApology,grantHuntCountApology,isHuntCountApologyDelivered } from './core/hunt-count-apology.js';
import { huntCountApologyLoadingMarkup,huntCountApologyDialogueMarkup } from './ui/hunt-count-apology.js';
import { createBrowserMarketApi } from './market/browser-market-api.js';
import { createFeedbackApi } from './online/feedback-api.js';
import { COLLECTION_EVENT_202611 } from './data/collection-event-202611.js';
import { collectionEventBannerMarkup,collectionEventDetailsMarkup,nextCollectionBannerBoundary } from './ui/collection-event-banner.js';
import { createCollectionRewardApi } from './online/collection-reward-api.js';
import { grantCollectionReward,collectionRewardDelivered } from './core/collection-reward-claim.js';
import { collectionRankingMarkup,collectionRankingTitleButton } from './ui/collection-ranking.js';
import { createCollectionRankingApi } from './online/collection-ranking-api.js';
import { createCollectionScoreApi } from './online/collection-score-api.js';
import { reserveCollectionBattle } from './online/collection-battle-ticket.js';
import {collectionDropPreview} from './core/collection-event.js';
import { feedbackFormMarkup, feedbackHistoryMarkup, feedbackSentMarkup } from './ui/feedback.js';
import { titleUpdatesMarkup } from './ui/title-updates.js';
import { purchaseMarketListing,syncPendingMarketTransactions,formatMarketSaleNotifications,persistMarketReturn } from './market/market-sync.js';
import { createMarketOperationGuard } from './market/market-operation-guard.js';

const session={mode:'guest',storage:window.localStorage,userId:null};
const festivalApi=createFestivalApi(session.storage);
const festivalKillRecorder=createFestivalKillRecorder(battle=>festivalApi.recordBattle(battle),session.storage);
festivalView.debug=false;
let festivalBusy=false,festivalFetchedAt=0,festivalClaimBusy=false;


const accountApi=createAccountApi({storage:session.storage});
const accountState={ready:false,linked:false,loginId:'',userId:null,playerId:null};
const accountCloudTimers=new Map(),accountCloudPending=new Map();
const playerStatsHeartbeat=startPlayerStatsHeartbeat({storage:session.storage,endpoint:'https://nmxmrxfyriutakewqgkk.supabase.co/functions/v1/yakusoku-player-stats'});
const raidApi=createRaidApi();
const progressionAuditApi=createProgressionAuditApi(undefined,session.storage,globalThis.fetch,playerStatsHeartbeat.playerId);
void progressionAuditApi.flush().catch(()=>{});
const rankingApologyApi=createRankingApologyApi(undefined,undefined,session.storage);
const huntCountApologyApi=createHuntCountApologyApi({storage:session.storage});
let huntCountApologyStatus=null,huntCountApologyClaimBusy=false;
const newMarketUi=()=>({tab:'browse',historyFocus:'buy',history:{purchases:[],sales:[]},profileName:'',loading:false,error:'',browse:{items:[],search:'',category:'all',sort:'newest',inStockOnly:true},store:{profileName:'',store:null,listings:[],sold:[]}});
let marketUi=newMarketUi(),marketApiPromise=null,marketSyncBusy=false;
const marketOperationGuard=createMarketOperationGuard({
 isLocked:()=>marketSyncBusy,
 onBusy:()=>toast('フリーマーケットの取引処理中です。完了してから再操作してください'),
 onSettled:()=>{
  if(state?.market?.everUsed&&!title.classList.contains('active'))
   queueMicrotask(()=>void syncMarketSettlement());
 }
});
let equipmentSearch=''; // Browser-only query. Never update inventory or save data.
const getMarketApi=()=>marketApiPromise??=createBrowserMarketApi({storage:session.storage});
const feedbackApi=createFeedbackApi({storage:session.storage});
const arenaApi=createArenaApi({storage:session.storage});
const collectionRankingApi=createCollectionRankingApi({storage:session.storage});
const collectionScoreApi=createCollectionScoreApi({storage:session.storage});
const collectionRewardApi=createCollectionRewardApi({storage:session.storage});
let collectionRewardBusy=false;
let collectionRewardView={finalized:false,claimable:false,receipt:null,loading:false,error:false};
let collectionRankingRequest=0;
let collectionRankingView={rows:[],totalParticipants:0,page:1,myRank:null,myCount:0,loading:false,error:false};
let feedbackBusy=false;
let raidRoom=null,raidStartedAt=0,raidPendingBossAction=null,raidRewardClaimBusy=false,raidJoinBusy=false,raidBattleLog=[],raidLastHitText='',raidTurnState=null,raidTurnExecuting=false,raidEndedReason=null,raidExecutionId=0,raidClaimExecutionId=0,eventBoundaryTimer=null;
const raidPoller=createRaidPoller({api:raidApi,getPayload:()=>({playerId:getRaidPlayerId(session.storage)}),intervalMs:1000,onSnapshot:r=>{if(!raidRoom||(r.sessionId&&r.sessionId!==raidRoom.sessionId)||(r.roomId&&r.roomId!==raidRoom.roomId))return;if(isRaidTimedOutSnapshot(r)){raidExecutionId++;raidPoller.stop();raidEndedReason='timeout';raidTurnExecuting=false;raidTurnState=null;raidPendingBossAction=null;addRaidBattleLog(`${raidRoom.boss?.name??'レイドボス'}は逃げ出した…`);renderRaidBattleScreen();return;}const motion={visualAction:raidRoom.visualAction,visualEvents:raidRoom.visualEvents};raidRoom={...raidRoomView(r),...motion};rememberRaidSnapshot(r);if(raidTurnExecuting)return;updateRaidBattleModal(raidRoom,raidHero(),raidPendingBossAction,raidPartyMembers());void tryClaimRaidReward(r,{silent:true});if(r.currentHp===0){raidPoller.stop();raidTurnState=null;raidPendingBossAction=null;saveNow();renderRaidBattleScreen();}},onError:()=>{}});
const raidLobbyPoller=createRaidPoller({api:raidApi,getPayload:()=>({playerId:getRaidPlayerId(session.storage)}),intervalMs:3000,onSnapshot:r=>{rememberRaidSnapshot(r);if(!r?.active&&r.currentHp!==0){raidLobbyPoller.stop();return;}updateRaidAdventureCard(r);void tryClaimRaidReward(r,{silent:false});},onError:()=>{}});
const $=s=>document.querySelector(s);const title=$('#title-screen'),game=$('#game-screen'),battleScreen=$('#battle-screen'),modal=$('#modal-root'),toastRoot=$('#toast-root');
let currentSlot=1;let state=ensureAdventureState(createNewGame(createDefaultRoster()));let view='adventure',battle=null,battleMeta=null,mashoRun=null,arenaSession=null,arenaClaimBusy=false,arenaOperationBusy=false,arenaPendingMutation=null;let playStartedAt=null,boostClockLastAt=null,lastPlayerInputAt=Date.now();
const selectedId=()=>state.selectedCharacterId??state.characters?.[0]?.id;
const autoSettings=()=>normalizeAutoSettings(state.ui?.autoPlay);
function saveAutoSettings(patch){
 state.ui??={};state.ui.autoPlay=normalizeAutoSettings({...autoSettings(),...patch});
 document.body.dataset.battleSpeed=String(state.ui.autoPlay.speed);
 saveNow();
}
let normalAutoTimer=null,raidAutoTimer=null,raidAutoRound=0,raidLastActAt=0,raidAutoStopped=false;
function clearNormalAuto(){clearTimeout(normalAutoTimer);normalAutoTimer=null;}
function clearRaidAuto(){clearTimeout(raidAutoTimer);raidAutoTimer=null;}
function displayAutoSettings(){
 const a=autoSettings();
 openModal(`<div class="auto-play-settings" data-no-pixel-icon><h2>オートプレイ設定</h2><p class="modal-sub">「その他」メニューで設定し、次の戦闘から適用します。</p><h3>オートプレイ</h3><div class="auto-setting-options"><button data-auto-enabled="off" class="${!a.enabled?'is-selected':''}" aria-pressed="${!a.enabled}">OFF</button><button data-auto-enabled="on" class="${a.enabled?'is-selected':''}" aria-pressed="${a.enabled}">ON</button></div><h3>戦闘速度</h3><div class="auto-setting-options">${[1,2,4].map(v=>`<button data-auto-speed="${v}" class="${a.speed===v?'is-selected':''}" aria-pressed="${a.speed===v}">${v===1?'通常（1倍速）':`${v}倍速`}</button>`).join('')}</div><h3>戦闘方針</h3><div class="auto-setting-options auto-strategies">${[['balanced','バランス重視'],['aggressive','攻撃重視'],['safe','安全重視']].map(([key,label])=>`<button data-auto-strategy="${key}" class="${a.strategy===key?'is-selected':''}" aria-pressed="${a.strategy===key}">${label}</button>`).join('')}</div><p class="auto-setting-note">通常戦闘・イベント・洞窟・レイドに対応。行動はセット済みの特技・魔法から選択します。即死予兆では防御を最優先します。</p><p class="auto-setting-note">4倍速は演出を短縮します。レイドの通信間隔や攻撃回数は増えません。探索の連続開始とアイテムの自動消費は行いません。</p><button class="action-main" data-auto-settings-close>設定を保存して戻る</button></div>`);
}
function scheduleNormalAuto(){
 clearNormalAuto();
 if(!autoSettings().enabled||!battle||battle.arenaQuestId||battle.autoPlayStopped||battle.phase!=='planning'||!getPendingActor(battle)||document.hidden||modal.classList.contains('open'))return;
 const current=battle,actorId=current.awaitingActorId;
 normalAutoTimer=setTimeout(()=>{
  normalAutoTimer=null;
  if(!autoSettings().enabled||current.autoPlayStopped||document.hidden||battle!==current||current.phase!=='planning'||current.awaitingActorId!==actorId||modal.classList.contains('open'))return;
  const actor=getPendingActor(current),source=state.characters.find(c=>c.id===actor?.id);
  const skills=source?getBattleSkills(source):[];
  const action=chooseAutoAction({actor,allies:current.actors.filter(x=>x.side==='ally'),enemies:current.actors.filter(x=>x.side==='enemy'),skills,strategy:autoSettings().strategy,turn:(current.turnNumber??0)+1,warning:current.actors.some(x=>x.side==='enemy'&&x.hp>0&&(x._instantDeathPrimed||x._rareDeathPrimed||x._eventDeathPrimed))});
  act(action);
 },Math.max(95,Math.round(400/autoSettings().speed)));
}
function scheduleRaidAuto(){
 clearRaidAuto();
 if(!autoSettings().enabled||raidAutoStopped||!raidRoom||!raidTurnState||raidTurnState.complete||raidTurnExecuting||raidEndedReason||document.hidden||isRaidWindowDefeated(state)||Number(raidRoom.currentHp??0)<=0)return;
 const currentRoom=raidRoom.roomId,currentExecution=raidExecutionId,actorId=raidTurnState.currentActorId;
 raidAutoTimer=setTimeout(()=>{
  raidAutoTimer=null;
  if(!autoSettings().enabled||raidAutoStopped||document.hidden||!raidRoom||raidRoom.roomId!==currentRoom||raidExecutionId!==currentExecution||!raidTurnState||raidTurnState.currentActorId!==actorId||raidTurnExecuting||raidEndedReason||isRaidWindowDefeated(state))return;
  const actor=currentRaidPartyActor();if(!actor)return;
  const selected=chooseAutoAction({actor,allies:raidPartyMembers(),enemies:[{id:'raid-boss',hp:raidRoom.currentHp,maxHp:raidRoom.maxHp,...(raidRoom.boss??{})}],skills:getBattleSkills(actor),strategy:autoSettings().strategy,turn:raidAutoRound,warning:Boolean(raidPendingBossAction?.telegraph)});
  const planned=selected.type==='defend'?{type:'guard'}:selected.type==='skill'?{type:'skill',skillId:selected.skillId,targetId:selected.targetId}:{type:selected.type==='attack'?'attack':'guard'};
  planRaidAction(planned);
 },Math.max(120,Math.round(530/autoSettings().speed)));
}
async function limitAutoRaidCalls(expectedExecution){
 if(!autoSettings().enabled)return;
 const delay=Math.max(0,1650-(Date.now()-raidLastActAt));
 if(delay)await new Promise(r=>setTimeout(r,delay));
 if(expectedExecution!==raidExecutionId||!raidRoom)throw new Error('raid_turn_cancelled');
 raidLastActAt=Date.now();
}
function battlePresentationDelay(frame,last=false){return Math.max(85,Math.round(frameDuration(frame,last)/autoSettings().speed));}

function syncPlayTime(now=Date.now()){
 if(playStartedAt===null)return;
 const from=boostClockLastAt??now;
 advanceBoostPlaytime(state,eligibleBoostTickMs({from,now,lastInputAt:lastPlayerInputAt,inCombat:!!(battle||raidRoom)}));
 boostClockLastAt=now;
 const r=addElapsedPlayTime(state,playStartedAt,now);playStartedAt=r.accountedUntil;
}
const saveNow=()=>{syncPlayTime();const unlocked=evaluateAchievements(state);const result=saveToSlot(session,currentSlot,state);scheduleAccountCloudSave(currentSlot,result);if(unlocked.length)setTimeout(()=>toast(`🏆 実績解除！ ${unlocked.at(-1).name}`),0);return result;};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(message){toastRoot.innerHTML=`<div class="toast">${esc(message)}</div>`;setTimeout(()=>{toastRoot.innerHTML='';},2200);}
function openModal(content){modal.innerHTML=`<div class="modal-backdrop" data-modal-backdrop><section class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal>×</button>${content}</section></div>`;modal.classList.add('open');}
function openRankingApologyModal(content){modal.classList.add('ranking-apology-open');openModal(content);}
function updateRankingApologyModalContent(content){const card=modal.querySelector('.modal-card');if(!card)return openRankingApologyModal(content);card.innerHTML=`<button class="modal-close" data-close-modal>×</button>${content}`;}
function closeModal(){modal.classList.remove('open','ranking-apology-open','raid-ui-open');modal.innerHTML='';if(battle&&battle.phase==='planning')queueMicrotask(scheduleNormalAuto);}
function topbar(){const hero=state.characters.find(c=>c.isHero)??state.characters[0];return `<header class="topbar"><button class="brand" data-nav="adventure"><span class="brand-mark">✦</span><span>約束のクロニクル</span></button><div class="top-resources"><span>💰 ${state.gold??0}G</span><span>⭐ Lv${hero?.level??1}</span></div></header>`;}
function partyDock(){const byId=new Map((state.characters??[]).map(c=>[c.id,c]));const ordered=(state.activePartyIds??[]).map(id=>byId.get(id)).filter(Boolean);return `<div class="party-dock" role="group" aria-label="戦闘パーティの隊列：横にドラッグで並び替え">${ordered.map(c=>{const caps=getCharacterResourceCaps(state,c),hp=Math.max(0,Math.min(100,Math.round((c.hp??0)/Math.max(1,caps.maxHP)*100))),mp=Math.max(0,Math.min(100,Math.round((c.mp??0)/Math.max(1,caps.maxMP)*100)));return `<button data-character-id="${esc(c.id)}" data-dock-member="${esc(c.id)}" class="dock-member ${c.id===selectedId()?'selected':''}"><span>${esc(c.name.slice(0,1))}</span><small>${esc(c.name)}<br>Lv${c.level}</small><i class="dock-hp" role="progressbar" aria-label="HP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${hp}"><b style="width:${hp}%"></b></i><i class="dock-mp" role="progressbar" aria-label="MP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${mp}"><b style="width:${mp}%"></b></i></button>`;}).join('')}</div>`;}
const nav=()=>`<nav class="main-nav"><button data-nav="adventure">🗺️<span>冒険</span></button><button data-nav="party">👥<span>仲間</span></button><button data-nav="status">📊<span>能力</span></button><button data-nav="jobs">🔯<span>転職</span></button><button data-nav="equipment">⚔️<span>装備</span></button><button data-nav="items">🎒<span>アイテム</span></button><button data-nav="more">☰<span>その他</span><i class="game-update-dot" data-game-update-dot aria-label="更新あり" ${gameUpdateAvailable?'':'hidden'}></i></button></nav>`;
function panelForView(){if(view==='exploreResult')return `<section class="panel exploration-result"><h2>探索を続けますか？</h2><p>${esc(state.adventure?.message??'戦闘終了！').replace(/\n/g,'<br>')}</p><div class="hunt-actions"><button class="action-main" data-explore-continue>はい</button><button data-explore-return>いいえ（町へ戻る）</button></div></section>`;if(view==='masho')return mashoCaveMarkup(state);if(view==='arena')return arenaMarkup(state);const switcher=()=>characterSwitcherMarkup(state,selectedId());if(view==='town')return townMarkup(state,huntCountApologyStatus,currentSlot);if(view==='market')return marketMarkup(state,marketUi);if(view==='party')return partyMarkup(state);if(view==='status')return switcher()+statusMarkup(state,selectedId());if(view==='skillList')return switcher()+skillLoadoutMarkup(state,selectedId());if(view==='jobs')return switcher()+jobsMarkup(state,selectedId())+skillsMarkup(state,selectedId());if(view==='equipment')return switcher()+equipmentMarkup(state,selectedId(),equipmentSearch);if(view==='items')return itemsMarkup(state);if(view==='bestiary')return bestiaryMarkup(state);if(view==='quests')return questsMarkup(state,getVisibleQuestDefinitions(state));if(view==='achievements')return achievementsMarkup(state,Object.values(ACHIEVEMENTS));if(view==='forge')return forgeMarkup(state);if(view==='ending')return endingMarkup(state);if(view==='guide')return adventureGuideMarkup(state);if(view==='eidelEnding')return eidelEndingMarkup(state,state.ui?.eidelEndingView??(state.endgame?.complete?'saved':state.endgame?.eidelEnding));if(view==='endgame')return endgameMarkup(state);return adventureMarkup(state);}
function syncEquipmentCandidateFilters(){
 const screen=game.querySelector('.equipment-screen'),candidates=game.querySelector('.equipment-candidates');
 if(!screen||!candidates)return;
 const category=state.ui?.equipmentCategory??'all';
 screen.querySelectorAll('[data-equipment-category]').forEach(button=>button.classList.toggle('active',button.dataset.equipmentCategory===category));
 screen.querySelectorAll('[data-equipment-current-category]').forEach(row=>{
  row.hidden=category==='unequipped'||category!=='all'&&row.dataset.equipmentCurrentCategory!==category;
 });
 let visible=0;
 candidates.querySelectorAll('[data-equipment-category-value]').forEach(row=>{
  row.hidden=!equipmentCandidateVisible({category,itemCategory:row.dataset.equipmentCategoryValue,unequipped:row.dataset.equipmentUnequipped==='1',name:row.dataset.equipmentSearchName,query:equipmentSearch});
  if(!row.hidden)visible++;
 });
 const heading=candidates.querySelector('.equipment-list-head h2');
 if(heading)heading.textContent=category==='unequipped'?'未装備一覧':'装備候補';
 const count=candidates.querySelector('.equipment-list-head small');
 if(count)count.textContent=`${visible}種を表示`;
 const empty=candidates.querySelector('.equipment-category-empty');
 if(empty){
  empty.textContent=equipmentSearch.trim()?'検索に一致する装備がありません。':category==='unequipped'?'未装備のアイテムがありません。':'このカテゴリに装備できるアイテムがありません。';
  empty.hidden=visible>0;
 }
 const clear=candidates.querySelector('[data-equipment-search-clear]');
 if(clear)clear.hidden=!equipmentSearch.trim();
}
function renderGameKeepVertical(){const scroller=game.querySelector('.game-scroll');const scrollTop=scroller?.scrollTop??0;const detailOpen=!!game.querySelector('.forge-advanced[open]');const equipmentDetails=new Set([...game.querySelectorAll('.equipment-details[open][data-equipment-details-key]')].map(el=>el.dataset.equipmentDetailsKey));renderGame();const detail=game.querySelector('.forge-advanced');if(detail&&detailOpen)detail.open=true;game.querySelectorAll('.equipment-details[data-equipment-details-key]').forEach(el=>{if(equipmentDetails.has(el.dataset.equipmentDetailsKey))el.open=true;});const next=game.querySelector('.game-scroll');if(next)requestAnimationFrame(()=>{next.scrollTop=scrollTop;});}

function renderGame(){restoreRaidDefeats(state,session.storage);rememberRaidDefeat(state,state.raid?.liveSnapshot,{storage:session.storage});const forgeScroll=captureHorizontalScroll(game,'.forge-categories'),characterScroll=captureHorizontalScroll(game,'.character-switcher-list'),itemCategoryScroll=captureHorizontalScroll(game,'.item-category-tabs');title.classList.remove('active');battleScreen.classList.remove('active');game.classList.add('active');game.innerHTML=`${topbar()}<main class="game-scroll ${view==='exploreResult'?'explore-result-scroll':''}">${panelForView()}</main>${partyDock()}${nav()}`;restoreHorizontalScroll(game,'.forge-categories',forgeScroll,'.selected');restoreHorizontalScroll(game,'.character-switcher-list',characterScroll,'.selected');restoreHorizontalScroll(game,'.item-category-tabs',itemCategoryScroll,'.active');if(view==='adventure'&&!raidRoom&&getRaidWindow()&&!isRaidWindowDefeated(state))raidLobbyPoller.start();else if(!raidRoom)raidLobbyPoller.stop();scheduleEventRefresh();void refreshFestival();}
function showGame(){void refreshFestival(true);state.rankingApologyEligible=null;huntCountApologyStatus=null;renderGame();saveNow();void refreshRankingApologyEligibility();void refreshHuntCountApologyStatus();}
async function refreshRankingApologyEligibility(){
 const current=state;
 if(current.rankingApologyReceived)return;
 try{
  const status=await rankingApologyApi.status(playerStatsHeartbeat.playerId);
  if(state!==current)return;
  current.rankingApologyEligible=status?.eligible===true;
  saveNow();
  if(game.classList.contains('active'))renderGameKeepVertical();
 }catch{/* Keep the card hidden until eligibility can be confirmed. */}
}
async function refreshHuntCountApologyStatus(){
 const current=state,slot=currentSlot;
 try{
  const status=await huntCountApologyApi.status();
  if(state!==current||currentSlot!==slot)return;
  huntCountApologyStatus=status;
  // A claim may have committed remotely just before the page was closed.
  // Resume delivery only in the slot recorded by the server.
  if(status.claimed&&Number(status.saveSlot)===slot&&!isHuntCountApologyDelivered(current,status)&&canReceiveHuntCountApology(current)){
   if(grantHuntCountApology(current,status,slot))saveNow();
  }
  if(view==='town'&&game.classList.contains('active'))renderGameKeepVertical();
 }catch{/* A server error never authorizes a local reward. */}
}
async function openHuntCountApologyNpc(){
 openModal(huntCountApologyLoadingMarkup());
 const original=state,slot=currentSlot;
 try{
  const status=await huntCountApologyApi.status();
  if(state!==original||currentSlot!==slot){closeModal();return;}
  huntCountApologyStatus=status;
  if(status.claimed&&Number(status.saveSlot)===slot&&!isHuntCountApologyDelivered(state,status)&&canReceiveHuntCountApology(state)){
   grantHuntCountApology(state,status,slot);saveNow();closeModal();renderGame();toast('💎 強化結晶5個を受け取りました！');return;
  }
  updateRankingApologyModalContent(huntCountApologyDialogueMarkup(state,status,slot));
 }catch{updateRankingApologyModalContent(huntCountApologyDialogueMarkup(state,null,slot));}
}
async function claimHuntCountApology(){
 if(huntCountApologyClaimBusy)return;
 if(!huntCountApologyStatus?.eligible)return toast('お詫びの受取状況を確認してください');
 if(!canReceiveHuntCountApology(state))return toast('強化結晶5個分の空きを作ってください');
 huntCountApologyClaimBusy=true;
 const original=state,slot=currentSlot;
 updateRankingApologyModalContent(huntCountApologyLoadingMarkup());
 try{
  const result=await huntCountApologyApi.claim(slot);
  if(state!==original||currentSlot!==slot){closeModal();return;}
  huntCountApologyStatus=result;
  if(!result.claimed||Number(result.saveSlot)!==slot){updateRankingApologyModalContent(huntCountApologyDialogueMarkup(state,result,slot));return;}
  const delivered=grantHuntCountApology(state,result,slot);
  saveNow();closeModal();renderGame();
  toast(delivered?'💎 強化結晶5個を受け取りました！':'お詫びの報酬は受取済みです');
 }catch(err){updateRankingApologyModalContent(`<section class="npc-dialogue"><h2>🎁 お詫びの案内人</h2><p>${esc(err?.message??'通信エラーが発生しました')}</p><button data-hunt-count-apology-npc>受取状況を確認する</button></section>`);}
 finally{huntCountApologyClaimBusy=false;}
}
function startFresh(slot=currentSlot){if(marketOperationGuard.busy||marketSyncBusy||arenaOperationBusy||arenaClaimBusy)return toast('取引・闘技大会の通信中はセーブスロットを変更できません');arenaPendingMutation=null;mashoRun=null;arenaSession=null;clearNormalAuto();cancelRaidSession();raidClaimExecutionId++;raidRewardClaimBusy=false;currentSlot=Number(slot)||1;marketUi=newMarketUi();state=ensureAdventureState(createNewGame(createDefaultRoster()));suspendUnverifiedArenaAssets(state);ensureSpecialJobProgress(state);state.rankingApologyReceived=wasRankingApologyDelivered(session.storage,playerStatsHeartbeat.playerId);state.selectedCharacterId='hero';view='adventure';playStartedAt=Date.now();boostClockLastAt=playStartedAt;lastPlayerInputAt=playStartedAt;document.body.dataset.battleSpeed=String(autoSettings().speed);showGame();toast('新しい物語が始まりました');}
function continueGame(slot=currentSlot){if(marketOperationGuard.busy||marketSyncBusy||arenaOperationBusy||arenaClaimBusy)return toast('取引・闘技大会の通信中はセーブスロットを変更できません');arenaPendingMutation=null;mashoRun=null;arenaSession=null;clearNormalAuto();cancelRaidSession();raidClaimExecutionId++;raidRewardClaimBusy=false;currentSlot=Number(slot)||1;marketUi=newMarketUi();const loaded=loadFromSlot(session,currentSlot);state=ensureAdventureState(loaded??createNewGame(createDefaultRoster()));suspendUnverifiedArenaAssets(state);ensureSpecialJobProgress(state);state.rankingApologyReceived=state.rankingApologyReceived===true||wasRankingApologyDelivered(session.storage,playerStatsHeartbeat.playerId);state.selectedCharacterId??=state.characters[0]?.id;view=state.story?.firstEndingSeen&&!state.story?.trueEndingSeen&&state.adventure?.completedRegions?.includes('abyss')?'ending':'adventure';playStartedAt=Date.now();boostClockLastAt=playStartedAt;lastPlayerInputAt=playStartedAt;document.body.dataset.battleSpeed=String(autoSettings().speed);showGame();void recoverArenaPending();if(state.market?.everUsed)void syncMarketSettlement({notify:true});}
function outcomeOf(b){const a=b.actors.some(x=>x.side==='ally'&&x.hp>0),e=b.actors.some(x=>x.side==='enemy'&&x.hp>0);return !e?'victory':!a?'defeat':null;}
let battlePlayback=null;
function renderBattle(){
 if(battlePlayback===battle&&battle)return;
 title.classList.remove('active');game.classList.remove('active');battleScreen.classList.add('active');
 if(battle?.phase==='complete'&&battle.visualTimeline?.length){void playBattleTimeline(battle);return;}
 updateBattleView(battleScreen,battleMarkup(state,battle));queueMicrotask(checkBattleState);scheduleNormalAuto();
}
async function playBattleTimeline(current){
 battlePlayback=current;
 try{for(const [frameIndex,frame] of current.visualTimeline.entries()){
  if(battle!==current)return;
  const view={...current,...frame,awaitingActorId:null,actorMap:Object.fromEntries(frame.actors.map(a=>[a.id,a]))};
  renderMotionFrame(battleScreen,battleMarkup(state,view));
  await new Promise(resolve=>setTimeout(resolve,battlePresentationDelay(frame,frameIndex===current.visualTimeline.length-1)));
 }}finally{if(battlePlayback===current)battlePlayback=null;}
 if(battle!==current)return;
 current.visualTimeline=[];current.visualEvents=[];checkBattleState();
}
function createAdventureBattle(enemies,options={}){
 battleMeta.auditBefore??=captureProgressionSnapshot(state);
 const list=Array.isArray(enemies)?enemies:[enemies];
 battleMeta.festivalProof=reserveFestivalBattle(battleMeta,list,battleInfo=>festivalApi.beginBattle(battleInfo));
 const b=createBattle(getAdventureBattleParty(state),list,{...options,useItem:(itemId,target)=>useBattleItem(state,itemId,target),onActionExecuted:(action,actor,result)=>{
  if(actor.side!=='ally')return;
  if(action.type==='defend')recordSpecialProgress(state,'guard');
  if(action.type==='skill'){
   if(action.skill?.element&&action.skill.element!=='none')recordSpecialProgress(state,'element',{id:action.skill.element});
   if(action.skill?.type==='revive'&&result?.revived!==false)recordSpecialProgress(state,'revive');
  }
 }});
 b.gold=list.reduce((n,e)=>n+(e.gold??0),0);b.exp=list.reduce((n,e)=>n+(e.exp??0),0);b.jobExp=list.reduce((n,e)=>n+(e.jobExp??0),0);
 return b;
}
function scheduleEventRefresh(){
 clearTimeout(eventBoundaryTimer);const next=Math.min(nextFestivalBoundary(),nextCollectionBannerBoundary(),getNextEventBoundary()??Infinity,getNextDailyTravelBonusBoundary()??Infinity,getNextRaidStart(),getRaidWindow()?.endsAt??Infinity);if(!Number.isFinite(next))return;
 eventBoundaryTimer=setTimeout(()=>{
  if(!document.hidden&&!battle&&!raidRoom&&!raidJoinBusy){if(title.classList.contains('active'))renderTitle();else if(view==='adventure'){renderGameKeepVertical();void refreshFestival(true);}}
  scheduleEventRefresh();
 },Math.min(2147483647,Math.max(1,next-Date.now())));
}
function startTrainingFestivalWave(wave=1,festival=TRAINING_FESTIVAL){
 const active=festival.id===TWIN_STAR_FESTIVAL.id?isTwinStarFestivalActive():isTrainingFestivalActive();
 if(!active)return toast(`${festival.name}の開催期間外です（日本時間）`);
 if(wave===1){state.adventure.trainingFestivalLevelUps=[];state.adventure.trainingFestivalDrops=[];}
 const enemies=makeTrainingFestivalWave(state,wave,festival);recordHalloweenWaveEncounters(state,enemies);
 battleMeta={regionId:festival.id,boss:wave===3,rematch:false,eventId:festival.id,eventWave:wave,enemy:enemies[0],enemies,auditBefore:captureProgressionSnapshot(state)};
 battle=createAdventureBattle(enemies,{isBoss:wave===3});startTurn(battle);renderBattle();
}
function awardSpecialBattleExperience(){
 const enemies=battleMeta.enemies??[battleMeta.enemy];
 const exp=battle.exp??enemies.reduce((n,e)=>n+(e.exp??0),0),jobExp=battle.jobExp??enemies.reduce((n,e)=>n+(e.jobExp??0),0);
 const result=recordAdventureVictory(state,{regionId:battleMeta.regionId,boss:false,enemyIds:enemies.map(e=>e.bestiaryId??e.id),exp,jobExp,gold:0,countsForExploration:false});
 state.adventure.message=['試練勝利！',...result.levelUps].join('\n');auditVictory(battleMeta,exp);return result;
}
function startBattle(enemy,{boss=false,rematch=false,trainingArea=null,guildQuestId=null,exploration=false}={}){const enemies=Array.isArray(enemy)?enemy:[enemy];battleMeta={regionId:guildQuestId?enemies[0].regionId:state.adventure.regionId,boss,rematch,trainingArea,guildQuestId,exploration,rareEncounter:enemies.some(x=>x.rareMonster),enemy:enemies[0],enemies,auditBefore:captureProgressionSnapshot(state)};
battleMeta.collectionProof=reserveCollectionBattle(battleMeta,enemies,params=>collectionScoreApi.begin(params),{displayName:getFeedbackAuthorName()});
battle=createAdventureBattle(enemies,{isBoss:boss});battle.gold=enemies.reduce((n,e)=>n+(e.gold??0),0);battle.exp=enemies.reduce((n,e)=>n+(e.exp??0),0);battle.jobExp=enemies.reduce((n,e)=>n+(e.jobExp??0),0);startTurn(battle);renderBattle();}
// Three genuine battles with HP/MP carried between waves. Each victory saves
// materials immediately, including battles started just before the event closes.
function startEclipseWave(wave=1){
 if(!getEclipseEventStatus().active)return toast('星蝕の異界門は開催期間外です（日本時間）');
 if(wave===1){
  state.adventure??={};
  state.adventure.eclipseLevelUps=[];
  state.adventure.eclipseDrops=[];
 }
 const now=Date.now();
 const enemies=makeEclipseWave(state,wave);
 recordHalloweenWaveEncounters(state,enemies);
 battleMeta={regionId:'event:eclipse-gate-2026',boss:wave===3,rematch:false,eventId:ECLIPSE_EVENT.id,eventWave:wave,eventStartedAt:now,enemy:enemies[0],enemies,auditBefore:captureProgressionSnapshot(state)};
 battle=createAdventureBattle(enemies,{isBoss:wave===3});
 startTurn(battle);
 renderBattle();
}
function startHalloweenWave(wave=1){if(wave===1&&!isHalloweenActive())return toast('イベント開催期間外です');if(wave===1){state.adventure??={};state.adventure.halloweenLevelUps=[];state.adventure.halloweenDrops=[];}const enemies=makeHalloweenWave(state,wave);recordHalloweenWaveEncounters(state,enemies);battleMeta={regionId:'event:halloween-2026',boss:wave===3,rematch:false,eventId:'halloween-2026',eventWave:wave,enemy:enemies[0],enemies,auditBefore:captureProgressionSnapshot(state)};battle=createAdventureBattle(enemies,{isBoss:wave===3});battle.gold=enemies.reduce((n,e)=>n+(e.gold??0),0);battle.exp=enemies.reduce((n,e)=>n+(e.exp??0),0);battle.jobExp=enemies.reduce((n,e)=>n+(e.jobExp??0),0);startTurn(battle);renderBattle();}
function checkBattleState(){if(!battle||battlePlayback===battle)return;const out=outcomeOf(battle);if(out==='victory')return finishBattleVictory();if(out==='defeat')return finishBattleDefeat();if(battle.phase==='complete'){finishTurn(battle);if(battle.arenaQuestId&&battle.turnNumber>=100)return void finishArenaBattle();startTurn(battle,battle.arenaQuestId?arenaSession?.rng:Math.random);const next=outcomeOf(battle);if(next==='defeat')return finishBattleDefeat();renderBattle();}}
function auditVictory(meta,expAwarded=0){
 try{
  const after=captureProgressionSnapshot(state);
  const enemyIds=(battle?.actors?.filter(x=>x.side==='enemy'&&x.hp<=0&&!x.escaped)??(meta?.enemies??[meta?.enemy]).filter(Boolean)).map(x=>x.bestiaryId??x.id);
  const events=buildProgressionAuditEvents({playerId:playerStatsHeartbeat.playerId,before:meta?.auditBefore??after,after,meta:{
   battleId:meta?.festivalProof?.battleId??meta?.collectionProof?.battleId,
   battleType:festivalBattleType(meta),regionId:meta?.regionId??'',enemyIds,
   cycle:state.cycle??1,saveSlot:currentSlot,expAwarded
  }});
  void progressionAuditApi.record(events).then(()=>refreshFestival(true)).catch(()=>{});
  const audit=events[0];
  if(audit&&!meta?.rematch){
   void buildRecordedFestivalVictory(meta?.festivalProof,audit).then(record=>{
    if(record)return festivalKillRecorder.record(record);
    return null;
   }).then(()=>refreshFestival(true)).catch(()=>{});
  }
 }catch{}
}
function startMashoFloorBattle(floor){
 if(!canEnterMashoFloor(state,floor))throw new Error('まだ挑戦できない階層です');
 // Clear former chain result when starting a single battle.
 if(!mashoRun)state.mashoCave.lastRunSummary=null;
 setMashoResultVisibility(state,false);
 const enemy=createMashoEnemy(state,floor);
 battleMeta={regionId:'masho',boss:true,enemy,mashoFloor:floor};
 battle=createAdventureBattle(enemy,{isBoss:true});
 battle.mashoFloor=floor;
 if(mashoRun){battle.mashoRun={index:mashoRun.completed+1,total:mashoRun.total,stopAfterCurrent:mashoRun.stopAfterCurrent,queueNextTen:mashoRun.queueNextTen};if(mashoRun.manualOnly)battle.autoPlayStopped=true;}
 startTurn(battle);closeModal();renderBattle();
}
function finishBattleVictory(){if(battle?.arenaQuestId)return finishArenaBattle();clearNormalAuto();syncPlayTime();syncBattlePartyToState(state,battle);const e=battleMeta.enemy;
 if(battleMeta.mashoFloor){
  const floor=battleMeta.mashoFloor,beforeGold=Number(state.gold??0),receipt=settleMashoVictory(state,battle);
  auditVictory(battleMeta,battle.exp??0);
  if(mashoRun&&mashoRun.floor===floor){
   recordMashoRunVictory(mashoRun,receipt,Math.max(0,Number(state.gold??0)-beforeGold));
   mashoRun.manualOnly ||= battle.autoPlayStopped===true;
   saveNow();battle=null;
   if(mashoRunCanContinue(mashoRun)){
    try{startMashoFloorBattle(floor);return;}
    catch(error){state.mashoCave.lastRunSummary=mashoRunSummary(mashoRun,'stopped');setMashoResultVisibility(state,true);mashoRun=null;saveNow();battleScreen.classList.remove('active');view='masho';renderGame();toast(error.message??'連戦を中断しました');return;}
   }
   const completed=mashoRun.completed,total=mashoRun.total,stopped=completed<total;
   // Only one extra group: the extra group's queued flag starts false.
   // All earned rewards were already settled and saved individually.
   if(!stopped&&mashoRun.queueNextTen){
    const previous=mashoRun;
    mashoRun=createMashoRun(floor);
    mashoRun.manualOnly=previous.manualOnly;
    try{startMashoFloorBattle(floor);toast('予約した追加10連戦を開始しました');return;}
    catch(error){mashoRun=null;state.mashoCave.lastRunSummary=mashoRunSummary(previous,'completed');toast(error.message??'追加10連戦を開始できませんでした');}
   }else state.mashoCave.lastRunSummary=mashoRunSummary(mashoRun,stopped?'stopped':'completed');
   setMashoResultVisibility(state,true);mashoRun=null;saveNow();battleScreen.classList.remove('active');view='masho';renderGame();
   toast(stopped?`魔障の洞窟 連戦終了！ ${completed}/${total}戦`:`魔障の洞窟 10連戦クリア！`);return;
  }
  state.mashoCave.lastRunSummary=null;setMashoResultVisibility(state,true);saveNow();battle=null;battleScreen.classList.remove('active');view='masho';renderGame();toast(`魔障の洞窟 第${floor}階層クリア！`);return;
 }
 if(battleMeta.eventId===ECLIPSE_EVENT.id){
  const wave=battleMeta.eventWave??1;
  const defeated=battleMeta.enemies??[e];
  const result=recordAdventureVictory(state,{regionId:'event:eclipse-gate-2026',boss:false,enemyIds:defeated.map(x=>x.bestiaryId??x.id),exp:battle.exp??0,gold:battle.gold??0,jobExp:battle.jobExp??0,countsForExploration:false});
  auditVictory(battleMeta,battle.exp??0);
  state.adventure.eclipseLevelUps=mergeLatestLevelUps(state.adventure.eclipseLevelUps??[],result.levelUps);
  const randomDrops=awardBattleDrops(state,defeated,Math.random,battleMeta.eventStartedAt);
  const guaranteed=awardEclipseWaveBonus(state,defeated,wave,battleMeta.eventStartedAt);
  state.adventure.eclipseDrops=mergeDropTotals(state.adventure.eclipseDrops??[],[...randomDrops,...guaranteed]);
  const next=getNextEclipseWave(wave),canContinue=next&&getEclipseEventStatus().active;
  state.adventure.message=[`🌌 星蝕の異界門 ${wave}/3戦 勝利！`,...state.adventure.eclipseLevelUps,...formatDropLines(state.adventure.eclipseDrops),wave===3?'🏆 星蝕の支配者・ノクス討伐！ 限定素材を獲得！':canContinue?'⚔️ 次の異界戦へ！':'開催期間が終了しました。獲得済み報酬は保存しました。'].join(String.fromCharCode(10));
  saveNow();battle=null;
  if(canContinue)return startEclipseWave(next);
  battleScreen.classList.remove('active');view='adventure';renderGame();toast(wave===3?'🌌 星蝕の異界門をクリア！': 'イベント終了。獲得した素材を保存しました');return;
 }
 if([TRAINING_FESTIVAL.id,TWIN_STAR_FESTIVAL.id].includes(battleMeta.eventId)){
  const festival=battleMeta.eventId===TWIN_STAR_FESTIVAL.id?TWIN_STAR_FESTIVAL:TRAINING_FESTIVAL;
  const wave=battleMeta.eventWave??1;
  const result=recordAdventureVictory(state,{regionId:festival.id,boss:false,enemyIds:(battleMeta.enemies??[e]).map(x=>x.bestiaryId??x.id),exp:battle.exp??0,gold:battle.gold??0,jobExp:battle.jobExp??0,characterExpMultiplier:festival.characterExpMultiplier,jobExpMultiplier:festival.jobExpMultiplier,countsForExploration:false});
  auditVictory(battleMeta,battle.exp??0);
  state.adventure.trainingFestivalLevelUps=mergeLatestLevelUps(state.adventure.trainingFestivalLevelUps??[],result.levelUps);
  state.adventure.trainingFestivalDrops=mergeDropTotals(state.adventure.trainingFestivalDrops??[],awardBattleDrops(state,battleMeta.enemies??[e]));
  const next=getNextTrainingFestivalWave(wave),canContinue=next&&(festival.id===TWIN_STAR_FESTIVAL.id?isTwinStarFestivalActive():isTrainingFestivalActive());
  state.adventure.message=[`⚔️ ${festival.name} ${wave}/3戦 勝利！ ${festival.characterExpMultiplier===2?'キャラ経験値2倍 ＆ ':''}ジョブ経験値2倍！`,...state.adventure.trainingFestivalLevelUps,...formatDropLines(state.adventure.trainingFestivalDrops),wave===3?`🏆 ${festival.name}クリア！`:canContinue?'次の戦いへ！':'開催期間が終了しました。獲得済み報酬は保存しました。'].join('\n');
  saveNow();battle=null;if(canContinue)return startTrainingFestivalWave(next,festival);
  battleScreen.classList.remove('active');view='adventure';renderGame();toast(wave===3?`${festival.name}クリア！`:`${festival.name}の開催期間が終了しました`);return;
 }
 if(battleMeta.eventId==='halloween-2026'){const wave=battleMeta.eventWave??1;const victory=recordAdventureVictory(state,{regionId:'event:halloween-2026',boss:false,enemyIds:(battleMeta.enemies??[e]).map(x=>x.bestiaryId??x.id),exp:battle.exp??0,gold:battle.gold??0,jobExp:battle.jobExp??0,characterExpMultiplier:halloweenCharacterExpMultiplier(wave),jobExpMultiplier:1,countsForExploration:false});auditVictory(battleMeta,battle.exp??0);state.adventure.halloweenLevelUps??=[];state.adventure.halloweenLevelUps=mergeLatestLevelUps(state.adventure.halloweenLevelUps,victory.levelUps);const drops=awardBattleDrops(state,battleMeta.enemies??[e]);state.adventure.halloweenDrops=mergeDropTotals(state.adventure.halloweenDrops,drops);const dropLines=formatDropLines(state.adventure.halloweenDrops);state.adventure.message=[`🎃 幻月祭 ${wave}/3戦 勝利！`,...state.adventure.halloweenLevelUps,...dropLines,wave===3?'👑 幻月のパンプキンキングを撃破！':'⚔️ 次の戦いへ！'].join('\n');saveNow();battle=null;const next=getNextHalloweenWave(wave);if(next){toast(`🎃 ${wave}/3戦突破！ 次の戦闘へ`);return startHalloweenWave(next);}battleScreen.classList.remove('active');view='adventure';renderGame();toast('🎃 イベントクエストクリア！ また挑戦できます');return;}
 if(battleMeta.eidel||battleMeta.oathbreaker||battleMeta.legendTrial||battleMeta.endgameBoss||battleMeta.specialJob)awardSpecialBattleExperience();
 if(battleMeta.eidel){const ending=settleEidelVictory(state,battle);state.gold+=applyBoostedBattleGold(state,e.gold??0);state.ui??={};state.ui.eidelEndingView=ending;saveNow();battle=null;battleScreen.classList.remove('active');view='eidelEnding';renderGame();toast(ending==='saved'?'エイデルの約束を取り戻した！ 完全クリア！':'エイデルを撃破した！');return;}
 if(battleMeta.oathbreaker){const reward=settleOathbreakerVictory(state,battleMeta.oathbreaker);state.gold+=applyBoostedBattleGold(state,e.gold??0);saveNow();battle=null;battleScreen.classList.remove('active');view='endgame';renderGame();openEndgameReplayPrompt('oathbreaker',battleMeta.oathbreaker,e.name,reward.fragmentGranted?'約束のクロニクルのかけらを入手！':reward.keyGranted?'「最初の約束」を入手！':'背約者を撃破！');toast(reward.fragmentGranted?'約束のクロニクルのかけらを入手！':reward.keyGranted?'「最初の約束」を入手！':'背約者を撃破！');return;}
 if(battleMeta.legendTrial){completeLegendaryTrial(state,battleMeta.legendTrial);state.gold+=applyBoostedBattleGold(state,e.gold??0);saveNow();battle=null;battleScreen.classList.remove('active');view='endgame';renderGame();toast('伝説装備試練を突破！');return;}
 if(battleMeta.endgameBoss){handleBossVictory(state,battleMeta.endgameBoss);state.gold+=applyBoostedBattleGold(state,e.gold??0);saveNow();battle=null;battleScreen.classList.remove('active');view=battleMeta.endgameBoss==='trueFinal'?'ending':'endgame';renderGame();toast(battleMeta.endgameBoss==='trueFinal'?'真ラスボス撃破！':'伝説の鍛冶師を超えた！');return;}
 if(battleMeta.specialJob){completeSpecialTrial(state,battleMeta.specialJob);state.gold+=applyBoostedBattleGold(state,e.gold??0);saveNow();battle=null;battleScreen.classList.remove('active');view='jobs';renderGame();toast(`試練突破！ ${JOBS[battleMeta.specialJob]?.name}の担当NPCへ報告しよう`);return;}
 if(battleMeta.rareEncounter){const reward=getRareBattleRewards(battle);recordAdventureVictory(state,{regionId:battleMeta.regionId,boss:false,enemyIds:reward.enemyIds,exp:reward.exp/2,gold:0,jobExp:reward.jobExp,characterExpMultiplier:2,jobExpMultiplier:2,countsForExploration:false});auditVictory(battleMeta,battle.exp??0);const rareBooks=awardBattleDrops(state,(battle.actors??[]).filter(x=>x.side==='enemy'&&x.hp<=0&&!x.escaped));state.adventure.message=reward.defeatedCount?`✨ 希少モンスター戦終了！\n撃破：${reward.defeatedCount}体 / 逃走：${reward.escapedCount}体\nキャラクター経験値2倍！\nジョブ経験値2倍！${rareBooks.length?'\n'+formatDropLines(rareBooks).join('\n'):''}`:`💨 希少モンスターは逃げ去った……\n経験値は獲得できなかった。`;saveNow();battle=null;battleScreen.classList.remove('active');view=battleMeta.exploration?'exploreResult':'adventure';renderGame();toast(reward.defeatedCount?`希少モンスター撃破！ 経験値2倍！`:'希少モンスターに逃げられた！');return;}
 if(battleMeta.trainingArea&&e.materialDrop){state.materials??={};addMaterial(state,e.materialDrop,1);}
 if(battleMeta.rematch){recordAdventureVictory(state,{regionId:battleMeta.regionId,enemyIds:(battleMeta.enemies??[e]).map(x=>x.bestiaryId??x.id),exp:0,jobExp:0,gold:battle.gold??0,countsForExploration:false});const drops=awardBattleDrops(state,battleMeta.enemies??[e],Math.random,Date.now(),{allowBoostScrollDrops:false});state.adventure.message=['図鑑再戦勝利！ Gとドロップを獲得した。',...formatDropLines(drops)].join('\n');for(const defeated of (battleMeta.enemies??[e]))updateQuestProgress(state,{type:'defeat',id:defeated.bestiaryId??defeated.id,amount:1,source:'bestiaryRematch'});}
 if(!battleMeta.rematch){recordAdventureVictory(state,{regionId:battleMeta.trainingArea?`training:${battleMeta.trainingArea}`:battleMeta.regionId,boss:battleMeta.boss,enemyIds:(battleMeta.enemies??[e]).map(x=>x.bestiaryId??x.id),exp:battle.exp??0,gold:battle.gold??0,jobExp:battle.jobExp??0,countsForExploration:!battleMeta.guildQuestId});auditVictory(battleMeta,battle.exp??0);
const proof=battleMeta.collectionProof;
const ticketDrop=proof?collectionDropPreview(battleMeta,(battle.actors??[]),proof.startedAt,Date.now()):null;
const drops=awardBattleDrops(state,battleMeta.enemies??[e]);
const dropLines=formatDropLines(drops);
if(ticketDrop?.count)dropLines.push(`🏆 討伐の証 ×${ticketDrop.count}（サーバーで確認後、ランキングに反映）`);const msg=state.adventure.message?.split('\n')??[];state.adventure.message=[msg[0],...dropLines,...msg.slice(1)].filter(Boolean).join('\n');for(const defeated of (battleMeta.enemies??[e]))updateQuestProgress(state,{type:'defeat',id:defeated.bestiaryId??defeated.id,amount:1});if(battleMeta.guildQuestId){const q=QUESTS[battleMeta.guildQuestId],rec=state.quests?.[battleMeta.guildQuestId];state.adventure.message=[`🎯 ${q?.name??'ギルド依頼'}：${e.name}を討伐！`,...dropLines,rec?.status==='ready'?'✅ 目標達成！ 街のギルドマスターに報告しよう。':`依頼進捗 ${rec?.progress??0}/${q?.goal?.amount??1}。ギルドマスターから続けて挑戦できます。`].join('\n');}if(battleMeta.boss){const idx=getUnlockedRegions(state).findIndex(x=>x.id===battleMeta.regionId);if(battleMeta.regionId==='field')recordSpecialProgress(state,'emblem');const specialKey=grantSpecialBossKeyItem(state,battleMeta.regionId);if(specialKey)state.adventure.message+=`\n🎁 ${getItemDef(specialKey.id).name} ×1 を手に入れた！`;recordSpecialProgress(state,'treasure');if(['volcano','ruins','abyss'].includes(battleMeta.regionId))recordSpecialProgress(state,'strongEnemy');}if(getActiveParty(state).some(c=>c.hp>0&&c.hp<=c.maxHp*.25))recordSpecialProgress(state,'lowHpWin');}
 recordAchievementEvent(state,{type:'firstWin'});saveNow();battle=null;battleScreen.classList.remove('active');if(battleMeta.boss&&battleMeta.regionId==='abyss'){view=state.cycle>=2?'endgame':'ending';}else if(battleMeta.trainingArea)view='endgame';else if(battleMeta.guildQuestId)view='town';else view=battleMeta.exploration?'exploreResult':'adventure';renderGame();if(battleMeta.trainingArea){const area=TRAINING_AREAS.find(x=>x.id===battleMeta.trainingArea);openEndgameReplayPrompt('training',battleMeta.trainingArea,area?.name??'修練',state.adventure.message);}else if(battleMeta.guildQuestId)openModal(`<h2>🎯 ギルド指定討伐・勝利！</h2><p class="notice endgame-replay-message">${esc(state.adventure.message)}</p><div class="endgame-replay-actions"><button class="action-main" data-npc="guildMaster">ギルドマスターに報告・続けて挑戦</button><button data-close-modal>街に戻る</button></div>`);if(!battleMeta.exploration)toast(`勝利！ ${battleMeta.enemies?.length??1}体撃破`);}
function finishBattleDefeat(){if(battle?.arenaQuestId)return finishArenaBattle();clearNormalAuto();syncBattlePartyToState(state,battle);if(mashoRun){state.mashoCave.lastRunSummary=mashoRunSummary(mashoRun,'defeat');setMashoResultVisibility(state,false);mashoRun=null;}const {loss}=handlePartyWipe(state);battle=null;view='town';saveNow();renderGame();toast(`全滅… ${loss}Gを失い宿屋へ戻った`);}
function act(action){if(!battle||battle.phase==='complete')return;
 const result=resolveAction(battle,action,battle.arenaQuestId?arenaSession?.rng:Math.random);
 if(result?.ok===false){toast(result.message);return;}
 if(battle.arenaQuestId&&battle.phase==='complete'){
  // Only FINAL committed planning actions, so undo never produces fake actions.
  for(const actorId of battle.planningIds){
   const planned=battle.plannedActions[actorId]??{type:'wait'};
   arenaSession.actions.push({actorId,type:planned.type,
    ...(planned.skill?.id?{skillId:planned.skill.id}:{}),
    ...(planned.targetId?{targetId:planned.targetId}:{})});
  }
  try{
   const checkpoint=loadArenaActive(session.storage,arenaSession.ownerId,currentSlot);
   if(checkpoint?.matchId===arenaSession.matchId)
    saveArenaActive(session.storage,arenaSession.ownerId,currentSlot,{...checkpoint,actions:structuredClone(arenaSession.actions)});
  }catch(err){toast('闘技大会の途中保存に失敗しました：'+(err?.message??'保存エラー'));}
 }
 if(!battle.arenaQuestId)syncBattlePartyToState(state,battle);
 renderBattle();
}
async function arenaOwnerId(){
 const auth=await ensureYakusokuSession(session.storage);
 if(!auth?.user?.id)throw new Error('闘技大会はログインが必要です');
 return auth.user.id;
}
async function settleSavedArenaOperation(entry,ownerId,slot,targetState){
 // The transaction ID and the authenticated user always come from the journal
 // and active Supabase session. Never credit coins locally.
 let receipt=null;
 if(entry.kind==='claim')receipt=await arenaApi.claim(slot,entry.matchId,entry.actions);
 else if(entry.kind==='craft')await arenaApi.craft(slot,entry.itemId,entry.requestId);
 else if(entry.kind==='enhance')await arenaApi.enhance(slot,String(entry.itemId).replace(/^arena-/,''),entry.requestId);
 else throw new Error('未完了の闘技大会処理が不正です');
 const profile=await arenaApi.profile(slot);
 if(state!==targetState||currentSlot!==slot)return false;
 applyAuthoritativeArenaProfile(state,profile);
 if(receipt)recordArenaServerReceipt(state,receipt);
 saveNow(); // A crash before journal removal may retry, but server receipts are idempotent.
 clearArenaPending(session.storage,ownerId,slot,entry);
 if(entry.kind==='claim')clearArenaActive(session.storage,ownerId,slot,entry.matchId);
 return true;
}
async function recoverArenaPending(){
 if(battle||arenaOperationBusy||arenaClaimBusy)return;
 const targetState=state,slot=currentSlot;arenaOperationBusy=true;
 try{
  const owner=await arenaOwnerId(),entry=loadArenaPending(session.storage,owner,slot);
  if(!entry){
   const saved=loadArenaActive(session.storage,owner,slot);
   if(saved&&!title.classList.contains('active'))
    openModal('<h2>🏟️ 闘技大会を再開</h2><p>前回の挑戦が残っています。最後に確定したターンから再開できます。</p><button class="action-main" data-arena-resume>闘技大会を再開する</button>');
   return;
  }
  const applied=await settleSavedArenaOperation(entry,owner,slot,targetState);
  if(!applied)return;
  if(!title.classList.contains('active'))renderGameKeepVertical();
  toast('前回の闘技大会処理を安全に復旧しました');
 }catch(err){toast('闘技大会の復旧待ち：'+(err?.message??'通信エラー'));}
 finally{arenaOperationBusy=false;}
}
async function finishArenaBattle(){
 if(!arenaSession||!battle||arenaSession.battle!==battle||arenaClaimBusy||arenaSession.claimError)return;
 const active=arenaSession,targetState=state,slot=currentSlot;arenaClaimBusy=true;
 try{
  const owner=await arenaOwnerId();
  const prior=loadArenaPending(session.storage,owner,slot);
  const entry=prior??{kind:'claim',matchId:active.matchId,questId:active.questId,
   actions:structuredClone(active.actions),createdAt:Date.now()};
  if(entry.kind!=='claim'||entry.matchId!==active.matchId)
   throw new Error('別の闘技大会報酬が未処理です');
  saveArenaPending(session.storage,owner,slot,entry);
  const settled=await settleSavedArenaOperation(entry,owner,slot,targetState);
  if(!settled||active!==arenaSession)return;
  const result=normalizeArenaProgress(state).lastResult;
  clearNormalAuto();syncPlayTime();arenaSession=null;battle=null;battleMeta=null;view='arena';
  renderGame();
  toast(result?.victory?'闘技大会 '+result.grade+'評価！ コイン＋'+result.coins+'枚':'闘技大会終了。コイン獲得なし');
 }catch(err){
  if(active===arenaSession){
   active.claimError=true;
   openModal('<h2>🏟️ サーバー検証待ち</h2><p>結果は未確定です。再試行では同じ対戦IDを使用し、報酬の二重配布を防ぎます。</p><button class="action-main" data-arena-retry>サーバー検証を再試行</button>');
   toast(err.message??'戦闘結果の通信に失敗しました');
  }
 }finally{arenaClaimBusy=false;}
}
async function openArena(){
 if(battle||arenaOperationBusy||arenaClaimBusy)return;
 const targetState=state,slot=currentSlot;arenaOperationBusy=true;
 try{
  const owner=await arenaOwnerId();
  const pending=loadArenaPending(session.storage,owner,slot);
  const savedBattle=loadArenaActive(session.storage,owner,slot);
  if(savedBattle&&!pending){
   openModal('<h2>🏟️ 未完了の闘技大会</h2><p>前回の挑戦を最後に確定したターンから再開できます。</p><button class="action-main" data-arena-resume>前回の挑戦を再開</button>');
   return;
  }
  if(pending){
   if(!await settleSavedArenaOperation(pending,owner,slot,targetState))return;
  }else{
   const profile=await arenaApi.profile(slot);
   if(targetState!==state||slot!==currentSlot)return;
   applyAuthoritativeArenaProfile(state,profile);
   saveNow();
  }
  if(targetState!==state||slot!==currentSlot)return;
  view='arena';closeModal();renderGame();
  if(pending)toast('未完了の闘技大会処理を復旧しました');
 }catch(err){toast(err.message??'闘技大会サーバーに接続できません');}
 finally{arenaOperationBusy=false;}
}
async function resumeArenaMatch(){
 if(battle||arenaOperationBusy||arenaClaimBusy)return;
 const targetState=state,slot=currentSlot;arenaOperationBusy=true;
 try{
  const owner=await arenaOwnerId();
  if(loadArenaPending(session.storage,owner,slot))
   throw new Error('先に未確定の報酬を受け取ってください');
  const checkpoint=loadArenaActive(session.storage,owner,slot);
  if(!checkpoint)throw new Error('再開できる闘技大会はありません');
  const status=await arenaApi.resume(slot,checkpoint.matchId);
  if(targetState!==state||currentSlot!==slot)return;
  if(status.questId!==checkpoint.questId||Number(status.seed)!==checkpoint.seed)
   throw new Error('サーバーの対戦情報が保存データと一致しません');
  if(status.status==='settled'){
   const profile=await arenaApi.profile(slot);
   if(targetState!==state||currentSlot!==slot)return;
   applyAuthoritativeArenaProfile(state,profile);
   saveNow();clearArenaActive(session.storage,owner,slot,checkpoint.matchId);
   view='arena';closeModal();renderGame();
   return toast('この対戦はサーバーで精算済みです');
  }
  if(status.status!=='issued'||Date.parse(status.expiresAt)<=Date.now()){
   clearArenaActive(session.storage,owner,slot,checkpoint.matchId);
   return toast('闘技大会の有効期限が過ぎています。もう一度挑戦してください');
  }
  const restored=replayArenaCheckpoint(checkpoint);
  restored.ownerId=owner;
  arenaSession=restored;battle=restored.battle;battleMeta={arena:true,arenaQuestId:checkpoint.questId};
  closeModal();renderBattle();toast('最後の確定ターンから闘技大会を再開しました');
 }catch(err){toast(err?.message??'闘技大会を再開できません');}
 finally{arenaOperationBusy=false;}
}
async function startArenaMatch(questId){
 if(battle||arenaOperationBusy||raidRoom)return;
 const targetState=state,slot=currentSlot;arenaOperationBusy=true;
 try{
  const owner=await arenaOwnerId();
  if(loadArenaPending(session.storage,owner,slot)||loadArenaActive(session.storage,owner,slot))
   throw new Error('前回の闘技大会が未完了です。先に再開してください');
  const match=await arenaApi.start(slot,questId);
  if(targetState!==state||slot!==currentSlot)return;
  const active=createArenaSession(questId);
  active.matchId=match.matchId;active.actions=[];active.rng=arenaSeededRandom(match.seed);active.ownerId=owner;
  saveArenaActive(session.storage,owner,slot,{matchId:match.matchId,questId,seed:Number(match.seed),actions:[],createdAt:Date.now()});
  arenaSession=active;battle=active.battle;battleMeta={arena:true,arenaQuestId:questId};
  startTurn(battle,active.rng);closeModal();renderBattle();
 }catch(err){arenaSession=null;toast(err.message??'闘技大会を開始できません');}
 finally{arenaOperationBusy=false;}
}
async function arenaMutation(kind,id){
 if(battle||arenaOperationBusy||arenaClaimBusy)return;
 const targetState=state,slot=currentSlot;arenaOperationBusy=true;
 try{
  const owner=await arenaOwnerId();
  const old=loadArenaPending(session.storage,owner,slot);
  const entry=old??{kind,itemId:id,requestId:crypto.randomUUID(),createdAt:Date.now()};
  if(entry.kind!==kind||entry.itemId!==id)
   throw new Error('前回の処理が未完了です。闘技大会を開き直してください');
  saveArenaPending(session.storage,owner,slot,entry);
  if(!await settleSavedArenaOperation(entry,owner,slot,targetState))return;
  renderGameKeepVertical();
  toast(kind==='craft'?'闘技コインで装備を生産しました！':'闘技コインで装備を強化しました！');
 }catch(err){toast((err.message??'通信に失敗しました')+'。取引IDは保持されます');}
 finally{arenaOperationBusy=false;}
}
function openEndgameReplayPrompt(kind,id,name,message){const action=kind==='training'?`data-training-area="${esc(id)}"`:`data-oathbreaker="${esc(id)}"`;openModal(`<h2>⚔️ ${esc(name)}・勝利！</h2><p class="notice endgame-replay-message">${esc(message)}</p><div class="endgame-replay-actions"><button class="action-main" ${action}>⚔️ 同じ敵ともう一度戦う</button><button data-close-modal>星の彼方の試練へ戻る</button></div>`);}
function openEnemyTargets(mode,skill=null){const enemies=battle.actors.filter(x=>x.side==='enemy'&&x.hp>0);openModal(`<h2>🎯 攻撃する敵</h2><div class="choice-list">${enemies.map(x=>`<button data-enemy-target="${x.id}" data-target-mode="${mode}" ${skill?`data-target-skill="${skill.id}"`:''}><span><b>${esc(x.name)}</b><small>HP ${x.hp} / ${x.maxHp}</small></span><em>攻撃</em></button>`).join('')}</div>`);}
function openSkills(){const actor=getPendingActor(battle);const c=battle?.arenaQuestId?arenaSession?.roster.find(x=>x.id===actor?.id):state.characters.find(x=>x.id===actor?.id);const skills=battle?.arenaQuestId?arenaSessionSkills(arenaSession,actor?.id):getBattleSkills(c);openModal(`<h2>✨ 特技・魔法</h2><p class="modal-sub">${esc(c?.name)} / MP ${actor?.mp??0}</p><div class="choice-list">${skills.map(s=>`<button data-use-skill="${s.id}" ${s.mp>(actor?.mp??0)?'disabled':''}><span><b>${esc(s.name)}</b><small class="skill-description">${esc(s.description)}</small></span><em>MP ${s.mp}</em></button>`).join('')||'<p>セット済みの技がありません。戦闘後に特技・魔法リストからセットしてください。</p>'}</div>`);}
function executeSkill(skill,targetId){if(!skill)return;closeModal();act({type:'skill',skill,targetId});}
function useSkill(skillId){const actor=getPendingActor(battle),c=battle?.arenaQuestId?arenaSession?.roster.find(x=>x.id===actor?.id):state.characters.find(x=>x.id===actor?.id),skill=(battle?.arenaQuestId?arenaSessionSkills(arenaSession,actor?.id):getBattleSkills(c)).find(x=>x.id===skillId);if(!skill)return;if(skill.type==='heal'&&skill.target==='all')return executeSkill(skill,actor.id);if(skill.type==='heal'){const allies=battle.actors.filter(x=>x.side==='ally'&&x.hp>0);openModal(`<h2>💚 回復する仲間</h2><p class="modal-sub">${esc(skill.name)} / MP ${skill.mp}</p><div class="choice-list">${allies.map(x=>`<button data-skill-target="${x.id}" data-skill-id="${skill.id}"><span><b>${esc(x.name)}</b><small>HP ${x.hp} / ${x.maxHp}</small></span><em>選択</em></button>`).join('')}</div>`);return;}if(skill.type==='buff')return executeSkill(skill,actor.id);if(skill.type==='revive'){const allies=battle.actors.filter(x=>x.side==='ally'&&x.hp<=0);if(!allies.length)return toast('戦闘不能の仲間がいません');openModal(`<h2>✨ 蘇生する仲間</h2><div class="choice-list">${allies.map(x=>`<button data-skill-target="${x.id}" data-skill-id="${skill.id}"><span><b>${esc(x.name)}</b></span><em>選択</em></button>`).join('')}</div>`);return;}const enemies=battle.actors.filter(x=>x.side==='enemy'&&x.hp>0);if(enemies.length===1)return executeSkill(skill,enemies[0].id);openEnemyTargets('skill',skill);}
function useSkillTarget(skillId,targetId){const actor=getPendingActor(battle),c=battle?.arenaQuestId?arenaSession?.roster.find(x=>x.id===actor?.id):state.characters.find(x=>x.id===actor?.id),skill=(battle?.arenaQuestId?arenaSessionSkills(arenaSession,actor?.id):getBattleSkills(c)).find(x=>x.id===skillId);executeSkill(skill,targetId);}
function openItems(){if(battle?.arenaQuestId)return toast('闘技大会では持ち込みアイテムを使用できません');const usable=getUsableInventory(state),chronicle=state.inventory?.find(x=>x.id==='promiseChronicle'&&(x.qty??0)>0);openModal(`<h2>🧪 どうぐ</h2><div class="choice-list">${usable.map(x=>`<button data-battle-item="${x.id}"><span><b>${x.icon} ${esc(x.name)}</b><small>${esc(x.description)}</small></span><em>×${x.qty}</em></button>`).join('')}${chronicle?`<button data-battle-chronicle><span><b>📖 約束のクロニクル</b><small>エイデルHP50%以下で使用可能</small></span><em>×${chronicle.qty}</em></button>`:''}</div>`);modal.querySelector('[data-battle-chronicle]')?.addEventListener('click',()=>{const r=usePromiseChronicle(state,battle);if(!r.used)return toast(r.reason);closeModal();renderBattle();});}
function openBattleItemTargets(itemId){const def=getItemDef(itemId);const targets=battle.actors.filter(x=>x.side==='ally'&&canUseItemOn(def,x));if(!targets.length)return toast(def.canTargetKo?'戦闘不能の仲間がいません':'使用できる仲間がいません');openModal(`<h2>${def.icon} ${esc(def.name)}</h2><div class="choice-list">${targets.map(x=>`<button data-battle-item-target="${x.id}" data-battle-item-id="${itemId}"><span><b>${esc(x.name)}</b><small>HP ${x.hp}/${x.maxHp}・MP ${x.mp}/${x.maxMp}</small></span><em>使う</em></button>`).join('')}</div>`);}
function useBattleItemTarget(itemId,targetId){closeModal();act({type:'item',itemId,targetId});}
function canUseFieldOn(def,c){return canUseItemOn(def,c,getCharacterResourceCaps(state,c));}
function openBoostScrollConfirm(itemId){syncPlayTime();const def=getItemDef(itemId);if(!def.boostKind)return;if(isBoostScrollActive(state,def.boostKind))return toast('同じ種類の書の効果がまだ継続中です');openModal(`<h2>${def.icon} ${esc(def.name)}</h2><p>使用すると1時間・2時間・3時間のいずれかがランダムで選ばれます。</p><p class="notice">効果時間はプレイ中のみ減少します。ゲームを閉じる・別アプリに切り替える・タイトル画面・街で5分以上操作がない場合は停止します。旅ボーナスや同じ種類の2倍効果とは重複しません。</p><div class="shop-purchase-actions"><button class="action-main" data-confirm-boost-scroll="${esc(itemId)}">使用する</button><button data-close-modal>やめる</button></div>`);}
function openFieldItemTargets(itemId){const stack=state.inventory?.find(x=>x.id===itemId),def=getItemDef(itemId);if(!stack?.qty)return toast('アイテムがありません');openModal(`<h2>${def.icon} ${esc(def.name)}</h2><p class="modal-sub">誰に使いますか？ ${esc(def.description)}</p><div class="choice-list">${state.characters.map(c=>`<button data-field-item-target="${c.id}" data-field-item-id="${itemId}" ${canUseFieldOn(def,c)?'':'disabled'}><span><b>${esc(c.name)}</b><small>HP ${c.hp}/${getCharacterResourceCaps(state,c).maxHP}・MP ${c.mp}/${getCharacterResourceCaps(state,c).maxMP}</small></span><em>使う</em></button>`).join('')}</div>`);}
function useFieldItemTarget(itemId,characterId){try{const r=useFieldItem(state,itemId,characterId);saveNow();closeModal();renderGame();const parts=[];if(r.healed)parts.push(`HP ${r.healed}回復`);if(r.mpRestored)parts.push(`MP ${r.mpRestored}回復`);if(r.item.canTargetKo)parts.push('復活');if(r.item.cure?.length)parts.push('状態異常回復');toast(`${r.character.name}に${r.item.name}！ ${parts.join('・')}`);}catch(err){toast(err.message);}}
function syncShopCategory(category){const panel=modal.querySelector('.shop-home');if(!panel)return;const buttons=[...panel.querySelectorAll('[data-shop-category]')],enabled=buttons.filter(btn=>!btn.disabled);const next=(enabled.find(btn=>btn.dataset.shopCategory===category)??enabled[0])?.dataset.shopCategory??'item';buttons.forEach(btn=>{const active=btn.dataset.shopCategory===next;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});const rows=[...panel.querySelectorAll('[data-shop-category-value]')];let visibleCount=0;rows.forEach(row=>{const visible=row.dataset.shopCategoryValue===next;row.hidden=!visible;if(visible)visibleCount++;});const label=buttons.find(btn=>btn.dataset.shopCategory===next)?.dataset.shopCategoryLabel??'商品';const summary=panel.querySelector('[data-shop-category-summary]');if(summary)summary.innerHTML=`<b>${esc(label)}</b><span>${visibleCount}件を表示中</span>`;}
function openBank(){const cash=Math.max(0,Math.floor(Number(state.gold)||0)),bank=bankBalance(state);openModal(`<section class="bank-window" data-no-pixel-icon><h2>🏦 旅人の銀行</h2><p class="notice">預けたゴールドは全滅時の所持金減少（10%）から守られます。手数料なし・利息なし。預金はこのセーブスロットに保存されます。</p><div class="bank-balances"><div><small>手持ち</small><strong>${cash.toLocaleString('ja-JP')}G</strong></div><div><small>預金残高</small><strong>${bank.toLocaleString('ja-JP')}G</strong></div></div><label class="bank-label">金額（G）<input type="number" min="1" step="1" inputmode="numeric" placeholder="例：10000" data-bank-amount></label><div class="bank-quick-picks"><button data-bank-quick="1000">1,000G</button><button data-bank-quick="10000">10,000G</button><button data-bank-quick="cash">手持ち全額</button><button data-bank-quick="bank">預金全額</button></div><div class="bank-actions"><button class="action-main" data-bank-action="deposit">預ける</button><button data-bank-action="withdraw">引き出す</button></div><button data-close-modal>街へ戻る</button></section>`);}
function openShop(){const starter=getShopInventory(state,'starter').map(x=>({...x,shopId:'starter'}));const endgameShop=state.story?.trueEndingSeen?getShopInventory(state,'endgame').map(x=>({...x,shopId:'endgame'})):[];const items=[...starter,...endgameShop].map(x=>({...x,name:x.kind==='equipment'?(EQUIPMENT[x.equipmentId]?.name??x.equipmentId):getItemDef(x.id).name}));openModal(shopMarkup(state,{name:'🛒 ショップ',stock:items}));syncShopCategory(modal.querySelector('.shop-home')?.dataset.shopDefaultCategory??'item');}
function openShopBuyConfirm(shopId,itemId){
 const item=getShopInventory(state,shopId).find(x=>x.id===itemId);
 if(!item)return toast('商品が見つかりません');
 const affordable=item.price>0?Math.floor((state.gold??0)/item.price):999;
 const available=Math.max(0,Math.min(999,Number.isFinite(item.stock)?item.stock:999,affordable));
 const name=item.kind==='equipment'?(EQUIPMENT[item.equipmentId]?.name??item.equipmentId):getItemDef(item.id).name;
 if(item.kind==='equipment'){
  openModal(`<h2>🛒 装備購入の確認</h2><p><b>${esc(name)}</b></p><p class="modal-sub">装備品は1回に1個のみ購入できます。</p><p class="shop-total">合計：${Number(item.price).toLocaleString('ja-JP')}G</p><p class="modal-sub">所持金：${Number(state.gold??0).toLocaleString('ja-JP')}G</p><div class="shop-purchase-actions"><button class="action-main" data-shop-buy-confirm="${esc(itemId)}" data-shop-buy-shop="${esc(shopId)}" data-shop-buy-single ${available?'':'disabled'}>1個購入する</button><button data-close-modal>戻る</button></div>${!available?'<p class="notice">ゴールドまたは在庫が足りません。</p>':''}`);
  return;
 }
 openModal(`<h2>🛒 購入個数を選択</h2><p><b>${esc(name)}</b></p><p class="modal-sub">1個 ${Number(item.price).toLocaleString('ja-JP')}G / 1回の上限999個</p><section class="shop-buy-qty"><label for="shop-buy-qty-input">個数（最大${available}個）</label><input id="shop-buy-qty-input" data-shop-buy-qty-input type="number" min="1" max="${Math.max(1,available)}" step="1" value="1" ${available?'':'disabled'}><div class="shop-qty-picks"><button data-shop-qty-pick="1">1個</button><button data-shop-qty-pick="10">10個</button><button data-shop-qty-pick="100">100個</button><button data-shop-qty-pick="max">MAX</button></div></section><p class="shop-total" data-shop-buy-total>合計：${Number(item.price).toLocaleString('ja-JP')}G</p><p class="modal-sub">所持金：${Number(state.gold??0).toLocaleString('ja-JP')}G</p><div class="shop-purchase-actions"><button class="action-main" data-shop-buy-confirm="${esc(itemId)}" data-shop-buy-shop="${esc(shopId)}" data-shop-buy-price="${item.price}" ${available?'':'disabled'}>購入する</button><button data-close-modal>戻る</button></div>${!available?'<p class="notice">ゴールドまたは在庫が足りません。</p>':''}`);
}
function shopBuyQuantityUpdate(value){
 const input=modal.querySelector('[data-shop-buy-qty-input]');if(!input)return;
 const max=Math.min(999,Math.max(1,Number(input.max)||1));
 const quantity=Math.max(1,Math.min(max,Math.floor(Number(value)||1)));
 input.value=String(quantity);
 const unit=Number(modal.querySelector('[data-shop-buy-price]')?.dataset.shopBuyPrice??0);
 const total=modal.querySelector('[data-shop-buy-total]');
 if(total)total.textContent=`合計：${(quantity*unit).toLocaleString('ja-JP')}G`;
}
function openEquipmentSellConfirm(instanceId){
 const instance=(state.equipmentInventory??[]).find(item=>item.instanceId===instanceId);
 if(!instance)return toast('装備が見つかりません');
 if(instance.locked===true)return toast('ロック中の装備は売却できません');
 if((state.characters??[]).some(c=>Object.values(c.equipment??{}).some(ref=>(typeof ref==='object'?ref?.instanceId:ref)===instanceId)))return toast('装備中のアイテムは売却できません');
 const def=getSellDefinition('equipment',instance.equipmentId),price=getSellPrice(def);
 if(price<=0)return toast('この装備は売却できません');
 const stats=getEnhancedStats(instance),statNames=[['attack','攻撃'],['defense','防御'],['magic','魔法'],['speed','素早さ'],['maxHp','HP'],['maxMp','MP']];
 const statText=statNames.filter(([key])=>Number(stats[key]??0)!==0).map(([key,label])=>`${label} +${stats[key]}`).join(' / ');
 const warning=getSellWarning(def);
 openModal(`<h2>💰 この装備1個を売却しますか？</h2><p><b>${esc(def.name)} +${Number(instance.enhanceLevel??0)}</b></p><p class="notice">${esc(statText||'能力補正なし')}</p>${warning?`<p class="notice warning">${esc(warning)}</p>`:''}<p class="notice">売却すると元に戻せません。同名の別装備やロック中の装備は売却しません。</p><p class="shop-total">売却価格：${price.toLocaleString('ja-JP')}G</p><div class="shop-purchase-actions"><button class="action-main" data-equip-sell-confirm="${esc(instanceId)}">この1個を売却する</button><button data-close-modal>やめる</button></div>`);
}
function openSellShop(){openModal(sellShopMarkup(state));}
function openSellConfirm(kind,id,quantity=1){
 const def=getSellDefinition(kind,id),warning=getSellWarning(def),available=getSellableQuantity(state,kind,id);
 if(available<1)return toast('売却できる品がありません');
 const qty=Math.max(1,Math.min(Number(quantity)||1,available));
 openModal(`<h2>💰 売却確認</h2>${warning?`<p class="notice warning">${warning}</p>`:''}<p><b>${esc(def.name)}</b></p><div class="sell-qty-controls"><button data-sell-adjust="-10" data-sell-ref="${kind}:${id}" data-sell-current="${qty}">-10</button><button data-sell-adjust="-1" data-sell-ref="${kind}:${id}" data-sell-current="${qty}">-1</button><b>${qty}個</b><button data-sell-adjust="1" data-sell-ref="${kind}:${id}" data-sell-current="${qty}">+1</button><button data-sell-adjust="10" data-sell-ref="${kind}:${id}" data-sell-current="${qty}">+10</button><button data-sell-adjust="max" data-sell-ref="${kind}:${id}" data-sell-current="${qty}">MAX</button></div><p>売却後所持数：${available-qty}</p><button class="action-main" data-confirm-sell="${kind}:${id}" data-sell-qty="${qty}">${qty}個売却する</button><button data-close-modal>キャンセル</button>`);
}
async function refreshMarketView(){
 if(view!=='market')return;
 marketUi.loading=true;marketUi.error='';renderGameKeepVertical();
 try{
  const api=await getMarketApi();await api.ensureSession();
  const profile=await api.profile(currentSlot);marketUi.profileName=profile?.displayName??'';
  if(marketUi.tab==='history'){
   const history=await api.history(currentSlot);marketUi.history={purchases:history?.purchases??[],sales:history?.sales??[]};
  }else if(marketUi.tab==='store'){
   const store=await api.myStore(currentSlot);marketUi.store={profileName:store?.profile??marketUi.profileName,store:store?.store??null,listings:store?.listings??[],sold:store?.sold??[],now:Date.now()};
  }else{
   const items=await api.browse({slot:currentSlot,search:marketUi.browse.search,category:marketUi.browse.category,sort:marketUi.browse.sort,inStockOnly:marketUi.browse.inStockOnly});marketUi.browse.items=items??[];
  }
 }catch(err){marketUi.error=err?.message??'フリーマーケットに接続できません';}
 finally{marketUi.loading=false;if(view==='market')renderGameKeepVertical();}
}
function enterMarket(){unlockMarketIfEligible(state);state.market.everUsed=true;saveNow();view='market';marketUi.error='';renderGame();void refreshMarketView();}
async function marketEnsureDisplayName(){
 const api=await getMarketApi(),profile=await api.profile(currentSlot);
 if(!profile?.displayName)throw new Error('お店の名前を取得できませんでした');
 marketUi.profileName=profile.displayName;state.market.everUsed=true;saveNow();return profile.displayName;
}
async function marketOpenStore(){try{await marketEnsureDisplayName();const api=await getMarketApi();await api.openStore(currentSlot);state.market.everUsed=true;saveNow();marketUi.tab='store';await refreshMarketView();toast('7日間の出店を開始しました！');}catch(err){toast(err.message??'出店できませんでした');}}
function selectedMarketListingOption(){return modal.querySelector('[data-market-listing-item]')?.selectedOptions?.[0]??null;}
function currentMarketListingCategory(){return modal.querySelector('[data-market-listing-category].active')?.dataset.marketListingCategory??modal.querySelector('.market-listing-form')?.dataset.marketDefaultCategory??'all';}
function setMarketListingCategory(category){
 const form=modal.querySelector('.market-listing-form');
 const select=modal.querySelector('[data-market-listing-item]');
 if(!form||!select)return;
 const buttons=[...modal.querySelectorAll('[data-market-listing-category]')];
 const enabledButtons=buttons.filter(btn=>!btn.disabled);
 const next=(enabledButtons.find(btn=>btn.dataset.marketListingCategory===category)??enabledButtons[0])?.dataset.marketListingCategory??'all';
 buttons.forEach(btn=>{const active=btn.dataset.marketListingCategory===next;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
 const options=[...select.options];
 let visibleCount=0;
 for(const option of options){
  const visible=next==='all'||String(option.dataset.category??'')===next;
  option.hidden=!visible;
  option.disabled=!visible;
  if(visible)visibleCount++;
 }
 if(!options.some(option=>option.value===select.value&&!option.disabled)){
  const firstVisible=options.find(option=>!option.disabled);
  if(firstVisible)select.value=firstVisible.value;
 }
 const label=buttons.find(btn=>btn.dataset.marketListingCategory===next)?.dataset.categoryLabel??'商品';
 const summary=modal.querySelector('[data-market-listing-category-summary]');
 if(summary)summary.innerHTML=`<b>${esc(label)}</b><span>${visibleCount}件から選べます</span>`;
 syncMarketListingForm();
 void refreshMarketPriceGuide();
}
function syncMarketListingForm(){
 const select=modal.querySelector('[data-market-listing-item]');
 const qtyInput=modal.querySelector('[data-market-listing-quantity]');
 const hint=modal.querySelector('[data-market-listing-available]');
 const summary=modal.querySelector('[data-market-selected-item]');
 if(!select||!qtyInput)return;
 const option=selectedMarketListingOption();
 const available=Math.max(1,Number(option?.dataset?.available??1));
 const kind=String(option?.dataset?.kind??'item');
 const categoryLabel=String(option?.dataset?.categoryLabel??'商品');
 const isEquipment=kind==='equipment';
 qtyInput.min='1';qtyInput.max=String(available);qtyInput.step='1';qtyInput.disabled=isEquipment;
 const current=Math.max(1,Number(qtyInput.value??1));qtyInput.value=String(Math.min(current,available));
 if(summary){
  const plus=kind==='equipment'&&Number(option?.dataset?.enhanceLevel??0)>0?` ＋${Number(option.dataset.enhanceLevel)}`:'';
  summary.innerHTML=`<div><small>${esc(categoryLabel)}</small><strong>${esc(option?.dataset?.name??'商品')}${plus}</strong></div><span>所持 <b>${available}</b>${isEquipment?'点':'個'}</span>`;
 }
 if(hint)hint.textContent=isEquipment?'装備品は1点ずつ出品します。':`1〜${available}個 の範囲で出品できます。`;
 modal.querySelectorAll('[data-market-qty-adjust]').forEach(btn=>{btn.disabled=isEquipment;});
}
function adjustMarketListingQuantity(mode){
 const input=modal.querySelector('[data-market-listing-quantity]');if(!input||input.disabled)return;
 const max=Math.max(1,Number(input.max??1)),current=Math.max(1,Math.min(max,Number(input.value??1)));
 input.value=String(mode==='max'?max:Math.max(1,Math.min(max,current+Number(mode||0))));
}
async function refreshMarketPriceGuide(){
 const guide=modal.querySelector('[data-market-price-guide]');const option=selectedMarketListingOption();if(!guide||!option)return;
 guide.innerHTML='<b>相場：</b><span>確認中…</span>';
 try{
  const api=await getMarketApi(),kind=String(option.dataset.kind??'item'),itemId=String(option.dataset.itemId??''),category=String(option.dataset.category??'all'),name=String(option.dataset.name??'');
  const rows=await api.browse({slot:currentSlot,search:name,category,sort:'priceAsc',inStockOnly:true});
  const level=Number(option.dataset.enhanceLevel??0);
  const matches=(rows??[]).filter(x=>String(x.itemKind??'')===kind&&String(x.itemId??'')===itemId&&(kind!=='equipment'||Number(x.itemPayload?.instance?.enhanceLevel??0)===level));
  const prices=matches.map(x=>Number(x.unitPrice??0)).filter(x=>Number.isInteger(x)&&x>0).sort((a,b)=>a-b);
  if(!prices.length){guide.innerHTML='<b>相場：</b><span>現在、同じ商品の出品はありません</span>';return;}
  const low=prices[0],high=prices.at(-1),mid=prices.length%2?prices[(prices.length-1)/2]:Math.round((prices[prices.length/2-1]+prices[prices.length/2])/2);
  guide.innerHTML=`<b>相場：</b><span><strong>${low.toLocaleString('ja-JP')}G〜${high.toLocaleString('ja-JP')}G</strong>　中央値 ${mid.toLocaleString('ja-JP')}G（${prices.length}件）</span>`;
 }catch{guide.innerHTML='<b>相場：</b><span>相場を取得できませんでした</span>';}
}
function marketOpenListing(){
 const candidates=listMarketCandidates(state);
 if(!candidates.length)return toast('出品できる商品がありません');
 openModal(marketListingFormMarkup(candidates));
 setMarketListingCategory(modal.querySelector('.market-listing-form')?.dataset.marketDefaultCategory??'all');
}
function marketCandidateFromKey(key,quantity){const [kind,id]=String(key??'').split(':');const candidates=listMarketCandidates(state),base=kind==='equipment'?candidates.find(x=>x.kind==='equipment'&&x.instanceId===id):candidates.find(x=>x.kind===kind&&x.id===id);if(!base)throw new Error('商品が見つかりません');return kind==='equipment'?{kind:'equipment',instanceId:base.instanceId,quantity:1}:{kind,id:base.id,quantity};}
async function marketSubmitListing(){return marketOperationGuard.run(async()=>{
 const key=modal.querySelector('[data-market-listing-item]')?.value,qtyInput=modal.querySelector('[data-market-listing-quantity]'),maxQty=Math.max(1,Number(qtyInput?.max??1)),quantity=Math.max(1,Math.min(maxQty,Number(qtyInput?.value??1))),unitPrice=parseMarketPrice(modal.querySelector('[data-market-listing-price]')?.value);if(qtyInput)qtyInput.value=String(quantity);
 if(!isValidMarketPrice(unitPrice))return toast('価格は1G〜30,000,000Gで指定してください');
 try{
  const candidate=marketCandidateFromKey(key,quantity),payload=serializeMarketItem(state,candidate),api=await getMarketApi();
  const listing=await api.createListing(currentSlot,{category:payload.category,itemKind:payload.kind,itemId:payload.equipmentId??payload.id,itemName:payload.name,itemPayload:payload,unitPrice,quantity:payload.kind==='equipment'?1:quantity});
  try{removeMarketItem(state,candidate);state.market.everUsed=true;saveNow();}
  catch(localErr){try{const ret=await api.cancel(currentSlot,listing.id);applyMarketReturn(state,ret);await api.ackReturn(currentSlot,ret.id??ret.returnId);}catch{}throw localErr;}
  closeModal();marketUi.tab='store';await refreshMarketView();toast('商品を出品しました');
 }catch(err){toast(err.message??'出品できませんでした');}
});}
async function marketUpdatePrice(listingId){return marketOperationGuard.run(async()=>{const input=game.querySelector(`[data-market-price="${CSS.escape(listingId)}"]`),price=parseMarketPrice(input?.value);if(!isValidMarketPrice(price))return toast('価格は1G〜30,000,000Gで指定してください');try{const api=await getMarketApi();await api.updatePrice(currentSlot,listingId,price);await refreshMarketView();toast('価格を変更しました');}catch(err){toast(err.message??'価格を変更できませんでした');}});}
async function marketCancelListing(listingId){return marketOperationGuard.run(async()=>{
 if(!confirm('この出品を取り消しますか？ 売れ残りは手持ちに戻ります。'))return;
 try{const api=await getMarketApi(),ret=await api.cancel(currentSlot,listingId);await persistMarketReturn({state,ret,save:async()=>saveNow()});await api.ackReturn(currentSlot,ret.id??ret.returnId);await refreshMarketView();toast('出品を取り消し、売れ残りを手持ちに戻しました');}catch(err){toast(err.message??'出品を取り消せませんでした');}
});}
async function marketBuy(listingId){return marketOperationGuard.run(async()=>{
 const listing=(marketUi.browse.items??[]).find(x=>x.id===listingId);if(!listing)return toast('商品情報を更新してください');
 try{await marketEnsureDisplayName();const input=game.querySelector(`[data-market-buy-qty="${CSS.escape(listingId)}"]`),quantity=Math.max(1,Number(input?.value??1)),api=await getMarketApi();await purchaseMarketListing({api,state,slot:currentSlot,listing,quantity,save:async()=>saveNow()});renderGameKeepVertical();await refreshMarketView();toast('購入しました！');}catch(err){if(err?.code==='PRICE_CHANGED'||String(err?.message).includes('PRICE_CHANGED'))void refreshMarketView();toast(err.message??'購入できませんでした');}
});}
async function syncMarketSettlement({notify=false}={}){
 const targetState=state,targetSlot=currentSlot;
 if(!targetState.market?.everUsed||marketSyncBusy||marketOperationGuard.busy)return;
 marketSyncBusy=true;
 try{
  const api=await getMarketApi();
  if(state!==targetState||currentSlot!==targetSlot)return;
  const result=await syncPendingMarketTransactions({
   api,state:targetState,slot:targetSlot,
   save:async()=>{if(state!==targetState||currentSlot!==targetSlot)throw new Error('SLOT_CHANGED_RETRY_SETTLEMENT');saveNow();}
  });
  if(state!==targetState||currentSlot!==targetSlot)return;
  const changed=result.purchases.length||result.saleBatch||result.returns.length;
  if(changed&&!title.classList.contains('active'))renderGameKeepVertical();
  if(notify&&(result.saleBatch||result.returns.length||result.purchases.length)){
   const lines=result.saleBatch?formatMarketSaleNotifications(result.saleBatch):[];
   if(result.returns.length)lines.push(`フリーマーケットの出品 ${result.returns.length}件を持ち物に返却しました。`);
   if(result.purchases.length)lines.push(`未受取の商品 ${result.purchases.length}件を受け取りました。`);
   openModal(`<h2>フリーマーケットの受取</h2><p class="modal-sub">売上・購入品・返却品を受け取りました。</p><div class="market-sale-notice">${lines.map(x=>`<p>${esc(x)}</p>`).join('')}</div><button class="action-main" data-close-modal>確認</button>`);
  }
 }catch(err){if(notify&&state===targetState&&currentSlot===targetSlot)toast(err.message??'以前の取引の受取確認に失敗しました');}
 finally{
  marketSyncBusy=false;
  if((state!==targetState||currentSlot!==targetSlot)&&state.market?.everUsed&&!title.classList.contains('active'))queueMicrotask(()=>void syncMarketSettlement({notify:true}));
 }
}
function openRenameCharacter(characterId){const c=state.characters.find(x=>x.id===characterId);if(!c)return;state.selectedCharacterId=c.id;const original=c.defaultName??c.name;openModal(`<h2>✏️ 名前変更</h2><p class="modal-sub">${esc(c.name)}の名前を変更できます。8文字以内で入力してください。</p><label class="name-edit-field"><span>新しい名前</span><input data-name-input type="text" maxlength="8" value="${esc(c.name)}" autocomplete="off" enterkeyhint="done"></label><div class="name-edit-actions"><button data-confirm-rename="${esc(c.id)}" class="action-main">この名前にする</button><button data-reset-name="${esc(c.id)}">初期名「${esc(original)}」に戻す</button></div>`);queueMicrotask(()=>{const input=modal.querySelector('[data-name-input]');input?.focus();input?.select();});}
function confirmRename(characterId){const input=modal.querySelector('[data-name-input]');try{const name=renameCharacter(state,characterId,input?.value);saveNow();closeModal();renderGame();toast(`名前を「${name}」に変更しました`);}catch(err){toast(err.message);input?.focus();}}
function resetName(characterId){try{const name=resetCharacterName(state,characterId);saveNow();closeModal();renderGame();toast(`名前を「${name}」に戻しました`);}catch(err){toast(err.message);}}


function raidHero(){return state.characters?.find(c=>c.isHero)??state.characters?.[0];}
function raidPartyMembers(){return getAdventureBattleParty(state).slice(0,4);}
function syncRaidParty(party){
 syncBattlePartyToState(state,{actors:party.map(c=>({...c,side:'ally'}))});
 for(const actor of party){const c=state.characters.find(x=>x.id===actor.id);if(!c)continue;if(actor.raidBuff)c.raidBuff=structuredClone(actor.raidBuff);else delete c.raidBuff;}
}
function finishRaidDefeat(){
 cancelRaidSession();
 for(const c of state.characters??[]){const {maxHP,maxMP}=getCharacterResourceCaps(state,c);c.hp=maxHP;c.mp=maxMP;c.statusAilments=[];c.debuffs=[];}
 state.currentLocationId=state.lastInnId??state.currentLocationId??null;
 view='town';closeModal();saveNow();renderGame();toast('パーティ全員が戦闘不能… 町へ戻り、HP・MPが全回復しました');
}
function cancelRaidSession(){
 clearRaidAuto();raidAutoStopped=false;raidAutoRound=0;raidLastActAt=0;
 const cleared=clearRaidOnlyStatuses(state?.characters??[]);
 raidExecutionId++;raidPoller.stop();raidLobbyPoller.stop();raidRoom=null;raidPendingBossAction=null;raidTurnState=null;raidLastHitText='';raidTurnExecuting=false;raidEndedReason=null;raidJoinBusy=false;
 if(cleared){try{saveNow();}catch{}}
}
function raidRoomView(r){const boss=RAID_BOSSES.find(b=>b.id===r?.bossId)??null,prev=raidRoom&&(!r?.sessionId||r.sessionId===raidRoom.sessionId)&&(!r?.roomId||r.roomId===raidRoom.roomId)?raidRoom:null;return {...r,boss,verifiedLevel:r?.verifiedLevel??prev?.verifiedLevel??null,bossStatusAilments:structuredClone(prev?.bossStatusAilments??[]),bossStatusResistTurns:{...(prev?.bossStatusResistTurns??{})}};}
function raidHeroDefense(hero){const bonus=getEquipmentStatBonus(state,hero);return Math.max(0,(hero?.stats?.defense??0)+(bonus.defense??0));}
function rememberRaidSnapshot(snapshot){storeRaidSnapshot(state,snapshot,{storage:session.storage});}
function raidPhaseText(room){const ratio=Math.max(0,(room?.currentHp??0)/Math.max(1,room?.maxHp??1));return ratio<=.25?'⚠️ 最終フェーズ +30%':ratio<=.50?'🔥 強化フェーズ +15%':'通常フェーズ';}
function updateRaidBattleLog(){const root=modal.querySelector('.raid-battle-modal'),log=root?.querySelector('[data-raid-log]');if(!log)return;log.innerHTML=raidBattleLog.slice(-8).map(line=>`<div>${esc(line)}</div>`).join('');log.scrollTop=log.scrollHeight;}
function addRaidBattleLog(message){if(!message)return;raidBattleLog.push(String(message));if(raidBattleLog.length>24)raidBattleLog=raidBattleLog.slice(-24);updateRaidBattleLog();}
function updateRaidBattleModal(room=raidRoom,hero=raidHero(),pendingBossAction=raidPendingBossAction,party=raidPartyMembers()){
 const root=modal.querySelector('.raid-battle-modal');if(!root||!room)return;
 const hp=Math.max(0,room.currentHp??0),max=Math.max(1,room.maxHp??1),pct=Math.max(0,Math.min(100,hp/max*100)),stats=currentRaidBossStats(room);
 const scene=root.querySelector('[data-battle-stage]');if(scene&&(!room.visualAction||scene.dataset.actionToken!==room.visualAction.token)){const tails=captureNumberTails(root);scene.outerHTML=raidStageMarkup(room,party,raidTurnExecuting?null:currentRaidPartyActor()?.id);const next=root.querySelector('[data-battle-stage]');if(room.visualAction)next.dataset.actionToken=room.visualAction.token;appendNumberTails(root,tails);}
 const fill=root.querySelector('[data-raid-hp-fill]');if(fill)fill.style.width=`${pct}%`;
 const hpText=root.querySelector('[data-raid-hp-text]');if(hpText)hpText.textContent=`${hp.toLocaleString()} / ${max.toLocaleString()}`;
 const bossEffects=root.querySelector('[data-raid-boss-effects]');if(bossEffects)bossEffects.innerHTML=raidEffectMarkup(room?.bossStatusAilments??[]);
 const phase=root.querySelector('[data-raid-phase]');if(phase)phase.textContent=raidPhaseText(room);
 const bossStats=root.querySelector('[data-raid-boss-stats]');if(bossStats)bossStats.textContent=`こうげき ${stats.attack} ・ ぼうぎょ ${stats.defense} ・ まほう ${stats.magicAttack} ・ すばやさ ${stats.speed}`;
 const participants=root.querySelector('[data-raid-participants]');if(participants)participants.textContent=String(room.participants??1);
 const telegraph=root.querySelector('[data-raid-telegraph]');if(telegraph){telegraph.hidden=pendingBossAction?.telegraph!==true||hp<=0||raidEndedReason==='timeout';if(pendingBossAction?.telegraph===true){const b=telegraph.querySelector('b');if(b)b.textContent=`⚠️ ${room.boss?.name??'ボス'}が力を溜めている！`;const text=telegraph.querySelector('span');if(text)text.textContent=deathWarningText(pendingBossAction,party);}}
 const defeated=root.querySelector('[data-raid-defeated]'),actions=root.querySelector('[data-raid-actions]'),skillMenu=root.querySelector('[data-raid-skill-menu]');if(defeated)defeated.hidden=hp>0;if(actions)actions.hidden=hp<=0;if(skillMenu&&hp<=0)skillMenu.hidden=true;
 for(const member of party){
  const id=String(member?.id??'');
  const hpText=root.querySelector(`[data-raid-party-hp-text="${id}"]`);if(hpText)hpText.textContent=`${Number(member?.hp??0)}/${Number(member?.maxHp??Math.max(0,member?.hp??0))}`;
  const hpFill=root.querySelector(`[data-raid-party-hp-fill="${id}"]`);if(hpFill)hpFill.style.width=`${Math.max(0,Math.min(100,Math.round((Number(member?.hp??0)/Math.max(1,Number(member?.maxHp??1)))*100)))}%`;
  const mpText=root.querySelector(`[data-raid-party-mp-text="${id}"]`);if(mpText)mpText.textContent=`${Number(member?.mp??0)}/${Number(member?.maxMp??Math.max(0,member?.mp??0))}`;
  const mpFill=root.querySelector(`[data-raid-party-mp-fill="${id}"]`);if(mpFill)mpFill.style.width=`${Math.max(0,Math.min(100,Math.round((Number(member?.mp??0)/Math.max(1,Number(member?.maxMp??1)))*100)))}%`;
  const effects=root.querySelector(`[data-raid-party-effects="${id}"]`);if(effects)effects.innerHTML=raidEffectMarkup(member?.statusAilments??[]);
 }
 updateRaidBattleLog();
 const reward=root.querySelector('[data-raid-reward-status]'),rewardKey=raidRewardKey(room)||raidRewardKey(state.raid?.liveSnapshot);if(reward&&rewardKey&&state.raid?.claimedRewards?.[rewardKey])reward.textContent=formatRaidReward(state.raid.claimedRewards[rewardKey]);
 const lastHit=root.querySelector('[data-raid-last-hit]');if(lastHit)lastHit.textContent=raidLastHitText;
}
function updateRaidAdventureCard(snapshot){
 if(isRaidWindowDefeated(state)){raidLobbyPoller.stop();const card=game.querySelector('.raid-event-panel');if(card)card.outerHTML=raidWaitingMarkup();return;}
 const card=game.querySelector(`[data-raid-session="${snapshot?.slotKey??''}"]`);if(!card)return;
 const hp=card.querySelector('[data-raid-card-hp]');if(hp&&snapshot?.currentHp!=null&&snapshot?.maxHp!=null)hp.textContent=`共有HP ${Number(snapshot.currentHp).toLocaleString()} / ${Number(snapshot.maxHp).toLocaleString()}`;
 const contribution=card.querySelector('[data-raid-card-contribution]');if(contribution){contribution.hidden=snapshot?.joined!==true;if(snapshot?.joined)contribution.textContent=`貢献度 ${Number(snapshot.contribution??0).toLocaleString()}`;}
 const rewardKey=raidRewardKey(snapshot),reward=card.querySelector('[data-raid-card-reward]');if(reward)reward.textContent=rewardKey&&state.raid?.claimedRewards?.[rewardKey]?formatRaidReward(state.raid.claimedRewards[rewardKey]):'特別報酬あり';
 const button=card.querySelector('[data-raid-start]');if(button&&!raidJoinBusy){const ui=raidJoinButtonState({eligible:(raidHero()?.level??0)>=10,joined:snapshot?.joined===true});button.disabled=ui.disabled;button.textContent=ui.label;}
}

function grantRaidRewardLocally(reward,snapshot){
 const rewardKey=raidRewardKey(snapshot);if(!reward||!rewardKey)return false;state.raid??={};state.raid.claimedRewards??={};if(state.raid.claimedRewards[rewardKey])return false;
 const auditBefore=captureProgressionSnapshot(state),raidExp=Math.max(0,Number(reward.exp??raidExperienceForRank(reward.rank)));let expRecipients=0;
 state.inventory??=[];let stack=state.inventory.find(x=>x.id===reward.itemId);if(!stack){stack={id:reward.itemId,qty:0};state.inventory.push(stack);}stack.qty+=reward.qty??1;
 if(raidExp>0){const active=new Set(state.activePartyIds??[]);for(const c of state.characters??[]){if(active.has(c.id)&&(c.hp??0)>0){awardCharacterExp(state,c.id,raidExp,{won:true});expRecipients++;}}}
 const bonusMaterialId=reward.bonusMaterialId==='ultimateEnhanceCrystal'&&['S','A'].includes(reward.rank)?'ultimateEnhanceCrystal':null;
 if(bonusMaterialId){state.materials??={};addMaterial(state,bonusMaterialId,1);}
 state.raid.claimedRewards[rewardKey]={rank:reward.rank,itemId:reward.itemId,qty:reward.qty??1,exp:raidExp,bonusMaterialId,claimedAt:reward.claimedAt??new Date().toISOString()};
 if(raidExp>0&&expRecipients>0){try{const after=captureProgressionSnapshot(state),events=buildProgressionAuditEvents({playerId:playerStatsHeartbeat.playerId,before:auditBefore,after,meta:{battleType:'raid',regionId:'raid',enemyIds:[snapshot?.bossId??'raid-boss'],cycle:state.cycle??1,saveSlot:currentSlot,expAwarded:raidExp}});void progressionAuditApi.record(events).then(()=>refreshFestival(true)).catch(()=>{});}catch{}}
 saveNow();updateRaidAdventureCard(state.raid.liveSnapshot??{});return {granted:true,exp:raidExp,expRecipients};
}
async function tryClaimRaidReward(snapshot=raidRoom,{silent=false}={}){
 const hp=Math.max(0,Number(snapshot?.currentHp??0)),max=Math.max(1,Number(snapshot?.maxHp??1)),contribution=Math.max(0,Number(snapshot?.contribution??0)),claimSnapshot={...(state.raid?.liveSnapshot??{}),...(raidRoom??{}),...(snapshot??{})},rewardKey=raidRewardKey(claimSnapshot);
 if(hp/max>.5||contribution<RAID_RANK_THRESHOLDS.C||!rewardKey||state.raid?.claimedRewards?.[rewardKey]||raidRewardClaimBusy)return null;
 const claimState=state,claimExecutionId=++raidClaimExecutionId;raidRewardClaimBusy=true;
 try{const claim=await raidApi.claim({playerId:getRaidPlayerId(session.storage)});if(state!==claimState||claimExecutionId!==raidClaimExecutionId)return null;if(claim?.reward){if(shouldGrantRaidReward(claim.reward)){const granted=grantRaidRewardLocally(claim.reward,claimSnapshot);if(granted){const receipt=state.raid?.claimedRewards?.[rewardKey];const label=formatRaidReward(receipt);addRaidBattleLog(label);updateRaidBattleModal();if(!silent)toast(label);}}else{state.raid??={};state.raid.claimedRewards??={};state.raid.claimedRewards[rewardKey]={rank:claim.reward.rank,itemId:claim.reward.itemId,qty:claim.reward.qty??1,claimedAt:claim.reward.claimedAt??new Date().toISOString()};saveNow();updateRaidBattleModal();}}return claim?.reward??null;}
 catch(err){if(!silent)toast(err.message??'レイド報酬の受取に失敗しました');return null;}
 finally{if(claimExecutionId===raidClaimExecutionId)raidRewardClaimBusy=false;}
}
function startRaidPartyTurn(){
 raidAutoRound++;
 const party=raidPartyMembers();
 if(raidAutoRound===1){
  const shields=party.filter(x=>isShieldGuardJob(x.currentJob)&&shieldJobLevel(x)>=70&&x.hp>0);
  const seen=new Set();
  for(const c of shields){
   if(seen.has(c.currentJob))continue;
   seen.add(c.currentJob);
   const bonus=c.currentJob==='shielder'?{attackPct:.2,magicPct:.2}:{defensePct:.2};
   for(const target of party){
    target.raidBuff??={turns:3,attackPct:0,magicPct:0,defensePct:0};
    for(const key of Object.keys(bonus))target.raidBuff[key]=(target.raidBuff[key]??0)+bonus[key];
    target.raidBuff.turns=Math.max(3,target.raidBuff.turns??0);
   }
   addRaidBattleLog(`🛡️ ${c.name}の${c.currentJob==='shielder'?'攻撃':'防御'}の掛け声！ 味方全員が3ターン強化された！`);
  }
  if(seen.size)syncRaidParty(party);
 }
 raidTurnState=createRaidTurnState(party);
}
function raidTurnInfo(){const receipt=state.raid?.claimedRewards?.[raidRewardKey(raidRoom)]??null;return {currentActorId:raidTurnState?.currentActorId??null,index:raidTurnState?.index??0,total:raidTurnState?.actorIds?.length??0,executing:raidTurnExecuting,endedReason:raidEndedReason,autoEnabled:autoSettings().enabled,autoStopped:raidAutoStopped,rewardText:receipt?formatRaidReward(receipt):null,lastHitText:raidLastHitText};}
function currentRaidPartyActor(){return currentRaidTurnActor(raidTurnState,raidPartyMembers());}
function renderRaidBattleScreen(){
 if(!raidRoom)return;
 openModal(raidBattleMarkup(raidRoom,raidHero(),raidPendingBossAction,raidPartyMembers(),raidBattleLog,raidTurnInfo()));
 modal.classList.add('raid-ui-open');
 scheduleRaidAuto();
}
function raidActorBonus(actor){const bonus={...getEquipmentStatBonus(state,actor)};const buff=actor?.raidBuff;if(buff?.turns>0){bonus.attack=(bonus.attack??0)+Math.round((actor?.stats?.attack??0)*(buff.attackPct??0));bonus.magic=(bonus.magic??0)+Math.round((actor?.stats?.magic??0)*(buff.magicPct??0));}return bonus;}
function tickRaidBuffs(party){for(const c of party){if(c.raidBuff?.turns>0){c.raidBuff.turns--;if(c.raidBuff.turns<=0)delete c.raidBuff;}}}
function allRaidPartyKo(){const p=raidPartyMembers();return !p.length||p.every(x=>(x?.hp??0)<=0);}
function skillById(actor,id){return getBattleSkills(actor).find(x=>x.id===id);}
function raidSkillChoiceMarkup(actor){const skills=getBattleSkills(actor);return `<section class="raid-submenu"><h2>✨ ${esc(actor?.name)}の特技・魔法</h2><p class="modal-sub">MP ${actor?.mp??0} / ${actor?.maxMp??0}</p><div class="choice-list">${skills.map(sk=>`<button data-raid-use-skill="${sk.id}" ${(sk.mp??0)>(actor?.mp??0)?'disabled':''}><span><b>${esc(sk.name)}</b><small class="skill-description">${esc(describeSkill(sk,{raid:true}))}</small></span><em>MP ${sk.mp??0}</em></button>`).join('')||'<p>セット済みの技がありません。戦闘後に特技・魔法リストからセットしてください。</p>'}</div><button data-raid-submenu-back>← 戦闘へ戻る</button></section>`;}
function showRaidSkillPicker(){const actor=currentRaidPartyActor();if(!actor)return;const card=modal.querySelector('.modal-card');if(!card)return;card.innerHTML=raidSkillChoiceMarkup(actor);}
function showRaidSkillTargets(skill){const actor=currentRaidPartyActor();if(!actor||!skill)return;const party=raidPartyMembers();const targets=skill.type==='revive'?party.filter(x=>(x?.hp??0)<=0):party.filter(x=>(x?.hp??0)>0);if(!targets.length){toast(skill.type==='revive'?'戦闘不能の仲間がいません':'対象がいません');return renderRaidBattleScreen();}const card=modal.querySelector('.modal-card');if(!card)return;card.innerHTML=`<section class="raid-submenu"><h2>${esc(skill.name)}の対象</h2><div class="choice-list">${targets.map(t=>`<button data-raid-skill-target="${t.id}" data-raid-skill-id="${skill.id}"><span><b>${esc(t.name)}</b><small>HP ${t.hp}/${t.maxHp}</small></span><em>選択</em></button>`).join('')}</div><button data-raid-submenu-back>← 戦闘へ戻る</button></section>`;}
function canRaidUseItemOn(def,c){return canUseItemOn(def,c);}
function raidItemChoiceMarkup(){const actor=currentRaidPartyActor(),items=getUsableInventory(state);return `<section class="raid-submenu"><h2>🧪 ${esc(actor?.name??'仲間')}のアイテム</h2><div class="choice-list">${items.map(item=>`<button data-raid-use-item="${item.id}"><span><b>${item.icon??'🧪'} ${esc(item.name)}</b><small>${esc(item.description??'')}</small></span><em>×${item.qty}</em></button>`).join('')||'<p>使えるアイテムがありません</p>'}</div><button data-raid-submenu-back>← 戦闘へ戻る</button></section>`;}
function showRaidItemPicker(){if(!currentRaidPartyActor())return;const card=modal.querySelector('.modal-card');if(!card)return;card.innerHTML=raidItemChoiceMarkup();}
function showRaidItemTargets(itemId){const def=getItemDef(itemId),party=raidPartyMembers(),targets=party.filter(c=>canRaidUseItemOn(def,c));if(!targets.length){toast(def.canTargetKo?'戦闘不能の仲間がいません':'今このアイテムを使う必要がありません');return;}const card=modal.querySelector('.modal-card');if(!card)return;card.innerHTML=`<section class="raid-submenu"><h2>${def.icon??'🧪'} ${esc(def.name)}の対象</h2><div class="choice-list">${targets.map(t=>`<button data-raid-item-target="${t.id}" data-raid-item-id="${itemId}"><span><b>${esc(t.name)}</b><small>HP ${t.hp}/${t.maxHp}・MP ${t.mp}/${t.maxMp}</small></span><em>使う</em></button>`).join('')}</div><button data-raid-submenu-back>← 戦闘へ戻る</button></section>`;}
function chooseRaidItemTarget(itemId,targetId){planRaidAction({type:'item',itemId,targetId});}
async function openRaidBattle(button=null){
 if(raidJoinBusy)return;restoreRaidDefeats(state,session.storage);if(!getRaidWindow())return toast('次の開催時刻までお待ちください');if(isRaidWindowDefeated(state))return toast('この回は討伐済みです。次の開催までお待ちください');const hero=raidHero();if((hero?.level??0)<10)return toast('キャラクターLv10から参加できます');
 const executionId=++raidExecutionId,joinWindowId=getRaidWindow()?.id;raidJoinBusy=true;const beforeJoined=state.raid?.liveSnapshot?.joined===true;
 if(button){const ui=raidJoinButtonState({loading:true,eligible:true,joined:beforeJoined});button.disabled=ui.disabled;button.textContent=ui.label;}
 openModal(raidJoinLoadingMarkup());raidLobbyPoller.stop();
 try{
  const playerId=getRaidPlayerId(session.storage);
  const snapshot=await withRaidJoinTimeout(raidApi.snapshot({playerId}));
  if(executionId!==raidExecutionId)return;if(getRaidWindow()?.id!==joinWindowId)throw new Error('開催時間が切り替わりました。次の開催を確認してください');rememberRaidSnapshot(snapshot);
  if(isRaidWindowDefeated(state)){saveNow();raidJoinBusy=false;closeModal();renderGame();return;}
  const r=await withRaidJoinTimeout(raidApi.join({playerId,level:hero?.level??1}));
  if(executionId!==raidExecutionId)return;if(getRaidWindow()?.id!==joinWindowId)throw new Error('開催時間が切り替わりました。次の開催を確認してください');
  rememberRaidSnapshot(r);if(isRaidWindowDefeated(state)){saveNow();raidJoinBusy=false;closeModal();renderGame();return;}
  raidRoom=raidRoomView(r);if(!raidRoom?.boss)throw new Error('レイドボス情報を取得できませんでした');
  const party=raidPartyMembers();for(const member of party)if((member.hp??0)<=0)member.hp=member.maxHp??1;syncRaidParty(party);
  rememberRaidSnapshot({...r,joined:true});raidStartedAt=Date.now();raidAutoStopped=false;raidAutoRound=0;raidLastActAt=0;raidBattleLog=['⚔️ レイドバトル開始！'];raidLastHitText='';raidTurnExecuting=false;raidEndedReason=null;
  raidPendingBossAction=chooseRaidBossAttack(raidRoom.bossId,(raidRoom.currentHp??1)/Math.max(1,raidRoom.maxHp??1),Math.random,raidPartyMembers());startRaidPartyTurn();renderRaidBattleScreen();raidPoller.start();saveNow();
 }catch(err){
  if(executionId!==raidExecutionId)return;
  cancelRaidSession();closeModal();renderGameKeepVertical();raidLobbyPoller.start();toast(err.message??'レイド接続に失敗しました');
 }finally{
  if(executionId===raidExecutionId){raidJoinBusy=false;if(!raidRoom){const current=game.querySelector('[data-raid-start]')??button;if(current){const ui=raidJoinButtonState({eligible:(raidHero()?.level??0)>=10,joined:state.raid?.liveSnapshot?.joined===true});current.disabled=ui.disabled||isRaidWindowDefeated(state);current.textContent=isRaidWindowDefeated(state)?'討伐済み・次の開催をお待ちください':ui.label;}}}
 }
}
async function executeRaidPartyTurn(){
 if(!raidRoom||!raidTurnState?.complete)return;
 const executionId=raidExecutionId;
 const actions=[...raidTurnState.actions],party=raidPartyMembers(),playerId=getRaidPlayerId(session.storage),bossStats=currentRaidBossStats(raidRoom);let survivalSent=false;
 const executedActions=[];
 try{
  for(const action of actions){
   if(executionId!==raidExecutionId||!raidRoom)return;
   if((raidRoom.currentHp??0)<=0||isRaidWindowDefeated(state))break;
   const actor=party.find(x=>x.id===action.actorId);if(!actor||(actor.hp??0)<=0){addRaidBattleLog(`💫 ${actor?.name??'仲間'}は戦闘不能で行動できない`);continue;}
   const control=getRaidActorControl(actor,Math.random);if(control.blocked){addRaidBattleLog(`💫 ${actor.name}は${control.message}`);continue;}
   const mpBefore=Number(actor.mp??0);
   const visualBefore=Object.fromEntries(party.map(c=>[c.id,c.hp]));
   let payload={},log='',visualSkill=null,visualLabel=action.type==='guard'?'防御':'攻撃',pendingBossStatusSkill=null;
   if(action.type==='item'){
    const result=applyRaidItemEffect({state,itemId:action.itemId,targetId:action.targetId,party});if(!result.ok){addRaidBattleLog(`${actor.name}: ${result.message}`);continue;}payload=result.payload??{};visualLabel=result.itemName;
    const detail=[];if((result.healing??0)>0)detail.push(`HP${Number(result.healing).toLocaleString()}回復`);if((result.mpRestored??0)>0)detail.push(`MP${Number(result.mpRestored).toLocaleString()}回復`);
    log=`🧪 ${actor.name}は${result.itemName}を使用！ ${result.targetName}${detail.length?` ${detail.join('・')}`:''}`;
   }else if(action.type==='skill'){
    const skill=skillById(actor,action.skillId);if(!skill){addRaidBattleLog(`${actor.name}の特技・魔法が見つからない`);continue;}
    visualSkill=skill;visualLabel=skill.name;
    const result=applyRaidSkillEffect({actor,skill,targetId:action.targetId,party,statBonus:raidActorBonus(actor),bossStats,boss:raidRoom?.boss??{}});if(!result.ok){addRaidBattleLog(`${actor.name}: ${result.message}`);continue;}payload=result.payload??{};pendingBossStatusSkill=result.bossStatusAttempt?skill:null;
    if(result.kind==='damage'){const weak=getElementMultiplier(getSkillElement(skill),raidRoom?.boss??{})>1;log=(result.damage??0)>0?`✨ ${actor.name}の${skill.name}！ ${Number(result.damage??0).toLocaleString()}ダメージ${weak?'（弱点！1.5倍）':''}`:`✨ ${actor.name}の${skill.name}！`;}
    else if(result.kind==='heal')log=`💖 ${actor.name}の${skill.name}！ 合計${Number(result.healing??0).toLocaleString()}回復`;
    else if(result.kind==='revive'){const target=party.find(x=>x.id===action.targetId);log=`✨ ${actor.name}の${skill.name}！ ${target?.name??'仲間'}が復活！`;}
    else log=`✨ ${actor.name}の${skill.name}！`;
   }else{
    payload=raidActionPayload(action.type,actor,bossStats,raidActorBonus(actor));
    log=action.type==='guard'?`🛡️ ${actor.name}は防御！`:`⚔️ ${actor.name}の攻撃！ ${Number(payload.damage??0).toLocaleString()}ダメージ`;
   }
   // Client-side soft cap mirrors the verified server ceiling but never overrides
   // server rejection. Legitimate high-output skills no longer send unpayable hits.
   const safeSubmission=prepareRaidDamageSubmission(payload,actor,raidRoom?.verifiedLevel);
   if(safeSubmission.adjusted){
    log=log.replace(Number(safeSubmission.requested).toLocaleString(),Number(safeSubmission.submitted).toLocaleString());
    log+='（レイドの安全上限に調整）';
   }
   payload=safeSubmission.payload;
   if(!survivalSent){payload.survivalSeconds=Math.min(30,Math.floor((Date.now()-raidStartedAt)/1000));raidStartedAt=Date.now();survivalSent=true;}
   syncRaidParty(party);
   await limitAutoRaidCalls(executionId);
   const r=await raidApi.act({playerId,...payload});if(executionId!==raidExecutionId||!raidRoom)return;raidRoom=raidRoomView(r);rememberRaidSnapshot(r);if(isRaidWindowDefeated(state))raidRoom.currentHp=0;
   if(r.damageRejected){
    // The server refused the hit. Undo MP costs and avoid giving a status effect
    // to a rejected offensive skill; do not penalize a legitimate player.
    if(action.type==='skill'&&Number(actor.mp??0)<mpBefore){actor.mp=mpBefore;syncRaidParty(party);saveNow();}
    pendingBossStatusSkill=null;
    log=`⚠️ ${actor.name}の攻撃はサーバーの安全判定により反映されませんでした。${action.type==='skill'?'使用したMPは返却します。':''}正規の攻撃でも続く場合は「ご意見BOX」でご報告ください。`;
   }
   else if(payload.damage>0&&r.damageApplied!=null)log=log.replace(Number(payload.damage).toLocaleString(),Number(r.damageApplied).toLocaleString());
   const appliedDamage=Math.max(0,Math.floor(Number(r.damageApplied??0)||0));
   if(action.type==='skill'){
    const spent=Math.max(0,mpBefore-Number(actor.mp??0));
    log+=' ／ MP '+mpBefore+'→'+actor.mp+'（消費'+spent+'）';
   }
   raidLastHitText=payload.damage>0?(r.damageRejected?'⚠️ サーバーがダメージを拒否しました':'✅ 実際に反映：'+appliedDamage.toLocaleString()+'ダメージ'):'';
   if(pendingBossStatusSkill&&(raidRoom.currentHp??0)>0){const status=tryInflictRaidBossStatus(raidRoom,actor,pendingBossStatusSkill,Math.random);if(status.applied)log+=` / ${status.label}${status.refreshed?'延長':'付与'}`;else if(status.attempted)log+=` / ${status.label}は効かなかった`;}
   executedActions.push(action);
   const visualKind=visualSkill?.kind==='magic'||visualSkill?.type==='magic'?'magic':'physical';
   raidRoom.visualAction={token:crypto.randomUUID(),actorId:actor.id,actorName:actor.name,label:visualLabel,kind:visualKind};
   raidRoom.visualEvents=[{id:'raid-scene-boss',kind:visualKind,element:visualSkill?.element,amount:Number(r.damageApplied??0)},...party.map(c=>({id:c.id,amount:(visualBefore[c.id]??c.hp)-c.hp}))].filter(x=>x.amount!==0);
   updateRaidBattleModal();addRaidBattleLog(log);
   const presentation=new Promise(resolve=>setTimeout(resolve,battlePresentationDelay(raidRoom,(raidRoom.currentHp??0)<=0)));
   await tryClaimRaidReward(r,{silent:true});await presentation;
   if(executionId!==raidExecutionId||!raidRoom)return;raidRoom.visualEvents=[];raidRoom.visualAction=null;
  }
  if(executionId!==raidExecutionId||!raidRoom)return;
  if(isRaidWindowDefeated(state))raidRoom.currentHp=0;
  if((raidRoom.currentHp??0)<=0){raidPoller.stop();raidPendingBossAction=null;raidTurnState=null;raidTurnExecuting=false;raidEndedReason=null;saveNow();renderRaidBattleScreen();return toast(`🏆 ${raidRoom.boss?.name??'レイドボス'}討伐！`);}

  const partyTick=tickRaidPartyStatuses(party);for(const line of partyTick.logs)addRaidBattleLog(line);syncRaidParty(party);updateRaidBattleModal();
  if(allRaidPartyKo())return finishRaidDefeat();

  const dot=getRaidBossDotTick(raidRoom);
  if(dot.damage>0){
   await limitAutoRaidCalls(executionId);
   const safeDot=prepareRaidDamageSubmission({damage:dot.damage},raidHero(),raidRoom?.verifiedLevel);
   const r=await raidApi.act({playerId,...safeDot.payload});if(executionId!==raidExecutionId||!raidRoom)return;raidRoom=raidRoomView(r);rememberRaidSnapshot(r);if(isRaidWindowDefeated(state))raidRoom.currentHp=0;
   const applied=Math.max(0,Number(r.damageApplied??dot.damage)),labels=dot.details.map(x=>x.label).join('・');addRaidBattleLog(r.damageRejected?'⚠️ 状態異常ダメージはサーバー検証で反映されませんでした。':`☠️ ${raidRoom.boss?.name??'レイドボス'}：${labels} ${applied.toLocaleString()}ダメージ`);updateRaidBattleModal();await tryClaimRaidReward(r,{silent:true});
   if((raidRoom.currentHp??0)<=0){raidPoller.stop();raidPendingBossAction=null;raidTurnState=null;raidTurnExecuting=false;raidEndedReason=null;saveNow();renderRaidBattleScreen();return toast(`🏆 ${raidRoom.boss?.name??'レイドボス'}討伐！`);}
  }

  const bossControl=getRaidBossControl(raidRoom,Math.random);
  if(bossControl.blocked){
   addRaidBattleLog(`💫 ${raidRoom.boss?.name??'レイドボス'}は${bossControl.message}`);tickRaidBossStatuses(raidRoom);tickRaidBuffs(party);syncRaidParty(party);saveNow();updateRaidBattleModal();
  }else{
   const bossAction=raidPendingBossAction??chooseRaidBossAttack(raidRoom.bossId,(raidRoom.currentHp??1)/Math.max(1,raidRoom.maxHp??1),Math.random,party);
   const bossBefore=Object.fromEntries(party.map(c=>[c.id,c.hp])),bossStatsNow=currentRaidBossStats(raidRoom);
   const bossResult=applyRaidBossAction(bossAction,party,executedActions,bossStatsNow,raidRoom.bossId,Math.random,raidRoom.boss?.name??'レイドボス');for(const line of bossResult.logs)addRaidBattleLog(line);
   raidRoom.visualAction={token:crypto.randomUUID(),actorId:'raid-scene-boss',actorName:raidRoom.boss?.name??'ボス',label:bossAction.name??'攻撃',kind:bossAction.magic?'magic':'physical'};
   raidRoom.visualEvents=party.map(c=>({id:c.id,amount:bossBefore[c.id]-c.hp,kind:bossAction.magic||['aoe','death','wipe','statusAoe'].includes(bossAction.kind)?'magic':'physical'})).filter(x=>x.amount!==0);
   updateRaidBattleModal();await new Promise(resolve=>setTimeout(resolve,battlePresentationDelay(raidRoom,true)));
   if(executionId!==raidExecutionId||!raidRoom)return;
   raidRoom.visualEvents=[];raidRoom.visualAction=null;tickRaidBossStatuses(raidRoom);tickRaidBuffs(party);syncRaidParty(party);saveNow();
  }

  if(allRaidPartyKo())return finishRaidDefeat();
  raidPendingBossAction=chooseRaidBossAttack(raidRoom.bossId,(raidRoom.currentHp??1)/Math.max(1,raidRoom.maxHp??1),Math.random,raidPartyMembers());if(raidPendingBossAction?.telegraph)addRaidBattleLog('⚠️ 終焉の刻の予兆！ 防御するメンバーだけ生存できます');raidTurnExecuting=false;startRaidPartyTurn();renderRaidBattleScreen();
 }catch(err){if(executionId!==raidExecutionId||!raidRoom)return;raidTurnExecuting=false;toast(err.message??'レイド通信に失敗しました');startRaidPartyTurn();renderRaidBattleScreen();}
}

function planRaidAction(action){if(!raidRoom||!raidTurnState||raidTurnExecuting||isRaidWindowDefeated(state))return;const actor=currentRaidPartyActor();if(!actor)return;
try{raidTurnState=planRaidPartyAction(raidTurnState,{...action,actorId:actor.id});if(raidTurnState.complete){raidTurnExecuting=true;renderRaidBattleScreen();queueMicrotask(()=>void executeRaidPartyTurn());return;}renderRaidBattleScreen();}catch(err){toast(err.message);}}
function doRaidAction(type){if(!['attack','guard'].includes(type))return;planRaidAction({type});}
function chooseRaidSkill(skillId){const actor=currentRaidPartyActor(),skill=skillById(actor,skillId);if(!actor||!skill)return;if((skill.mp??0)>(actor.mp??0))return toast('MPが足りない！');if(skill.type==='heal'&&skill.target!=='all')return showRaidSkillTargets(skill);if(skill.type==='revive')return showRaidSkillTargets(skill);planRaidAction({type:'skill',skillId:skill.id,targetId:actor.id});}
function chooseRaidSkillTarget(skillId,targetId){const actor=currentRaidPartyActor(),skill=skillById(actor,skillId);if(!actor||!skill)return;planRaidAction({type:'skill',skillId:skill.id,targetId});}

function deliverRankingApologyLocally(){
 const playerId=playerStatsHeartbeat.playerId;
 if(wasRankingApologyDelivered(session.storage,playerId)){state.rankingApologyReceived=true;return {delivered:false,already:true};}
 const added=grantRankingApologyReward(state);
 state.rankingApologyReceived=true;
 markRankingApologyDelivered(session.storage,playerId);
 saveNow();
 return {delivered:added,already:!added};
}
async function openRankingApologyNpc(){
 openRankingApologyModal(rankingApologyLoadingMarkup());
 try{
  const status=await rankingApologyApi.status(playerStatsHeartbeat.playerId);
  if(status?.eligible&&status?.claimed){
   const local=deliverRankingApologyLocally();
   closeModal();renderGame();
   if(local.delivered)toast('💍 星晶の指輪を受け取りました！');
   return;
  }
  updateRankingApologyModalContent(rankingApologyConversationMarkup(status));
 }catch{updateRankingApologyModalContent(rankingApologyConversationMarkup({error:true}));}
}
async function claimRankingApology(){
 updateRankingApologyModalContent(rankingApologyLoadingMarkup());
 try{
  const result=await rankingApologyApi.claim(playerStatsHeartbeat.playerId);
  if(result?.eligible&&result?.claimed){
   const local=deliverRankingApologyLocally();
   closeModal();renderGame();
   return toast(local.delivered?'💍 星晶の指輪を受け取りました！':'星晶の指輪はすでに受取済みです');
  }
  updateRankingApologyModalContent(rankingApologyConversationMarkup(result));
 }catch{updateRankingApologyModalContent(rankingApologyConversationMarkup({error:true}));}
}


function accountErrorText(err){
 const code=String(err?.code??err?.message??'');
 if(code==='invalid_login_id')return 'ログインIDは6〜32文字で、英字・数字・記号をそれぞれ1文字以上含めてください';
 if(code==='invalid_password')return 'パスワードは8〜72文字で、英字・数字・記号をそれぞれ1文字以上含めてください';
 if(code==='login_id_unavailable')return 'このログインIDは使用できません';
 if(code==='invalid_credentials')return 'ログインIDまたはパスワードが違います';
 if(code==='invalid_recovery')return 'ログインIDまたは復帰コードが違います';
 if(code==='too_many_attempts')return '入力回数が多いため一時的にロックされています。しばらく待ってからお試しください';
 if(code==='already_linked')return 'この端末のプレイヤーはすでにアカウント連携済みです';
 if(code==='auth_upgrade_failed'||code==='signin_after_create_failed')return 'アカウント作成に失敗しました。時間をおいてもう一度お試しください';
 return '通信に失敗しました。時間をおいてもう一度お試しください';
}
function validAccountLoginId(value){const s=String(value??'').trim();return s.length>=6&&s.length<=32&&/^[\x21-\x7E]+$/.test(s)&&/[A-Za-z]/.test(s)&&/[0-9]/.test(s)&&/[^A-Za-z0-9]/.test(s);}
function validAccountPassword(value){const s=String(value??'');return s.length>=8&&s.length<=72&&/^[\x21-\x7E]+$/.test(s)&&/[A-Za-z]/.test(s)&&/[0-9]/.test(s)&&/[^A-Za-z0-9]/.test(s);}
function accountRulesMarkup(){return `<div class="account-rules"><p><b>ログインID</b>：6文字以上 / 英字・数字・記号を含む</p><p><b>パスワード</b>：8文字以上 / 英字・数字・記号を含む</p><p>ログインIDは大文字・小文字を区別しません。パスワードは区別します。</p></div>`;}
function accountTitleMarkup(){
 if(!accountState.ready)return `<div class="title-account-box"><small>🔐 アカウント確認中…</small></div>`;
 if(accountState.linked)return `<div class="title-account-box is-linked"><small>🔐 ${esc(accountState.loginId)} / 自動ログイン ON</small><button data-account-open>アカウント</button></div>`;
 return `<div class="title-account-box"><p>端末を変えても続きを遊べるようにできます。</p><div><button class="action-main" data-account-create>アカウント作成</button><button data-account-login>ログイン</button></div></div>`;
}
function openAccountHome(){
 if(accountState.linked){
  openModal(`<h2>🔐 アカウント</h2><p class="modal-sub">ログインID</p><div class="account-id-display">${esc(accountState.loginId)}</div><p class="account-auto-login">✅ 自動ログイン：ON</p><p class="account-warning">⚠️ パスワードを忘れた方のみ復帰コードの確認をお願いします</p><div class="account-actions"><button data-account-show-recovery>復帰コードを表示</button><button data-account-logout>ログアウト</button></div>`);return;
 }
 openModal(`<h2>🔐 アカウント</h2><p class="modal-sub">アカウントを作成すると現在のセーブデータを紐付けできます。</p><div class="account-actions"><button class="action-main" data-account-create>アカウント作成</button><button data-account-login>ログイン</button></div>`);
}
function openAccountCreate(){
 openModal(`<h2>🔐 アカウント作成</h2>${accountRulesMarkup()}<label class="account-field">ログインID<input data-account-create-id autocomplete="username" maxlength="32" placeholder="例：Chronicle_01!"></label><label class="account-field">パスワード<input data-account-create-password type="password" autocomplete="new-password" maxlength="72"></label><label class="account-field">パスワード確認<input data-account-create-confirm type="password" autocomplete="new-password" maxlength="72"></label><p class="account-note">現在の5つのセーブスロットをこのアカウントへ紐付けます。</p><button class="action-main wide-button" data-account-submit-create>作成して紐付ける</button><button class="wide-button" data-account-open>戻る</button>`);
}
function openAccountLogin(){
 openModal(`<h2>🔑 ログイン</h2><p class="modal-sub">ログインIDは大文字・小文字どちらでもログインできます。</p><label class="account-field">ログインID<input data-account-login-id autocomplete="username" maxlength="32"></label><label class="account-field">パスワード<input data-account-login-password type="password" autocomplete="current-password" maxlength="72"></label><button class="action-main wide-button" data-account-submit-login>ログイン</button><button class="account-forgot-link" data-account-forgot>パスワードを忘れた方</button><button class="wide-button" data-account-open>戻る</button>`);
}
function openAccountRecovery(){
 openModal(`<h2>🗝️ パスワード初期化</h2><p class="account-warning">⚠️ ゲーム内メニューで確認した復帰コードを入力してください。</p><label class="account-field">ログインID<input data-account-reset-id autocomplete="username" maxlength="32"></label><label class="account-field">復帰コード<input data-account-reset-code autocomplete="off" maxlength="32" placeholder="XXXX-XXXX-XXXX-XXXX"></label><label class="account-field">新しいパスワード<input data-account-reset-password type="password" autocomplete="new-password" maxlength="72"></label><label class="account-field">新しいパスワード確認<input data-account-reset-confirm type="password" autocomplete="new-password" maxlength="72"></label>${accountRulesMarkup()}<button class="action-main wide-button" data-account-submit-reset>パスワードを初期化してログイン</button><button class="wide-button" data-account-login>ログインへ戻る</button>`);
}
function recoveryCodeMarkup(code,title='復帰コード'){return `<h2>🗝️ ${title}</h2><p class="account-warning">⚠️ パスワードを忘れた方のみ復帰コードの確認をお願いします</p><div class="recovery-code" data-recovery-value>${esc(code)}</div><p class="account-note">このコードはパスワード初期化専用です。第三者に見せないでください。</p><button class="action-main wide-button" data-account-copy-recovery="${esc(code)}">コピー</button><button class="wide-button" data-account-open>アカウントへ戻る</button>`;}
function guestSavePayload(){
 const out=[];for(let slot=1;slot<=5;slot++){const rec=loadSlotRecord(session,slot);if(rec)out.push({slot,save_data:rec.save,updated_at:rec.updatedAt});}return out;
}
async function applyAccountSessionAndReload(result,{showRecovery=false}={}){
 await accountApi.applySession(result.session);
 if(result.player_id)session.storage.setItem(PLAYER_STATS_STORAGE_KEY,result.player_id);
 if(showRecovery&&result.recovery_code)sessionStorage.setItem('yakusoku.account.recovery.notice',result.recovery_code);
 location.reload();
}
async function submitAccountCreate(){
 const loginId=modal.querySelector('[data-account-create-id]')?.value??'',password=modal.querySelector('[data-account-create-password]')?.value??'',confirmPassword=modal.querySelector('[data-account-create-confirm]')?.value??'';
 if(!validAccountLoginId(loginId))return toast('ログインIDは6文字以上で、英字・数字・記号を含めてください');
 if(!validAccountPassword(password))return toast('パスワードは8文字以上で、英字・数字・記号を含めてください');
 if(password!==confirmPassword)return toast('パスワード確認が一致しません');
 try{if(!title.classList.contains('active'))saveNow();const initial=guestSavePayload();const result=await accountApi.create(loginId,password,initial);toast('アカウントを作成しました');await applyAccountSessionAndReload(result,{showRecovery:true});}catch(err){toast(accountErrorText(err));}
}
async function submitAccountLogin(){
 const loginId=modal.querySelector('[data-account-login-id]')?.value??'',password=modal.querySelector('[data-account-login-password]')?.value??'';
 if(!loginId||!password)return toast('ログインIDとパスワードを入力してください');
 try{const result=await accountApi.login(loginId,password);toast('ログインしました');await applyAccountSessionAndReload(result);}catch(err){toast(accountErrorText(err));}
}
async function submitAccountReset(){
 const loginId=modal.querySelector('[data-account-reset-id]')?.value??'',code=modal.querySelector('[data-account-reset-code]')?.value??'',password=modal.querySelector('[data-account-reset-password]')?.value??'',confirmPassword=modal.querySelector('[data-account-reset-confirm]')?.value??'';
 if(!validAccountPassword(password))return toast('新しいパスワードは8文字以上で、英字・数字・記号を含めてください');
 if(password!==confirmPassword)return toast('パスワード確認が一致しません');
 if(!loginId||!code)return toast('ログインIDと復帰コードを入力してください');
 try{const result=await accountApi.resetPassword(loginId,code,password);toast('パスワードを初期化しました');await applyAccountSessionAndReload(result,{showRecovery:true});}catch(err){toast(accountErrorText(err));}
}
async function showAccountRecovery(){try{const result=await accountApi.showRecovery();openModal(recoveryCodeMarkup(result.recovery_code));}catch(err){toast(accountErrorText(err));}}
async function logoutAccount(){
 try{if(!title.classList.contains('active'))saveNow();await syncAllLocalUserSlotsToCloud();await accountApi.logout();session.storage.removeItem(PLAYER_STATS_STORAGE_KEY);location.reload();}catch(err){toast(accountErrorText(err));}
}
function scheduleAccountCloudSave(slot,result){
 if(session.mode!=='user'||!accountState.linked||!result?.save)return;
 accountCloudPending.set(Number(slot),result);clearTimeout(accountCloudTimers.get(Number(slot)));
 accountCloudTimers.set(Number(slot),setTimeout(()=>{void flushAccountCloudSave(Number(slot));},900));
}
async function flushAccountCloudSave(slot){
 const result=accountCloudPending.get(slot);if(!result||session.mode!=='user'||!accountState.linked)return;
 accountCloudPending.delete(slot);clearTimeout(accountCloudTimers.get(slot));accountCloudTimers.delete(slot);
 try{await accountApi.saveSlot(slot,result.save,result.updatedAt);}catch{}
}
async function syncAllLocalUserSlotsToCloud(){
 if(session.mode!=='user'||!accountState.linked)return;
 for(let slot=1;slot<=5;slot++){const rec=loadSlotRecord(session,slot);if(rec)try{await accountApi.saveSlot(slot,rec.save,rec.updatedAt);}catch{}}
}
async function syncAccountSlotsOnStartup(){
 if(session.mode!=='user'||!accountState.linked)return;
 try{
  const remote=await accountApi.loadSlots(),map=new Map((remote.slots??[]).map(x=>[Number(x.save_slot),x]));
  for(let slot=1;slot<=5;slot++){
   const local=loadSlotRecord(session,slot),cloud=map.get(slot);
   if(!local&&cloud){saveToSlot(session,slot,cloud.save_data,cloud.client_updated_at??cloud.updated_at??new Date().toISOString());continue;}
   if(local&&!cloud){await accountApi.saveSlot(slot,local.save,local.updatedAt);continue;}
   if(local&&cloud){const lt=Date.parse(local.updatedAt??0)||0,rt=Date.parse(cloud.client_updated_at??cloud.updated_at??0)||0;if(rt>lt)saveToSlot(session,slot,cloud.save_data,cloud.client_updated_at??cloud.updated_at);else if(lt>rt)await accountApi.saveSlot(slot,local.save,local.updatedAt);}
  }
 }catch{}
}
async function initializeAccountSystem(){
 try{
  const status=await accountApi.status();
  if(status?.account){session.mode='user';session.userId=status.user_id;accountState.linked=true;accountState.loginId=status.login_id??'';accountState.userId=status.user_id;accountState.playerId=status.player_id??null;if(status.player_id)session.storage.setItem(PLAYER_STATS_STORAGE_KEY,status.player_id);migrateLegacySaveToSlot1(session);await syncAccountSlotsOnStartup();}
  else{session.mode='guest';session.userId=null;accountState.linked=false;accountState.loginId='';migrateLegacySaveToSlot1(session);}
 }catch{session.mode='guest';session.userId=null;accountState.linked=false;migrateLegacySaveToSlot1(session);}
 accountState.ready=true;renderTitle();
 const recovery=sessionStorage.getItem('yakusoku.account.recovery.notice');if(recovery){sessionStorage.removeItem('yakusoku.account.recovery.notice');setTimeout(()=>openModal(recoveryCodeMarkup(recovery,'新しい復帰コード')),80);}
}

function getFeedbackAuthorName(){return state.characters.find(c=>c.isHero)?.name??state.characters[0]?.name??'旅人';}
function openFeedback(){openModal(feedbackFormMarkup(getFeedbackAuthorName()));}
async function showMyFeedback(){
 if(feedbackBusy)return;
 feedbackBusy=true;
 openModal('<div class="feedback-box"><h2>📋 自分の投稿履歴</h2><p>確認しています…</p></div>');
 try{const items=await feedbackApi.mine(currentSlot);if(modal.classList.contains('open'))openModal(feedbackHistoryMarkup(items));}
 catch(error){if(modal.classList.contains('open'))openModal(`<div class="feedback-box"><h2>📋 投稿履歴</h2><p>${esc(error?.message??'取得できませんでした')}</p><div class="feedback-actions"><button data-feedback-open>ご意見BOXへ戻る</button><button data-close-modal>閉じる</button></div></div>`);}
 finally{feedbackBusy=false;}
}
async function submitFeedback(){
 if(feedbackBusy)return;
 const category=modal.querySelector('[data-feedback-category]')?.value;
 const subject=String(modal.querySelector('[data-feedback-subject]')?.value??'').trim();
 const message=String(modal.querySelector('[data-feedback-message]')?.value??'').trim();
 const errorEl=modal.querySelector('[data-feedback-error]');
 if(subject.length<2||subject.length>80){if(errorEl)errorEl.textContent='件名は2〜80文字で入力してください。';return;}
 if(message.length<10||message.length>1500){if(errorEl)errorEl.textContent='内容は10〜1,500文字で入力してください。';return;}
 feedbackBusy=true;
 const sendButton=modal.querySelector('[data-feedback-submit]');if(sendButton){sendButton.disabled=true;sendButton.textContent='送信中…';}
 try{
  const authorName=getFeedbackAuthorName();
  const receipt=await feedbackApi.submit({slot:currentSlot,category,subject,message,authorName,screenName:view||'その他',playerId:playerStatsHeartbeat.playerId});
  if(modal.classList.contains('open')&&modal.querySelector('[data-feedback-submit]'))openModal(feedbackSentMarkup(receipt));
 }catch(error){if(errorEl)errorEl.textContent=error?.message??'送信に失敗しました。';}
 finally{feedbackBusy=false;if(sendButton){sendButton.disabled=false;sendButton.textContent='送信する';}}
}
function collectionRewardStorageKey(){return 'yakusoku.collection.202611.delivered.'+String(session.userId??playerStatsHeartbeat.playerId);}
function collectionRankingViewMarkup(){
 const receipt=collectionRewardView.receipt;
 return collectionRankingMarkup({...collectionRankingView,rewardLoading:collectionRewardView.loading,rewardError:collectionRewardView.error,
  rewardFinalized:collectionRewardView.finalized,rewardClaimable:collectionRewardView.claimable,rewardReceipt:receipt,
  rewardDelivered:!!receipt&&(collectionRewardDelivered(state,receipt)||session.storage.getItem(collectionRewardStorageKey())===receipt.id)});
}
function renderCollectionRankingPanel(){
 const panel=modal.querySelector('.collection-ranking');
 if(panel)panel.outerHTML=collectionRankingViewMarkup();
}
async function refreshCollectionReward(){
 if(Date.now()<COLLECTION_EVENT_202611.endsAt||!modal.querySelector('.collection-ranking'))return;
 collectionRewardView.loading=true;collectionRewardView.error=false;renderCollectionRankingPanel();
 try{
  const result=await collectionRewardApi.snapshot();
  if(!modal.querySelector('.collection-ranking'))return;
  collectionRewardView={finalized:result.finalized===true,claimable:result.claimable===true,
   receipt:result.receipt??null,loading:false,error:false};
 }catch{
  if(!modal.querySelector('.collection-ranking'))return;
  collectionRewardView={...collectionRewardView,loading:false,error:true};
 }
 renderCollectionRankingPanel();
}
async function claimCollectionReward(){
 if(collectionRewardBusy||Date.now()<COLLECTION_EVENT_202611.endsAt)return;
 collectionRewardBusy=true;
 const target=state,slot=currentSlot;
 try{
  const receipt=await collectionRewardApi.claim(slot);
  if(target!==state||slot!==currentSlot)throw new Error(`SLOT ${slot}に戻って報酬を受け取ってください`);
  collectionRewardView.receipt=receipt;
  if(collectionRewardDelivered(target,receipt)||session.storage.getItem(collectionRewardStorageKey())===receipt.id){
   toast('報酬は受取済みです');return;
  }
  const prior={gold:target.gold,materials:{...(target.materials??{})},inventory:structuredClone(target.inventory??[]),
   receipts:{...(target.collectionRewardReceipts??{})}};
  try{grantCollectionReward(target,receipt,slot);saveNow();}
  catch(err){target.gold=prior.gold;target.materials=prior.materials;target.inventory=prior.inventory;
   target.collectionRewardReceipts=prior.receipts;throw err;}
  try{session.storage.setItem(collectionRewardStorageKey(),receipt.id);}catch{}
  toast('ランキング報酬を受け取りました！');
  collectionRewardView.claimable=false;
  renderCollectionRankingPanel();
 }catch(error){toast(error?.message??'報酬を受け取れませんでした。');}
 finally{collectionRewardBusy=false;renderCollectionRankingPanel();}
}
function openCollectionRanking(){
 collectionRankingRequest++;
 collectionRankingView={rows:[],totalParticipants:0,page:1,myRank:null,myCount:0,loading:false,error:false};
 collectionRewardView={finalized:false,claimable:false,receipt:null,loading:false,error:false};
 openModal(collectionRankingViewMarkup());
 if(Date.now()>=COLLECTION_EVENT_202611.startsAt)void refreshCollectionRanking(1);
 if(Date.now()>=COLLECTION_EVENT_202611.endsAt)void refreshCollectionReward();
}
async function refreshCollectionRanking(page=1){
 if(!Number.isSafeInteger(page)||page<1||page>100000||!modal.querySelector('.collection-ranking'))return;
 const request=++collectionRankingRequest;
 collectionRankingView={...collectionRankingView,page,rows:[],loading:true,error:false};
 const render=()=>renderCollectionRankingPanel();
 render();
 try{
  const payload=await collectionRankingApi.page(page);
  if(collectionRankingRequest!==request||!modal.querySelector('.collection-ranking'))return;
  collectionRankingView={...collectionRankingView,...payload,loading:false,error:false};
 }catch{
  if(collectionRankingRequest!==request||!modal.querySelector('.collection-ranking'))return;
  collectionRankingView={...collectionRankingView,rows:[],loading:false,error:true};
 }finally{
  if(collectionRankingRequest===request)render();
 }
}
let gameUpdateAvailable=false;
let gameUpdateReloading=false;
const currentGameBuildId=String(window.__CHRONICLE_BUILD_ID__??'');
function updateGameNotice(){
 document.querySelectorAll('[data-game-update-dot]').forEach(node=>{node.hidden=!gameUpdateAvailable;});
}
async function pollForGameUpdate(){
 if(document.hidden||!currentGameBuildId||gameUpdateReloading)return;
 try{
  const newest=await fetchLatestGameBuild();
  gameUpdateAvailable=isGameUpdateAvailable(currentGameBuildId,newest);
  updateGameNotice();
 }catch{/* Offline players keep playing without interruption. */}
}
async function refreshGameToLatest(){
 if(gameUpdateReloading)return;
 gameUpdateReloading=true;
 try{
  // Save locally first; finish any queued account save before navigating away.
  if(!title.classList.contains('active')){
   saveNow();
   await flushAccountCloudSave(currentSlot);
  }
  const next=new URL(location.href);
  next.searchParams.set('updated',String(Date.now()));
  location.replace(next.toString());
 }catch(error){
  gameUpdateReloading=false;
  toast(error?.message??'更新できませんでした。もう一度お試しください。');
 }
}
function openSkillPresetRename(slot,characterId){
 if(battle||raidRoom)return toast('戦闘中は変更できません');
 if(!state.characters.some(x=>x.id===characterId))return;
 try{
  const current=getSkillPresetName(state,slot);
  openModal(`<h2>✏️ スキルセット名の変更</h2><p class="notice">セット${Number(slot)}の名前を変更できます。空欄で保存すると元の名前に戻ります。</p><label>セット名（最大24文字）<input data-skill-preset-name-input maxlength="24" value="${esc((state.skillPresetNames??[])[Number(slot)-1]??'')}" placeholder="${esc(current)}"></label><div class="hunt-actions"><button class="action-main" data-skill-preset-rename-confirm="${Number(slot)}" data-skill-character="${esc(characterId)}">保存する</button><button data-close-modal>キャンセル</button></div>`);
  modal.querySelector('[data-skill-preset-name-input]')?.focus();
 }catch(error){toast(error.message);}
}
function confirmSkillPresetRename(slot,characterId){
 if(battle||raidRoom)return toast('戦闘中は変更できません');
 if(!state.characters.some(x=>x.id===characterId))return;
 try{
  const name=modal.querySelector('[data-skill-preset-name-input]')?.value??'';
  const result=renameSkillPreset(state,slot,name);
  saveNow();closeModal();renderGameKeepVertical();
  toast(`「${result.name}」に変更しました`);
 }catch(error){toast(error.message);}
}
function openMore(){openModal(`<h2>📚 メニュー</h2><div class="menu-grid"><button data-open-auto-settings><b>オートプレイ設定</b></button><button data-game-update>🔄<b>更新</b><i class="game-update-dot" data-game-update-dot aria-label="更新あり" ${gameUpdateAvailable?'':'hidden'}></i><small>最新版を読み込む</small></button><button data-more="save">💾<b>セーブ</b></button><button data-feedback-open>📮<b>ご意見BOX</b></button>${Date.now()>=COLLECTION_EVENT_202611.startsAt?'<button data-collection-ranking-open>🏆<b>討伐の証ランキング</b></button>':''}${Date.now()>=HUNT_FESTIVAL.end?'<button data-hunt-archive>🎁<b>過去イベント報酬</b></button>':''}<button data-more="arena">🏟️<b>闘技大会（試作）</b></button><button data-more="guide">📖<b>冒険の達成状況</b></button><button data-more="bestiary">👹<b>魔物図鑑</b></button><button data-more="quests">📜<b>クエスト</b></button><button data-more="achievements">🏆<b>実績</b></button>${state.cycle>=2?'<button data-more="endgame">🌌<b>最終試練</b></button>':''}${hasFirstClear(state)?'<button data-masho-open>🌑<b>魔障の洞窟</b></button>':''}<button data-more="account">🔐<b>アカウント</b></button><button data-more="title">🏠<b>タイトルへ</b></button></div>`);}
function toggleParty(id){const ids=[...(state.activePartyIds??[])],has=ids.includes(id);if(has){if(ids.length===1)return toast('戦闘メンバーは1人以上必要です');setActiveParty(state,ids.filter(x=>x!==id));}else{if(ids.length>=4)return toast('戦闘メンバーは4人までです');setActiveParty(state,[...ids,id]);}saveNow();renderGame();}

wirePartyDockDrag({root:game,onReorder(fromId,toId){
 if(battle||raidRoom)return toast('戦闘中は隊列を変更できません');
 try{movePartyMember(state,fromId,toId);saveNow();renderGameKeepVertical();toast('🛡️ 編成順を保存しました');}
 catch(error){toast(error.message??'編成順を変更できませんでした');}
}});
document.addEventListener('click',e=>{
 const el=e.target.closest('button,[data-modal-backdrop]');if(!el)return;
 if(el.hasAttribute('data-hunt-title-details')){titleHuntDetailsOpen=true;return renderTitleHuntDetails();}
 if(el.hasAttribute('data-hunt-title-back')){titleHuntDetailsOpen=false;renderTitle();title.scrollTop=0;return;}
 if(el.hasAttribute('data-hunt-archive')){openModal(festivalArchiveMarkup());return void refreshFestival(true);}
 if(el.hasAttribute('data-collection-event-details'))return openModal(collectionEventDetailsMarkup());
 if(el.hasAttribute('data-collection-ranking-open'))return openCollectionRanking();
 if(el.hasAttribute('data-collection-reward-claim'))return void claimCollectionReward();
 if(el.hasAttribute('data-collection-reward-refresh'))return void refreshCollectionReward();
 if(el.hasAttribute('data-collection-ranking-refresh'))return void refreshCollectionRanking(collectionRankingView.page);
 if(el.hasAttribute('data-collection-ranking-page'))return void refreshCollectionRanking(Number(el.dataset.collectionRankingPage));
 if(el.hasAttribute('data-hunt-details'))return openModal(festivalDetailsMarkup());
 if(el.hasAttribute('data-hunt-raid-guide')){const card=game.querySelector('.raid-event-panel');if(card){card.scrollIntoView({behavior:'smooth',block:'start'});return;}return openModal(raidDetailsMarkup());}
 if(el.hasAttribute('data-hunt-refresh'))return void refreshFestival(true);
 if(el.hasAttribute('data-hunt-reward'))return openModal(festivalRewardMarkup(festivalView.data?.receipt));
 if(el.hasAttribute('data-hunt-claim'))return void claimFestival(el.dataset.huntClaim);
 if(el.hasAttribute('data-hunt-bonus'))return void claimFestivalBonus(Number(el.dataset.huntBonus));
 if(el.hasAttribute('data-hunt-debug')&&festivalView.debug){festivalApi.change(el.dataset.huntDebug);return void refreshFestival(true);}
 if(el.matches('[data-close-modal]')||e.target.matches?.('[data-modal-backdrop]')){if(raidRoom||raidJoinBusy){if(raidRoom&&raidEndedReason!=='timeout')void tryClaimRaidReward(raidRoom,{silent:false});cancelRaidSession();raidLobbyPoller.start();renderGameKeepVertical();}return closeModal();}
 if(el.hasAttribute('data-auto-stop')){if(raidRoom){raidAutoStopped=true;clearRaidAuto();}else if(battle){battle.autoPlayStopped=true;clearNormalAuto();}document.querySelectorAll('[data-auto-stop]').forEach(button=>{button.disabled=true;button.textContent='手動';});toast('この戦闘だけオートを停止しました。次の戦闘では設定どおり再開します');return;}
 if(el.hasAttribute('data-game-update'))return void refreshGameToLatest();
 if(el.hasAttribute('data-skill-preset-rename-confirm'))return confirmSkillPresetRename(el.dataset.skillPresetRenameConfirm,el.dataset.skillCharacter);
 if(el.hasAttribute('data-feedback-open'))return openFeedback();
 if(el.hasAttribute('data-feedback-submit'))return void submitFeedback();
 if(el.hasAttribute('data-feedback-mine'))return void showMyFeedback();
 if(el.hasAttribute('data-open-auto-settings'))return displayAutoSettings();
 if(el.dataset.autoEnabled){saveAutoSettings({enabled:el.dataset.autoEnabled==='on'});return displayAutoSettings();}
 if(el.dataset.autoSpeed){saveAutoSettings({speed:Number(el.dataset.autoSpeed)});return displayAutoSettings();}
 if(el.dataset.autoStrategy){saveAutoSettings({strategy:el.dataset.autoStrategy});return displayAutoSettings();}
 if(el.hasAttribute('data-auto-settings-close')){closeModal();return openMore();}
 if(el.hasAttribute('data-account-open'))return openAccountHome();
 if(el.hasAttribute('data-account-create'))return openAccountCreate();
 if(el.hasAttribute('data-account-login'))return openAccountLogin();
 if(el.hasAttribute('data-account-forgot'))return openAccountRecovery();
 if(el.hasAttribute('data-account-submit-create'))return void submitAccountCreate();
 if(el.hasAttribute('data-account-submit-login'))return void submitAccountLogin();
 if(el.hasAttribute('data-account-submit-reset'))return void submitAccountReset();
 if(el.hasAttribute('data-account-show-recovery'))return void showAccountRecovery();
 if(el.hasAttribute('data-account-logout'))return void logoutAccount();
 if(el.dataset.accountCopyRecovery){const code=el.dataset.accountCopyRecovery;if(navigator.clipboard?.writeText){void navigator.clipboard.writeText(code).then(()=>toast('復帰コードをコピーしました')).catch(()=>toast('復帰コードを選択してコピーしてください'));}else toast('復帰コードを選択してコピーしてください');return;}
 if(el.hasAttribute('data-raid-notice'))return openModal(raidDetailsMarkup());
 if(el.hasAttribute('data-eclipse-event-notice'))return openModal(eclipseEventDetailsMarkup());
 if(el.hasAttribute('data-event-notice'))return openModal(halloweenEventDetailsMarkup());
 if(el.hasAttribute('data-twin-star-event-notice'))return openModal(twinStarFestivalDetailsMarkup());
 if(el.hasAttribute('data-training-event-notice'))return openModal(trainingFestivalDetailsMarkup());
 if(el.hasAttribute('data-job-release-notice'))return openModal(jobReleaseDetailsMarkup());
 if(el.hasAttribute('data-hunt-count-apology-npc'))return void openHuntCountApologyNpc();
 if(el.hasAttribute('data-hunt-count-apology-claim'))return void claimHuntCountApology();
 if(el.hasAttribute('data-ranking-apology-npc'))return openRankingApologyNpc();
 if(el.hasAttribute('data-ranking-apology-claim'))return claimRankingApology();
 if(el.hasAttribute('data-raid-start'))return openRaidBattle(el);
 if(el.hasAttribute('data-raid-open-skills'))return showRaidSkillPicker();
 if(el.hasAttribute('data-raid-open-items'))return showRaidItemPicker();
 if(el.hasAttribute('data-raid-submenu-back'))return renderRaidBattleScreen();
 if(el.hasAttribute('data-raid-retry')){cancelRaidSession();closeModal();return openRaidBattle();}
 if(el.dataset.raidUseSkill)return chooseRaidSkill(el.dataset.raidUseSkill);
 if(el.dataset.raidSkillTarget)return chooseRaidSkillTarget(el.dataset.raidSkillId,el.dataset.raidSkillTarget);
 if(el.dataset.raidUseItem)return showRaidItemTargets(el.dataset.raidUseItem);
 if(el.dataset.raidItemTarget)return chooseRaidItemTarget(el.dataset.raidItemId,el.dataset.raidItemTarget);
 if(el.dataset.raidAction)return doRaidAction(el.dataset.raidAction);
 if(el.hasAttribute('data-raid-exit')){if(raidEndedReason!=='timeout')void tryClaimRaidReward(raidRoom,{silent:false});cancelRaidSession();closeModal();renderGame();raidLobbyPoller.start();return toast('レイドから退出しました。');}
 if(el.hasAttribute('data-eclipse-event-start'))return startEclipseWave(1);
 if(el.hasAttribute('data-twin-star-festival-start'))return startTrainingFestivalWave(1,TWIN_STAR_FESTIVAL);
 if(el.hasAttribute('data-training-festival-start'))return startTrainingFestivalWave(1);
 if(el.hasAttribute('data-halloween-start'))return startHalloweenWave(1);
 if(el.dataset.action==='explore')return startBattle(makeEncounterGroup(state),{exploration:true});
 if(el.hasAttribute('data-explore-continue')){if(view!=='exploreResult'||battle)return;view='adventure';return startBattle(makeEncounterGroup(state),{exploration:true});}
 if(el.hasAttribute('data-explore-return')){if(view!=='exploreResult'||battle)return;view='town';saveNow();return renderGame();}
 if(el.dataset.action==='boss'){if(canChallengeBoss(state))startBattle(makeRegionBoss(state),{boss:true});return;}
 if(el.dataset.action==='gather'){try{const scrollTop=game.querySelector('.game-scroll')?.scrollTop??0;const r=gatherAtPoint(state,getGatherPointForState(state));updateQuestProgress(state,{type:'collect',id:r.materialId,amount:r.qty});saveNow();renderGame();const scroller=game.querySelector('.game-scroll');if(scroller)scroller.scrollTop=scrollTop;toast(`採取：${getItemDef(r.materialId).name} ×${r.qty}`);}catch(err){toast(err.message);}return;}
 if(el.dataset.action==='town'){if(['field','coast','snow'].includes(state.adventure.regionId))recordSpecialProgress(state,'chapel',{id:state.adventure.regionId});view='town';saveNow();return renderGame();}
 if(el.dataset.region){travelToRegion(state,el.dataset.region);saveNow();return renderGame();}
 if(el.dataset.town==='field'){view='adventure';return renderGame();}
 if(el.dataset.town==='market')return enterMarket();
 if(el.hasAttribute('data-market-back')){view='town';return renderGame();}
 if(el.dataset.marketTab){marketUi.tab=el.dataset.marketTab;renderGameKeepVertical();return void refreshMarketView();}
 if(el.dataset.marketHistoryFocus){marketUi.historyFocus=el.dataset.marketHistoryFocus==='sell'?'sell':'buy';return renderGameKeepVertical();}
 if(el.dataset.marketCategory){marketUi.browse.category=el.dataset.marketCategory;return void refreshMarketView();}
 if(el.hasAttribute('data-market-open-store'))return void marketOpenStore();
 if(el.hasAttribute('data-market-open-listing'))return marketOpenListing();
 if(el.dataset.marketListingCategory)return setMarketListingCategory(el.dataset.marketListingCategory);
 if(el.dataset.marketQtyAdjust)return adjustMarketListingQuantity(el.dataset.marketQtyAdjust);
 if(el.hasAttribute('data-market-submit-listing'))return void marketSubmitListing();
 if(el.dataset.marketSavePrice)return void marketUpdatePrice(el.dataset.marketSavePrice);
 if(el.dataset.marketCancel)return void marketCancelListing(el.dataset.marketCancel);
 if(el.dataset.marketBuy)return void marketBuy(el.dataset.marketBuy);
 if(el.dataset.town==='inn'){try{const price=getInnPrice(state);restAtInn(state,`${state.adventure.regionId}-inn`);saveNow();renderGame();return toast(`ぐっすり休んだ。${price}G支払い、HP・MPと採掘回数が回復！`);}catch(err){return toast(err.message);}}
 if(el.dataset.town==='bank')return openBank();
 if(el.dataset.bankQuick){const available=el.dataset.bankQuick==='cash'?Math.max(0,Math.floor(state.gold??0)):el.dataset.bankQuick==='bank'?bankBalance(state):Number(el.dataset.bankQuick);const input=modal.querySelector('[data-bank-amount]');if(input)input.value=String(available);return;}
 if(el.dataset.bankAction){try{const input=modal.querySelector('[data-bank-amount]'),amount=input?.value;const result=el.dataset.bankAction==='deposit'?depositGold(state,amount):withdrawGold(state,amount);saveNow();openBank();toast(`${result.amount.toLocaleString('ja-JP')}Gを${el.dataset.bankAction==='deposit'?'預けました':'引き出しました'}`);}catch(err){toast(err.message);}return;}
 if(el.dataset.town==='shop')return openShop();
 if(el.dataset.shopCategory)return syncShopCategory(el.dataset.shopCategory);
 if(el.dataset.town==='forge'){view='forge';state.forgeCategory='home';return renderGame();}
 if(el.dataset.town==='jobs'){view='jobs';return renderGame();}
 if(el.hasAttribute('data-unequip-all')){try{const r=unequipAllEquipment(state,selectedId());if(!r.removed)return toast('外す装備がありません');saveNow();renderGameKeepVertical();toast(`${r.removed}部位の装備を外しました。所持品はそのままです`);}catch(err){toast(err.message);}return;}
 if(el.dataset.equipLock){try{const r=toggleEquipmentLock(state,el.dataset.equipLock);saveNow();renderGameKeepVertical();toast(r.locked?'装備をロックしました':'装備のロックを解除しました');}catch(err){toast(err.message);}return;}
 if(el.dataset.equipSellAsk)return openEquipmentSellConfirm(el.dataset.equipSellAsk);
 if(el.dataset.equipSellConfirm){try{const r=sellEquipmentInstance(state,el.dataset.equipSellConfirm);saveNow();closeModal();renderGameKeepVertical();toast(`装備1個を売却して ${r.total.toLocaleString('ja-JP')}G獲得！`);}catch(err){toast(err.message);}return;}
 if(el.dataset.equip){try{equipItem(state,selectedId(),el.dataset.equip,el.dataset.slot);saveNow();renderGameKeepVertical();toast('装備しました');}catch(err){toast(err.message);}return;}
 if(el.hasAttribute('data-recommend-equipment')){try{const r=equipRecommendedEquipment(state,selectedId());saveNow();renderGameKeepVertical();toast(r.changedSlots.length?`おすすめ装備に変更しました（${r.changedSlots.length}部位）`:'現在の装備がおすすめです');}catch(err){toast(err.message);}return;}
 if(el.dataset.arenaStart)return void startArenaMatch(el.dataset.arenaStart);
 if(el.hasAttribute('data-arena-back')){view='adventure';return renderGame();}
 if(el.hasAttribute('data-arena-retry')){if(arenaSession){arenaSession.claimError=false;closeModal();void finishArenaBattle();}return;}
 if(el.hasAttribute('data-arena-resume'))return void resumeArenaMatch();
 if(el.dataset.arenaCraft)return void arenaMutation('craft',el.dataset.arenaCraft);
 if(el.dataset.arenaEnhance)return void arenaMutation('enhance',el.dataset.arenaEnhance);
 if(el.dataset.forgePage){state.forgeCategory=el.dataset.forgePage;saveNow();return renderGame();}
 if(el.dataset.forgeCategory){state.forgeCategory=el.dataset.forgeCategory;saveNow();return renderGame();}
 if(el.dataset.forgeAvailability){state.ui??={};state.ui.forgeAvailability=el.dataset.forgeAvailability;return renderGameKeepVertical();}
 if(el.dataset.forgeArmorSlot){state.ui??={};state.ui.forgeArmorSlot=el.dataset.forgeArmorSlot;return renderGameKeepVertical();}
 if(el.dataset.forgeRaidArmorSlot){state.ui??={};state.ui.forgeRaidArmorSlot=el.dataset.forgeRaidArmorSlot;return renderGameKeepVertical();}
 if(el.dataset.forgeEnhanceArmorSlot){state.ui??={};state.ui.forgeEnhanceArmorSlot=el.dataset.forgeEnhanceArmorSlot;return renderGameKeepVertical();}
 if(el.dataset.forgeEventArmorSlot){state.ui??={};state.ui.forgeEventArmorSlot=el.dataset.forgeEventArmorSlot;return renderGameKeepVertical();}
 if(el.dataset.forgeRaidJob){state.ui??={};state.ui.forgeRaidJob=el.dataset.forgeRaidJob;return renderGameKeepVertical();}
 if(el.dataset.forgeEnhanceJob){state.ui??={};state.ui.forgeEnhanceJob=el.dataset.forgeEnhanceJob;return renderGameKeepVertical();}
 if(el.dataset.forgeJob){state.ui??={};state.ui.forgeJob=el.dataset.forgeJob;return renderGameKeepVertical();}
 if(el.dataset.forgeEventCategory){state.ui??={};state.ui.forgeEventCategory=el.dataset.forgeEventCategory;return renderGameKeepVertical();}
 if(el.dataset.forgeEventJob){state.ui??={};state.ui.forgeEventJob=el.dataset.forgeEventJob;return renderGameKeepVertical();}
 if(el.dataset.forgeEnhanceCategory){state.ui??={};state.ui.forgeEnhanceCategory=el.dataset.forgeEnhanceCategory;return renderGameKeepVertical();}
 if(el.hasAttribute('data-craft-promise-chronicle')){try{craftPromiseChronicle(state);saveNow();renderGameKeepVertical();toast('約束のクロニクルを復元した！');}catch(err){toast(err.message);}return;}
 if(el.dataset.craft){try{const made=craftItem(state,el.dataset.craft);saveNow();renderGameKeepVertical();toast(made.outputKind==='material'?`精錬成功！ ${getItemDef(made.outputId).name} ×${made.quantity}`:'生産成功！ 装備が完成しました');}catch(err){toast(err.message);}return;}
 if(el.hasAttribute('data-toggle-forge-charm')){state.ui??={};state.ui.useForgeCharm=!state.ui.useForgeCharm;saveNow();return renderGameKeepVertical();}
 if(el.dataset.forge){try{const r=enhanceEquipment(state,el.dataset.forge,{useCharm:el.dataset.useCharm==='true'});if(r.level===10)recordAchievementEvent(state,{type:'forge10'});if(r.unequipped?.length)for(const c of state.characters??[]){const {maxHP,maxMP}=getCharacterResourceCaps(state,c);c.hp=Math.max(0,Math.min(Number(c.hp??0),maxHP));c.mp=Math.max(0,Math.min(Number(c.mp??0),maxMP));}saveNow();renderGameKeepVertical();toast(r.success?`強化成功！ +${r.level}${r.unequipped?.length?' / 必要職業Lv不足のため装備を自動解除':''}`:'強化失敗…');}catch(err){toast(err.message);}return;}
 if(el.hasAttribute('data-open-sell-shop'))return openSellShop();
 if(el.hasAttribute('data-back-shop'))return openShop();
 if(el.dataset.itemCategory){state.ui??={};state.ui.itemCategory=el.dataset.itemCategory;return renderGame();}
 if(el.dataset.equipmentCategory){state.ui??={};state.ui.equipmentCategory=el.dataset.equipmentCategory;syncEquipmentCandidateFilters();return;}
 if(el.hasAttribute('data-equipment-search-clear')){equipmentSearch='';const input=game.querySelector('[data-equipment-search]');if(input){input.value='';input.focus();}syncEquipmentCandidateFilters();return;}
 if(el.dataset.sellCategory){const panel=el.closest('.shop-sell-screen');if(!panel)return;const category=el.dataset.sellCategory;panel.querySelectorAll('[data-sell-category]').forEach(b=>b.classList.toggle('active',b.dataset.sellCategory===category));panel.querySelectorAll('[data-sell-item]').forEach(row=>{row.hidden=category!=='all'&&row.dataset.sellCategoryValue!==category;});return;}
 if(el.dataset.sellItem){const [kind,id]=el.dataset.sellItem.split(':');return openSellConfirm(kind,id,1);}
 if(el.dataset.sellAdjust){const [kind,id]=el.dataset.sellRef.split(':');const available=getSellableQuantity(state,kind,id);const current=Number(el.dataset.sellCurrent)||1;const next=el.dataset.sellAdjust==='max'?available:Math.max(1,Math.min(available,current+Number(el.dataset.sellAdjust)));return openSellConfirm(kind,id,next);}
 if(el.dataset.confirmSell){const [kind,id]=el.dataset.confirmSell.split(':');try{const opts={kind,id,quantity:Number(el.dataset.sellQty)||1};const r=sell(state,opts);saveNow();closeModal();toast(`${r.quantity}個売却して ${r.total}G 獲得！`);}catch(err){toast(err.message);}return;}
 if(el.hasAttribute('data-shop-qty-pick')){const max=Number(modal.querySelector('[data-shop-buy-qty-input]')?.max??1);shopBuyQuantityUpdate(el.dataset.shopQtyPick==='max'?max:Number(el.dataset.shopQtyPick));return;}
 if(el.hasAttribute('data-shop-buy-confirm')){try{const input=modal.querySelector('[data-shop-buy-qty-input]');const qty=el.hasAttribute('data-shop-buy-single')?1:Number(input?.value);if(!Number.isInteger(qty)||qty<1||qty>999||qty>(input?Number(input.max):1))throw new Error('購入個数が不正です');const item=buyItem(state,el.dataset.shopBuyShop,el.dataset.shopBuyConfirm,qty);saveNow();openShop();toast(`${qty.toLocaleString('ja-JP')}個購入しました！`);}catch(err){toast(err.message);}return;}
 if(el.dataset.buy)return openShopBuyConfirm(el.dataset.shopId??'starter',el.dataset.buy);
 if(el.dataset.battleItemTarget)return useBattleItemTarget(el.dataset.battleItemId,el.dataset.battleItemTarget);
 if(el.dataset.battleItem)return openBattleItemTargets(el.dataset.battleItem);
 if(el.dataset.confirmBoostScroll){try{syncPlayTime();const result=useBoostScroll(state,el.dataset.confirmBoostScroll);saveNow();closeModal();renderGame();toast(`${result.name}！ ${result.hours}時間の2倍効果が発動！`);}catch(err){toast(err.message);}return;}
 if(el.dataset.fieldItemTarget)return useFieldItemTarget(el.dataset.fieldItemId,el.dataset.fieldItemTarget);
 if(el.dataset.fieldItem){return getItemDef(el.dataset.fieldItem).boostKind?openBoostScrollConfirm(el.dataset.fieldItem):openFieldItemTargets(el.dataset.fieldItem);}
 if(el.dataset.command==='undo'){undoPlannedAction(battle);return renderBattle();}
 if(el.dataset.command==='attack'){const enemies=battle.actors.filter(x=>x.side==='enemy'&&x.hp>0);if(enemies.length===1)return act({type:'attack',targetId:enemies[0].id});return openEnemyTargets('attack');}
 if(el.dataset.command==='skills')return openSkills();
 if(el.dataset.command==='item')return openItems();
 if(el.dataset.command==='defend')return act({type:'defend'});
 if(el.dataset.command==='escape'){const r=attemptEscape(battle);if(r.success){syncBattlePartyToState(state,battle);battle=null;view='adventure';renderGame();toast(r.message);}else{battle.log.push(r.message);act({type:'wait'});}return;}
 if(el.dataset.enemyTarget){const id=el.dataset.enemyTarget,mode=el.dataset.targetMode,skillId=el.dataset.targetSkill;closeModal();if(mode==='attack')return act({type:'attack',targetId:id});if(mode==='skill')return useSkillTarget(skillId,id);}
 if(el.dataset.skillTarget)return useSkillTarget(el.dataset.skillId,el.dataset.skillTarget);
 if(el.dataset.renameCharacter)return openRenameCharacter(el.dataset.renameCharacter);
 if(el.dataset.confirmRename)return confirmRename(el.dataset.confirmRename);
 if(el.dataset.resetName)return resetName(el.dataset.resetName);
 if(el.dataset.useSkill)return useSkill(el.dataset.useSkill);
 if(el.dataset.characterSkills){if(battle||raidRoom)return toast('特技・魔法のセットは戦闘前に変更してください');if(!state.characters.some(c=>c.id===el.dataset.characterSkills))return;state.ui??={};state.ui.skillReturnView=view;state.selectedCharacterId=el.dataset.characterSkills;view='skillList';return renderGame();}
 if(el.hasAttribute('data-skill-list-back')){view=['party','jobs','status','equipment'].includes(state.ui?.skillReturnView)?state.ui.skillReturnView:'party';return renderGame();}
 if(el.dataset.skillPresetRename){openSkillPresetRename(el.dataset.skillPresetRename,el.dataset.skillCharacter);return;}
 if(el.dataset.skillPresetSave){if(battle||raidRoom)return toast('戦闘中は変更できません');try{const r=saveSkillPreset(state,el.dataset.skillCharacter,el.dataset.skillPresetSave);saveNow();renderGameKeepVertical();toast(`セット${r.slot}に${r.count}個のスキルを保存しました`);}catch(err){toast(err.message);}return;}
 if(el.dataset.skillPresetApply){if(battle||raidRoom)return toast('戦闘中は変更できません');try{const r=applySkillPreset(state,el.dataset.skillCharacter,el.dataset.skillPresetApply);saveNow();renderGameKeepVertical();toast(`セット${r.slot}を適用：${r.equipped}個${r.skipped?'（使用不可'+r.skipped+'個を除外）':''}`);}catch(err){toast(err.message);}return;}
 if(el.dataset.autoBattleSkills){if(battle||raidRoom)return toast('戦闘中は変更できません');const c=state.characters.find(x=>x.id===el.dataset.autoBattleSkills);if(!c)return;try{const ids=getRecommendedBattleSkillIds(c);if(!ids.length)return toast('おまかせで選べる習得済みの技がありません');setBattleSkillLoadout(c,ids);const summary=getRecommendedBattleSkillSummary(c,ids);saveNow();renderGameKeepVertical();toast(`おまかせ編成：${summary||ids.length+'個'}をセットしました`);}catch(err){toast(err.message);}return;}
 if(el.dataset.toggleBattleSkill){if(battle||raidRoom)return toast('戦闘中は変更できません');const c=state.characters.find(x=>x.id===el.dataset.skillCharacter);if(!c)return;try{const ids=getSelectedSkillIds(c),id=el.dataset.toggleBattleSkill;setBattleSkillLoadout(c,ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);saveNow();renderGameKeepVertical();}catch(err){toast(err.message);}return;}
 if(el.dataset.characterId){state.selectedCharacterId=el.dataset.characterId;saveNow();return renderGame();}
 if(el.dataset.partyShift){
  if(battle||raidRoom)return toast('戦闘中は隊列を変更できません');
  try{shiftPartyMember(state,el.dataset.partyShift,Number(el.dataset.partyDir));saveNow();renderGameKeepVertical();toast('🛡️ 編成順を保存しました');}
  catch(error){toast(error.message??'編成順を変更できませんでした');}
  return;
 }
 if(el.dataset.toggleParty)return toggleParty(el.dataset.toggleParty);
 if(el.hasAttribute('data-masho-open')){if(!hasFirstClear(state))return toast('一周目クリアで解放されます');setMashoResultVisibility(state,false);view='masho';closeModal();return renderGame();}
 if(el.hasAttribute('data-masho-back')){setMashoResultVisibility(state,false);view='adventure';return renderGame();}
 if(el.hasAttribute('data-masho-dismiss-result')){setMashoResultVisibility(state,false);saveNow();return renderGameKeepVertical();}
 if(el.dataset.mashoJob){state.ui??={};state.ui.mashoJob=el.dataset.mashoJob;return renderGameKeepVertical();}
 if(el.dataset.mashoRun10||el.dataset.mashoRunConfirm){if(battle)return;try{const floor=Number(el.dataset.mashoRun10??el.dataset.mashoRunConfirm);if(!Number.isInteger(floor)||!canEnterMashoFloor(state,floor)||state.mashoCave?.highestCleared<floor)throw new Error('クリア済みの階層のみ10連戦できます');mashoRun=createMashoRun(floor);state.mashoCave.lastRunSummary=null;setMashoResultVisibility(state,false);return startMashoFloorBattle(floor);}catch(err){mashoRun=null;toast(err.message);return;}}
 if(el.hasAttribute('data-masho-run-queue')){if(!mashoRun||!battle?.mashoRun)return;toggleMashoNextTen(mashoRun);battle.mashoRun.queueNextTen=mashoRun.queueNextTen;renderBattle();toast(mashoRun.queueNextTen?'10連戦終了後に追加10戦を予約しました':'追加10戦の予約を解除しました');return;}
 if(el.hasAttribute('data-masho-run-stop')){if(!mashoRun||!battle?.mashoRun)return;mashoRun.stopAfterCurrent=true;mashoRun.queueNextTen=false;battle.mashoRun.stopAfterCurrent=true;battle.mashoRun.queueNextTen=false;renderBattle();toast('この戦闘に勝利したら連戦を終了します');return;}
 if(el.dataset.mashoFloor){if(battle)return;try{mashoRun=null;return startMashoFloorBattle(Number(el.dataset.mashoFloor));}catch(err){toast(err.message);return;}}
 if(el.hasAttribute('data-eidel-replay')){if(!state.endgame?.eidelEnding&&!state.endgame?.complete)return;state.ui??={};state.ui.eidelEndingView=state.endgame?.complete?'saved':state.endgame.eidelEnding;view='eidelEnding';closeModal();return renderGame();}
 if(el.hasAttribute('data-eidel')){try{const enemy=createEidelEnemy(state);battleMeta={regionId:'endgame',boss:true,rematch:false,enemy,eidel:true};battle=createAdventureBattle(enemy,{isBoss:true});battle.gold=enemy.gold??0;startTurn(battle);return renderBattle();}catch(err){toast(err.message);return;}}
 if(el.dataset.oathbreaker){try{const enemy=createOathbreakerEnemy(state,el.dataset.oathbreaker);battleMeta={regionId:'endgame',boss:true,rematch:false,enemy,oathbreaker:el.dataset.oathbreaker};battle=createAdventureBattle(enemy,{isBoss:true});battle.gold=enemy.gold??0;battle.exp=enemy.exp??0;battle.jobExp=enemy.jobExp??0;startTurn(battle);closeModal();return renderBattle();}catch(err){toast(err.message);return;}}
 if(el.dataset.trainingArea){try{const enemy=makeTrainingEnemy(state,el.dataset.trainingArea);closeModal();return startBattle(enemy,{trainingArea:el.dataset.trainingArea});}catch(err){toast(err.message);return;}}
 if(el.dataset.difficulty){try{setDifficulty(state,el.dataset.difficulty);saveNow();renderGame();toast(`難易度：${el.dataset.difficulty}`);}catch(err){toast(err.message);}return;}
 if(el.dataset.legendTrial){try{const enemy=makeLegendaryTrialEnemy(state,el.dataset.legendTrial);battleMeta={regionId:'endgame',boss:true,rematch:false,enemy,legendTrial:el.dataset.legendTrial};battle=createAdventureBattle(enemy,{isBoss:true});startTurn(battle);return renderBattle();}catch(err){toast(err.message);}return;}
 if(el.dataset.trueEvolve){try{evolveLegendaryToTrue(state,el.dataset.trueEvolve);saveNow();renderGame();toast('伝説装備が「真」へ進化！');}catch(err){toast(err.message);}return;}
 if(el.dataset.endgameBoss){try{const enemy=makeEndgameBoss(state,el.dataset.endgameBoss);battleMeta={regionId:'endgame',boss:true,rematch:false,enemy,endgameBoss:el.dataset.endgameBoss};battle=createAdventureBattle(enemy,{isBoss:true});startTurn(battle);return renderBattle();}catch(err){toast(err.message);return;}}
 if(el.dataset.rematch){try{createBestiaryRematch(state,el.dataset.rematch);const enemy=makeBestiaryRematchEnemy(state,el.dataset.rematch);return startBattle(enemy,{rematch:true});}catch(err){toast(err.message);return;}}
 if(el.dataset.npc)return openModal(npcConversationMarkup(state,el.dataset.npc));
 if(el.dataset.npcGuildHunt){try{if(el.dataset.npcId!=='guildMaster')throw new Error('ギルドマスターから依頼を受けてください');const enemy=makeGuildHuntEnemy(state,el.dataset.npcGuildHunt);closeModal();return startBattle(enemy,{guildQuestId:el.dataset.npcGuildHunt});}catch(err){toast(err.message);return;}}
 if(el.dataset.npcAccept){try{acceptQuestFromNpc(state,el.dataset.npcId,el.dataset.npcAccept);saveNow();openModal(npcConversationMarkup(state,el.dataset.npcId));toast('クエストを受注しました');}catch(err){toast(err.message);}return;}
 if(el.dataset.npcProgress){try{const q=QUESTS[el.dataset.npcProgress];const event=q.goal.type==='talk'?{type:'talk',id:q.goal.id,amount:1}:q.goal.type==='rescue'?{type:'rescue',amount:1}:{type:'story',id:q.goal.id,amount:1};updateQuestProgress(state,event);saveNow();openModal(npcConversationMarkup(state,el.dataset.npcId));}catch(err){toast(err.message);}return;}
 if(el.dataset.npcReport){try{const before=state.gold??0;reportQuestToNpc(state,el.dataset.npcId,el.dataset.npcReport);const gain=(state.gold??0)-before;saveNow();if(view==='quests'||QUESTS[el.dataset.npcReport]?.specialJob)renderGame();openModal(npcConversationMarkup(state,el.dataset.npcId));toast(`クエスト達成！${gain?` ${gain}G獲得`:''}`);}catch(err){toast(err.message);}return;}
 if(el.dataset.npcTrial){try{const enemy=createSpecialTrialEnemy(state,el.dataset.npcTrial);battleMeta={regionId:state.adventure.regionId,boss:true,rematch:false,enemy,specialJob:el.dataset.npcTrial};battle=createAdventureBattle(enemy,{isBoss:true});battle.gold=enemy.gold??0;startTurn(battle);closeModal();return renderBattle();}catch(err){toast(err.message);return;}}
 if(el.dataset.specialTrial){try{const enemy=createSpecialTrialEnemy(state,el.dataset.specialTrial);battleMeta={regionId:state.adventure.regionId,boss:true,rematch:false,enemy,specialJob:el.dataset.specialTrial};battle=createAdventureBattle(enemy,{isBoss:true});startTurn(battle);closeModal();return renderBattle();}catch(err){toast(err.message);return;}}
 if(el.dataset.jobId){try{changeJob(state,selectedId(),el.dataset.jobId);const removed=state.lastJobChangeUnequipped?.length??0;saveNow();renderGame();toast(`転職：${JOBS[el.dataset.jobId]?.name}${removed?` / 装備${removed}個を自動解除`:''}`);}catch(err){toast(err.message);}return;}
 if(el.dataset.nav){if(el.dataset.nav==='more')return openMore();view=el.dataset.nav;return renderGame();}
 if(el.dataset.more){if(el.dataset.more==='arena')return void openArena();if(el.dataset.more==='save'){saveNow();closeModal();return toast('セーブしました');}if(el.dataset.more==='account')return openAccountHome();if(el.dataset.more==='title'){clearNormalAuto();clearRaidAuto();saveNow();playStartedAt=null;boostClockLastAt=null;closeModal();game.classList.remove('active');battleScreen.classList.remove('active');title.classList.add('active');renderTitle();return;}view=el.dataset.more;closeModal();renderGame();return;}
 if(el.dataset.ending==='ngplus'){startAdventureNewGamePlus(state);view='adventure';saveNow();return renderGame();}
 if(el.dataset.ending==='continue'){view='adventure';return renderGame();}
});

let titleUpdateDetailsOpen=false;
let titleUpdatePage=1;
let titleHuntDetailsOpen=false;
function renderTitleHuntDetails(){
 title.innerHTML=`<div class="title-card hunt-title-details" data-no-pixel-icon><button class="hunt-details-back" data-hunt-title-back>← タイトルへ戻る</button><article class="event-details"><img class="event-detail-banner" src="assets/events/chronicle-hunt-title-202610.webp" alt="クロニクル大討伐祭">${festivalDetailsMarkup()}</article><button class="hunt-details-back" data-hunt-title-back>← タイトルへ戻る</button></div>`;
 title.scrollTop=0;title.querySelector('[data-hunt-title-back]')?.focus({preventScroll:true});
}
const titleHeaderMarkup="<header class=\"forest-title-heading\"><div class=\"title-gem\" aria-hidden=\"true\">⚔</div><p class=\"eyebrow\">CHRONICLE OF PROMISE</p><h1>約束の<br><span>クロニクル</span></h1><div class=\"title-leaf-divider\" aria-hidden=\"true\">❧ ── ✧ ── ☙</div></header>";
function renderTitle(){if(titleHuntDetailsOpen)return;scheduleEventRefresh();if(!accountState.ready){
 title.innerHTML=`<div class="title-card">${titleHeaderMarkup}${titleUpdatesMarkup(titleUpdateDetailsOpen,titleUpdatePage)}${festivalTitleMarkup()}${titleEventNoticeMarkup()}${collectionEventBannerMarkup()}${collectionRankingTitleButton()}<p class="title-copy" role="status">アカウントとセーブデータを確認しています…</p></div>`;
 return;
}const slots=listSaveSlots(session);title.innerHTML=`<div class="title-card">${titleHeaderMarkup}${titleUpdatesMarkup(titleUpdateDetailsOpen,titleUpdatePage)}${festivalTitleMarkup()}${titleEventNoticeMarkup()}${collectionEventBannerMarkup()}${collectionRankingTitleButton()}<p class="title-copy">セーブデータを選んでください。</p><div class="save-slot-list">${slots.map(x=>`<section class="save-slot ${x.empty?'is-empty':'has-save'}"><strong><span aria-hidden="true">❧</span> SLOT ${x.slot} <span aria-hidden="true">☙</span></strong><small>${x.empty?'空きスロット':`${esc(x.heroName)} / Lv${x.heroLevel} / ${x.cycle}周目<br><span class="save-playtime">⏱ プレイ時間 ${formatPlayTime(x.playTimeSeconds)}</span>`}</small><div>${x.empty?`<button class="action-main" data-slot-new="${x.slot}">このスロットではじめる</button>`:`<button class="action-main" data-slot-load="${x.slot}">つづきから</button><button data-slot-new="${x.slot}">最初から</button><button data-slot-delete="${x.slot}">削除</button>`}</div></section>`).join('')}</div><p class="save-note">セーブデータは5つまで作成できます。</p><p class="save-migration-note">旧セーブデータはSLOT 1へ自動移行されます</p>${accountTitleMarkup()}</div>`;}
title.addEventListener('toggle',e=>{if(e.target?.matches?.('[data-title-update-details]')){titleUpdateDetailsOpen=e.target.open;const summary=e.target.querySelector('summary');if(summary)summary.firstChild.textContent=titleUpdateDetailsOpen?'詳しい更新内容を閉じる':'詳しい更新内容を見る';}},true);
title.addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;if(el.hasAttribute('data-title-update-page')){const next=Number(el.dataset.titleUpdatePage);if(next===1||next===2){titleUpdatePage=next;const panel=title.querySelector('.title-update-panel');if(panel)panel.outerHTML=titleUpdatesMarkup(titleUpdateDetailsOpen,titleUpdatePage);}return;}if(el.dataset.slotLoad)return continueGame(el.dataset.slotLoad);if(el.dataset.slotNew){if(!listSaveSlots(session)[Number(el.dataset.slotNew)-1]?.empty&&!confirm('このスロットを最初から始めますか？'))return;return startFresh(el.dataset.slotNew);}if(el.dataset.slotDelete){if(confirm(`SLOT ${el.dataset.slotDelete}を削除しますか？`)){deleteSlot(session,el.dataset.slotDelete);if(session.mode==='user'&&accountState.linked)void accountApi.deleteSlot(Number(el.dataset.slotDelete)).catch(()=>{});renderTitle();}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(playStartedAt!==null){saveNow();playStartedAt=null;boostClockLastAt=null;}}else if(!title.classList.contains('active')&&playStartedAt===null){playStartedAt=Date.now();boostClockLastAt=playStartedAt;lastPlayerInputAt=playStartedAt;}if(!document.hidden){if(battle&&!battlePlayback)scheduleNormalAuto();if(raidRoom&&!raidTurnExecuting)scheduleRaidAuto();void refreshFestival(true);if(raidRoom)void raidPoller.refresh();else if(raidLobbyPoller.active)void raidLobbyPoller.refresh();if(!battle&&!raidRoom&&!raidJoinBusy){if(title.classList.contains('active'))renderTitle();else if(view==='adventure')renderGameKeepVertical();}if(!title.classList.contains('active')&&state.market?.everUsed)void syncMarketSettlement({notify:true});scheduleEventRefresh();}});
game.addEventListener('input',e=>{const input=e.target;if(view!=='equipment'||!input?.hasAttribute?.('data-equipment-search'))return;equipmentSearch=String(input.value??'').slice(0,100);syncEquipmentCandidateFilters();});
game.addEventListener('change',e=>{const el=e.target;if(view==='forge'&&el?.hasAttribute?.('data-forge-sort')){state.ui??={};state.ui.forgeSort=['recommended','level','price'].includes(el.value)?el.value:'recommended';return renderGameKeepVertical();}if(view!=='market')return;if(el?.hasAttribute?.('data-market-search')){marketUi.browse.search=el.value??'';void refreshMarketView();return;}if(el?.hasAttribute?.('data-market-sort')){marketUi.browse.sort=el.value??'newest';void refreshMarketView();return;}if(el?.hasAttribute?.('data-market-in-stock')){marketUi.browse.inStockOnly=Boolean(el.checked);void refreshMarketView();}});
document.addEventListener('input',e=>{const field=e.target;if(field?.matches?.('[data-market-listing-price],[data-market-price]'))formatMarketPriceField(field);if(field?.hasAttribute?.('data-shop-buy-qty-input'))shopBuyQuantityUpdate(field.value);});
document.addEventListener('change',e=>{const el=e.target;if(el?.hasAttribute?.('data-market-listing-item')){syncMarketListingForm();void refreshMarketPriceGuide();return;}if(el?.hasAttribute?.('data-market-listing-quantity')){const maxQty=Math.max(1,Number(el.max??1)),value=Math.max(1,Math.min(maxQty,Number(el.value??1)));el.value=String(value);return;}});
// Save and pause on iOS Safari / installed PWA backgrounding, including page-cache restores.
window.addEventListener('pagehide',()=>{if(playStartedAt!==null){saveNow();playStartedAt=null;boostClockLastAt=null;}});
window.addEventListener('pageshow',()=>{if(!document.hidden&&!title.classList.contains('active')&&playStartedAt===null){playStartedAt=Date.now();boostClockLastAt=playStartedAt;lastPlayerInputAt=playStartedAt;}});
// Account for idle time BEFORE marking the user active again, or a resumed click could
// accidentally consume all the time spent idle.
function markScrollPlayActivity(){if(playStartedAt!==null)syncPlayTime();lastPlayerInputAt=Date.now();}
document.addEventListener('pointerdown',markScrollPlayActivity,{capture:true,passive:true});
document.addEventListener('keydown',markScrollPlayActivity,{capture:true});
setInterval(()=>{
 if(playStartedAt===null||document.hidden||title.classList.contains('active'))return;
 syncPlayTime();
 if(view==='items'&&game.classList.contains('active')){
  let expired=false;
  for(const el of game.querySelectorAll('[data-boost-remaining]')){
   const remaining=remainingBoostMs(state,el.dataset.boostRemaining);
   el.textContent=scrollDurationLabel(remaining);
   if(remaining<=0)expired=true;
  }
  if(expired)renderGameKeepVertical();
 }
},1000);
// A background check detects deployments without interrupting active battles.
setInterval(()=>{void pollForGameUpdate();},120000);
window.addEventListener('focus',()=>{void pollForGameUpdate();});
window.addEventListener('beforeunload',()=>{playerStatsHeartbeat.stop();if(playStartedAt!==null){syncPlayTime();saveToSlot(session,currentSlot,state);}});
installPixelIconRenderer();
renderTitle(); // Show announcements immediately; never await network account checks for first paint.
void initializeAccountSystem();
void pollForGameUpdate();

function festivalDeliveryKey(goal=HUNT_FESTIVAL.goal){
 const prefix=festivalView.debug?'yakusoku.admin':'yakusoku';
 return goal===HUNT_FESTIVAL.goal?`${prefix}.huntDelivered.v1.${playerStatsHeartbeat.playerId}`:`${prefix}.huntBonusDelivered.v1.${playerStatsHeartbeat.playerId}.${goal}`;
}
function updateFestivalPanel(){
 festivalView.pending=festivalKillRecorder.pending();
 const receipt=festivalView.data?.receipt;
 festivalView.delivered=!!receipt&&(state.festivalReceipts?.[HUNT_FESTIVAL.id]===receipt.id||session.storage.getItem(festivalDeliveryKey())===receipt.id);
 const bonusReceipts=festivalView.data?.bonusReceipts??{};
 festivalView.bonusDelivered=Object.fromEntries(HUNT_FESTIVAL.milestones.filter(goal=>goal>HUNT_FESTIVAL.goal).map(goal=>{
  const bonus=bonusReceipts[String(goal)];
  return [goal,!!bonus&&(state.festivalReceipts?.[`${HUNT_FESTIVAL.id}:${goal}`]===bonus.id||session.storage.getItem(festivalDeliveryKey(goal))===bonus.id)];
 }));
 const element=document.getElementById('hunt-festival');
 if(element)element.outerHTML=festivalMarkup();
 const archive=document.getElementById('hunt-festival-archive');
 if(archive)archive.outerHTML=festivalArchiveMarkup();
}
async function refreshFestival(force=false){
 if(Date.now()<HUNT_FESTIVAL.announce)return;
 if(festivalBusy||(!force&&Date.now()-festivalFetchedAt<30000))return;
 if(document.hidden||!game.classList.contains('active')||battle||raidRoom)return;
 festivalBusy=true;festivalView.loading=true;updateFestivalPanel();
 try{await festivalKillRecorder.flush();festivalView.data=await festivalApi.snapshot();festivalView.error=false;festivalFetchedAt=Date.now();}
 catch{festivalView.error=true;festivalFetchedAt=Date.now();}
 finally{festivalBusy=false;festivalView.loading=false;updateFestivalPanel();}
}
async function claimFestival(weapon){
 if(festivalClaimBusy)return;
 festivalClaimBusy=true;
 const target=state,slot=currentSlot;
 modal.querySelectorAll('[data-hunt-claim]').forEach(x=>x.disabled=true);
 const deliver=async()=>{
  const receipt=await festivalApi.claim(weapon,slot);
  if(state!==target||currentSlot!==slot)throw new Error(`SLOT ${slot}を開いて受取を再開してください`);
  festivalView.data={...festivalView.data,receipt};
  if(session.storage.getItem(festivalDeliveryKey())===receipt.id||target.festivalReceipts?.[HUNT_FESTIVAL.id]===receipt.id){closeModal();toast('この報酬は受取済みです');return;}
  const priorInventory=[...(target.equipmentInventory??[])],priorReceipts={...(target.festivalReceipts??{})};
  try{grantFestivalReward(target,receipt,slot);saveNow();}
  catch(error){target.equipmentInventory=priorInventory;target.festivalReceipts=priorReceipts;throw error;}
  // The save's receipt is authoritative; this extra marker also protects older save restores.
  try{session.storage.setItem(festivalDeliveryKey(),receipt.id);}catch{}
  closeModal();toast('共闘の装備9部位一式を受け取りました！');renderGameKeepVertical();
 };
 try{if(navigator.locks)await navigator.locks.request('yakusoku-hunt-claim',deliver);else await deliver();}
 catch(error){toast(error.message??'受取に失敗しました。もう一度お試しください');modal.querySelectorAll('[data-hunt-claim]').forEach(x=>x.disabled=false);}
 finally{festivalClaimBusy=false;updateFestivalPanel();}
}
async function claimFestivalBonus(goal){
 if(festivalClaimBusy||!HUNT_FESTIVAL.milestones.includes(goal)||goal<=HUNT_FESTIVAL.goal)return;
 festivalClaimBusy=true;
 const target=state,slot=currentSlot;
 const deliver=async()=>{
  const receipt=await festivalApi.claimBonus(goal,slot);
  if(state!==target||currentSlot!==slot)throw new Error(`SLOT ${slot}を開いて受取を再開してください`);
  if(Number(receipt?.milestone)!==goal)throw new Error('追加報酬情報が一致しません');
  festivalView.data={...festivalView.data,bonusReceipts:{...(festivalView.data?.bonusReceipts??{}),[String(goal)]:receipt}};
  const localKey=`${HUNT_FESTIVAL.id}:${goal}`;
  if(session.storage.getItem(festivalDeliveryKey(goal))===receipt.id||target.festivalReceipts?.[localKey]===receipt.id){toast('この追加報酬は受取済みです');return;}
  const priorMaterials={...(target.materials??{})};
  const priorGold=target.gold;
  const priorReceipts={...(target.festivalReceipts??{})};
  try{grantFestivalBonus(target,receipt,slot);saveNow();}
  catch(error){target.materials=priorMaterials;target.gold=priorGold;target.festivalReceipts=priorReceipts;throw error;}
  try{session.storage.setItem(festivalDeliveryKey(goal),receipt.id);}catch{}
  toast(`${goal.toLocaleString('ja-JP')}体達成の追加報酬を受け取りました！`);
  renderGameKeepVertical();
 };
 try{if(navigator.locks)await navigator.locks.request('yakusoku-hunt-claim',deliver);else await deliver();}
 catch(error){toast(error.message??'追加報酬の受取に失敗しました。再試行してください');}
 finally{festivalClaimBusy=false;updateFestivalPanel();}
}
setInterval(()=>{if(view==='adventure')void refreshFestival();},30000);
