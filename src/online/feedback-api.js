import { yakusokuAuthorizedFetch, YAKUSOKU_SUPABASE_URL } from './supabase-auth.js';

const ERROR_LABELS={
 AUTH_REQUIRED:'ログイン情報を取得できませんでした。通信状態を確認して再試行してください。',
 INVALID_SLOT:'セーブスロットが不正です。',
 INVALID_CATEGORY:'ご意見の種類を選択してください。',
 SUBJECT_LENGTH:'件名は2〜80文字で入力してください。',
 MESSAGE_LENGTH:'本文は10〜1,500文字で入力してください。',
 FEEDBACK_RATE_LIMIT:'投稿が集中しています。少し時間をおいてから送信してください（1時間3件、1日10件まで）。'
};

export function createFeedbackApi({storage=globalThis.localStorage,fetchImpl=globalThis.fetch?.bind(globalThis),authorizedFetch=yakusokuAuthorizedFetch}={}){
 async function call(name,params){
  const response=await authorizedFetch(`${YAKUSOKU_SUPABASE_URL}/rest/v1/rpc/${name}`,{
   storage,fetchImpl,method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(params)
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok){
   const detail=String(result?.message??result?.code??'');
   const code=Object.keys(ERROR_LABELS).find(key=>detail.includes(key));
   throw new Error(ERROR_LABELS[code]??'ご意見BOXに接続できませんでした。時間をおいて再試行してください。');
  }
  return result;
 }
 return {
  submit:({slot=1,category,subject,message,authorName='旅人',screenName='その他',playerId=null,version='20261015-feedback-subject-2'})=>call('yakusoku_submit_feedback_v2',{
   p_save_slot:slot,p_category:category,p_subject:subject,p_message:message,p_author_name:authorName,p_screen_name:screenName,
   p_player_id:playerId,p_client_version:version
  }),
  mine:(slot=1)=>call('yakusoku_my_feedback',{p_save_slot:slot,p_limit:20})
 };
}
