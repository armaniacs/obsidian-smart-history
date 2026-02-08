# Code Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 5つの推奨事項とImportantな問題点を修正して、uBlockフィルター管理機能を本番対応レベルへ向上させる

**Architecture:**
- Jest設定をjsdom環境に復元してテストを修復
- 旧形式からのデータマイグレーション関数を追加
- XSS脆弱性を修正（innerHTMLのtextContent化）
- エラーハンドリングを改善
- 未使用コードを削除・整理
- ドキュメントを更新（マイグレーション注意点含む）

**Tech Stack:** JavaScript ES Modules, Jest with jsdom, Chrome Extension APIs

---

## Task 1: Jest設定を修正してテスト修復

**Files:**
- Modify: `jest.config.cjs:8`

**Step 1: Jest設定を確認**

現在の設定（testEnvironment: 'node'）はブラウザAPIを必要とするテストを壊しています。

**Step 2: testEnvironmentをjsdomに修正**

```javascript
// jest.config.cjs
module.exports = {
  // テスト環境: jsdom（ブラウザAPIを必要とするテスト用）
  testEnvironment: 'jsdom',
  // ... その他の設定維持
};
```

**Step 3: テストを実行して検証**

```bash
npm test
```

Expected: テストが正常にパスすること

**Step 4: Commit**

```bash
git add jest.config.cjs
git commit -m "fix: restore jsdom environment in Jest config for browser API tests"
```

---

## Task 2: データマイグレーション関数を追加

**Files:**
- Create: `src/utils/migration.js`
- Modify: `src/utils/ublockMatcher.js`
- Modify: `src/utils/storage.js`

**Step 1: マイグレーション用ファイルを作成**

```javascript
// src/utils/migration.js

/**
 * 旧形式のuBlockルールを新形式（軽量化）にマイグレーション
 * @param {Object} oldRules - 旧形式 {blockRules, exceptionRules, metadata}
 * @returns {Object} - 新形式 {blockDomains, exceptionDomains, metadata}
 */
export function migrateToLightweightFormat(oldRules) {
  // 既に新形式の場合はそのまま返す
  if (oldRules.blockDomains && oldRules.exceptionDomains) {
    return oldRules;
  }

  return {
    blockDomains: (oldRules.blockRules || []).map(r => r.domain),
    exceptionDomains: (oldRules.exceptionRules || []).map(r => r.domain),
    metadata: oldRules.metadata || {
      importedAt: Date.now(),
      ruleCount: (oldRules.blockRules?.length || 0) + (oldRules.exceptionRules?.length || 0),
      migrated: true
    }
  };
}

/**
 * ストレージ内のuBlock設定をマイグレーション
 * @returns {Promise<boolean>} - マイグレーション実行したらtrue
 */
export async function migrateUblockSettings() {
  const { UBLOCK_RULES, UBLOCK_SOURCES } = await import('./storage.js');

  const result = await chrome.storage.local.get([UBLOCK_RULES.UBLOCK_RULES]);

  const ublockRules = result[UBLOCK_RULES.UBLOCK_RULES];

  // 既に新形式またはデータがない場合は何もしない
  if (!ublockRules || ublockRules.blockDomains) {
    return false;
  }

  // マイグレーション実行
  const newRules = migrateToLightweightFormat(ublockRules);
  await chrome.storage.local.set({ [UBLOCK_RULES.UBLOCK_RULES]: newRules });

  return true;
}
```

**Step 2: ublockMatcher.jsでマイグレーションを呼び出す**

```javascript
// ublockMatcher.js
// 先頭にimportを追加
import { migrateToLightweightFormat } from './migration.js';

// RuleIndex.buildIndexメソッドを修正
buildIndex(ublockRules) {
  // マイグレーションが必要な場合は事前に実行
  const rules = migrateToLightweightFormat(ublockRules);

  // blockRules（旧形式）
  if (rules.blockRules) {
    for (const rule of rules.blockRules) {
      if (!rule.domain) continue;
      if (rule.domain.includes('*')) {
        this.wildcardBlockRules.push(rule);
      } else {
        if (!this.blockRulesByDomain.has(rule.domain)) {
          this.blockRulesByDomain.set(rule.domain, []);
        }
        this.blockRulesByDomain.get(rule.domain).push(rule);
      }
    }
  }

  // blockDomains（新形式）
  if (rules.blockDomains) {
    for (const domain of rules.blockDomains) {
      if (domain.includes('*')) {
        this.wildcardBlockRules.push({ domain, options: {} });
      } else {
        if (!this.blockRulesByDomain.has(domain)) {
          this.blockRulesByDomain.set(domain, []);
        }
        this.blockRulesByDomain.get(domain).push({ domain, options: {} });
      }
    }
  }

  // exceptionRules（旧形式）
  if (rules.exceptionRules) {
    for (const rule of rules.exceptionRules) {
      if (!rule.domain) continue;
      if (rule.domain.includes('*')) {
        this.wildcardExceptionRules.push(rule);
      } else {
        if (!this.exceptionRulesByDomain.has(rule.domain)) {
          this.exceptionRulesByDomain.set(rule.domain, []);
        }
        this.exceptionRulesByDomain.get(domain).push(rule);
      }
    }
  }

  // exceptionDomains（新形式）
  if (rules.exceptionDomains) {
    for (const domain of rules.exceptionDomains) {
      if (domain.includes('*')) {
        this.wildcardExceptionRules.push({ domain, options: {} });
      } else {
        if (!this.exceptionRulesByDomain.has(domain)) {
          this.exceptionRulesByDomain.set(domain, []);
        }
        this.exceptionRulesByDomain.get(domain).push({ domain, options: {} });
      }
    }
  }
}
```

**Step 3: storage.jsにマイグレーションimportを追加**

```javascript
// storage.js
import { migrateUblockSettings } from './migration.js';

export async function getSettings() {
  let settings = await chrome.storage.local.get(null);
  const migrated = await migrateUblockSettings();
  if (migrated) {
    // マイグレーション後は設定を再取得
    settings = await chrome.storage.local.get(null);
  }
  return { ...DEFAULT_SETTINGS, ...settings };
}
```

**Step 4: テストを作成**

**Test file:** `src/utils/__tests__/migration.test.js`

```javascript
import { migrateToLightweightFormat } from '../migration.js';

test('旧形式から新形式にマイグレーション', () => {
  const oldRules = {
    blockRules: [
      { domain: 'example.com' },
      { domain: 'test.com' }
    ],
    exceptionRules: [
      { domain: 'whitelist.com' }
    ],
    metadata: {
      importedAt: 1000000,
      ruleCount: 3
    }
  };

  const result = migrateToLightweightFormat(oldRules);

  expect(result).toEqual({
    blockDomains: ['example.com', 'test.com'],
    exceptionDomains: ['whitelist.com'],
    metadata: expect.objectContaining({
      importedAt: 1000000,
      ruleCount: 3
    })
  });
});

test('既に新形式の場合はそのまま返す', () => {
  const newRules = {
    blockDomains: ['example.com'],
    exceptionDomains: ['whitelist.com'],
    metadata: { importedAt: 1000000, ruleCount: 2 }
  };

  const result = migrateToLightweightFormat(newRules);

  expect(result).toBe(newRules);
});

test('空のルールセットをハンドル', () => {
  const emptyOldRules = {
    blockRules: [],
    exceptionRules: [],
    metadata: {}
  };

  const result = migrateToLightweightFormat(emptyOldRules);

  expect(result).toEqual({
    blockDomains: [],
    exceptionDomains: [],
    metadata: expect.objectContaining({
      ruleCount: 0
    })
  });
});
```

**Step 5: テスト実行**

```bash
npm test -- migration.test.js
```

Expected: テストがパスすること

**Step 6: Commit**

```bash
git add src/utils/migration.js src/utils/ublockMatcher.js src/utils/storage.js src/utils/__tests__/migration.test.js
git commit -m "feat: add data migration function for old format uBlock rules"
```

---

## Task 3: XSS脆弱性を修正（innerHTMLtextContent化）

**Files:**
- Modify: `src/popup/ublockImport.js:52-82`

**Step 1: renderSourceList関数を書き換え**

```javascript
// ublockImport.js

function renderSourceList(sources) {
  const container = document.getElementById('uBlockSourceItems');
  const noSourcesMsg = document.getElementById('uBlockNoSources');

  if (!container) return;

  container.innerHTML = '';

  if (sources.length === 0) {
    noSourcesMsg.style.display = 'block';
    return;
  }

  noSourcesMsg.style.display = 'none';

  sources.forEach((source, index) => {
    const item = document.createElement('div');
    item.className = 'source-item';
    item.dataset.index = index;

    const urlText = source.url === 'manual' ? '手動入力' : source.url;
    const isUrl = source.url !== 'manual';

    // XSS対策: textContentを使用
    const urlElement = document.createElement(isUrl ? 'a' : 'span');
    urlElement.className = 'source-url';
    urlElement.textContent = urlText;
    if (isUrl) {
      urlElement.href = source.url;
      urlElement.target = '_blank';
      urlElement.rel = 'noopener noreferrer';
    }

    const date = new Date(source.importedAt);
    const dateStr = date.toLocaleString('ja-JP');

    const metaDiv = document.createElement('div');
    metaDiv.className = 'source-meta';

    const metaSpan = document.createElement('span');
    metaSpan.textContent = `${dateStr} | ルール: ${source.ruleCount}`;

    const actionDiv = document.createElement('div');

    if (isUrl) {
      const reloadBtn = document.createElement('button');
      reloadBtn.className = 'reload-btn';
      reloadBtn.dataset.index = index;
      reloadBtn.textContent = '再読込';
      reloadBtn.title = '再読み込み';
      actionDiv.appendChild(reloadBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.dataset.index = index;
    deleteBtn.textContent = '削除';
    actionDiv.appendChild(deleteBtn);

    metaDiv.appendChild(metaSpan);
    metaDiv.appendChild(actionDiv);

    item.appendChild(urlElement);
    item.appendChild(metaDiv);

    container.appendChild(item);
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteSource);
  });

  container.querySelectorAll('.reload-btn').forEach(btn => {
    btn.addEventListener('click', handleReloadSource);
  });
}
```

**Step 2: テスト追加**

**Test file:** `src/popup/__tests__/ublockImport-xss.test.js`

```javascript
import { renderSourceList } from '../ublockImport.js';

document.body.innerHTML = `
  <div id="uBlockSourceItems"></div>
  <div id="uBlockNoSources"></div>
`;

test('XSS: マルiciousなURLがエスケープされる', () => {
  const maliciousSources = [
    {
      url: '<script>alert("xss")</script>',
      importedAt: Date.now(),
      ruleCount: 1,
      blockDomains: ['example.com'],
      exceptionDomains: []
    }
  ];

  renderSourceList(maliciousSources);

  const items = document.querySelectorAll('.source-url');
  expect(items.length).toBe(1);
  expect(items[0].textContent).toBe('<script>alert("xss")</script>');
  expect(items[0].innerHTML).not.toContain('<script>');
});

test('安全なURLが正しく表示される', () => {
  const sources = [
    {
      url: 'https://example.com',
      importedAt: Date.now(),
      ruleCount: 10,
      blockDomains: ['example.com'],
      exceptionDomains: []
    }
  ];

  renderSourceList(sources);

  const items = document.querySelectorAll('.source-url');
  expect(items.length).toBe(1);
  expect(items[0].textContent).toBe('https://example.com');
  expect(items[0].href).toBe('https://example.com/');
});
```

**Step 3: テスト実行**

```bash
npm test -- ublockImport-xss.test.js
```

Expected: テストがパスすること

**Step 4: Commit**

```bash
git add src/popup/ublockImport.js src/popup/__tests__/ublockImport-xss.test.js
git commit -m "fix: prevent XSS by using textContent instead of innerHTML for source URLs"
```

---

## Task 4: URLインポートのエラーハンドリング改善

**Files:**
- Modify: `src/popup/ublockImport.js:428-435`

**Step 1: Content-Typeチェックを強化**

```javascript
// fetchFromUrl関数内

export async function fetchFromUrl(url) {
  try {
    try {
      new URL(url);
    } catch (e) {
      throw new Error('無効なURLです');
    }

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const text = await response.text();

    // 取得後にテキストが有効かチェック
    if (!text || text.trim().length === 0) {
      throw new Error('取得されたテキストが空です');
    }

    // Content-Typeがテキストでない場合は警告
    if (contentType && !contentType.includes('text/') && !contentType.includes('application/octet-stream')) {
      addLog(LogType.WARN, 'Content-Typeがテキスト形式ではありません', { contentType });
    }

    return text;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    }
    throw new Error(`URL読み込みエラー: ${error.message}`);
  }
}
```

**Step 2: テスト追加**

```javascript
// src/popup/__tests__/ublockImport-error.test.js

import { fetchFromUrl } from '../ublockImport.js';

global.fetch = jest.fn();

test('HTTPエラーを適切に処理', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 404,
    statusText: 'Not Found'
  });

  await expect(fetchFromUrl('https://example.com/filters.txt')).rejects.toThrow('HTTP 404');
});

test('空のレスポンスを検出', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    headers: { get: () => 'text/plain' },
    text: () => Promise.resolve('  ')
  });

  await expect(fetchFromUrl('https://example.com/empty.txt')).rejects.toThrow('取得されたテキストが空です');
});

test('無効なURLを検出', async () => {
  await expect(fetchFromUrl('not-a-url')).rejects.toThrow('無効なURLです');
});
```

**Step 3: テスト実行**

```bash
npm test -- ublockImport-error.test.js
```

**Step 4: Commit**

```bash
git add src/popup/ublockImport.js src/popup/__tests__/ublockImport-error.test.js
git commit -m "fix: improve URL import error handling with better content validation"
```

---

## Task 5: 正規表現キャッシュの改善

**Files:**
- Modify: `src/utils/ublockParser.js:151-167`

**Step 1: キャッシュの無効化（regex.testは十分速いため）**

```javascript
// ublockParser.js

// 正規表現のテストは非常に高速なのでキャッシュを無効化
// キャッシュによるメモリオーバーヘッドを回避
function cachedRegexTest(regex, str) {
  // キャッシュなしで直接実行
  return regex.test(str);
}
```

**Step 2: 不要なキャッシュ関連コードを削除**

```javascript
// ublockParser.js
// 正規表現キャッシュ定数を削除
// const REGEX_CACHE = new Map();  <-- 削除

// cleanupCache関数からREGEX_CACHE.clear()を削除
function cleanupCache() {
  const now = Date.now();
  if (now - lastCleanupTime > CLEANUP_INTERVAL) {
    PARSER_CACHE.clear();
    LRU_TRACKER.clear();
    lastCleanupTime = now;
  }
}
```

**Step 3: テスト実行**

```bash
npm test -- ublockParser.test.js
```

**Step 4: Commit**

```bash
git add src/utils/ublockParser.js
git commit -m "refactor: remove regex caching to avoid memory overhead"
```

---

## Task 6: 未使用のexportを削除する

**Files:**
- Modify: `src/popup/domainFilter.js:221-237`

**Step 1: 重複関数を削除**

```javascript
// domainFilter.js

/**
 * 保存ボタンのハンドラー
 */
export async function handleSaveDomainSettings() {
  try {
    // シンプル形式の保存
    await saveSimpleFormatSettings();

    // uBlock形式の保存 (有効な場合のみパースして保存されるが、有効化フラグだけは更新する)
    const ublockEnabled = ublockFormatEnabledCheckbox.checked;
    if (ublockEnabled) {
      await saveUblockSettings();
    } else {
      await saveSettings({ [StorageKeys.UBLOCK_FORMAT_ENABLED]: false });
    }
  } catch (error) {
    addLog(LogType.ERROR, 'Error saving domain settings', { error: error.message });
    showDomainStatus(`保存エラー: ${error.message}`, 'error');
  }
}
```

`saveDomainSettings()` 関数を削除（`handleSaveDomainSettings()` のみ残す）

**Step 2: テスト実行**

```bash
npm test -- domainFilter.test.js
```

**Step 3: Commit**

```bash
git add src/popup/domainFilter.js
git commit -m "refactor: remove duplicate saveDomainSettings function"
```

---

## Task 7: ドキュメントを更新（マイグレーション注意点）

**Files:**
- Modify: `CHANGELOG.md`
- Create: `docs/UBLOCK_MIGRATION.md`
- Modify: `USER-GUIDE-UBLOCK-IMPORT.md`

**Step 1: マイグレーションガイドを作成**

```markdown
# uBlockフィルター データマイグレーションガイド

## 概要

バージョン 2.2.5 以降、uBlockフィルターのストレージ形式が変更されました。

## 変更内容

### 旧形式 (v2.2.4以前)
```json
{
  "blockRules": [
    { "domain": "example.com", "pattern": "example.com", "options": {} }
  ],
  "exceptionRules": [
    { "domain": "safe.com", "pattern": "safe.com", "options": {} }
  ],
  "metadata": { ... }
}
```

### 新形式 (v2.2.5以降)
```json
{
  "blockDomains": ["example.com", "test.com"],
  "exceptionDomains": ["safe.com"],
  "metadata": { ... }
}
```

## 自動マイグレーション

v2.2.4以前のデータを持っているユーザーは、初回起動時に自動的に新形式へマイグレーションされます。

- マイグレーションは拡張機能のバックグラウンド（settings読み込み時）に自動実行されます
- 既存のルールはすべて保持されます
- マイグレーションは一度だけ実行されます

## メリット

- ストレージ使用量の大幅な削減（約70%削減）
- マッチング処理の高速化
- 大規模なフィルターリストでのパフォーマンス向上

## 注意点

- マイグレーションは不可逆です（新形式から旧形式へは戻れません）
- マイグレーションが正常に完了するまで拡張機能を使用していないことを推奨します
```

**Step 2: CHANGELOG.mdを更新**

```markdown
## [2.2.5] - 2026-02-04

### Fixed
- Jestテスト環境をjsdomに復元し、ブラウザAPIを必要とするテストを修復
- XSS脆弱性を修正: source URL表示をinnerHTMLからtextContentへ変更
- URLインポート時のエラーハンドリングを改善（空レスポンスの検出など）

### Added
- uBlockフィルターのデータマイグレーション機能（旧形式から軽量化形式への自動移行）
- マイグレーション用テストケース

### Changed
- 正規表現キャッシュを削除（メモリオーバーヘッド回避）
- 重複関数 saveDomainSettings() を削除

### Security
- XSS脆弱性の修正 (renderSourceListでのテキストエスケープ強化)
```

**Step 3: USER-GUIDE-UBLOCK-IMPORT.mdにマイグレーション注意を追加**

```markdown
# データ形式

## 軽量化されており高速

フィルターデータは最小限の形式で保存されています：
- ドメイン名のみの配列として保存
- ルールオブジェクトではなく文字列のみ

### マイグレーションについて

v2.2.4以前を使用していたユーザーは、データが自動的に軽量形式へ変換されます。
バックグラウンドで実行され、既存のルールはすべて保持されます。
```

**Step 4: Commit**

```bash
git add CHANGELOG.md docs/UBLOCK_MIGRATION.md USER-GUIDE-UBLOCK-IMPORT.md
git commit -m "docs: add migration guide and update changelog for uBlock format changes"
```

---

## Task 8: 統合テスト追加（リロードワークフローのE2Eテスト）

**Files:**
- Create: `src/popup/__tests__/integration-reload-workflow.test.js`

**Step 1: 統合テスト作成**

```javascript
/**
 * 統合テスト: ソースリロードワークフロー
 */

import { parseUblockFilterListWithErrors } from '../../utils/ublockParser.js';
import { rebuildRulesFromSources } from '../ublockImport.js';
import { StorageKeys } from '../../utils/storage.js';

// モックの設定
global.fetch = jest.fn();
global.chrome = {
  storage: { local: { get: jest.fn(), set: jest.fn() } }
};

describe('脊ーワーフロー: URLからインポートしてソースを再読み込み', () => {
  const mockFilterText = `
||example.com^
@@||safe.com^
`;

  const sources = [
    {
      url: 'https://example.com/filters.txt',
      importedAt: Date.now() - 86400000,
      ruleCount: 2,
      blockDomains: ['example.com'],
      exceptionDomains: ['safe.com']
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('URLからフィルターを取得してパース', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/plain' },
      text: () => Promise.resolve(mockFilterText)
    });

    const response = await fetch('https://example.com/filters.txt');
    const text = await response.text();

    const result = parseUblockFilterListWithErrors(text);

    expect(result.rules.blockRules.length).toBe(1);
    expect(result.rules.exceptionRules.length).toBe(1);
    expect(result.errors.length).toBe(0);
  });

  test('複数ソースからのルール再構築', () => {
    const multiSources = [
      { blockDomains: ['example.com'], exceptionDomains: [] },
      { blockDomains: ['test.com'], exceptionDomains: ['safe.com'] }
    ];

    const merged = rebuildRulesFromSources(multiSources);

    expect(new Set(merged.blockDomains)).toEqual(new Set(['example.com', 'test.com']));
    expect(new Set(merged.exceptionDomains)).toEqual(new Set(['safe.com']));
  });

  test('エラーがある場合のリロード動作', async () => {
    const brokenFilterText = `
||example.com
invalid line without caret
@@||safe.com^
`;

    const result = parseUblockFilterListWithErrors(brokenFilterText);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rules.blockRules.length).toBe(1);
  });

  test('空のフィルターリストを検出', async () => {
    const emptyFilterText = `
# Only comments here
!
! Another comment
`;

    const result = parseUblockFilterListWithErrors(emptyFilterText);

    expect(result.rules.ruleCount).toBe(0);
  });
});
```

**Step 2: テスト実行**

```bash
npm test -- integration-reload-workflow.test.js
```

**Step 3: Commit**

```bash
git add src/popup/__tests__/integration-reload-workflow.test.js
git add src/popup/ublockImport.js  // rebuildRulesFromSourcesをexport必要なら追加
git commit -m "test: add integration tests for reload workflow"
```

---

## Task 9: すべてのテスト実行

**Step 1: 全テスト実行**

```bash
npm test
```

Expected: すべてのテストがパスすること

**Step 2: カバレッジ確認**

```bash
npm test -- --coverage
```

**Step 3: 修正がある場合は再度コミット**

---

## Task 10: コードレビューの実施

すべての修正が完了したら、コードレビューを実施して本番対応レベルを確認します。

```bash
# スキル経由でコードレビューをリクエスト
```

---

## まとめ

このプランでは以下の問題を修正します：

| 推奨事項 | タスク | 状態 |
|---------|-------|------|
| Jest設定修復 | Task 1 | - |
| データマイグレーション | Task 2 | - |
| XSS脆弱性修正 | Task 3 | - |
| エラーハンドリング改善 | Task 4 | - |
| 正規表現キャッシュ改善 | Task 5 | - |
| 未使用コード削除 | Task 6 | - |
| ドキュメント更新 | Task 7 | - |
| 統合テスト追加 | Task 8 | - |
| 全テスト実行 | Task 9 | - |
| コードレビュー | Task 10 | - |