# リリース前P0対応 設計書

## 概要

本設計書は、リリース前レビューで特定されたP0課題（4件）の実装計画を記述する。

**対象課題:**
1. セキュリティ: SSRF脆弱性への対策
2. セキュリティ: Content Scriptパーミッション縮小
3. アクセシビリティ: タブキーボードナビゲーション実装
4. アクセシビリティ: モーダルフォーカストラップ実装
5. アクセシビリティ: アイコンボタンのARIAラベル追加

**リリース優先度:** P0（ブロッキング）

---

## 1. SSRF脆弱性対策

### 1.1 現状

`service-worker.js:69-87` の `FETCH_URL` ハンドラーがURL検証なしでフェッチし、内部ネットワークアクセスが可能。

### 1.2 対策

`src/utils/fetch.js` に `validateUrlForFilterImport` 関数を追加し、プライベートネットワークをブロック。

### 1.3 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/utils/fetch.js` | `isPrivateIpAddress()`、`validateUrlForFilterImport()` 追加 |
| `src/background/service-worker.js` | `validateUrlForFilterImport()` 呼び出し追加 |
| `_locales/ja/messages.json` | エラーメッセージキー追加 |
| `_locales/en/messages.json` | エラーメッセージキー追加 |

### 1.4 コードスニペット

**fetch.js に追加:**

```javascript
function isPrivateIpAddress(hostname) {
  // IPv4形式（xxx.xxx.xxx.xxx）
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    if (a === 10) return true;                      // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true;        // 192.168.0.0/16
    if (a === 127) return true;                     // 127.x.x.x
    if (a === 169 && b === 254) return true;        // 169.254.x.x
    return false;
  }
  if (hostname === '::1' || hostname.startsWith('::ffff:127.') || hostname.startsWith('fe80:')) {
    return true;
  }
  return false;
}

export function validateUrlForFilterImport(url) {
  validateUrl(url, { requireValidProtocol: true, blockLocalhost: false });
  const parsedUrl = new URL(url);
  if (isPrivateIpAddress(parsedUrl.hostname)) {
    throw new Error(`Access to private network address is not allowed: ${parsedUrl.hostname}`);
  }
  if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname.endsWith('.localhost')) {
    throw new Error(`Access to localhost is not allowed for filter imports`);
  }
}
```

---

## 2. Content Scriptパーミッション縮小

### 2.1 現状

`manifest.json` で `<all_urls>` を使用し、`chrome://`、`file://` 等の機密ページに注入される。

### 2.2 対策

`matches` を `http://*/*`、`https://*/*` のみに縮小し、Content Script不在時のエラーハンドリングを追加。

### 2.3 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `manifest.json` | `matches: ["http://*/*", "https://*/*"]` に変更 |
| `src/popup/main.js` | GET_CONTENTのエラーハンドリング追加 |
| `_locales/ja/messages.json` | エラーメッセージキー追加 |
| `_locales/en/messages.json` | エラーメッセージキー追加 |

### 2.4 副作用

- `file://` プロトコルのローカルHTMLファイルからの自動記録不可
- ほとんどのユーザーに影響なし

---

## 3. タブキーボードナビゲーション

### 3.1 現状

設定画面のタブ（General / Domain Filter / Privacy）がクリックでのみ切り替え可能。

### 3.2 対策

キーボードイベント（矢印キー、Home/End、Enter/Space）でタブ操作可能にする。

### 3.3 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/popup/popup.html` | `<div class="tab-nav">` に `id="tabList"` 追加 |
| `src/popup/domainFilter.js` | `handleTabKeydown()` 関数追加、`showTab()` でARIA更新 |

### 3.4 コードスニペット

**domainFilter.js `init()` 内に追加:**

```javascript
const tabList = document.getElementById('tabList');
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
```

---

## 4. モーダルフォーカストラップ

### 4.1 現状

PIIプレビューモーダルが開いている間、キーボードフォーカスが外に出られる。

### 4.2 対策

フォーカストラップ、ESCキーでの閉じる、元のフォーカス復帰を実装。

### 4.3 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/popup/sanitizePreview.js` | `previousActiveElement` 変数追加、`trapFocus()` 関数追加 |

### 4.4 コードスニペット

```javascript
let previousActiveElement = null;

function trapFocus(modal) {
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableElements = modal.querySelectorAll(focusableSelector);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const keydownHandler = (e) => {
    if (e.key === 'Escape') {
      handleAction(false);
    }
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  };

  modal.addEventListener('keydown', keydownHandler);
  modal.addEventListener('focusout', () => {
    modal.removeEventListener('keydown', keydownHandler);
  });
}

// showPreview() 内
previousActiveElement = document.activeElement;
// ... existing code ...
trapFocus(modal);

// handleAction() 内
if (previousActiveElement) {
  previousActiveElement.focus();
}
```

---

## 5. アイコンボタンのARIAラベル

### 5.1 現状

メニューボタン(`☰`)、戻るボタン(`←`)、閉じるボタン(`×`)が絵文字のみ。

### 5.2 対策

`aria-label` 属性と `data-i18n` 属性を追加。

### 5.3 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/popup/popup.html` | 3つのボタンに `aria-label`、`data-i18n` 属性追加 |
| `_locales/ja/messages.json` | 翻訳キー追加 |
| `_locales/en/messages.json` | 翻訳キー追加 |

### 5.4 コードスニペット

```html
<button id="menuBtn" class="icon-btn" aria-label="[キータブ]" data-i18n="openSettings">☰</button>
<button id="backBtn" class="icon-btn" aria-label="[キータブ]" data-i18n="backToMain">←</button>
<button id="closeModalBtn" class="icon-btn" aria-label="[キータブ]" data-i18n="closeModal">×</button>
```

---

## テスト計画

| 課題 | テスト内容 |
|-----|---------|
| SSRF対策 | 内部ネットワークURLがブロックされること |
| Content Script縮小 | `file://` ページで適切なエラーが表示されること |
| タブキーボードナビゲーション | 矢印キーでタブが切り替えられること |
| モーダルフォーカストラップ | Tabキーでループ、ESCで閉じられること |
| ARIAラベル | スクリーンリーダーで適切に読み上げられること |

---

## リリース後の対応推奨（P1-P2）

1. i18nハードコード文字列の分離（20+件）
2. パフォーマンス向上措置（高優先順位）
3. UI/UX改善
4. ドキュメント作成（CONTRIBUTING.md、API仕様）