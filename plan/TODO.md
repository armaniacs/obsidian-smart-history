# TODO: Obsidian Smart History 改善候補

---

## uBlock Origin形式 インポート機能 実装TODO

### 概要

- **全タスク数**: 12
- **推定作業時間**: 約4時間
- **クリティカルパス**: UF-001 → UF-101 → UF-201 → UF-301
- **依存**: 既存 `domainUtils.js`、`domainFilter.js`、`storage.js`

### uBlock Origin構文（ドメインブロック関連）

| 構文 | 説明 | 例 |
|------|------|-----|
| `||hostname^` | ドメインと全サブドメインをブロック | `||example.com^` |
| `@@` | 例外ルール（ブロックを無効化） | `@@||trusted.com^` |
| `*` | ワイルドカード | `||*.doubleclick.net^` |
| `!` | コメント | `! Comment line` |
| `domain=` | 特定ドメインに制限 | `||tracker.com$domain=example.com` |
| `3p`/`1p` | サード/ファーストパーティのみ | `||ad.com$3p` |

### 実装タスク

#### フェーズ1: 基盤構築

- [ ] **UF-001 [DIRECT]**: 構成分析と要件定義
  - [ ] uBlock Origin 静的フィルター構文の詳細分析
  - [ ] サポート範囲の策定（ドメインブロックに限定、オプションの一部対応など）
  - [ ] 既存 `domainUtils.js` との整合性確認
  - [ ] データ構造設計（ブロックルールと例外ルールの分離）

- [ ] **UF-002 [DIRECT]**: Storage拡張
  - [ ] `StorageKeys` に uBlock形式用キー追加（`UBLOCK_RULES`）
  - [ ] 既存ドメインリスト形式との互換性保持

#### フェーズ2: フィルターパーサー実装

- [ ] **UF-101 [TDD]**: uBlockフィルターパーサーコア実装
  - [ ] `src/utils/ublockParser.js` 新規作成
  - [ ] `parseUblockFilterLine(line)` - コメント行無視、`||`、`@@`、`*` のパース
  - [ ] `parseUblockFilterList(text)` - 複数行の一括パース
  - [ ] テストケース作成

- [ ] **UF-102 [TDD]**: オプション解析実装
  - [ ] `parseOptions(optionsString)` - `domain=`、`3p`、`1p` のパース
  - [ ] オプションに基づくフィルター適用ロジック

- [ ] **UF-103 [TDD]**: 既存 `domainUtils.js` との統合
  - [ ] `isUrlBlocked(url, ublockRules)` 関数実装
  - [ ] `isDomainAllowed()` 関数拡張

#### フェーズ3: UI実装

- [ ] **UF-201 [TDD]**: インポートUI追加
  - [ ] 「フィルター形式」選択セレクト追加（simple/ublock）
  - [ ] テキストエリア貼り付け機能
  - [ ] インプレビュー機能（ルール数、例外数、エラー表示）

- [ ] **UF-202 [TDD]**: ファイルアップロード機能
  - [ ] `.txt` ファイル選択と読み込み
  - [ ] ドラッグ&ドロップ対応

- [ ] **UF-203 [TDD]**: URL/サブスクリプションインポート機能（オプション）
  - [ ] 外部URLからのフィルター読み込み

- [ ] **UF-204 [TDD]**: エクスポート機能
  - [ ] `.txt` ファイルダウンロード
  - [ ] クリップボードコピー

#### フェーズ4: 統合・最適化

- [ ] **UF-301 [TDD]**: 選択的なオプション対応実装
- [ ] **UF-302 [TDD]**: パフォーマンス最適化（10,000+件対応）
- [ ] **UF-303 [TDD]**: エラーハンドリングとユーザーフィードバック

---

## PBI-001完了後の改善候補 実装TODO (UF-400シリーズ)

### 概要

- **全タスク数**: 8
- **推定作業時間**: 約5時間
- **クリティカルパス**: UF-403 → UF-404 → UF-405
- **依存**: 既存 `popup.html`、`main.js`、`navigation.js`、`sanitizePreview.js`

### 既存実装状況

| ファイル | 状況 | 備考 |
|---------|------|------|
| `src/popup/popup.html` | インラインCSS約130行 | `popup.css` 未作成 |
| `src/popup/sanitizePreview.js` | 実装済み | PII確認UI |
| `src/popup/main.js` | 実装済み | 手動記録ロジック |
| `src/popup/navigation.js` | 実装済み | `showMainScreen()`/`showSettingsScreen()` |
| `src/background/service-worker.js` | 実装済み | 記録処理ロジック |

### TODO

#### フェーズ1: マスク情報改善

- [ ] **UF-401 [TDD]**: マスク情報の可視化機能実装
  - [ ] マスク箇所のカウント表示実装
    - [ ] `maskedCount` をプレビューモーダルに表示
    - [ ] ステータスメッセージに「X件の個人情報をマスクしました」を追加
  - [ ] マスク箇所のハイライト実装
    - [ ] `.masked-highlight` クラスの強化（現在は黄色背景のみ）
    - [ ] 赤文字表示オプションの追加
  - [ ] マスク理由の表示実装
    - [ ] 各マスク箇所のタイプ（email, phone, creditCard等）を表示
    - [ ] ツールチップまたは凡例での説明
  - [ ] テストケース作成
    - [ ] マスク件数0件の表示
    - [ ] マスク件数複数件の表示
    - [ ] 例外ルール（強制記録時）の表示

#### フェーズ2: UI/UX改善

- [ ] **UF-402 [DIRECT]**: CSS外部ファイル化
  - [ ] `src/popup/popup.css` 新規作成
    - [ ] `popup.html` の `<style>` ブロック（約130行）を移動
    - [ ] セレクタの整理とファイル構造化
  - [ ] `popup.html` 修正
    - [ ] `<style>` ブロック削除
    - [ ] `<link rel="stylesheet" href="popup.css">` 追加
  - [ ] manifest.json へのCSS追加（必要な場合）
  - [ ] スタイルの動作確認
  - [ ] トレリシビリティ確認（既存スタイルとの互換性）

- [ ] **UF-403 [TDD]**: ローディングスピナー追加
  - [ ] SVGスピナー実装
    - [ ] スピナーコンポーネント作成（Circle、Dots、または Spinner）
    - [ ] CSSアニメーション定義（@keyframes）
  - [ ] `main.js` 修正
    - [ ] recordCurrentPage() にスピナー表示ロジック追加
    - [ ] 処理中はスピナーを表示、完了/エラー時に非表示
  - [ ] `popup.html` 修正
    - [ ] スピナー用コンテナ追加（`<div id="loadingSpinner">`）
    - [ ] 記録ボタンとステータスエリア内での配置
  - [ ] テストケース作成
    - [ ] スピナーの表示開始
    - [ ] スピナーの非表示
    - [ ] エラー時のスピナー挙動

- [ ] **UF-404 [TDD]**: 記録成功後のポップアップ自動クローズ
  - [ ] `main.js` 修正
    - [ ] 記録成功後にクローズロジック追加
    - [ ] `setTimeout(() => window.close(), 2000);` 実装
    - [ ] 設定画面にいる場合はクローズしない判定
  - [ ] `navigation.js` 修正
    - [ ] 画面状態の追跡（メイン画面か設定画面か）
    - [ ] `isOnSettingsScreen` 状態変数の追加
  - [ ] ユーザー体験改善
    - [ ] カウントダウン秒数の表示（3...2...1...）
    - [ ] 「自動閉じる」アラートの表示
  - [ ] テストケース作成
    - [ ] メイン画面で成功時の自動クローズ
    - [ ] 設定画面で成功時のクローズしない
    - [ ] エラー時のクローズしない

#### フェーズ3: 操作性改善

- [ ] **UF-405 [TDD]**: キーボードショートカット対応
  - [ ] `manifest.json` 修正
    - [ ] `commands` セクション追加
    - [ ] Ctrl+S / Cmd+S コマンド定義
  - [ ] `src/background/shortcut-handler.js` 新規作成（ショートカット処理）
    - [ ] コマンドリスナー実装
    - [ ] 現在のタブ情報取得
    - [ ] `MAIN_RECORD` メッセージ送信
  - [ ] `src/content/shortcut-handler.js` 新規作成（必要な場合）
    - [ ] Content Scriptでのキーボードイベント監視（Chrome拡張 `commands` 不使用時）
  - [ ] `service-worker.js` 修正
    - [ ] コマンドメッセージのハンドラ追加
  - [ ] テストケース作成
    - [ ] ショートカットキー押下での記録
    - [ ] アクティブタブ以外無効
    - [ ] 記録中の重複実行防止

#### フェーズ4: 将来的な機能拡張

- [ ] **UF-501 [TDD]**: 閲覧履歴一覧表示
  - [ ] `src/popup/history.js` 新規作成
    - [ ] 最近保存した5件を表示するロジック
    - [ ] `chrome.storage.local` から履歴取得
  - [ ] `popup.html` 修正
    - [ ] メイン画面下部に履歴セクション追加
    - [ ] 各履歴アイテム（タイトル、URL、日時）の表示
  - [ ] `main.js` 修正
    - [ ] 記録成功時に履歴表示のリフレッシュ
  - [ ] テストケース作成

- [ ] **UF-502 [TDD]**: 記録前のプレビュー機能
  - [ ] `main.js` 修正
    - [ ] 記録前にAI要約を事前生成するオプション追加
    - [ ] プレビュー表示フラグ設定
  - [ ] `sanitizePreview.js` 拡張
    - [ ] オリジナル内容と要約結果の比較表示
  - [ ] テストケース作成

- [ ] **UF-503 [TDD]**: バッチ記録機能
  - [ ] 新規UIスポップアップ（batch.html）作成
    - [ ] タブ一覧表示（許可リスト対象タブのみ）
    - [ ] チェックボックスによる複数選択
  - [ ] `src/popup/batch.js` 新規作成
    - [ ] 選択タブの一括取得
    - [ ] 並列記録処理
  - [ ] テストケース作成

- [ ] **UF-504 [SKIP]**: 記録フィルター設定（既に実装済み）
  - [ ] ドメインホワイトリスト/ブラックリスト機能は既に実装済み
  - [ ] `src/popup/domainFilter.js` 確認済み
  - [ ] `src/utils/domainUtils.js` 確認済み

### 実行順序

1. **マスク情報改善** (UF-401) - 理由：プライバシー機能の強化
2. **UI/UX改善** (UF-402, UF-403, UF-404) - 理由：使用体験の向上
   - CSS外部ファイル化は拡張時に実施
3. **操作性改善** (UF-405) - 理由：キーボードユーザー向け
4. **将来的な機能拡張** (UF-501, UF-502, UF-503) - 理由：追加機能

### 実装プロセス

[TDD]タスクは以下の順序で実装:

1. UF-{taskID}/tdd-requirements.md - 詳細要件定義
2. UF-{taskID}/tdd-testcases.md - テストケース作成
3. UF-{taskID}/tdd-red.md - テスト実装（失敗）
4. UF-{taskID}/tdd-green.md - 最小実装
5. UF-{taskID}/tdd-refactor.md - リファクタリング
6. UF-{taskID}/tdd-verify-complete.md - 品質確認

[DIRECT]タスクは以下の順序で実行:

1. UF-{taskID}/direct-setup.md - 設定作業の実行
2. UF-{taskID}/direct-verify.md - 設定確認

### 既存実装との連携

- **`src/popup/navigation.js`**: `showMainScreen()` / `showSettingsScreen()` - 画面状態追跡に利用
- **`src/popup/main.js`**: 手動記録ロジック - 拡張ポイント
- **`src/popup/sanitizePreview.js`**: PII確認UI - マスク情報表示の拡張
- **`src/background/service-worker.js`**: 記録処理ロジック - メッセージハンドラ追加

---

## PBI-001: 手動記録機能 - 実装完了後の改善候補（元テキスト）

### マスクされた情報を簡単に確認する

- [ ] マスクされた情報簡単に確認できるようにする
  - 現状: 特に工夫なし
  - 改善: マスク箇所が何箇所あるかを出す、赤い文字にする
  - 改善: なぜマスク対象になったのかを表示する



### UI/UX改善

- [ ] **CSS外部ファイル化**
  - 現状: インラインCSS約130行
  - 改善: `src/popup/popup.css` として分離
  - メリット: 保守性向上、スタイル再利用
  - タイミング: インラインCSSが150行を超えた場合

- [ ] **ローディングスピナー追加**
  - 現状: テキストのみの「記録中...」表示
  - 改善: スピナーアニメーションを追加
  - 実装: CSSアニメーション or SVGスピナー
  - 配置: 記録ボタンの隣、またはステータスメッセージエリア

- [ ] **記録成功後のポップアップ自動クローズ**
  - 現状: ポップアップは手動で閉じる必要がある
  - 改善: 記録成功後2秒でポップアップを自動クローズ
  - 実装: `setTimeout(() => window.close(), 2000);`
  - 注意: ユーザーが設定画面に遷移中の場合は閉じない

### 操作性改善

- [ ] **キーボードショートカット対応**
  - ショートカット: `Ctrl+S` (または `Cmd+S`)
  - 動作: 現在のタブを即座に記録
  - 実装場所: Content Scriptでキーボードイベントをリスン
  - 参考: `manifest.json` の `commands` セクション

### 将来的な機能拡張候補

- [ ] **閲覧履歴一覧表示**
  - メイン画面に最近保存した5件を表示
  - クリックでObsidianのノートを開く

- [ ] **記録前のプレビュー**
  - AI要約を事前生成して確認
  - 編集してから保存する機能

- [ ] **バッチ記録機能**
  - 複数のタブを一括記録
  - タブリストで選択して記録

- [ ] **記録フィルター設定**
  - 特定ドメインを自動記録から除外
  - ホワイトリスト/ブラックリスト機能

---

# 次のステップ 2026-01-23 4:33

🚀 次のお勧めステップ

今回の実装はリグレッションテストのため、Greenフェーズ（最小実装）はスキップされました。

次のステップとして、以下を推奨します:

1. テストカバレッジレポート取得:
   npm run test:coverage

2. 追加テストケースの検討:
   - エッジケースの追加
   - 統合テストの検討

3. 次回の新機能開発時:
   - /tdd-testcases → /tdd-red → /tdd-green → /tdd-refactor の完全なTDDサイクルを実施

一つ前のcommitからの変更点をまとめます:                    
                                                             
  📋 変更点サマリー                                          
                            W   w                            
  🆕 新規追加ファイル                                        
                                                             
  1. テスト環境設定ファイル                                  
                                                             
  - package.json - プロジェクト依存関係定義（Jest            
  29.7.0追加）                                               
  - jest.config.js - Jestテスト設定（ES Modules対応）        
  - jest.setup.js - Chrome Extensions APIモック設定          
                                                             
  2. テストファイル                                          
                                                             
  - src/utils/__tests__/domainUtils.test.js -                
  domainUtilsの18テストケース                                
  - src/utils/__tests__/piiSanitizer.test.js -               
  piiSanitizerの13テストケース                               
                                                             
  3. ドキュメント                                            
                                                             
  - docs/implements/utils-testing/utils-testcases.md -       
  テストケース定義書（28ケース詳細）                         
  - docs/implements/utils-testing/utils-tdd-memo.md -        
  TDD開発メモ                                                
                                                             
  4. その他                                                  
                                                             
  - package-lock.json - npm依存関係ロックファイル            
  - node_modules/ - npmパッケージ（.gitignoreに追加推奨）

