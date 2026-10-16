# 約束のクロニクル：GitHub Actions × Cloudflare Workers（公開指示方式）

## この手順はスクリーンショットで確認した Workers 静的アセット用です

本番サイト：**https://muddy-credit-f5af.starload.workers.dev/**
既存Worker名：**muddy-credit-f5af**
アカウントのworkers.devサブドメイン：**starload**

このZIPは **GitHub登録用ソースコード一式** です。**ZIP自体をCloudflareにアップロードしないでください。**
Cloudflareに送るのは、後述のテスト合格後に `build/worker` に集める公開ゲームファイルだけです。

`wrangler.toml` では `name = "muddy-credit-f5af"` と `workers_dev = true` を固定しています。
本番公開前にはAPIから *既存* Workerが存在すること、アカウントのsubdomainがstarloadであること、
対象Workerのworkers.dev公開が有効なことを照合し、一致しなければ公開を停止します。

## 初回設定（まだ実施していません）

1. GitHubに private リポジトリ（例 `yakusoku-chronicle`）を作り、このZIPの **中身を展開して** リポジトリのルートに追加し、`main` にcommit/pushします。
   - `.github/workflows/` は隠しフォルダなので、必ず含めてください。
   - ZIPファイルそのものをリポジトリに置く方法では、GitHub Actionsは動作しません。
2. GitHub → リポジトリ Settings → Environments → New environment から `production` を作成。
   - Deployment branchesは `main` に限定してください。
   - ご利用プランでサポートされる場合は、Required reviewers を有効化します。
   - この手順は `Run workflow` と合言葉 `PUBLISH` によって「利用者による公開指示」を必須にしています。
3. Cloudflareで **APIトークン** を発行します。
   - [Cloudflare WorkersでのGitHub Actions公式説明](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) に従い、`Edit Cloudflare Workers` に相当する適切なWorkersデプロイ権限を設定。
   - 対象アカウントだけに制限し、有効期限も必要に応じて設定してください。
   - 実際のトークン値・CloudflareアカウントIDをチャットやリポジトリのソースコードに貼らないでください。
4. GitHub → Settings → Environments → `production` → **Environment secrets** に登録：
   - `CLOUDFLARE_API_TOKEN`：発行したAPIトークン
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflareダッシュボードで確認する32文字のAccount ID
5. GitHub → Actions → **Game QA - Cloudflare Workers (no deploy)** がすべて成功するのを確認。**この時点で本番公開はありません。**
6. 既存サイトの現在の正常なデプロイをCloudflareダッシュボードで確認し、復元可能な状態にしておきます。

## 以後の更新

- ゲームを修正して `main` にcommit/pushすると、**自動でQAだけ**が実行されます。
- コードを保存しただけでは本番に変更されません。
- 内容を確認して公開したいときだけ、GitHub → Actions →
  **Publish existing Workers game (manual approval)** → **Run workflow** を選び、
  Branch=`main`、確認欄に **PUBLISH** と入力します。
- 公開ワークフローは、ゲームの全テストとWorkerの安全対策テストを再実行してから公開用素材を作成します。
- 承認された環境のSecretsを使い、Cloudflareの既存Worker名とURLに対応するサブドメインをAPIで厳密に照合します。
- 一致時だけ `wrangler deploy --config wrangler.toml` で **既存のmuddy-credit-f5af Worker** を更新します。
- デプロイ後に https://muddy-credit-f5af.starload.workers.dev/ をiPhone等で開き、タイトルとセーブ、イベントを確認します。

## 安全対策

- 公開用素材は `index.html`、`src/`、`styles/`、`assets/`、PWA用manifestとService Worker、`_headers` などの公開専用ファイルのみ。
- `__qa_hunt.html`、開発用テスト、DB移行SQL、ゲームの管理資料、GitHub設定ファイルなどはゲームサイトへ送信しません。
- `_headers` をWorkers静的アセットでも維持するので、これまでの `no-store` キャッシュ制御を保持します。
- `production` 環境のSecretsはQAワークフローでは読み込まず、本番を公開するジョブだけで使います。
- `wrangler.toml` にWorker名、workers.devの利用、アップロード元を固定し、`pages deploy` ではなく `wrangler deploy` を利用します。
- API照合はアカウントの一致・既存Workerの存在・workers.devの公開有効状態まで確認し、違えば公開しません。
- 既存Workerにプログラム、環境変数、ルート等の追加設定がある場合、Wranglerでの上書きが影響する可能性があります。
  本スクリーンショットでは「静的アセットのみ」と表示されましたが、**初回本番反映前に追加設定がないかダッシュボードで確認**してください。
- 本番Supabaseのデータベース変更はこのCI/CDに含まれません。
- GitHub Actionsを作成しても、ChatGPTの定期チェックが自動的にGitHubへソースをpushできるとは限りません。
  定期改修と自動pushの連携は、GitHubコネクタ接続および権限・実行環境の確認が別途必要です。

## 手元でのテスト（秘密情報不要）

```bash
node --check src/main.js
node --test tests/*.test.mjs
python3 -m unittest discover -s deployment_tests -p 'test_*.py' -v
python3 tools/build_worker.py
```

## 参考：Cloudflare公式

- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/static-assets/headers/
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/list/
- https://developers.cloudflare.com/api/resources/workers/subresources/subdomains/methods/get/
- https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/subdomain/methods/get/
