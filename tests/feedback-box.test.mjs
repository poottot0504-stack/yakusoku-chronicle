import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackFormMarkup,feedbackHistoryMarkup,feedbackSentMarkup,FEEDBACK_STATUSES} from '../src/ui/feedback.js';
import {createFeedbackApi} from '../src/online/feedback-api.js';

test('feedback form includes auto player name, category, subject, usable length limits and history',()=>{
 const html=feedbackFormMarkup('勇者<test>&');
 assert.match(html,/ご意見BOX/);
 assert.match(html,/不具合・バグ/);
 assert.match(html,/新機能の提案/);
 assert.match(html,/data-feedback-name/);
 assert.match(html,/readonly/);
 assert.match(html,/勇者&lt;test&gt;&amp;/);
 assert.match(html,/data-feedback-subject/);
 assert.match(html,/件名/);
 assert.doesNotMatch(html,/data-feedback-screen/);
 assert.match(html,/data-feedback-message/);
 assert.match(html,/maxlength="1500"/);
 assert.match(html,/data-feedback-submit/);
 assert.match(html,/data-feedback-mine/);
});

test('user feedback history displays own status while escaping raw input',()=>{
 const html=feedbackHistoryMarkup([{
  id:'r-1',category:'bug',subject:'洞窟<script>bad()</script>',status:'reviewing',message:'<script>bad()</script><img src=x onerror=bad()>',createdAt:'2026-10-15T04:10:00Z'
 }]);
 assert.match(html,/確認中/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&lt;img/);
 assert.match(html,/洞窟&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/<img/);
 assert.equal(FEEDBACK_STATUSES.fixed,'対応済み');
});

test('feedback receipt only displays escaped submission ID',()=>{
 const html=feedbackSentMarkup({id:'<unsafe>'});
 assert.match(html,/&lt;unsafe&gt;/);
 assert.doesNotMatch(html,/<unsafe>/);
});

test('feedback API sends only expected RPC arguments under authorized fetch',async()=>{
 let calls=0;
 const authorizedFetch=async(url,options)=>{
  calls++;
  assert.match(url,/rest\/v1\/rpc\/yakusoku_submit_feedback_v2/);
  assert.equal(options.method,'POST');
  const sent=JSON.parse(options.body);
  assert.equal(sent.p_save_slot,2);
  assert.equal(sent.p_category,'bug');
  assert.equal(sent.p_subject,'鍛冶屋強化のエラー');
  assert.equal(sent.p_message,'鍛冶屋で強化した時にエラーが出ます。');
  assert.equal(sent.p_player_id,'a14c5810-07ca-471e-9e4b-387f2113b107');
  return {ok:true,json:async()=>({id:'receipt-1',status:'new'})};
 };
 const api=createFeedbackApi({storage:{},authorizedFetch});
 assert.deepEqual(await api.submit({slot:2,category:'bug',subject:'鍛冶屋強化のエラー',message:'鍛冶屋で強化した時にエラーが出ます。',playerId:'a14c5810-07ca-471e-9e4b-387f2113b107'}),{id:'receipt-1',status:'new'});
 assert.equal(calls,1);
});

test('feedback subject-length errors are explained in Japanese',async()=>{
 const api=createFeedbackApi({storage:{},authorizedFetch:async()=>({ok:false,json:async()=>({message:'SUBJECT_LENGTH'})})});
 await assert.rejects(api.submit({slot:1,category:'bug',subject:'x',message:'テスト内容は10文字以上です。'}),/件名は2〜80文字/);
});

test('feedback rate-limit response presents readable text',async()=>{
 const api=createFeedbackApi({storage:{},authorizedFetch:async()=>({ok:false,json:async()=>({message:'FEEDBACK_RATE_LIMIT'})})});
 await assert.rejects(api.submit({slot:1,category:'other',message:'通信テスト中です'}),/投稿が集中/);
});

test('feedback history calls owner-slot-scoped authenticated RPC',async()=>{
 const api=createFeedbackApi({storage:{},authorizedFetch:async(url,opts)=>{
  assert.match(url,/yakusoku_my_feedback/);
  assert.deepEqual(JSON.parse(opts.body),{p_save_slot:3,p_limit:20});
  return {ok:true,json:async()=>([])};
 }});
 assert.deepEqual(await api.mine(3),[]);
});
