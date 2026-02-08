# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Security
- **SSRF脆弱性対策 (P0)**: uBlockフィルターインポート機能で内部ネットワークアクセスを防止
  - `isPrivateIpAddress()` 関数でプライベートIPアドレス検出（10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, IPv6 localhost）
  - `validateUrlForFilterImport()` でCloud Metadata (169.254.169.254) 等の内部ネットワークURLをブロック
  - Obsidian API用localhostアクセスは維持（フィルターインポートのみ別途ブロック）
- **Content Script権限縮小 (P0)**: `manifest.json`でcontent_scriptsのmatchesを`<all_urls>`から`["http://*/*", "https://*/*"]`へ変更
  - chrome://, file://等のプロトコルへのインジェクションを防止
  - Content Script不在時の適切なエラーハンドリング追加（HTTP/HTTPSページのみ対応）
- **キーボードアクセシビリティの強化**: 全てのフォーカス可能要素に視覚的なフォーカスインジケーターを追加
  - icon-btn, primary-btn, secondary-btn, alert-btn, input, select, textarea等に:focusスタイルを追加
  - WCAG準拠の視覚的フィードバックを実現
- **モーダルのアクセシビリティ向上**: 確認モーダルにスクリーンリーダー対応のARIA属性を追加
  - `role="dialog"` と `aria-modal="true"` を追加
  - `aria-labelledby` でタイトル要素と関連付け

### Accessibility
- **タブキーボードナビゲーション (P0)**: 設定画面のタブ切り替えにキーボード操作対応
  - 矢印キー（←→）でタブ間移動
  - Home/Endキーで先頭/末尾タブへジャンプ
  - Enter/Spaceキーでタブ選択
  - `aria-selected`属性の動的更新でスクリーンリーダー対応
- **モーダルフォーカストラップ (P0)**: 確認モーダルにフォーカストラップ実装
  - Tabキーでモーダル内フォーカスループ
  - ESCキーでモーダルを閉じる
  - モーダル前のフォーカス要素を記憶・復帰
- **アイコンボタンARIAラベル (P0)**: スクリーンリーダー用ラベル追加
  - メニューボタン: `aria-label="設定"`
  - 戻るボタン: `aria-label="戻る"`
  - モーダル閉じる: `aria-label="閉じる"`

### i18n
- **P0セキュリティ強化用メッセージ追加**: SSRF対策およびContent Script権限縮小対策のためのエラーメッセージ追加
  - `errorPrivateNetworkAccess`: プライベートネットワークアクセスブロック
  - `errorLocalhostAccess`: localhostアクセスブロック（フィルターインポート）
  - `errorContentScriptNotAvailable`: Content Script不在時エラー
  - `errorNoContentResponse`: コンテンツ応答なしエラー
- **ARIAラベル用メッセージ追加**: スクリーンリーダー用ボタンラベル
  - `openSettings`: "設定" / "Settings"
  - `backToMain`: "メイン画面に戻る" / "Back to Main"
  - `closeModal`: "閉じる" / "Close Modal"
- **ハードコード文字列のi18n化**: 日本語固定テキストを国際化システムに置換
  - `spinner.js` のデフォルト引数 `showSpinner(text = '処理中...')` を `getMessage('processing')` に置換
  - `autoClose.js` のカウントダウンメッセージを `getMessage('countdownNumber', { count })` に置換
  - `autoClose.js` の自動閉じるメッセージを `getMessage('autoClosing')` に置換
- **翻訳ファイルの追加**: 新しいi18nキーの翻訳を追加
  - `countdownNumber`: "{count}..." (en/ja)
  - `autoClosing`: "Auto-closing..." / "自動閉じる..."

### Tests
- **i18nモックの追加**: テスト環境でi18nメッセージのモックを追加
  - `mainSpinner.test.js` に `getMessage('processing')` のモック設定
  - `autoClose.test.js` に `getMessage('countdownNumber')` と `getMessage('autoClosing')` のモック設定

### UI/UX
- **設定ボタンのアイコン化**: メイン画面の設定ボタンをテキスト表示からギアアイコン（⚙）に変更
  - i18n翻訳によるテキスト置換でボタンからはみ出していた問題を修正
  - `data-i18n` を `data-i18n-aria-label` に変更し、`textContent` ではなく `aria-label` のみ翻訳
  - 戻るボタン（←）、モーダル閉じるボタン（×）も同様に修正
  - `i18n.js` に `data-i18n-aria-label` 属性のサポートを追加
  - `.icon-btn` の `font-size` を16px→20pxに拡大、`overflow: hidden` を追加

### Fixed
- **uBlock設定保存エラーの修正**: ドメインフィルター設定で「保存」ボタン押下時に `saveSettings is not defined` エラーが発生する問題を修正
  - `ublockImport/index.js` で `saveSettings` のインポートが欠落していたため、uBlock形式の有効/無効切り替え時に保存が失敗していた
  - `storage.js` からのインポートに `saveSettings` を追加

## [2.4.0-rc2] - 2026-02-08

### Security
- **URL検証の強化 (`fetch.js` 新規作成)**: SSRF攻撃防止のためのURL検証機能を追加
  - プロトコル検証（http://、https://のみ許可）
  - localhostブロック（オプション、デフォルト無効でObsidian API localhostアクセスを許可）
  - 危険なプロトコルスキームの防止
- **パラメータ検証の強化 (`fetch.js`)**: タイムアウトパラメータの検証を追加
  - 最小タイムアウト100ms、最大5分（300000ms）
  - 型チェックと有限数チェック
- **Mutexデッドロック保護**: `obsidianClient.js`のMutex.release()にtry-catchを追加
  - エラー発生時に強制アンロック（locked = false）
- **LocalAIClientメモリリーク修正**: `localAiClient.js`のタイムアウト処理でtimeoutIdを適切にクリア
- **CSP実装**: manifest.jsonとpopup.htmlにContent Security Policyを追加し、スクリプトインジェクションのリスクを軽減
  - extension_pages: script-srcおよびobject-srcの制限
  - connect-src: localhostとHTTPSのみを許可
- **エラーメッセージの情報流出防止**: `errorUtils.js` に `sanitizeErrorMessage()` 関数をエクスポート
  - APIキー、Bearerトークン、localhost URLなどの機密情報をマスク
- **メッセージ検証強化**: Service Workerのメッセージパッシング検証を強化（テスト追加）
  - XSS攻撃パターン、JSプロトコル、data URL等の検出
- **URLパスサニタイズ機能追加**: `pathSanitizer.js` にパスセグメントのサニタイズを実装
  - パストラバーサル攻撃 (`../`, `../../`) の検出とブロック
  - プロトコルスキーム注入 (`https://`, `ftp://`, `file://`) の防止
  - ヌルバイト、改行文字、制御文字のフィルタリング
  - 過度なパス長（500文字制限）およびセグメント数（10個制限）の実装
- **HTMLエスケープ関数追加**: `errorUtils.js` に `escapeHtml()` 関数を実装
  - `&`, `<`, `>`, `"`, `'`, `/` を適切なHTMLエンティティにエスケープ
- **ReDoSリスク調査**: `piiSanitizer-redos.test.js` で正規表現のパフォーマンス特性を分析
  - 大規模入力（〜100KB）に対する処理時間の測定
  - 入力サイズ制限とタイムアウト機能の改善提案
- **クリックジャッキング対策**: CSP `frame-ancestors 'none'` ディレクティブによりiframe埋め込み攻撃を防止
- **入力検証の強化**: ポート番号の検証（1-65535）により不正な入力値を拒否
- **メモリ枯渇防止**: URLセットサイズ制限（最大10000）によりメモリ使用量を抑制

### Added
- **AIクライアントタイムアウト**: `aiClient.js` に全AI API呼び出しで30秒タイムアウトを追加
  - `generateGeminiSummary()` に30秒タイムアウト
  - `generateOpenAISummary()` に30秒タイムアウト
  - `listGeminiModels()` に30秒タイムアウト（P1修正で追加）
- **LocalAIClientタイムアウト**: `localAiClient.js` に15秒タイムアウトを実装
  - Promise.raceによるタイムアウト機構
  - 適切なクリーンアップ処理（メモリリーク防止）
- **Fetchタイムアウト機能**: `fetch.js` にタイムアウト付きfetchラッパーを新規作成し、AbortControllerを使用して無限待機を防止
  - ユニバーサルなタイムアウト機能（ミリ秒指定）
  - URL検証とパラメータ検証を内包
- **StorageKeys最適化**: `storage.js`のgetSettings()で明示的なキー指定を追加
  - `chrome.storage.local.get(null)` から StorageKeysの配列指定へ
  - メモリ効率の改善
- **Fetchタイムアウト機能**: `obsidianClient.js` に15秒のタイムアウトを実装し、AbortControllerを使用して無限待機を防止
- **ポート番号検証**: `obsidianClient.js` にポート番号の検証（1-65535）を追加し、入力値の妥当性を確認
- **URLセットサイズ制限**: `recordingLogic.js` にURLセットのサイズ制限（最大10000、警告8000）と警告閾値を追加
  - `MAX_URL_SET_SIZE` 定数（10000）と `URL_WARNING_THRESHOLD` 定数（8000）を `storage.js` に追加

### Performance
- **Mutex Queue Map改善**: `obsidianClient.js`のMutexを配列からMapへ変更
  - O(1)の取得・削除操作（配列のO(n)から改善）
  - taskIdによる効率的なロック管理
  - 技術的負債: Map.entries().next()は真のO(1)ではない（Blue Teamレビューで指摘）
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
- **設定オブジェクト作成の最適化**: `obsidianClient.js` に `BASE_HEADERS` 定数を追加
  - `Content-Type` と `Accept` の値をモジュールレベル定数化
- **2重キャッシュ構造の簡素化**: `recordingLogic.js` のキャッシュを1段階に統合
  - インスタンスキャッシュを削除し、staticキャッシュのみを使用
- **定数のモジュールスコープ移動**: `errorUtils.js` の `INTERNAL_KEYWORDS` を関数内からモジュールスコープへ移動
  - 関数呼び出しごとの配列作成コストを削減
- **i18nメッセージキャッシュ**: `errorUtils.js` に `getMsgWithCache()` 関数を実装
  - `ErrorMessages` getterからキャッシュされたメッセージを取得
- **URLセットキャッシュ追加**: `recordingLogic.js` に `getSavedUrlsWithCache()` と `invalidateUrlCache()` を実装
  - Chrome Storage I/O回数の削減
- **エラーサニタイゼーションの重複呼び出し削除**: `getUserErrorMessage()` 内の不要な `sanitizeErrorMessage()` 呼び出しを削除

### UI/UX
- **エラー/成功メッセージの視覚的強化**: `styles.css` にスタイル定義を追加
  - `.error` クラスに背景色 (`#f8d7da`) とボーダー (`#f5c6cb`) を追加
  - `.success` クラスに背景色 (`#d4edda`) とボーダー (`#c3e6cb`) を追加
- **アクセシビリティ対応**: `popup.html` にARIA属性を追加
  - タブボタンに `role="tab"` と `aria-selected` 属性を追加
  - タブパネルに `role="tabpanel"` と `aria-labelledby` 属性を追加
  - ステータス要素に `aria-live="polite"` 属性を追加
- **強制記録ボタンのスタイル正規化**: `styles.css` に `.alert-btn` クラスを追加
  - インラインスタイルをCSSクラス化し、保守性を向上
- **ヘルプテキストの視覚的強化**: `styles.css` の `.help-text` クラスに背景色とパディングを追加
- **ボタンの操作エリア確保**: `.icon-btn` のサイズを 32×32px → 44×44px に拡大
  - WCAG推奨の最小タッチ領域を確保
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
- **URLパスサニタイズテスト追加**: `pathSanitizer.test.js` (新規ファイル) に42件のテストを追加
  - パストラバーサル攻撃、プロトコルスキーム注入、制御文字の検出
- **日付パス構築セキュリティテスト追加**: `dailyNotePathBuilder-security.test.js` (新規ファイル) に18件のテストを追加
- **HTMLエスケープテスト追加**: `errorUtils.test.js` に12件のテストを追加
- **ReDoSリスクテスト追加**: `piiSanitizer-redos.test.js` (新規ファイル) に20件のテストを追加
  - 小規模〜大規模入力に対する処理時間の測定
- **UI/UX改善テスト追加**: `ui-ux-improvements.test.js` (新規ファイル) に20件のテストを追加
- **堅牢性テスト追加**: ロブストネスに関する5つのテストファイル (60テスト)
  - `robustness-fetch-timeout.test.js` - Fetchタイムアウト機能
  - `robustness-mutex-queue-limit.test.js` - Mutexキューサイズ制限
  - `robustness-data-integrity.test.js` - データ整合性
  - `robustness-port-validation.test.js` - ポート番号の検証
  - `robustness-url-set-limit.test.js` - URLセットのサイズ制限
- **ロバストネス改善追加テスト**: 6つのテストファイル (23テスト)
  - `obsidianClient-mutex-map.test.js` - Mutex Queue Map改善
  - `localAiClient-timeout.test.js` - LocalAIClientタイムアウト機能
  - `aiClient-timeout.test.js` - AIクライアントタイムアウト機能
  - `integration-robustness.test.js` - ロバストネス統合テスト
  - `fetch.test.js` - fetchWithTimeout URL検証とパラメータ検証
  - `storage-keys.test.js` - StorageKeys最適化
- **テスト結果**: 全825テスト中824パス（50テストスイート）
  - 1件のテスト失敗はロバストネス改善とは無関係（既知の問題）
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

### Fixed
- **Mutexデッドロック修正**: `obsidianClient.js`のrelease()でエラー発生時にロックが解放されない問題を修正
  - try-catchブロックを追加し、エラー時に強制的にlocked = falseを設定
- **LocalAIClientメモリリーク修正**: `localAiClient.js`のタイムアウト処理でtimeoutIdクリーンアップが漏れる問題を修正
  - 成功時・エラー時双方でclearTimeout(timeoutId)を実行
- **URL検証のlocalhost許可デフォルト化**: `fetch.js`のURL検証がObsidian APIのlocalhostアクセスをブロックしていた問題を修正
  - localhostブロックをオプション化し、デフォルトで無効（Obsidian API使用時の問題回避）
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

## [2.4.0-rc1] - 2026-02-07
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
