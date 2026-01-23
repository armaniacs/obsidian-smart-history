# TDD要件定義: UF-403 ローディングスピナー追加

## 概要

- **タスクID**: UF-403
- **機能名**: ローディングスピナー追加
- **開発開始**: 2026-01-23
- **現在のフェーズ**: Requirements（要件定義）
- **対象モジュール**: `src/popup/main.js`, `src/popup/popup.html`

---

## 1. 機能概要

ユーザーが記録ボタンを押して記録処理が進行中の間、視覚的なフィードバックとしてローディングスピナーを表示する。現在はテキストのみ（「処理中...」「コンテンツ取得中...」「記録中...」）の表示のみで完了まで待つ時間が不明瞭であるため、より直感的なUXを提供する。

---

## 2. 背景と動機

### 現状

- 記録処理中はテキストのみが表示される（`mainStatus` div）
- ユーザーは処理中かどうかを認識できるが、処理が進行しているか不明瞭
- 特にAI要約処理（数秒から数十秒）の間、フリーズしているように見える可能性がある

### 改善点

- ローディングスピナー（アニメーション）によって処理中であることを明確に示す
- ユーザー体験の向上（処理待機中の不安感軽減）
- 視覚的に魅力的なUI

---

## 3. ユーザーストーリー

**ユーザーとして**、記録処理中に視覚的なフィードバックが欲しい。**そうすれば**、処理が進行中であること、完了まで待つ必要があることをすぐに理解できる。

---

## 4. 機能要件 (FR)

### FR-1: スピナー表示
- **記録**: 記録処理を開始した時点でスピナーを表示する
- **非表示**: 処理完了時にスピナーを非表示にする
- **エラー時**: エラー発生時もスピナーを非表示にする

### FR-2: スピナー種類
- SVG形式のローディングスピナーを使用する
- CSSアニメーション（@keyframes）で回転アニメーションを実装する
- デザインはシンプルで、現在のUIに調和する

### FR-3: 配置
- 記録ボタンの近く、またはステータスメッセージエリア内に配置する
- 既存のテキストステータス（「処理中...」）を置き換えるか、併記する

### FR-4: 既存機能との統合
- 既存の `mainStatus` 要素と共存できる
- 強制記録モード（`force=true`）でも正常動作する
- プレビュー確認画面（`sanitizePreview.js`）との整合性を保つ

---

## 5. 非機能要件 (NFR)

### NFR-1: パフォーマンス
- スピナーのアニメーションは60fpsで滑らかに動作する
- スピナー表示による処理速度への影響がない

### NFR-2: ブラウザ互換性
- ChromeとFirefoxの両方で動作する
- SVGはすべての主要ブラウザでサポートされている

### NFR-3: アクセシビリティ
- スクリーンリーダー等のアクセシビリティツールで処理中であることを伝えられる
- 適切なARIA属性を設定する

### NFR-4: コード品質
- 既存コードとの整合性を保つ
- DRY原則を遵守（スピナー表示ロジックは共通化する）

---

## 6. 既存実装の確認

### src/popup/main.js

**現在のロジック**:
```javascript
async function recordCurrentPage(force = false) {
  const statusDiv = document.getElementById('mainStatus');
  statusDiv.textContent = '処理中...';
  // ...

  statusDiv.textContent = 'コンテンツ取得中...';
  // ...

  statusDiv.textContent = 'ローカルAI処理中...';
  // ...

  statusDiv.textContent = '保存中...';
  // ...

  statusDiv.textContent = '✓ Obsidianに保存しました';
  statusDiv.className = 'success';
  // ...

  statusDiv.className = 'error';
  statusDiv.textContent = `✗ エラー: ${error.message}`;
}
```

**変更箇所**:
1. スピナーの表示開始処理追加
2. すべての状態遷移時にスピナーの表示・非表示を適切に制御

### src/popup/popup.html

**現在の構造**:
```html
<button id="recordBtn" class="primary-btn">📝 今すぐ記録</button>
<div id="mainStatus"></div>
```

**変更箇所**:
1. スピナー用コンテナ追加（`<div id="loadingSpinner">`）
2. スピナー用CSS追加

---

## 7. 技術仕様

### 7.1 SVGスピナー仕様

**推奨シンプルスピナー**:
```html
<div id="loadingSpinner" class="spinner-container" style="display: none;">
  <svg class="spinner" viewBox="0 0 50 50">
    <circle
      class="spinner-path"
      cx="25" cy="25" r="20"
      fill="none"
      stroke="#4CAF50"
      stroke-width="4"
      stroke-linecap="round"
      stroke-dasharray="80"
      stroke-dashoffset="60"
    />
  </svg>
  <span class="spinner-text">処理中...</span>
</div>
```

### 7.2 CSS @keyframes仕様

```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinner {
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

.spinner-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
}

.spinner-text {
  font-size: 12px;
  color: #666;
}
```

### 7.3 JavaScript API仕様

**新しいスピナー制御関数**:

```javascript
/**
 * ローディングスピナーを表示する
 * @param {string} text - スピナーの横に表示するテキスト（省略可能）
 */
function showSpinner(text = '処理中...') {
  const spinner = document.getElementById('loadingSpinner');
  const spinnerText = spinner.querySelector('.spinner-text');
  spinnerText.textContent = text;
  spinner.style.display = 'flex';
}

/**
 * ローディングスピナーを非表示にする
 */
function hideSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  spinner.style.display = 'none';
}
```

**recordCurrentPage() 関数の統合**:

```javascript
async function recordCurrentPage(force = false) {
  const statusDiv = document.getElementById('mainStatus');
  showSpinner('処理中...');
  statusDiv.textContent = '';
  statusDiv.className = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.startsWith('http')) {
      throw new Error('記録できないページです');
    }

    // 設定確認
    const settings = await getSettings();
    const usePreview = settings[StorageKeys.PII_CONFIRMATION_UI] !== false;

    // Content Scriptにコンテンツ取得を要求
    showSpinner('コンテンツ取得中...');
    const contentResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' });

    // Background Workerに記録を要求
    let result;

    if (usePreview) {
      showSpinner('ローカルAI処理中...');
      // ... (既存コード)

      if (shouldShowPreview) {
        hideSpinner(); // プレビュー表示前はスピナー非表示
        const confirmation = await showPreview(previewResponse.processedContent);

        if (!confirmation.confirmed) {
          statusDiv.textContent = 'キャンセルしました';
          return;
        }
        finalContent = confirmation.content;
      }

      // 3. 確定データ送信 (L3 processing & Save)
      showSpinner('保存中...');
      result = await chrome.runtime.sendMessage({
        type: 'SAVE_RECORD',
        payload: {
          title: tab.title,
          url: tab.url,
          content: finalContent,
          force: force
        }
      });

    } else {
      // 確認なしの既存フロー
      result = await chrome.runtime.sendMessage({
        type: 'MANUAL_RECORD',
        payload: {
          title: tab.title,
          url: tab.url,
          content: contentResponse.content,
          force: force
        }
      });
    }

    if (result.success) {
      hideSpinner();
      statusDiv.textContent = '✓ Obsidianに保存しました';
      statusDiv.className = 'success';
    } else {
      throw new Error(result.error || '保存に失敗しました');
    }
  } catch (error) {
    hideSpinner();
    statusDiv.className = 'error';

    // Handle connection errors more gracefully
    if (error.message && error.message.includes("Receiving end does not exist")) {
      statusDiv.textContent = '✗ エラー: ページを再読み込みしてから再度お試しください';
    }
    // Check for the specific domain blocked error
    else if (error.message === 'このドメインは記録が許可されていません') {
      statusDiv.textContent = 'このドメインは記録が許可されていませんが特別に記録しますか？';

      const forceBtn = document.createElement('button');
      forceBtn.textContent = '強制記録';
      forceBtn.className = 'secondary-btn';
      forceBtn.style.marginTop = '10px';
      forceBtn.style.backgroundColor = '#d9534f';

      forceBtn.onclick = () => {
        forceBtn.disabled = true;
        forceBtn.textContent = '記録中...';
        recordCurrentPage(true); // Call with force=true
      };

      statusDiv.appendChild(forceBtn);
    } else {
      statusDiv.textContent = `✗ エラー: ${error.message}`;
    }
  }
}
```

---

## 8. 入出力仕様

### 入力
| 項目 | 型 | 説明 | 必須 |
|------|------|------|------|
| force | boolean | 強制記録フラグ | false |

### 出力
| 状態 | 挙動 |
|------|------|
| 処理開始時 | スピナー表示、テキスト「処理中...」 |
| コンテンツ取得中 | スピナー継続、テキスト「コンテンツ取得中...」 |
| ローカルAI処理中 | スピナー継続、テキスト「ローカルAI処理中...」 |
| プレビュー表示時 | スピナー非表示 |
| 保存処理中 | スピナー表示、テキスト「保存中...」 |
| 成功時 | スピナー非表示、ステータス「✓ Obsidianに保存しました」 |
| エラー時 | スピナー非表示、ステータス「✗ エラー: ...」 |

---

## 9. 制約条件

| 制約事項 | 内容 |
|----------|------|
| 履歴エリア | スピナーを追加してもポップアップサイズが320pxを大きく超えない |
| 既存スタイル | インラインCSSに追加する（popup.cssはUF-402） |
| テキスト併記 | スピナーと処理状況テキストを併記する |

---

## 10. 依存関係

| タスク | 状態 | 依存理由 |
|--------|------|----------|
| UF-402 (CSS外部ファイル化) | 未着手 | 理想的にはCSSファイル化後に実装する |
| PII確認UI (sanitizePreview.js) | 完了済 | 画面遷移時のスピナー制御に影響 |

---

## 11. Edgeケース

| ケース | 挙動 |
|--------|------|
| 二重クリック防止 | recordBtnを無効化、スピナー表示中は再実行不可 |
| ネットワーク遅延 | 長時間処理でもスピナーが回り続ける |
| 強制記録ボタン押下時 | スピナー表示時の状態遷移も制御 |
| プレビュー画面キャンセル時 | スピナー非表示、メイン画面に戻る |

---

## 12. 受け入れ基準

| 条件 | 内容 |
|------|------|
| AC-1 | 記録ボタン押下後、スピナーが表示される |
| AC-2 | スピナーは60fpsで滑らかに回転する |
| AC-3 | 処理状況に応じてテキストが更新される（処理中→コンテンツ取得中→保存中→完了） |
| AC-4 | 成功時、スピナーが非表示になり成功メッセージが表示される |
| AC-5 | エラー時、スピナーが非表示になりエラーメッセージが表示される |
| AC-6 | 強制記録ボタン押下時もスピナーが正常に表示される |
| AC-7 | ユーザーが記録ボタンを連打しても二重処理が発生しない（現在は既存実装） |

---

## 13. テストカテゴリ

- **正常系**: スピナー表示・非表示、テキスト更新の正常動作
- **異常系**: エラー発生時のスピナー非表示
- **境界値**: 高速処理（即時完了）でのスピナー表示フラッシュ防止

---

## 14. 実装後の検証項目

1. Chromeで記録ボタン押下、スピナーが表示されること
2. Firefoxで記録ボタン押下、スピナーが表示されること
3. エラー発生時でもスピナーが非表示になること
4. 強制記録ボタン押下時もスピナーが正常に動作すること
5. パフォーマンスへの影響がないこと

---

## 15. 関連ファイル

- **要件定義**: 本ファイル
- **テストケース**: `docs/implements/UF-403-loading-spinner/loading-spinner-testcases.md` (作成予定)
- **実装ファイル**:
  - `src/popup/popup.html`（既存：スピナー追加）
  - `src/popup/main.js`（既存：スピナー制御追加）
- **テストファイル**: `src/popup/__tests__/mainSpinner.test.js` (作成予定)

---

## 次のステップ

本要件定義に基づき、次のフェーズを実施：

1. **`/tsumiki:tdd-testcases`** - テストケースの洗い出し
2. **`/tsumiki:tdd-red`** - 失敗するテストの実装
3. **`/tsumiki:tdd-green`** - 最小限の実装
4. **`/tsumiki:tdd-refactor`** - コード改善
5. **`/tsumiki:tdd-verify-complete`** - 品質確認