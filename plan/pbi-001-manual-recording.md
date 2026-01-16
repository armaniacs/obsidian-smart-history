# Obsidian Smart History 機能拡張実装プラン

## 概要

Obsidian Smart History Chrome拡張機能に以下の2機能を追加します：

1. **設定画面のハンバーガーメニュー化**
   - 現在：拡張機能アイコンクリック → 設定画面が直接表示
   - 変更後：メイン画面を表示 → ハンバーガーメニューから設定にアクセス

2. **手動記録機能**
   - メイン画面に「今すぐ記録」ボタンを配置
   - クリックで現在のタブを即座に記録（AI要約 → Obsidian保存）
   - 既存の自動記録（VALID_VISIT）とは独立動作
   - 重複URL制限なし（同じページを何度でも記録可能）

## 確定した仕様

- **メイン画面UI**: 記録ボタン + 現在のページ情報 + ステータスメッセージ
- **画面遷移**: 単純な切り替え（メイン画面 ⇔ 設定画面）
- **重複URL処理**: 手動記録は重複チェックをスキップ
- **コンテンツ取得**: Content Script経由でメッセージパッシング

## アーキテクチャアプローチ

**プラグマティックバランスアプローチ**を採用：
- 開発速度と品質のバランス重視
- 既存パターン（Vanilla JavaScript、インラインCSS）を尊重
- 明確な責務分離（navigation.js、main.js）
- 将来のリファクタリングも容易

## ファイル変更概要

### 新規作成（2ファイル）

1. **`src/popup/main.js`** (~80行)
   - 現在のタブ情報の表示
   - 手動記録ボタンのイベントハンドリング
   - Content Scriptへのコンテンツ取得要求
   - Background Workerへの記録要求
   - ステータスメッセージ表示

2. **`src/popup/navigation.js`** (~20行)
   - `showMainScreen()`: メイン画面表示
   - `showSettingsScreen()`: 設定画面表示
   - イベントリスナー設定

### 既存ファイル修正（4ファイル）

3. **`src/popup/popup.html`** (+100行)
   - メイン画面UI構造を追加（`<div id="mainScreen">`）
   - 既存設定フォームを`<div id="settingsScreen">`でラップ
   - インラインCSS追加（約60行）
   - main.js、navigation.jsのインポート

4. **`src/popup/popup.js`** (+5行)
   - 既存の設定ロジックは変更なし
   - navigationモジュールのインポートのみ

5. **`src/background/service-worker.js`** (+40行)
   - `MANUAL_RECORD`メッセージハンドラを追加
   - 既存のVALID_VISITフローを再利用
   - 重複URLチェックをスキップ
   - 成功/失敗通知

6. **`src/content/extractor.js`** (+20行)
   - `GET_CONTENT`メッセージリスナーを追加
   - 既存のコンテンツ抽出ロジック（10,000文字制限）を再利用

**合計**: 約265行の追加

## 実装フェーズ

### Phase 1: ナビゲーション基盤構築（30分）

**ゴール**: 画面切り替え機能の実装

**タスク**:
- [ ] `src/popup/navigation.js` を作成
  - `showMainScreen()` 関数: mainScreenを表示、settingsScreenを非表示
  - `showSettingsScreen()` 関数: 逆の動作
  - イベントリスナー設定用の `init()` 関数

- [ ] `src/popup/popup.html` を修正
  - 既存の設定フォーム全体を `<div id="settingsScreen" style="display: none;">` でラップ
  - 新規メイン画面用の `<div id="mainScreen">` を追加（仮の内容）
  - 設定画面に「← 戻る」ボタンを追加
  - navigation.js をインポート: `<script type="module" src="navigation.js"></script>`

- [ ] `src/popup/popup.js` を修正
  - `import { init as initNavigation } from './navigation.js';` を追加
  - `initNavigation();` を呼び出し

**検証**:
- 拡張機能を読み込み、ハンバーガーメニューと戻るボタンで画面切り替えができること

### Phase 2: コンテンツ抽出機能（20分）

**ゴール**: Content Scriptからのコンテンツ取得

**タスク**:
- [ ] `src/content/extractor.js` を修正
  - 既存コード（86行目以降）に以下を追加：
    ```javascript
    // Popupからの手動コンテンツ取得要求に応答
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_CONTENT') {
        const content = document.body.innerText
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 10000);

        sendResponse({ content: content });
      }
      return true;
    });
    ```

**検証**:
- DevToolsで任意のタブを開き、以下のコードで動作確認：
  ```javascript
  chrome.tabs.query({active: true}, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, {type: 'GET_CONTENT'}, (resp) => {
      console.log('Content length:', resp.content.length);
    });
  });
  ```

### Phase 3: メイン画面UI実装（40分）

**ゴール**: メイン画面の完全な実装

**タスク**:
- [ ] `src/popup/popup.html` のメイン画面構造を実装
  ```html
  <div id="mainScreen" style="display: block;">
    <div class="header">
      <h2>Smart History</h2>
      <button id="menuBtn" class="icon-btn">☰</button>
    </div>

    <div id="currentPage">
      <img id="favicon" src="" width="16" height="16" alt="">
      <div id="pageInfo">
        <div id="pageTitle">Loading...</div>
        <div id="pageUrl">...</div>
      </div>
    </div>

    <button id="recordBtn" class="primary-btn">📝 今すぐ記録</button>
    <div id="mainStatus"></div>
  </div>
  ```

- [ ] インラインCSS追加（約60行）
  - `.header`: フレックスレイアウト、space-between
  - `.icon-btn`: 32x32px、背景#f5f5f5
  - `#currentPage`: フレックスレイアウト、ボーダー
  - `#pageInfo`: タイトル（太字）、URL（小さい文字、グレー）
  - `.primary-btn`: 緑背景（#4CAF50）
  - `#mainStatus`: 既存の.success/.errorクラスを再利用

- [ ] `src/popup/main.js` を作成
  ```javascript
  // 現在のタブ情報を取得して表示
  async function loadCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) return;

    // Favicon設定
    document.getElementById('favicon').src = tab.favIconUrl || 'icons/icon16.png';

    // タイトル・URL表示
    document.getElementById('pageTitle').textContent = tab.title || 'No title';
    const url = tab.url || '';
    document.getElementById('pageUrl').textContent =
      url.length > 50 ? url.substring(0, 50) + '...' : url;

    // 記録可能ページチェック
    const recordBtn = document.getElementById('recordBtn');
    if (!url.startsWith('http')) {
      recordBtn.disabled = true;
      recordBtn.textContent = '記録できないページです';
    }
  }

  // 手動記録処理
  async function recordCurrentPage() {
    const statusDiv = document.getElementById('mainStatus');
    statusDiv.textContent = '記録中...';
    statusDiv.className = '';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url.startsWith('http')) {
        throw new Error('記録できないページです');
      }

      // Content Scriptにコンテンツ取得を要求
      const contentResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' });

      // Background Workerに記録を要求
      const response = await chrome.runtime.sendMessage({
        type: 'MANUAL_RECORD',
        payload: {
          title: tab.title,
          url: tab.url,
          content: contentResponse.content
        }
      });

      if (response.success) {
        statusDiv.textContent = '✓ Obsidianに保存しました';
        statusDiv.className = 'success';
      } else {
        throw new Error(response.error || '保存に失敗しました');
      }
    } catch (error) {
      statusDiv.textContent = `✗ エラー: ${error.message}`;
      statusDiv.className = 'error';
    }
  }

  // イベントリスナー設定
  document.getElementById('recordBtn').addEventListener('click', recordCurrentPage);

  // 初期化
  loadCurrentTab();
  ```

- [ ] `src/popup/popup.html` に main.js をインポート
  ```html
  <script type="module" src="main.js"></script>
  ```

**検証**:
- 拡張機能を読み込み、メイン画面に現在のタブ情報が表示されること
- 記録ボタンが表示されること（まだ動作しない）

### Phase 4: Background処理実装（30分）

**ゴール**: 手動記録のバックエンド処理

**タスク**:
- [ ] `src/background/service-worker.js` を修正
  - 既存の `chrome.runtime.onMessage.addListener` に以下を追加：
    ```javascript
    // 手動記録処理（重複チェックなし）
    if (message.type === 'MANUAL_RECORD') {
      (async () => {
        try {
          const { title, url, content } = message.payload;

          console.log(`Manual record requested: ${url}`);

          // AI要約生成（既存のaiClientを使用）
          let summary = "Summary not available.";
          if (content) {
            console.log('Generating AI Summary for manual record...');
            summary = await aiClient.generateSummary(content);
          }

          // Markdown作成（既存パターンと同じ）
          const timestamp = new Date().toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
          });
          const markdown = `- ${timestamp} [${title}](${url})\n    - AI要約: ${summary}`;

          // Obsidian保存（既存のobsidianClientを使用）
          await obsidian.appendToDailyNote(markdown);
          console.log('Manual record saved to Obsidian successfully.');

          // 成功通知
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon128.png',
            title: 'Saved to Obsidian',
            message: `手動記録: ${title}`
          });

          sendResponse({ success: true });
        } catch (e) {
          console.error('Failed to save manual record', e);

          // エラー通知
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon128.png',
            title: 'Obsidian Sync Failed',
            message: `Error: ${e.message}`
          });

          sendResponse({ success: false, error: e.message });
        }
      })();

      return true; // 非同期レスポンス
    }
    ```

**注意**:
- このコードは既存の `VALID_VISIT` ハンドラの**後**に追加
- 既存コードは一切変更しない
- 重複URLチェック（`savedUrls`）は手動記録では実行しない

**検証**:
- DevToolsのBackground Service Workerコンソールで `message.type` のログを確認
- 手動記録時に `MANUAL_RECORD` が受信されること

### Phase 5: 統合テスト（30分）

**ゴール**: 全機能の動作確認

**テストシナリオ**:

1. **画面遷移テスト**
   - [ ] 拡張機能アイコンクリック → メイン画面が表示される
   - [ ] ハンバーガーメニュー（☰）クリック → 設定画面に遷移
   - [ ] 戻るボタン（←）クリック → メイン画面に戻る
   - [ ] 設定画面で「Save & Test Connection」が正常動作

2. **手動記録テスト（HTTPSページ）**
   - [ ] https://www.google.com を開く
   - [ ] 拡張機能を開き、メイン画面にページ情報が表示される
   - [ ] 「今すぐ記録」ボタンをクリック
   - [ ] ステータスが「記録中...」→「✓ Obsidianに保存しました」に変化
   - [ ] Chrome通知が表示される
   - [ ] Obsidianのdaily noteを確認し、記録されていることを確認

3. **重複URL記録テスト**
   - [ ] 同じページで「今すぐ記録」を再度クリック
   - [ ] エラーなく記録される（重複チェックがスキップされる）
   - [ ] Obsidianに2回記録されることを確認

4. **記録不可ページテスト**
   - [ ] chrome://extensions/ を開く
   - [ ] 拡張機能を開く
   - [ ] 記録ボタンが無効化される、または適切なエラーメッセージ

5. **エラーハンドリングテスト**
   - [ ] Obsidian Local REST APIを停止
   - [ ] 手動記録を試行
   - [ ] 適切なエラーメッセージが表示される
   - [ ] Chrome通知でエラーが表示される

6. **既存機能の後方互換性テスト**
   - [ ] 適当なページを5秒以上閲覧、50%以上スクロール
   - [ ] 自動記録（VALID_VISIT）が正常動作
   - [ ] 重複URLチェックが機能する
   - [ ] Obsidianに自動記録される

**問題発生時のデバッグ手順**:
- Chrome DevTools → Extensions → Service Worker → Inspect
- Console でエラーログを確認
- `chrome.runtime.lastError` のメッセージを確認
- Content Script のコンソールログを確認

## メッセージフロー図

### 手動記録フロー
```
[User Action: ポップアップアイコンクリック]
  ↓
[popup.html 読み込み]
  ↓
[main.js: loadCurrentTab() 実行]
  ↓ chrome.tabs.query({active: true})
[現在のタブ情報を取得・表示]
  ↓
[User Action: 「今すぐ記録」ボタンクリック]
  ↓
[main.js: recordCurrentPage() 実行]
  ↓
[① chrome.tabs.sendMessage(tabId, {type: 'GET_CONTENT'})]
  ↓
[content/extractor.js: GET_CONTENTハンドラ]
  ↓ document.body.innerText (10,000文字制限)
[② sendResponse({content: "..."})]
  ↓
[main.js: コンテンツ受信]
  ↓
[③ chrome.runtime.sendMessage({type: 'MANUAL_RECORD', payload: {...}})]
  ↓
[background/service-worker.js: MANUAL_RECORDハンドラ]
  ↓
[④ aiClient.generateSummary(content)]
  ↓ API呼び出し
[⑤ AI要約取得]
  ↓
[⑥ obsidian.appendToDailyNote(markdown)]
  ↓ Obsidian Local REST API
[⑦ Daily Noteに保存]
  ↓
[⑧ chrome.notifications.create() 成功通知]
  ↓
[⑨ sendResponse({success: true})]
  ↓
[main.js: レスポンス受信]
  ↓
[ステータス表示更新: "✓ Obsidianに保存しました"]
```

### 自動記録フロー（既存、変更なし）
```
[content/extractor.js: 条件満たす (時間 >= 5秒 AND スクロール >= 50%)]
  ↓
[chrome.runtime.sendMessage({type: 'VALID_VISIT', ...})]
  ↓
[background/service-worker.js: VALID_VISITハンドラ]
  ↓
[重複URLチェック (savedUrls)]
  ↓
[重複なし → AI要約 → Obsidian保存 → savedUrlsに追加]
```

## 重要な実装ノート

### 既存コードへの影響
- **影響なし**: aiClient.js, obsidianClient.js, storage.js
- **追加のみ**: service-worker.js, extractor.js（既存ロジックは変更なし）
- **構造変更**: popup.html, popup.js（既存の設定機能は維持）

### エラーハンドリング
- Content Scriptが未ロードのページ（chrome://, file://等）への対応
  - main.jsで `!tab.url.startsWith('http')` チェック
  - 記録ボタンを無効化
- Obsidian API接続失敗時
  - service-worker.jsのtry-catchでキャッチ
  - Chrome通知でユーザーに通知
  - popup.jsのステータスメッセージで表示

### パフォーマンス
- `chrome.tabs.query()` は高速、問題なし
- AI要約生成中もUI凍結なし（非同期処理）
- コンテンツ抽出は既存の10,000文字制限を維持

### セキュリティ
- 新規権限不要（manifest.jsonで既に宣言済み）
- Content Script Injection: `<all_urls>`で既に設定済み
- APIキー: 既存のChrome Storage使用（変更なし）

## クリティカルファイル

実装時に重点的に確認すべきファイル：

1. **`src/popup/popup.html`** - UI構造とCSS
2. **`src/popup/main.js`** - メイン画面ロジック（新規）
3. **`src/popup/navigation.js`** - 画面遷移（新規）
4. **`src/background/service-worker.js:43-123`** - 既存のVALID_VISITハンドラ（参考）
5. **`src/content/extractor.js:53-56`** - 既存のコンテンツ抽出ロジック（再利用）

## 成功基準

実装完了時に以下がすべて満たされること：

- [x] メイン画面と設定画面の切り替えがスムーズに動作
- [x] 現在のタブ情報（タイトル、URL、favicon）が正確に表示
- [x] 手動記録ボタンをクリックすると、AI要約が生成されObsidianに保存される
- [x] 同じURLを複数回手動記録できる（重複チェックなし）
- [x] 適切なエラーメッセージとステータス表示
- [x] Chrome通知による成功/失敗フィードバック
- [x] 既存の自動記録機能が正常動作（後方互換性）
- [x] 設定画面の全機能が正常動作

## 見積もり

- **実装時間**: 約2.5時間
- **テスト時間**: 約30分
- **合計**: 約3時間

## 次のステップ（実装後）

このプランに基づき、Phase 1から順次実装を進めてください。各Phaseは独立してテスト可能です。

実装完了後の改善候補：
- CSS外部ファイル化（インライン約130行がボトルネックになった場合）
- ローディングスピナー追加
- 記録成功後のポップアップ自動クローズ
- キーボードショートカット（Ctrl+Sで記録）
