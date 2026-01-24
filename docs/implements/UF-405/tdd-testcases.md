# UF-405: キーボードショートカット対応 - TDDテストケース

## 概要

**【機能名】**: キーボードショートカット対応 (Ctrl+S / Cmd+S)

**TDDタスクID**: UF-405

**作成日**: 2026-01-24

---

## 開発言語・フレームワーク

### 信頼性レベル: 🟢 青信号

### プログラミング言語: JavaScript (ES Modules)

- **言語選択の理由**: 既存コードベースは ES Modules で記述されており、Chrome Extension Service Worker は ES Modules をサポート
- **テストに適した機能**: Jest でのモック、非同期処理のテスト（async/await）

### テストフレームワーク: Jest

- **フレームワーク選択の理由**: 既存プロジェクトで使用中（UF-404のautoClose.test.jsで実績あり）
- **テスト実行環境**: Node.js + Jest (実験的VMモジュール)

---

## テストケース分類サマリー

| 分類 | テストケース数 | 内容 |
|------|----------------|------|
| 正常系 | 4 | コマンド受信、アクティブタブ記録、HTTP/HTTPS記録 |
| 異常系 | 3 | アクティブタブなし、非プロトコル、タブ取得失敗 |
| エッジ| 3 | 連続実行排他制御、Content Script通信失敗、既記録スキップ |
| **合計** | **10** | |

---

## 1. 正常系テストケース（基本的な動作）

### TC-001: コマンド受信時にアクティブタブを記録できる

- **何をテストするか**: `chrome.commands.onCommand` で `quick-record` コマンドを受信した際、適切に処理が実行されるか
- **期待される動作**: アクティブタブ情報を取得し、記録処理が呼び出される

- **入力値**:
  ```javascript
  {
    command: "quick-record"
  }
  ```
  - **入力データの意味**: manifest.json で定義されたコマンドID
  - **実際の発生シナリオ**: ユーザーが Ctrl+S / Cmd+S を押下

- **期待される結果**:
  ```javascript
  {
    success: true
  }
  ```
  - **期待結果の理由**: 既存の `processUrlRecording()` が正常に完了すると `{ success: true }` を返す

- **テストの目的**: ショートカットコマンド受信から記録処理までの基本的なフローを確認
  - **確認ポイント**: コマンドリスナーが呼び出される、タブ情報が取得できる、記録処理が実行される

- 🟢 要件定義（tdd-requirements.md 43-75行目、入出力仕様とデータフロー）

---

### TC-002: HTTP/HTTPS のアクティブタブのみ記録される

- **何をテストするか**: アクティブタブの URL が HTTP/HTTPS であるかの判定
- **期待される動作**: HTTP/HTTPS の場合のみ記録処理が実行される

- **入力値**:
  ```javascript
  {
    activeTab: {
      id: 123,
      url: "https://example.com",
      title: "Example Page"
    }
  }
  ```
  - **入力データの意味**: HTTPS URL を持つタブ
  - **実際の発生シナリオ**: ユーザーが通常の Web ページを閲覧中

- **期待される結果**:
  ```javascript
  {
    success: true
  }
  ```
  - **期待結果の理由**: HTTP/HTTPS は記録対象となる

- **テストの目的**: プロトコルフィルターが正しく動作することを確認
  - **確認ポイント**: URL チェック、記録処理がスキップされない

- 🟢 要件定義（tdd-requirements.md 114行目、HTTP/HTTPSのみ記録）

---

### TC-003: 記録成功後に通知が表示される

- **何をテストするか**: 記録処理成功後の Chrome 通知表示
- **期待される動作**: 成功メッセージを持つ通知が作成される

- **入力値**:
  ```javascript
  {
    activeTab: {
      id: 123,
      url: "https://example.com",
      title: "Example Page"
    }
  }
  ```
  - **入力データの意味**: 記録に成功するタブ情報
  - **実際の発生シナリオ**: 通常の記録処理

- **期待される結果**:
  ```javascript
  chrome.notifications.create が呼び出され、
  {
    type: 'basic',
    title: 'Saved to Obsidian',
    message: 'Saved: Example Page'
  }
  ```
  - **期待結果の理由**: 既存の `processUrlRecording()` で成功通知が実装されている（service-worker.js 164-169行目）

- **テストの目的**: ユーザーフィードバック（通知）が正しく表示されることを確認
  - **確認ポイント**: `chrome.notifications.create` が呼ばれる、通知内容が正しい

- 🟢 既存実装（src/background/service-worker.js 164-169行目、通知処理）

---

### TC-004: Content Script からページコンテンツを取得して記録

- **何をテストするか**: Content Script 経由でのページコンテンツ取得
- **期待される動作**: タブへメッセージを送信し、コンテンツを受信して記録処理へ渡す

- **入力値**:
  ```javascript
  {
    activeTab: {
      id: 123,
      url: "https://example.com",
      title: "Example Page"
    },
    contentFromScript: "ページの本文テキスト..."
  }
  ```
  - **入力データの意味**: Content Script から取得されるページコンテンツ
  - **実際の発生シナリオ**: Content Script がページテキストを抽出して返す

- **期待される結果**:
  ```javascript
  {
    success: true
  }
  ```
  - **期待結果の理由**: コンテンツ付きで `processUrlRecording()` が呼び出され、処理が成功する

- **テストの目的**: Content Script との連携が正しく動作することを確認
  - **確認ポイント**: `chrome.tabs.sendMessage` が呼ばれる、コンテンツが記録処理に渡される

- 🟢 要件定義（tdd-requirements.md 69-73行目、タブへメッセージ送信）

---

## 2. 異常系テストケース（エラーハンドリング）

### TC-101: アクティブタブが存在しない場合の処理

- **エラーケースの概要**: すべてのタブが閉じられている状態でショートカット押下
- **エラー処理の重要性**: 未定義値による例外防止、ユーザーへの適切なフィードバック

- **入力値**:
  ```javascript
  {
    activeTab: null  // chrome.tabs.query が空配列を返す
  }
  ```
  - **不正な理由**: アクティブタブが存在しない
  - **実際の発生シナリオ**: ユーザーがすべてのタブを閉じた後にショートカット押下

- **期待される結果**:
  ```javascript
  {
    success: false,
    error: "アクティブタブが見つかりません"
  }
  ```
  - **エラーメッセージの内容**: ユーザーに状況を明確に伝える
  - **システムの安全性**: null チェックにより例外防止

- **テストの目的**: タブがない状態での安全な処理を確認
  - **品質保証の観点**: 例外発生を防ぐ、適切なエラーメッセージ表示

- 🟡 要件定義の EDGE-001（アクティブタブが存在しない）から妥当な推測

---

### TC-102: HTTP/HTTPS 以外のページでは記録されない

- **エラーケースの概要**: chrome://、about:blank などの特別なプロトコルのタブ
- **エラー処理の重要性**: 記録不可能なページでの処理防止、ユーザーの混乱回避

- **入力値**:
  ```javascript
  {
    activeTab: {
      id: 123,
      url: "chrome://extensions",
      title: "Extensions"
    }
  }
  ```
  - **不正な理由**: HTTP/HTTPS 以外のプロトコル
  - **実際の発生シナリオ**: ユーザーが拡張機能設定ページを閲覧中

- **期待される結果**:
  ```javascript
  {
    success: false,
    error: "このページは記録できません"
    // または何もしない（サイレントスキップ）
  }
  ```
  - **エラーメッセージの内容**: 記録対象外であることを伝える
  - **システムの安全性**: 処理を早期に終了し、無駄なリソース使用を防止

- **テストの目的**: プロトコルフィルターによるスキップ処理を確認
  - **品質保証の観点**: 記録対象外ページでの適切な挙動

- 🟢 要件定義（tdd-requirements.md 155-158行目、記録対象外のページ）

---

### TC-103: タブ取得失敗時のエラーハンドリング

- **エラーケースの概要**: `chrome.tabs.query` API 自身の失敗
- **エラー処理の重要性**: API エラーに対する堅牢なハンドリング、ユーザーへの通知

- **入力値**:
  ```javascript
  {
    chromeTabsQueryError: new Error("API Error")
  }
  ```
  - **不正な理由**: chrome.tabs.query がエラーをスロー
  - **実際の発生シナリオ**: ブラウザの内部エラーや権限問題

- **期待される結果**:
  ```javascript
  {
    success: false,
    error: "タブ情報の取得に失敗しました"
  }
  ```
  - **エラーメッセージの内容**: 技術的な詳細を隠し、ユーザーに分かりやすいメッセージ
  - **システムの安全性**: try-catch による例外補足

- **テストの目的**: API 失敗時の安全な処理を確認
  - **品質保証の観点**: 例外によるクラッシュ防止、エラー通知

- 🟡 要件定義のエラーケース（タブ取得失敗）から妥当な推測

---

## 3. 境界値テストケース（エッジケース・排他制御）

### TC-201: 連続実行時の排他制御

- **境界値の意味**: 同時に記録処理が行われる状態
- **境界値での動作保証**: 二重記録防止、処理の一貫性

- **入力値**:
  ```javascript
  // 1回目のショートカット（処理中）
  {
    command: "quick-record",
    isRecording: true
  }
  // 2回目のショートカット（処理中）
  {
    command: "quick-record",
    isRecording: true
  }
  ```
  - **境界値選択の根拠**: 記録処理の完了前に再度ショートカットが押される
  - **実際の使用場面**: ユーザーが素早く連続してショートカットを押下

- **期待される結果**:
  - 1回目の記録処理のみ実行される
  - 2回目のショートカットは無視される
  - 最終的に `{ success: true }` が1回のみ返される

  - **境界での正確性**: 排他制御フラグによるガード
  - **一貫した動作**: 重複実行が常に防がれる

- **テストの目的**: 連続操作時の堅牢性を確認
  - **堅牢性の確認**: 二重記録防止、リソース競合の回避

- 🟢 要件定義（tdd-requirements.md 168-172行目、連続実行の排他制御）

---

### TC-202: Content Script 通信失敗時のハンドリング

- **境界値の意味**: Content Script との通信タイムアウト
- **境界値での動作保証**: 通信エラー時の適切な処理

- **入力値**:
  ```javascript
  {
    activeTab: {
      id: 123,
      url: "https://example.com",
      title: "Example Page"
    },
    contentScriptTimeout: true  // タイムアウト発生
  }
  ```
  - **境界値選択の根拠**: Content Script からの応答がない
  - **実際の使用場面**: ページ読み込み直後やスクリプトエラー時

- **期待される結果**:
  ```javascript
  {
    success: false,
    error: "ページコンテンツの取得に失敗しました"
  }
  ```
  - **境界での正確性**: タイムアウト検知による適切な処理
  - **一貫した動作**: タイムアウト時間の設定に基づく挙動

- **テストの目的**: 通信エラー時の堅牢性を確認
  - **堅牢性の確認**: タイムアウト処理、エラーハンドリング

- 🟡 要件定義の EDGE-003（Content Script が未ロード）から妥当な推測

---

### TC-203: 既に記録済みの URL のスキップ処理

- **境界値の意味**: 重複記録の防止
- **境界値での動作保証**: 既記録ページでの適切な処理

- **入力値**:
  ```javascript
  {
    activeTab: {
      id: 123,
      url: "https://example.com",
      title: "Example Page"
    },
    isAlreadyRecorded: true
  }
  ```
  - **境界値選択の根拠**: Chrome Storage に既に URL が保存されている
  - **実際の使用場面**: 同じページを再度記録しようとする

- **期待される結果**:
  ```javascript
  {
    success: true,
    skipped: true
  }
  ```
  - **境界での正確性**: 既記録チェックによるスキップ処理
  - **一貫した動作**: 重複チェックが常に機能する

- **テストの目的**: 重複記録防止を確認
  - **堅牢性の確認**: Storage チェック、スキップ処理

- 🟢 既存実装（src/background/service-worker.js 68-70行目、重複チェック `urlSet.has(url)`）

---

## テストケース優先度別リスト

### P0: 最初に実装すべきテスト（MVP実装に必要）

| テストID | テスト名 | 優先度理由 |
|----------|----------|------------|
| TC-001 | コマンド受信時にアクティブタブを記録できる | 基本機能動作 |
| TC-002 | HTTP/HTTPS のアクティブタブのみ記録される | プロトコル制約 |
| TC-201 | 連続実行時の排他制御 | 二重記録防止（重要） |

### P1: 次に実装すべきテスト（堅牢性向上）

| テストID | テスト名 | 優先度理由 |
|----------|----------|------------|
| TC-101 | アクティブタブが存在しない場合の処理 | エラーハンドリング |
| TC-102 | HTTP/HTTPS 以外のページでは記録されない | 例外処理 |
| TC-004 | Content Script からページコンテンツを取得して記録 | 連携確認 |

### P2: 最後に実装すべきテスト（品質保証）

| テストID | テスト名 | 優先度理由 |
|----------|----------|------------|
| TC-003 | 記録成功後に通知が表示される | ユーザーフィードバック |
| TC-103 | タブ取得失敗時のエラーハンドリング | 深層エラーハンドリング |
| TC-202 | Content Script 通信失敗時のハンドリング | タイムアウト処理 |
| TC-203 | 既に記録済みの URL のスキップ処理 | 重複防止（既存機能） |

---

## テストファイル構成計画

### ファイル: `src/background/__tests__/shortcutHandler.test.js`

```javascript
// 【テスト目的】: キーボードショートカット機能のテスト
// 【テスト内容】:
//   - コマンド受信（TC-001）
//   - プロトコルフィルター（TC-002, TC-102）
//   - アクティブタブ判定（TC-101）
//   - 排他制御（TC-201）

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import {
  handleQuickRecordCommand,
  isHttpOrHttps,
  isRecordingInProgress,
  setRecordingStatus
} from '../shortcut-handler.js';

describe('ショートカットコマンド受信', () => {
  // TC-001, TC-101, TC-102
});

describe('プロトコルフィルター', () => {
  // TC-002
  test('isHttpOrHttps で https URL を記録対象として判定する', () => {});
  test('isHttpOrHttps で http URL を記録対象として判定する', () => {});
  test('isHttpOrHttps で chrome:// URL を記録対象外として判定する', () => {});
});

describe('排他制御', () => {
  // TC-201
  test('記録中に再度コマンドを受信すると無視される', () => {});
});

describe('Content Script 連携', () => {
  // TC-004, TC-202
  test('Content Script からコンテンツを取得して記録する', () => {});
  test('Content Script 通信失敗時にエラーハンドリングする', () => {});
});
```

---

## テスト用モック戦略

### Chrome API モック

```javascript
// chrome.commands.onCommand モック
const mockOnCommand = {
  addListener: jest.fn((callback) => {
    // コールバックを保持し、テストで実行可能に
  })
};

// chrome.tabs.query モック
const mockTabsQuery = jest.fn((queryInfo, callback) => {
  if (queryInfo.active) {
    callback([{ id: 123, url: 'https://example.com', title: 'Example' }]);
  }
});

// chrome.tabs.sendMessage モック
const mockTabsSendMessage = jest.fn((tabId, message, callback) => {
  callback({ content: 'ページ本文...' });
});
```

### 既存関数のモック

```javascript
// processUrlRecording モック
jest.mock('../service-worker.js', () => ({
  processUrlRecording: jest.fn(() => Promise.resolve({ success: true }))
}));
```

---

## 未決定事項

| 項目 | 現状の方針 | 必要な判断 |
|------|-----------|-----------|
| Content Script タイムアウト時間 | 未定義 | Green フェーズで決定（推奨: 5000ms） |
| 排他制御フラグ実装 | グローバル変数で管理 | Green フェーズで実装 |
| 非対象ページでの通知 | サイレントスキップ | ユーザーフィードバック次第で調整 |

---

## 品質判定結果

### ✅ 高品質

| 判定項目 | 結果 | 説明 |
|----------|------|------|
| テストケース分類 | ✅ 網羅 | 正常系4、異常系3、エッジ/境界値3 |
| 期待値定義 | ✅ 明確 | 各テストケースで具体的な期待値を定義 |
| 技術選択 | ✅ 確定 | JavaScript (ES Modules) + Jest |
| 実装可能性 | ✅ 可能 | 既存コード再利用、モック戦略明確 |

### 判定理由

1. **要件との整合性**: 要件定義書の正常系・エッジケース・エラーケースをすべて網羅
2. **実装可能性**: 既存の `processUrlRecording()` 再利用により実装コスト削減
3. **モック戦略**: Chrome API モックの方法が明確
4. **優先度設定**: MVP 実装に必要な P0 テストを明確に定義

---

## 次のステップ

**推奨コマンド**: `/tdd-red` で Red フェーズ（失敗テスト作成）を開始します。

Red フェーズでは以下のテストを実装します：
1. P0 優先度テスト（TC-001, TC-002, TC-201）の作成
2. Chrome API モックの構築
3. テストが失敗することの確認