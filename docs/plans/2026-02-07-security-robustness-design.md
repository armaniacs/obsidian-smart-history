# セキュリティ・堅牢性機能の実装設計

作成日: 2026-02-07

## 1. アーキテクチャの概要

本機能は、既存の `ObsidianClient` と `RecordingLogic` クラスにセキュリティと堅牢性の向上を目的とした4つの機能を追加します。各機能は独立しており、それぞれ異なる問題を解決します：

1. **fetch タイムアウト**（obsidianClient.js）: ネットワーク無応答時の無限待機を防止
2. **ポート番号検証**（obsidianClient.js）: 不正なポート設定による接続エラーを事前に防止
3. **URL セットサイズ制限**（recordingLogic.js）: メモリ消費の増大とストレージ肥大化を防止
4. **CSP frame-ancestors**（popup.html）: iframe 埋め込みによるクリックジャッキング攻撃を防止

変更箇所は `obsidianClient.js`、`recordingLogic.js`、`popup.html` の既存コードに対する最小限の追加修正で構成されます。

## 2. 各コンポーネントの詳細実装

### 2.1 obsidianClient.js への変更

**fetch タイムアウト機能:**
- 定数 `FETCH_TIMEOUT_MS` をファイル上部に追加（値: 15000）
- プライベートメソッド `_fetchWithTimeout()` を新規追加
  - `AbortController` を使用してタイムアウト管理
  - タイムアウト時は `AbortError` をキャッチして明確なエラーメッセージを出力
- `_fetchExistingContent()`, `_writeContent()`, `testConnection()` の各メソッドで `_fetchWithTimeout()` を使用して fetch 呼び出しを置換

**ポート番号検証機能:**
- 定数 `MIN_PORT = 1`, `MAX_PORT = 65535` を追加
- プライベートメソッド `_validatePort()` を新規追加
  - 数値変換、範囲チェック（1-65535）、整数チェックを行う
  - 無効な場合は適切なエラーメッセージと共に例外をスロー
- `_getConfig()` メソッド内でポート値を検証後に使用

### 2.2 recordingLogic.js への変更

**URL セットサイズ制限機能:**
- storage.js から定数 `MAX_URL_SET_SIZE = 10000` をインポート
- オプションで `URL_WARNING_THRESHOLD = 8000` もインポート可能
- `record()` メソッドの URL 追加ロジックにサイズチェックを追加
  - 上限到達時:
    - `addLog(LogType.ERROR)` でログ出力
    - `NotificationHelper.notifyError()` でユーザー通知
    - エラー応答 `{ success: false, error: 'URL set size limit exceeded...' }` を返す
  - 警告閾値到達時（オプション）:
    - `addLog(LogType.WARN)` で警告ログ出力

### 2.3 popup.html への変更

**CSP frame-ancestors の追加:**
- 既存の CSP ディレクティブに `frame-ancestors 'none';` を追加
- 変更後の CSP: `default-src 'none'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none';`

## 3. データフローの変更

**fetch タイムアウトのデータフロー:**

```
ユーザー操作 → ObsidianClient メソッド呼び出し
  → _getConfig() (ポート番号検証を含む)
  → _fetchExistingContent() または _writeContent()
    → fetchWithTimeout(url, options)
      → AbortController 作成 + setTimeout(15000ms)
      → fetch(url, { signal })
        ├─ 正常応答 → clearTimeout → 結果返却
        └─ タイムアウト → AbortError をキャッチ
          → logger 出力 + 明確なエラーメッセージ
```

**URL サイズ制限のデータフロー:**

```
record() 呼び出し
  → getSettingsWithCache()
  → getSavedUrlsWithCache() → urlSet 取得
  → urlSet.has(url) (重複チェック)
    ├─ 重複 → skipped: true 返却
    └─ 新規 → PrivacyPipeline 実行
      → Obsidian 保存
      → urlSet.size < MAX_URL_SET_SIZE 検証
        ├─ 未超過 → urlSet.add(url) → setSavedUrls()
        └─ 超過 → ERROR ログ + ユーザー通知 + エラー返却
```

**ポート番号検証のデータフロー:**

```
_getConfig() 呼び出し
  → storage からポート値取得
  → port 未指定/空 → デフォルト(27123) 使用
  → port 指定あり → _validatePort(port)
    ├─ 有効 → baseUrl 構築へ
    └─ 無効 → ERROR ログ + 例外スロー
```

## 4. エラーハンドリング

### 4.1 fetch タイムアウトのエラーハンドリング

**エラー種別:**
- `AbortError`: 15秒経過しリクエストがキャンセルされた場合
  - ログ: `LogType.ERROR`、メッセージ: `Obsidian request timed out after 15000ms`
  - ユーザーメッセージ: `Error: Request timed out. Please check your Obsidian connection.`
- ネットワークエラー: fetch が失敗した場合（既存の _handleError で処理）

**エラー伝播パス:**
```
fetchWithTimeout → AbortError キャッチ
  → 明確なエラーメッセージ含む Error をスロー
    → 呼び元(_fetchExistingContent/_writeContent/testConnection)でキャッチ
      → 既存のエラーハンドリング（_handleError）へ
        → ユーザー通知
```

### 4.2 ポート番号検証のエラーハンドリング

**エラー種別:**
- `NaN`（非数値）: ポート値が数字に変換できない場合
  - メッセージ: `Invalid port number. Port must be a valid number.`
- 範囲外: ポートが `1` 未満または `65535` より大きい場合
  - メッセージ: `Invalid port number. Port must be between 1 and 65535.`
- 非整数: ポート値に小数が含まれる場合
  - メッセージ: `Invalid port number. Port must be an integer.`

**特殊ケース扱い:**
- `undefined` または空文字列: デフォルトポート `27123` を適用（エラーなし）

### 4.3 URL サイズ制限のエラーハンドリング

**エラー種別:**
- 上限超過: `urlSet.size >= MAX_URL_SET_SIZE` の場合
  - ログ: `LogType.ERROR`、メッセージ: `URL set size limit exceeded. Current: ${size}, Max: ${MAX_URL_SET_SIZE}`
  - 通知: `NotificationHelper.notifyError()`、メッセージ: `URL history limit reached. Please clear your history.`
  - 返却値: `{ success: false, error: 'URL set size limit exceeded. Please clear your history.' }`

**警告（オプション実装）:**
- 閾値接近: `urlSet.size >= URL_WARNING_THRESHOLD` の場合
  - ログ: `LogType.WARN`、メッセージ: `URL set size approaching limit. Current: ${size}, Warning threshold: ${URL_WARNING_THRESHOLD}`

## 5. テスト戦略

### 5.1 既存テストの更新

既存のテストファイルがすでに存在しており、実装完了後に以下の変更を行います：

**robustness-fetch-timeout.test.js:**
- タイムアウト発生時のテストを有効化
  - `jest.useFakeTimers()` と `jest.advanceTimersByTime()` 使用
  - AbortError が正しくスローされることを検証
  - ユーザーフレンドリーなエラーメッセージを検証

**robustness-port-validation.test.js:**
- 無効なポート番号のテストを有効化
  - ポート `0`, `65536`, `-1`, `abc`, `27123.5` で例外がスローされることを検証
  - エラーメッセージが適切であることを検証
  - 空文字列/undefined でデフォルト値が使用されることを検証

**robustness-url-set-limit.test.js:**
- URL セットサイズ制限のテストを有効化
  - `MAX_URL_SET_SIZE` で制限が適切に動作することを検証
  - 上限到達時のエラーとログ出力を検証
  - 上限到達時の通知を検証（NotificationHelper モックの呼び出しをチェック）

### 5.2 新規テストの追加

**storage.js への変更を検証するテスト:**
- `src/utils/__tests__/storage.test.js` に定数エクスポートのテストを追加
  - `MAX_URL_SET_SIZE` が 10000 であることを検証
  - `URL_WARNING_THRESHOLD` が 8000 であることを検証

**CSP frame-ancestors のテスト:**
- HTML 解析テストを使用して CSP ディレクティブを検証
  - `frame-ancestors 'none'` が含まれていることを確認

### 5.3 統合テスト

- ポート検証成功後、タイムアウト付きの fetch が正常に動作することを検証
- URL サイズ制限が Mutex キューリミットと干渉しないことを確認

## 6. ファイル構成と実装順序

### 6.1 変更対象ファイル

```
src/background/
├── obsidianClient.js                 (変更: タイムアウト + ポート検証追加)
├── recordingLogic.js                 (変更: URLサイズ制限追加)
└── __tests__/
    ├── obsidianClient-mutex.test.js  (変更なし)
    ├── obsidianClient.test.js        (変更: 新規機能追加の確認)
    ├── robustness-fetch-timeout.test.js    (更新: TODOテスト有効化)
    ├── robustness-port-validation.test.js  (更新: TODOテスト有効化)
    ├── robustness-url-set-limit.test.js    (更新: TODOテスト有効化)
    └── (その他既存テスト              (変更なし))

src/utils/
├── storage.js                        (変更: 定数エクスポート追加)
└── __tests__/
    └── storage.test.js               (更新: 定数値の検証追加)

src/popup/
├── popup.html                        (変更: CSP frame-ancestors 追加)
└── (その他                          (変更なし))
```

### 6.2 推奨実装順序

1. **storage.js**: `MAX_URL_SET_SIZE` と `URL_WARNING_THRESHOLD` 定数をエクスポート
2. **obsidianClient.js**: ポート番号検証と fetch タイムアウト機能を追加
3. **recordingLogic.js**: URL サイズ制限機能を追加
4. **popup.html**: CSP `frame-ancestors` を追加
5. **テスト更新**: 既存テストの TODO 部分を有効化
6. **テスト実行**: すべてのテストが通ることを確認

## 7. 設定値のまとめ

| 設定項目 | 値 | 場所 |
|---------|---|---|
| FETCH_TIMEOUT_MS | 15000 | obsidianClient.js |
| MIN_PORT | 1 | obsidianClient.js |
| MAX_PORT | 65535 | obsidianClient.js |
| DEFAULT_PORT | 27123 | obsidianClient.js |
| MAX_URL_SET_SIZE | 10000 | storage.js |
| URL_WARNING_THRESHOLD | 8000 | storage.js |