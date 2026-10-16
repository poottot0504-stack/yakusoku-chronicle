# 魔障の洞窟 Implementation Plan
Goal: 一周目以降の周回ダンジョンと専用装備、成長上限を追加する。
Architecture: data/masho-equipmentで全ジョブ定義、core/masho-caveで進行・敵生成・報酬を分離しmainとUIに接続。core/progression-capsを単一の上限判定にする。
Tech Stack: 既存JavaScript ES Modules、CSS、Nodeテスト。
Spec: ../specs/2026-10-07-masho-cave.md
## Constraints / Review Focus
保存互換、通常物品ドロップ経路の遮断、セット効果二重計上防止、盾不可ジョブ、NG+上限維持を検証。装備売買をローカルで往復検証し本番通信しない。
## Tasks
- [x] 上限: progression-capsを追加、schema/migration/new-game-plus/level-gates/progressionに接続。旧セーブと500/400境界をテスト。
- [x] 装備: data/masho-equipment、equipmentカタログ、equip制約、combat-statsセット加算、装備画面表示。20職9部位3段階とLv99不可/100可・不完全セットをテスト。
- [x] 洞窟: core/masho-caveで全ボス候補、段階解放、敵生成と低確率装備報酬。ui/masho-caveとmainへ入口・戦闘・帰還接続。勝利だけ報酬、元進行保護、5%境界をテスト。
- [x] 検証: Node統合テスト、実ブラウザの階層選択〜戦闘〜報酬確認、狭幅レイアウト確認、ZIP整合性とファイル数確認。

検証記録: Node統合11項目、390×844と1000×800のブラウザ実操作テスト成功。別レビューワーは実行枠の制限で起動できず、変更差分を自己レビュー。ドロップの通常報酬分岐を回避すること、固有報酬を持ち込まないこと、装備カタログが鍛冶へ自動追加されないことを確認。
