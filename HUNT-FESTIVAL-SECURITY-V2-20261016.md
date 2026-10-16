# 約束のクロニクル・大討伐祭 不正対策版（2026年10月16日）

## 状況

- Cloudflare Workers のゲーム本番URLへの公開は **未実施**。ゲーム更新は運営者が手動で行う。
- Supabaseに以下の非破壊・追加型の変更を適用済み：`hunt_festival_battle_ticket_v2_staged_20261016`。
- 既存の討伐記録や受取履歴は一切削除していない。
- `yakusoku_private.hunt_festival_security_config.strict_mode=false` のまま。旧クライアントの送信も通すため、過去／現在の周回が突然無効にならない。
- ゲーム本体の報酬5段階（2,500／5,000／10,000／50,000／100,000体）や報酬数値は変更なし。

## 追加したしくみ

1. 戦闘開始時、認証されたユーザーに対して `public.yakusoku_hunt_festival_begin` がバトルID・敵の組み合わせ・戦闘区分をサーバーに記録する。
2. 勝利時は `public.yakusoku_hunt_festival_record_v2` を優先使用。サーバーがアカウント・バトルID・敵の種類・数・最低経過時間・受付の有効期限を照合する。
3. 同一バトルIDの再送は重複加算せず、既存の1.5秒・1分25件の記録レート制限も維持する。
4. 旧APIからの記録は移行期間中のみ従来どおり受付ける。新旧の割合や分間ピークはDB内の非公開 `yakusoku_private.hunt_festival_security_review` で調査できる。
5. 通信失敗時のローカル討伐履歴キューを300件から3,000件に拡張（保存容量の範囲内）。不正扱いによる自動停止・削除は実施しない。

## 安全な運用手順

1. 今回のゲーム本体のみのZIPをCloudflare Workersへ手動アップロード。
2. 複数の端末・セーブスロット・倍速／通常戦闘で討伐数が正常に加算されることを確認する。
3. Supabase管理側で `hunt_festival_security_review` の `ticketed_battles` と `legacy_battles` を見て、新クライアントの移行率を確認する。
4. **strict_modeを自動でtrueにしない。** 旧版・通信不安定・チケット取得失敗での討伐は旧APIに依存する場合があるため、切り替えるなら運営者が影響を了承した上で、事前にユーザーへ周知する。

※ 今回のセッションでは **strict_mode=falseを維持する** 方針。完全遮断は、旧クライアントの正常プレイを巻き込むおそれがあるので実施していない。

## 制約と今後の展望

本作はブラウザ内で戦闘を判定しているため、外部ツールがAPIを模倣して「戦闘を開始→勝利」を送信することを完全には防止できない。今回の対策は不自然な自己申告を通しにくくし、調査可能にするもので、戦闘の真偽の完全なサーバー証明ではない。根本的な対策には戦闘計算／敵HPの更新をサーバーが権威的に扱う再設計が必要。

## 検証

- `node --test tests/*.test.mjs` 176件成功（ゲーム機能＋セキュリティV2追加テスト）。
- `python3 -m unittest discover -s deployment_tests -p 'test_*.py' -v` によるWorkers公開安全性の検査。
- `python3 tools/build_worker.py` の静的アセット検査。
- Supabaseのトランザクションテスト：正常受取、同一ID再送防止、敵数・戦闘種別不一致拒否、最短時間拒否、strict_mode切替時の旧API拒否とV2維持を確認し、**ROLLBACK** で試験データを取り消し。
- `strict_mode=false`、匿名ユーザーのV2関数呼び出し不可、テーブル直接読み取り不可を確認。
- 実際のiPhoneでの操作とCloudflare本番公開は未実施。
