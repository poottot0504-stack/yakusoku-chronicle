# ChatGPT × GitHub 自動更新の運用ルール

『約束のクロニクル』では、ご意見BOXの確認と小規模な不具合修正を支援します。

## 安全な更新手順

1. GitHub `main` の最新コードを取得してから変更する。
2. 変更前後の差分を確認し、既存のゲーム仕様・セーブデータとの互換性を守る。
3. JavaScript構文、ゲームの回帰テスト、Workersデプロイ安全テストを確認する。
4. テスト不合格・競合・アクセス不備があればPushを中止する。
5. 秘密情報・APIトークン・非公開設定値をコミットしない。

## 本番公開の条件

- `Game QA - Cloudflare Workers (no deploy)` はテスト用ワークフロー。
- GitHubへのコミットやPushだけでCloudflareの本番ゲームを更新しない。
- 本番公開は運営者による**明示的な公開指示**があるときだけ。次の2方式を利用できます。
  1. GitHub Actions の `Publish existing Workers game (manual approval)` で `PUBLISH` を入力して手動実行。
  2. 運営者がChatGPTとの会話で明確に「公開して」と指示した場合、ChatGPTが `release-requests/approved.json` に確認済みソースのコミットSHAと `PUBLISH` を記録。専用ワークフロー `Publish Workers game (approved in ChatGPT)` が要求元・差分・コミット整合性を検証してから公開。
- ご意見BOXの投稿内容、定期確認、自動修正・GitHubへの通常Pushは**公開の承認ではありません**。ChatGPTの定期タスクが公開依頼ファイルを作成・更新することは禁止します。
- どちらの経路でも検証失敗時は公開せず、Cloudflare Workersの既存Workerのみを使用します。
- 既存Worker名は `muddy-credit-f5af`。変更には運営者の確認が必要。

## 改修の判断

- ゲームは永久無料。課金機能や有料化を導入しない。
- 報酬・ゲーム内経済・難易度・認証・本番DB・個人情報保護など影響が大きい変更は、運営者の事前確認を求める。
- ご意見BOXの投稿は重複を排除し、すでに対応済みのものを再実装しない。

この文書はChatGPTのGitHub書き込み連携を検証するために作成しました。ゲーム本体は変更していません。
