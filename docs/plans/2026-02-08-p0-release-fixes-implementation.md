# P0リリース修正 実装計画

## 概要

本計画はリリース前P0課題（4件）の実装手順を記述する。

## 作業手順

### セクション1: セキュリティ1 - SSRF脆弱性対策

#### 1.1 `src/utils/fetch.js` に検証機能追加

**ファイル:** `src/utils/fetch.js`

**追加するコード:**

```javascript
/**
 * プライベートIPアドレスかどうか判定
 * @param {string} hostname - チェックするホスト名
 * @returns {boolean} プライベートIPの場合true
 */
function isPrivateIpAddress(hostname) {
  // IPv4形式（xxx.xxx.xxx.xxx）
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);

    // 10.x.x.x (10.0.0.0/8)
    if (a === 10) return true;

    // 172.16.x.x - 172.31.x.x (172.16.0.0/12)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.x.x (192.168.0.0/16)
    if (a === 192 && b === 168) return true;

    // 127.x.x.x (ループバック)
    if (a === 127) return true;

    // 169.254.x.x (リンクローカル、クラウドメタデータ含む)
    if (a === 169 && b === 254) return true;

    return false;
  }

  // IPv6形式のローカルアドレス
  if (hostname === '::1' || hostname.startsWith('::ffff:127.') || hostname.startsWith('fe80:')) {
    return true;
  }

  return false;
}

/**
 * uBlockインポート用URLの検証（内部ネットワークブロック）
 * @param {string} url - 検証するURL
 * @throws {Error} URLが無効またはプライベートネットワークの場合
 */
export function validateUrlForFilterImport(url) {
  // 既存のバリデーションを使用（プロトコル検証等）
  validateUrl(url, {
    requireValidProtocol: true,
    blockLocalhost: false  // Obsidian API用localhostは許可
  });

  const parsedUrl = new URL(url);

  // プライベートIPチェック
  if (isPrivateIpAddress(parsedUrl.hostname)) {
    throw new Error(`Access to private network address is not allowed: ${parsedUrl.hostname}`);
  }

  // ドメイン名形式のlocalhostチェック
  if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname.endsWith('.localhost')) {
    throw new Error(`Access to localhost is not allowed for filter imports`);
  }
}
```

#### 1.2 `src/background/service-worker.js` 修正

**ファイル:** `src/background/service-worker.js`

変更箇所: 先頭の import 文を追加
```javascript
import { validateUrlForFilterImport } from '../utils/fetch.js';
```

変更箇所: FETCH_URLハンドラー内でバリデーション追加
```javascript
if (message.type === 'FETCH_URL') {
  try {
    // URLバリデーション（内部ネットワークブロック含む）
    validateUrlForFilterImport(message.payload.url);

    const response = await fetch(message.payload.url, {
      method: 'GET',
      cache: 'no-cache'
    });
    // ... 既存のコード継続
```

#### 1.3 i18nファイル修正

**ファイル:** `_locales/ja/messages.json`
```json
"errorPrivateNetworkAccess": {
  "message": "プライベートネットワークへのアクセスは許可されていません: {hostname}",
  "description": "SSRF対策用エラーメッセージ"
},
"errorLocalhostAccess": {
  "message": "フィルターインポートでのlocalhostアクセスは許可されていません",
  "description": "SSRF対策用エラーメッセージ"
}
```

**ファイル:** `_locales/en/messages.json`
```json
"errorPrivateNetworkAccess": {
  "message": "Access to private network address is not allowed: {hostname}",
  "description": "SSRF protection error message"
},
"errorLocalhostAccess": {
  "message": "Access to localhost is not allowed for filter imports",
  "description": "SSRF protection error message"
}
```

---

### セクション2: セキュリティ2 - Content Scriptパーミッション縮小

#### 2.1 `manifest.json` 修正

**ファイル:** `manifest.json`

変更箇所: content_scriptsのmatches
```json
"content_scripts": [
  {
    "matches": [
      "http://*/*",
      "https://*/*"
    ],
    "js": [
      "src/content/extractor.js"
    ]
  }
]
```

#### 2.2 `src/popup/main.js` エラーハンドリング追加

**ファイル:** `src/popup/main.js`

変更箇所: recordCurrentPage関数内、GET_CONTENT送信後に追加
```javascript
    // Content Scriptにコンテンツ取得を要求
    showSpinner(getMessage('fetchingContent'));

    try {
      const contentResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' });

      // Content Script不在時のエラーハンドリング
      if (chrome.runtime.lastError) {
        throw new Error(getMessage('errorContentScriptNotAvailable'));
      }

      if (!contentResponse) {
        throw new Error(getMessage('errorNoContentResponse'));
      }
    } catch (error) {
      if (error.message === getMessage('errorContentScriptNotAvailable')) {
        throw error;
      }
      throw error;
    }
```

#### 2.3 i18nファイル修正

**ファイル:** `_locales/ja/messages.json`
```json
"errorContentScriptNotAvailable": {
  "message": "このページからコンテンツを取得できません。HTTP/HTTPSページでのみ使用可能です。",
  "description": "Content script不在時のエラーメッセージ"
},
"errorNoContentResponse": {
  "message": "コンテンツ取得レスポンスがありません。",
  "description": "Content Scriptからの応答なしのエラーメッセージ"
}
```

**ファイル:** `_locales/en/messages.json`
```json
"errorContentScriptNotAvailable": {
  "message": "Cannot fetch content from this page. Only available on HTTP/HTTPS pages.",
  "description": "Error message when content script is not available"
},
"errorNoContentResponse": {
  "message": "No response from content fetch.",
  "description": "Error message for missing content script response"
}
```

---

### セクション3: アクセシビリティ1 - タブキーボードナビゲーション

#### 3.1 `src/popup/popup.html` 修正

**ファイル:** `src/popup/popup.html`

変更箇所: タブナビゲーションにidを追加
```html
    <!-- Tab Navigation -->
    <div id="tabList" class="tab-nav" role="tablist">
```

#### 3.2 `src/popup/domainFilter.js` 修正

**ファイル:** `src/popup/domainFilter.js`

変更箇所: init関数内に追加
```javascript
    // タブキーボードナビゲーション用イベントリスナー
    const tabList = document.getElementById('tabList');
    if (tabList) {
      const tabs = tabList.querySelectorAll('[role="tab"]');

      function handleTabKeydown(e) {
        const currentIndex = Array.from(tabs).indexOf(document.activeElement);

        switch(e.key) {
          case 'ArrowRight':
            e.preventDefault();
            tabs[(currentIndex + 1) % tabs.length].focus();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            tabs[(currentIndex - 1 + tabs.length) % tabs.length].focus();
            break;
          case 'Home':
            e.preventDefault();
            tabs[0].focus();
            break;
          case 'End':
            e.preventDefault();
            tabs[tabs.length - 1].focus();
            break;
          case 'Enter':
          case ' ':
            e.preventDefault();
            document.activeElement.click();
            break;
        }
      }

      tabList.addEventListener('keydown', handleTabKeydown);
    }
```

変更箇所: showTab関数の末尾にARIA属性更新追加
```javascript
function showTab(tabName) {
    // Buttons
    generalTabBtn.classList.toggle('active', tabName === 'general');
    generalTabBtn.setAttribute('aria-selected', tabName === 'general');

    domainTabBtn.classList.toggle('active', tabName === 'domain');
    domainTabBtn.setAttribute('aria-selected', tabName === 'domain');

    if (privacyTabBtn) {
        privacyTabBtn.classList.toggle('active', tabName === 'privacy');
        privacyTabBtn.setAttribute('aria-selected', tabName === 'privacy');
    }

    // Panels
    generalPanel.classList.toggle('active', tabName === 'general');
    generalPanel.style.display = tabName === 'general' ? 'block' : 'none';

    domainPanel.classList.toggle('active', tabName === 'domain');
    domainPanel.style.display = tabName === 'domain' ? 'block' : 'none';

    if (privacyPanel) {
        privacyPanel.classList.toggle('active', tabName === 'privacy');
        privacyPanel.style.display = tabName === 'privacy' ? 'block' : 'none';
    }
}
```

---

### セクション4: アクセシビリティ2 - モーダルフォーカストラップ

#### 4.1 `src/popup/sanitizePreview.js` 修正

**ファイル:** `src/popup/sanitizePreview.js`

変更箇所: モジュールレベル変数に追加
```javascript
let resolvePromise = null;
let maskedPositions = [];
let currentMaskedIndex = -1;
let previousActiveElement = null;  // 追加: モーダル開く前のフォーカス要素
```

変更箇所: trapFocus関数を追加
```javascript
/**
 * フォーカストラップ実装
 * @param {HTMLElement} modal - モーダル要素
 */
function trapFocus(modal) {
  // Focusable要素セレクタ
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableElements = modal.querySelectorAll(focusableSelector);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  if (!firstFocusable || !lastFocusable) return;

  // フォーカストラップイベントリスナー
  const keydownHandler = (e) => {
    if (e.key === 'Escape') {
      handleAction(false);
      return;
    }
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {  // Shift+Tab: 前へ
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {  // Tab: 次へ
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  // イベントリスナー追加（モーダル限定）
  if (!modal.trapFocusHandler) {
    modal.trapFocusHandler = keydownHandler;
    modal.addEventListener('keydown', keydownHandler);
  }
}

/**
 * フォーカストラップの解放
 * @param {HTMLElement} modal - モーダル要素
 */
function releaseFocusTrap(modal) {
  if (modal && modal.trapFocusHandler) {
    modal.removeEventListener('keydown', modal.trapFocusHandler);
    modal.trapFocusHandler = null;
  }
}
```

変更箇所: showPreview関数にフォーカストラップ追加
```javascript
export function showPreview(content, maskedItems = null, maskedCount = 0) {
  const modal = getModal();
  const previewContent = getPreviewContent();
  const modalBody = modal?.querySelector('.modal-body');

  if (!modal) {
    console.error('Confirmation modal not found in DOM');
    return Promise.resolve({ confirmed: true, content });
  }

  // モーダル表示前にフォーカス要素を記憶
  previousActiveElement = document.activeElement;

  // ... 既存のコード継続 ...

  // モーダル表示
  modal.style.display = 'flex';

  // フォーカストラップ設定
  trapFocus(modal);

  // マスク箇所がある場合、最初の箇所へ自動ジャンプ
  if (maskedPositions.length > 0) {
    jumpToMaskedPosition(0);
  } else {
    // マスク箇所がない場合はtextareaに直接フォーカス
    previewContent?.focus();
  }

  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
}
```

変更箇所: handleAction関数にフォーカス復帰追加
```javascript
function handleAction(confirmed) {
  if (!resolvePromise) {
    return;
  }

  const modal = getModal();
  const previewContent = getPreviewContent();

  // DOM検証
  if (!modal || !previewContent) {
    console.error('Modal or preview content not found in DOM');
    resolvePromise = null;
    return;
  }

  // フォーカストラップ解放
  releaseFocusTrap(modal);

  modal.style.display = 'none';
  resetBodyWidth();
  const content = previewContent.value;

  // 元のフォーカス要素に戻る
  if (previousActiveElement) {
    previousActiveElement.focus();
  }

  resolvePromise({
    confirmed,
    content: confirmed ? content : null
  });

  resolvePromise = null;
}
```

---

### セクション5: アクセシビリティ3 - アイコンボタンARIAラベル

#### 5.1 `src/popup/popup.html` 修正

**ファイル:** `src/popup/popup.html`

変更箇所: メニューボタン
```html
<button
  id="menuBtn"
  class="icon-btn"
  aria-label="開く"
  data-i18n="openSettings"
>☰</button>
```

変更箇所: 戻るボタン
```html
<button
  id="backBtn"
  class="icon-btn"
  aria-label="戻る"
  data-i18n="backToMain"
  data-i18n="back"
>←</button>
```

変更箇所: モーダル閉じるボタン（line 328付近）
```html
<button
  id="closeModalBtn"
  class="icon-btn modal-close"
  aria-label="閉じる"
  data-i18n="closeModal"
>×</button>
```

#### 5.2 i18nファイル修正

**ファイル:** `_locales/ja/messages.json`
```json
"openSettings": {
  "message": "設定を開く",
  "description": "スクリーンリーダー用メニューボタンラベル"
},
"backToMain": {
  "message": "メイン画面に戻る",
  "description": "スクリーンリーダー用戻るボタンラベル"
},
"closeModal": {
  "message": "閉じる",
  "description": "スクリーンリーダー用モーダル閉じるボタンラベル"
}
```

**ファイル:** `_locales/en/messages.json`
```json
"openSettings": {
  "message": "Open Settings",
  "description": "Screen reader label for menu button"
},
"backToMain": {
  "message": "Back to Main",
  "description": "Screen reader label for back button"
},
"closeModal": {
  "message": "Close Modal",
  "description": "Screen reader label for modal close button"
}
```

---

## テスト実行

すべての変更後に以下のテストを実行してください：

```bash
npm test
```

---

## チェックリスト

- [ ] SSRF対策: 内部ネットワークURLがブロックされる
- [ ] Content Script縮小: `file://` ページでエラー表示
- [ ] タブキーボードナビゲーション: 矢印キー、Home/End、Enter/Space動作確認
- [ ] モーダルフォーカストラップ: Tabキーループ、ESC閉じる、フォーカス復帰確認
- [ ] ARIAラベル: スクリーンリーダーで確認
- [ ] すべてのテストパス
- [ ] 既存機能 regression なし