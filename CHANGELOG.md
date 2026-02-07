# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Security
- **CSP実装**: manifest.jsonとpopup.htmlにContent Security Policyを追加し、スクリプトインジェクションのリスクを軽減
  - extension_pages: script-srcおよびobject-srcの制限
  - connect-src: localhostとHTTPSのみを許可
- **エラーメッセージの情報流出防止**: `errorUtils.js` に `sanitizeErrorMessage()` 関数をエクスポート
  - APIキー、Bearerトークン、localhost URLなどの機密情報をマスク
- **メッセージ検証強化**: Service Workerのメッセージパッシング検証を強化（テスト追加）
  - XSS攻撃パターン、JSプロトコル、data URL等の検出

### Performance
- **設定キャッシュの実装**: `recordingLogic.js` に二重キャッシュ機構を実装
  - インスタンスレベルキャッシュと静的キャッシュ
  - TTLベースの有効期限（30秒）
  - Storage APIアクセス回数の削減によるパフォーマンス向上
- **Obsidian APIの競合回避**: `obsidianClient.js` にMutexクラスを実装
  - 複数プロセスからの同時アクセス時の排他制御
  - URLごとの書き込みロックによるデータ競合防止
  - 検証済みの `port` 変数を使用するよう修正
  - `innerHTML` の代わりに `createElement` と `textContent` を使用し、DOMインジェクション攻撃を防止
  - `rel="noopener noreferrer"` 属性を追加し、タブナビゲーションセキュリティを強化
- **URL検証の強化 (PRIV-003/SECURITY-007)**: `ublockImport/validation.js` に15以上の危険なプロトコル検出を追加
  - 新たに検出するプロトコル: `javascript:`, `data:`, `vbscript:`, `file:`, `mailto:`, `ftp:`, `http:`, `blob:`, `about:`, `chrome:`, `chrome-extension:`, `moz-extension:`, `edge:`, `opera:`, `safari:`
  - URL構造検証の追加（チェック済みプロトコルのみ許可）
  - URLエンコーディング攻撃防御
  - 国際化ドメイン名(IDN)とUnicode文字列の適切な処理
- **危険なURL構造のブロック**: ドメインインジェクション、バックリファレンス、不正なポート指定などを検出

### Performance
- **ResizeObserverメモリリークの修正 (PERF-007)**: `sanitizePreview.js` のモーダルイベントリスナーでメモリリークを修正
  - `resizeObserver` をモジュールレベル変数に変更
  - `cleanupModalEvents()` 関数で適切なObserver切断を実装
  - モーダル再開時のObserver再初期化処理を追加
- **キャッシュキー衝突の修正 (PERF-019)**: `ublockParser/cache.js` のキャッシュキー生成アルゴリズムを改善
  - FNV-1aハッシュ関数を実装し、キー衝突リスクを大幅削減
  - 古い「最初の100文字＋長さ」方式を「ハッシュ値＋長さ」方式に置換
  - 大量のuBlockフィルタールール処理時のパフォーマンスと安定性を向上

### Tests
- **XSS脆弱性テストの追加**: `popup-xss.test.js` (新規ファイル) に26件のXSS攻撃ペイロードテストを追加
  - スクリプトインジェクション、イベントハンドラー、data: URL攻撃など多様な攻撃パターンをカバー
- **URL検証テストの拡張**: `ublockImport.test.js` に7件の新しいテストスイートを追加（lines 412-606）
  - 危険なプロトコルの検出
  - 悪意のあるURL構造のブロック
  - URLエンコーディング攻撃の防御
  - 国際化ドメイン名(IDN)の処理
  - エッジケースの処理
  - data: URLバリアントの全ブロック
  - ポートとIPv6の特殊値の処理
- **メッセージ検証テストの追加**: `service-worker-message-validation.test.js` (新規ファイル) に27件のテストを追加
- **エラーサニタイゼーションテストの追加**: `sanitizeError.test.js` (新規ファイル) に26件のテストを追加
- **設定キャッシュテストの追加**: `recordingLogic-cache.test.js` (新規ファイル) に21件のテストを追加
- **Mutexロック機構テストの追加**: `obsidianClient-mutex.test.js` (新規ファイル) に11件のテストを追加
- **HTTPS通信強化テストの追加**: `obsidianClient-secure-fetch.test.js` (新規ファイル) にテストを作成
- **テスト結果**: 全618テストがパス（39テストスイート）

### Fixed
- **テストskip理由の修正と廃止**: `domainFilter.test.js` と `ublockImport.test.js` のテストskip理由が古くなっていたため調査
  - `domainFilter.test.js`: "Babelトランスパイル環境でのjest.mock設定が複雑であるため" という理由は誤りで、実際にはモジュールインポートが正常に動作していることを確認
  - `ublockImport.test.js`: "Test environment configuration causes module resolution errors for imports" という理由は誤りで、実際にはモジュールインポートが正常に動作していることを確認
- **テストアーキテクチャの改善**: モジュールレベルでのDOM要素キャッシュによるテストのアーキテクチャ上の制限を明確化
  - `domainFilter.js` と `updatePreviewUI` はモジュールレベルでDOM要素をキャッシュしているため、テストアーキテクチャ上の制限により完全な機能テストが不可能
  - "NOT FULLY TESTABLE" としてドキュメント化し、テスト可能な範囲（関数存在確認、呼び出しがエラーをスローしないこと）に限定
- **Jestモック設定の修正**: `storage.js` のモック設定を改善
  - `mockResolvedValue` の代わりに `mockImplementation` を使用して、テストごとに柔軟に設定値を変更可能に
  - `domainFilter.test.js` で `mockGetSettings` 変数を `beforeAll` でモジュールから取得し、各テストで使用
- **テストカバレッジの改善**: テスト不可能と判断した機能以外はすべてテスト実行
  - `domainFilter.test.js`: 5テスト (import verification, function existence check, toggleFormatUI)
  - `ublockImport.test.js`: 46テスト (import verification, URL validation, URL import, source management, etc.)

## [2.4.0] - 2026-02-07
### Added
- **i18n Support**: Added internationalization support with English and Japanese translations.
  - Implemented `i18n.js` for message retrieval and UI translation.
  - Added `_locales` directory with `en` and `ja` message files.

### Changed
- **UI Label Fix**: Corrected "Obsidian API Key" label to "OpenAI API Key" in AI settings.
- **UI Refactoring**: Updated `popup.html`, `popup.js`, and `main.js` to use localized strings instead of hardcoded text.

### Fixed
- **Test Updates**: Updated tests to support i18n and fix failing tests involved in the refactor.
- **isDomainBlockedError ロケール不一致修正**: エラー判定をi18nメッセージ文字列比較からエラーコード (`DOMAIN_BLOCKED`) ベースに変更。background workerとpopup間でロケールに依存しない安定した判定を実現。
- **XSSリスク除去**: `translateHelpText` の `innerHTML` 使用を `textContent` に変更し、CSS `white-space: pre-line` で改行を表示。`confirmContentDesc` からHTMLマークアップを除去し、注意文言を別キー `confirmContentNote` に分離。
- **ruleCount/exceptionCount/errorCount表示の修正**: `data-i18n` による `textContent` 上書きで子要素 `<span>` が消滅する問題を修正。ラベルとカウント値を別要素に分離。
- **domainFilter.jsのハードコード日本語除去**: 保存エラーメッセージを `getMessage('saveError')` に置換。
- **i18n.jsのリファクタリング**: `applyI18n` のデッドコード除去（if/else同一処理、INPUT到達不能分岐）、`getMessage` の二重API呼出除去、`JSON.parse` のエラーハンドリング追加。
- **翻訳キー不一致修正**: 日本語メッセージファイルに欠落していた `updateError` キーを追加。`items` キーの値を区切り文字（en: `", "` / ja: `"、"`）に修正。

### Security
- `translateHelpText` における `innerHTML` 使用を撤廃し、XSS攻撃ベクターを除去。

## [2.3.2] - 2026-02-07
### Fixed
- テスト分離問題を修正: sourceManager.test.jsとublockParser-cache.test.jsのテスト間で状態が共有される問題を解決
  - sourceManager.test.js: 脆弱なグローバルモックオーバーライドパターンをファクトリ関数`createStorageMocks()`に置き換え
  - ublockParser-cache.test.js: キャッシュ状態永続化問題を解決するため`clearCache()`関数を追加
  - 両テストで`beforeEach`/`afterEach`フックを使用し、テストごとに状態を初期化・復元
- テスト状態漏洩問題を修正: sourceManager.test.jsのテスト間でストレージデータが共有される問題を解決
  - jest.setup.jsのグローバルjest.fn()モックをmockImplementation()でオーバーライド
  - 各テストで独立したtestStorageオブジェクトを使用するように修正

### Changed
- src/utils/ublockParser/cache.js: テスト用の`clearCache()`関数を追加・エクスポート
- src/utils/ublockParser/index.js: `clearCache`関数をエクスポート
- テストカバレッジを向上（12テスト追加）
  - mask-visualization.test.js: ナビゲーション機能、モーダル操作、DOM要素動的作成のテストを追加
  - ublockExport.test.js: init関数のエラーハンドリングテストを追加
  - ublockParser-cache.test.js: クリーンアップタイマー設定テストを追加
- 全体カバレッジ: 52.73% → 54.4%
- sanitizePreview.js: 64.17% → 83.58% (+19.4%)
- ublockExport.js: 48.14% → 55.55% (+7.4%)

## [2.3.0] - 2026-02-05
### Added
- マスク種別表示: ステータスメッセージに具体的なPII種別名を表示（例: 「電話番号3件をマスクしました」「E-mail1件、クレジットカード番号2件をマスクしました」）
- マスク箇所ナビゲーション: ▲/▼ボタンでtextarea内の[MASKED:*]トークンにジャンプ＋選択する機能を追加
- プレビューtextareaのリサイズ: 右下ハンドルで縦横自由にリサイズ可能、ResizeObserverでポップアップ幅が自動追従

### Changed
- コードシンプル化リファクタリング（5グループ）
  - showStatus()の重複排除: 4ファイルに散在していたローカル関数を`settingsUiHelper.js`の共通関数に統合
  - cachedRegexTest()ラッパー削除: `ublockParser.js`の無意味なラッパーを直接`.test()`呼び出しに置換
  - sanitizePreview.js定数整理: 1回しか使われない定数オブジェクト（DISPLAY_VALUES, CSS_SELECTORS, MESSAGES）をインライン化
  - ObsidianClient簡素化: `init()`パターンを`_getConfig()`に統合し、二重`getSettings()`呼び出しを排除
  - isDomainAllowed()の二重シグネチャ排除: `arguments.length`による分岐を削除し、単一パラメータに統一
- storage.jsから未使用の`getApiKey()`関数を削除
- プレビューモーダルのHTMLハイライト生成を削除し、プレーンテキスト表示に変更（textareaでのHTMLタグ生テキスト表示バグを修正）
- プレビューtextareaのデフォルト高さを200px→600pxに拡大

### Fixed
- privacyPipeline.jsのpreviewOnlyレスポンスにmaskedItems配列が含まれていなかった問題を修正（maskedCountのみで配列が欠落していた）
- main.jsのshowPreview()呼び出しでmaskedItemsとmaskedCountが渡されていなかった問題を修正
- マスク0件でも確認画面が表示されていた問題を修正（全モード共通でmaskedCount > 0の場合のみ表示）

## [2.2.9] - 2026-02-05
### Changed
- コードシンプル化リファクタリング（5グループ）
  - showStatus()の重複排除: 4ファイルに散在していたローカル関数を`settingsUiHelper.js`の共通関数に統合
  - cachedRegexTest()ラッパー削除: `ublockParser.js`の無意味なラッパーを直接`.test()`呼び出しに置換
  - sanitizePreview.js定数整理: 1回しか使われない定数オブジェクト（DISPLAY_VALUES, CSS_SELECTORS, MESSAGES）をインライン化
  - ObsidianClient簡素化: `init()`パターンを`_getConfig()`に統合し、二重`getSettings()`呼び出しを排除
  - isDomainAllowed()の二重シグネチャ排除: `arguments.length`による分岐を削除し、単一パラメータに統一
- storage.jsから未使用の`getApiKey()`関数を削除
- プレビューモーダルのHTMLハイライト生成を削除し、プレーンテキスト表示に変更（textareaでのHTMLタグ生テキスト表示バグを修正）

### Added
- マスク種別表示: ステータスメッセージに具体的なPII種別名を表示（例: 「電話番号3件をマスクしました」「E-mail1件、クレジットカード番号2件をマスクしました」）
- マスク箇所ナビゲーション: ▲/▼ボタンでtextarea内の[MASKED:*]トークンにジャンプ＋選択する機能を追加
- プレビューtextareaのリサイズ: 右下ハンドルで縦横自由にリサイズ可能、ResizeObserverでポップアップ幅が自動追従

### Fixed
- privacyPipeline.jsのpreviewOnlyレスポンスにmaskedItems配列が含まれていなかった問題を修正（maskedCountのみで配列が欠落していた）
- main.jsのshowPreview()呼び出しでmaskedItemsとmaskedCountが渡されていなかった問題を修正
- マスク0件でも確認画面が表示されていた問題を修正（全モード共通でmaskedCount > 0の場合のみ表示）
- プレビューtextareaのデフォルト高さを200px→600pxに拡大

## [2.2.8] - 2026-02-05
### Fixed
- 確認ダイアログの「送信する」ボタンが動作しない不具合を修正
  - `initializeModalEvents()`がどこからも呼び出されておらず、ボタンのクリックイベントリスナーが未登録だった
  - `main.js`の初期化時に`initializeModalEvents()`を呼び出すように修正

## [2.2.7] - 2026-02-05
### Fixed
- Service Worker内での動的インポートエラーを修正
  - migration.jsで`await import('./storage.js')`を削除し、ハードコードされた定数 `'ublock_rules'` を使用
  - HTML仕様によりServiceWorkerGlobalScopeで禁止されている動的インポートの使用を回避

### Changed
- 大規模リファクタリング: service-worker.jsを責任ごとに分離し、保守性とテスタビリティを大幅向上
  - service-worker.js: 269行 → 97行（約64%削減）
  - 新規クラスの抽出:
    - `PrivacyPipeline.js` (80行): L1/L2/L3のプライバシー処理パイプライン
    - `RecordingLogic.js` (86行): URL記録フロー管理
    - `NotificationHelper.js` (22行): 成功/エラー通知処理
    - `NoteSectionEditor.js` (40行): Obsidianセクション編集ロジック
    - `dailyNotePathBuilder.js` (16行): 日付パス構築ユーティリティ
  - ObsidianClient.jsのリファクタリング: 抽出されたユーティリティを使用してシンプル化

### Added
- リファクタリングに伴う新規テストファイル（352行のテストコード追加）
  - `integration-recording.test.js` (118行): エンドツーエンド統合テスト
  - `privacyPipeline.test.js` (45行): プライバシーパイプラインのユニットテスト
  - `recordingLogic.test.js` (73行): 記録ロジックのユニットテスト
  - `notificationHelper.test.js` (38行): 通知ヘルパーのユニットテスト
  - `noteSectionEditor.test.js` (45行): セクション編集のユニットテスト
  - `dailyNotePathBuilder.test.js` (33行): パス構築のユニットテスト

## [2.2.6] - 2026-02-04
### Fixed
- uBlockマッチャーのバグ修正: `buildIndex` 関数で元のルールを直接使用するように変更し、options情報を保持
  - migrateToLightweightFormat が options を失う問題を修正
- テスト環境の jsdom 統合改善
  - navigation.test.js: 最大容量オブジェクトを削除し、jsdom DOM 要素を使用
  - main.test.js: 最大容量オブジェクトを削除し、jsdom DOM 要素を使用
  - mask-visualization.test.js: beforeEach で jsdom DOM 要素を作成
  - migration.test.js: chrome.runtime.lastError プロパティを追加
  - integration-reload-workflow.test.js: chrome.runtime.lastError プロパティを追加

### Changed
- ublockMatcher.js からデバッグログを削除

### Notes
- domainFilter.test.js は ESM モック設定の技術的制約により一時的にスキップ中（4テスト）

## [2.2.5] - 2026-02-04
### Fixed
- Jestテスト環境をjsdomに復元し、ブラウザAPIを必要とするテストを修復
- XSS脆弱性を修正: source URL表示をinnerHTMLからtextContentへ変更
- URLインポート時のエラーハンドリングを改善（空レスポンスの検出など）
- URLバリデーションを強化し、危険なプロトコル（javascript:, data:, vbscript:, file:）をブロック

### Added
- uBlockフィルターのデータマイグレーション機能（旧形式から軽量化形式への自動移行）
- マイグレーション用テストケース
- XSS防止テストケース（22テスト）
- URLインポートエラーハンドリングテストケース（28テスト）

### Changed
- 正規表現キャッシュを削除（メモリオーバーヘッド回避）
- 重複関数 saveDomainSettings() を削除
- uBlockフィルターの軽量化形式がデフォルトに

### Security
- XSS脆弱性の修正 (renderSourceListでのテキストエスケープ強化)
- 危険なURLプロトコルの検出とブロック

## [2.2.4] - 2026-02-03
### Fixed
- **Jest ESM設定修正**: babel-jestバージョン不整合(v30→v29)の解消、`--experimental-vm-modules`とbabel-jest変換の競合を修正
- **テスト基盤改善**: jest.config.jsをCJS形式に変更し、jest.setup.jsをsetupFilesAfterEnvに正しく登録
- **DOMモック強化**: jest.setup.jsにquerySelector/querySelectorAllを追加、domainFilter.js用DOM要素のキャッシュ付きモックを導入
- **domainFilter.test.js全面書き直し**: jest.mockによる正しい依存モック、fakeTimersによるタイマー処理で全12テストがパス

## [2.2.3] - 2026-02-01
### Added
- **Enhanced Logging**: Unified logging system with `addLog` function for consistent error/warning reporting across all modules.
- **Local AI Client Improvements**: Added better error handling and availability checking for local AI models.
- **Settings Management Refactor**: Centralized settings mapping and extraction in popup UI for better maintainability.
- **uBlock Filter Enhancements**: Added reload functionality for filter sources with validation and status updates.

### Changed
- **Improved Error Handling**: Replaced console.log/error/warn statements with structured logging throughout the codebase.
- **Optimized uBlock Matcher**: Refactored rule indexing and matching for better performance with wildcard domains.
- **Storage Utilities**: Added functions for managing saved URLs to prevent duplicates.

### Fixed
- **uBlock Filter Format Compatibility**: Fixed undefined length error when using lightweight uBlock filter format.
- **Content-Type Validation**: Added warning for non-text/plain content types when importing uBlock filters.
- **Crypto API Fallback**: Added fallback for environments where `crypto.randomUUID` is not available.

## [2.2.2] - 2026-01-30
### Added
- **Filter Source Reload**: Added a "Reload" (再読込) button to registered uBlock filter sources, allowing users to refresh rules from the original URL.
  - Updates timestamp and rule count upon successful reload.
  - Validates filter content before updating.

## [2.2.1] - 2026-01-29
### Added
- **uBlock Origin Filter Support**: Advanced domain filtering using uBlock Origin-style syntax.
  - Integrated `ublockParser.js` and `ublockMatcher.js` for rule parsing and matching.
  - Extended `domainUtils.js` to support combined whitelist/blacklist with uBlock rules.
  - Comprehensive test coverage for new functionality.

### Fixed
- **uBlock Filter Format Compatibility**: Fixed "Cannot read properties of undefined (reading 'length')" error when using the lightweight uBlock filter format (`blockDomains`/`exceptionDomains`).
  - Added `hasUblockRules()` helper function in `domainUtils.js` to safely check for rules in both old and new formats.

## [2.2.0] - 2025-01-xx
### Added
- **Masked Information Visualization**: Enhanced PII masking display in preview modal.
  - Shows count of masked items (e.g., "3件の個人情報をマスクしました")
  - Highlighted masked content with tooltip showing PII type (email, phone, creditCard, etc.)
  - Dynamic status message element creation and insertion
- **Loading Spinner**: Visual feedback indicator during recording process.
  - SVG-based spinner with smooth CSS animation
  - Configurable status text (default: "処理中...")
  - Proper show/hide behavior for success and error states
- **Auto-Close Popup**: Automatic popup closure 2 seconds after successful recording.
  - Only closes on main screen (preserves settings screen navigation)
  - Cancelled on error or screen transition
  - Countdown display for user feedback
- **Test Suite Improvements**: Added comprehensive test coverage for new features.
  - Masked information visualization tests (13 test cases)
  - Loading spinner tests (8 test cases)
  - Auto-close timer tests (9 test cases)
  - All tests passing (61/61)

### Changed
- **Refactoring**: Improved `sanitizePreview.js` with constant definitions, helper functions, and JSDoc documentation.
- **Jest Setup**: Enhanced DOM mocking for better test isolation (added loadingSpinner mock).

### Documentation
- **Plan Updates**: Updated plan/TODO.md to reflect current implementation status.
  - Clarified keyboard shortcut feature status (documentation exists but not implemented)
  - Marked UF-405, UF-406, UF-407 as "not implemented"

## [2.1.1] - 2026-01-22
### Changed
- **Refactoring**: Internal code refactoring for improved maintainability.

## [2.1.0] - 2026-01-21
### Added
- **Privacy Protection Suite**: Introduced comprehensive privacy controls with 4 operation modes.
    - **Mode A: Local Only**: Process entirely locally (Experimental, requires browser support).
    - **Mode B: Full Pipeline**: Local summary + Cloud refinement (Experimental).
    - **Mode C: Masked Cloud**: Masks PII (Credit Cards, Phone Numbers, etc.) before sending to Cloud AI (Recommended).
    - **Mode D: Cloud Only**: Legacy behavior.
- **Confirmation UI**: New modal to preview, edit, and confirm content before saving to Obsidian.
    - Conditional display in Mode C (shows only when PII is detected/masked).
- **PII Sanitization**: Regex-based masking for sensitive information.
- **Sanitization Logs**: Local logging system to track masking events (7-day retention).
- **Settings UI**: Reorganized settings into tabs (General, Domain Filter, Privacy).

### Fixed
- **Force Recording**: Fixed a bug where force-recording a blocked domain would fail or loop.


## [2.0.2] - 2026-01-17
### Fixed
- **Error Popup Removal**: Removed unnecessary error popup when a domain is not allowed to be recorded. Errors are now only logged to the console.
- **Improved Error Handling**: Enhanced error messages in the popup for connection issues, providing clearer guidance to users (e.g., "Please reload the page and try again").
- **Service Worker Connection**: Improved handling of "Receiving end does not exist" errors that occur when the service worker is not ready yet.

## [2.0.1] - 2026-01-17
### Added
- **Force Record**: Added a feature to allow users to force record pages even if they are on the blacklist.


## [2.0.0] - 2026-01-16
### Added
- **Domain Filter Feature**: Added whitelist/blacklist functionality to control which domains are recorded.
  - Three filter modes: Disabled (record all), Whitelist (record only specified domains), Blacklist (exclude specified domains)
  - Wildcard pattern support (e.g., `*.example.com`)
  - "Add Current Domain" button to easily add the domain of the currently open page
  - Automatic subdomain removal (www.example.com → example.com)
  - Default blacklist mode with common sites pre-configured
- **Manual Recording Feature**: Added "Record Now" button to manually record any page instantly without duplicate URL restrictions.
- **Improved UI**: Separated main screen and settings screen with hamburger menu navigation.
- **Main Screen Display**: Shows current page information (title, URL, favicon) in the main popup.
- **Navigation System**: Implemented screen switching between main and settings views.
- **LICENSE**: Added MIT License file (`LICENSE.md`).
- **Privacy Policy**: Updated `PRIVACY.md` to explicitly mention data usage with OpenAI-compatible APIs (user-specified endpoints).

### Changed
- **Popup Layout**: Redesigned popup to show main screen by default instead of direct settings access.
- **User Experience**: Enhanced workflow with manual recording option alongside automatic detection.

## [Commit 98a3686] - 2026-01-15
### Documentation
- Updated `README.md` to include a reference and credit to the original article/project.

## [Commit 35d09a5] - 2026-01-15
### Added
- **OpenAI Compatible API Support**: Added full support for OpenAI-compatible APIs (e.g., Groq, Ollama, LM Studio).
- **Dual Provider Configuration**: Implemented `OpenAI Compatible` and `OpenAI Compatible 2` settings, allowing users to switch between multiple providers (e.g., a fast cloud provider like Groq and a local private LLM) without re-entering keys.

### Changed
- **Unified AI Client**: Refactored `aiClient.js` to dynamically switch between Google Gemini and OpenAI-compatible providers based on user settings.
- **Settings UI**: Updated the popup UI to support provider selection and multiple API configurations.

## [1.0.0] - Initial Release
Original idea and codebase was introduced in this article: https://note.com/izuru_tcnkc/n/nd0a758483901
### Released
- Initial version of Obsidian Smart History.
- **Features**:
    - Automatic browsing history tracking locally.
    - Smart detection of "read" pages based on duration (5s) and scroll depth (50%).
    - AI Summarization using Google Gemini API.
    - Automatic saving to Obsidian Daily Notes via Local REST API.
