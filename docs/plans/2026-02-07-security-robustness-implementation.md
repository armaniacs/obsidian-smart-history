# セキュリティ・堅牢性機能の実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ブラーチーム報告に基づくセキュリティと堅牢性の向上：fetchタイムアウト、ポート番号検証、URLセットサイズ制限、CSP frame-ancestorsの追加

**Architecture:** 各機能は独立しており、obsidianClient.jsとrecordingLogic.jsに最小限の追加修正を行う。storage.jsに定数を追加し、popup.htmlにCSPディレクティブを追加。

**Tech Stack:** JavaScript (ES6+), Jest for testing, Chrome Extension APIs

---

## Task 1: storage.js に定数を追加する

**Files:**
- Modify: `src/utils/storage.js`
- Test: `src/utils/__tests__/storage.test.js` (新規作成)

**Step 1: Write the failing test (storage.test.js)**

```javascript
/**
 * storage.test.js
 * Storage定数のテスト
 */
import { MAX_URL_SET_SIZE, URL_WARNING_THRESHOLD } from '../storage.js';

describe('Storage定数', () => {
  it('MAX_URL_SET_SIZEが10000であること', () => {
    expect(MAX_URL_SET_SIZE).toBe(10000);
  });

  it('URL_WARNING_THRESHOLDが8000であること', () => {
    expect(URL_WARNING_THRESHOLD).toBe(8000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/storage.test.js`
Expected: FAIL with "MAX_URL_SET_SIZE is not exported"

**Step 3: Write minimal implementation (storage.js)**

`src/utils/storage.js` の最後に以下を追加：

```javascript
// URL set size limit constants
export const MAX_URL_SET_SIZE = 10000;
export const URL_WARNING_THRESHOLD = 8000;
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/__tests__/storage.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/storage.js src/utils/__tests__/storage.test.js
git commit -m "feat: add MAX_URL_SET_SIZE and URL_WARNING_THRESHOLD constants"
```

---

## Task 2: obsidianClient.js にfetchタイムアウト機能を追加する

**Files:**
- Modify: `src/background/obsidianClient.js`
- Test: `src/background/__tests__/robustness-fetch-timeout.test.js`

**Step 1: Write the failing test (robustness-fetch-timeout.test.js)**

`src/background/__tests__/robustness-fetch-timeout.test.js` の `describe('推奨される改善事項')` セクションにあるTODOテストのうち、`it('AbortControllerを使用して10秒タイムアウトを実装すべき')` を修正：

```javascript
it('15秒タイムアウトでリクエストがキャンセルされること', async () => {
  const neverResolvingPromise = new Promise(() => {});
  mockFetch.mockReturnValue(neverResolvingPromise);

  const fetchPromise = obsidianClient._fetchExistingContent(
    'https://127.0.0.1:27123/vault/test.md',
    { 'Authorization': 'Bearer test_key' }
  );

  // 16秒経過させる（15秒タイムアウト以上）
  jest.advanceTimersByTime(16000);

  await expect(fetchPromise).rejects.toThrow('timed out');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/__tests__/robustness-fetch-timeout.test.js`
Expected: FAIL with "_fetchWithTimeout is not defined" or timeout error

**Step 3: Write minimal implementation (obsidianClient.js)**

`src/background/obsidianClient.js` のファイル上部、`BASE_HEADERS` 定数の後に以下を追加：

```javascript
/**
 * Problem #1: Fetchタイムアウト設定
 */
const FETCH_TIMEOUT_MS = 15000; // 15秒
```

`Mutex` クラスの後に、`_fetchWithTimeout` メソッドを追加：

```javascript
/**
 * Mutexのインスタンス（クロージャ経由で共有）
 * 日次ノートごとではなく、全体的な書き込み操作をシリアライズ
 */
const globalWriteMutex = new Mutex();

/**
 * Problem #1: タイムアウト付きfetchのラッパー関数
 * @param {string} url - リクエストURL
 * @param {object} options - fetchオプション
 * @returns {Promise<Response>} fetchレスポンス
 * @throws {Error} タイムアウト時にエラーをスロー
 */
async function _fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    addLog(LogType.ERROR, `Obsidian request timed out after ${FETCH_TIMEOUT_MS}ms`, { url });
  }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Error: Request timed out. Please check your Obsidian connection.');
    }
    throw error;
  }
}

export class ObsidianClient {
```

**Step 4: Update _fetchExistingContent to use _fetchWithTimeout**

`src/background/obsidianClient.js` の `_fetchExistingContent` メソッドを更新：

```javascript
async _fetchExistingContent(url, headers) {
    const response = await _fetchWithTimeout(url, {
        method: 'GET',
        headers
    });

    if (response.ok) {
        return await response.text();
    } else if (response.status === 404) {
        return '';
    } else {
        const errorText = await response.text();
        addLog(LogType.ERROR, `Failed to read daily note: ${response.status} ${errorText}`);
        throw new Error('Error: Failed to read daily note. Please check your Obsidian connection.');
    }
}
```

**Step 5: Update _writeContent to use _fetchWithTimeout**

`src/background/obsidianClient.js` の `_writeContent` メソッドを更新：

```javascript
async _writeContent(url, headers, content) {
    const response = await _fetchWithTimeout(url, {
        method: 'PUT',
        headers,
        body: content
    });

    if (!response.ok) {
        const errorText = await response.text();
        addLog(LogType.ERROR, `Obsidian API Error: ${response.status} ${errorText}`);
        throw new Error('Error: Failed to write to daily note. Please check your Obsidian connection.');
    }
}
```

**Step 6: Update testConnection to use _fetchWithTimeout**

`src/background/obsidianClient.js` の `testConnection` メソッドを更新：

```javascript
async testConnection() {
    try {
        const { baseUrl, headers } = await this._getConfig();
        const response = await _fetchWithTimeout(`${baseUrl}/`, {
            method: 'GET',
            headers
        });
        if (response.ok) {
            return { success: true, message: 'Success! Connected to Obsidian. Settings Saved.' };
        } else {
            addLog(LogType.ERROR, `Connection test failed with status: ${response.status}`);
            return { success: false, message: 'Connection Failed. Please check your settings.' };
        }
    } catch (e) {
        addLog(LogType.ERROR, `Connection test failed: ${e.message}`);
        return { success: false, message: 'Connection Failed. Please check your settings and connection.' };
    }
}
```

**Step 7: Update test to use fake timers properly**

`src/background/__tests__/robustness-fetch-timeout.test.js` のテストを修正：

```javascript
describe('タイムアウトの検証', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('15秒タイムアウトでリクエストがキャンセルされること', async () => {
    const neverResolvingPromise = new Promise(() => {});
    mockFetch.mockReturnValue(neverResolvingPromise);

    const fetchPromise = obsidianClient._fetchExistingContent(
      'https://127.0.0.1:27123/vault/test.md',
      { 'Authorization': 'Bearer test_key' }
    );

    // 16秒経過させる（15秒タイムアウト以上）
    jest.advanceTimersByTime(16000);

    // タイムアウト後、setTimeoutのコールバックが実行されるのを待つ
    await setImmediate();

    await expect(fetchPromise).rejects.toThrow('timed out');
  });
});
```

**Step 8: Run test to verify it passes**

Run: `npm test -- src/background/__tests__/robustness-fetch-timeout.test.js`
Expected: PASS

**Step 9: Commit**

```bash
git add src/background/obsidianClient.js src/background/__tests__/robustness-fetch-timeout.test.js
git commit -m "feat: add fetch timeout with AbortController (15s)"
```

---

## Task 3: obsidianClient.js にポート番号検証を追加する

**Files:**
- Modify: `src/background/obsidianClient.js`
- Test: `src/background/__tests__/robustness-port-validation.test.js`

**Step 1: Write the failing test (robustness-port-validation.test.js)**

`src/background/__tests__/robustness-port-validation.test.js` の `describe('無効なポート番号のエッジケース')` セクションのTODOテストを有効化：

```javascript
it('ポート番号が0の場合はエラーをスローすべき', async () => {
  storage.getSettings.mockResolvedValue({
    OBSIDIAN_API_KEY: 'test_key',
    OBSIDIAN_PROTOCOL: 'https',
    OBSIDIAN_PORT: '0',
    OBSIDIAN_DAILY_PATH: ''
  });

  await expect(obsidianClient._getConfig()).rejects.toThrow('Invalid port number. Port must be between 1 and 65535.');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/__tests__/robustness-port-validation.test.js`
Expected: FAIL

**Step 3: Write minimal implementation (obsidianClient.js)**

`src/background/obsidianClient.js` の `FETCH_TIMEOUT_MS` 定数の後に以下を追加：

```javascript
/**
 * Problem #2: ポート番号検証定数
 */
const MIN_PORT = 1;
const MAX_PORT = 65535;
const DEFAULT_PORT = '27123';
```

`ObsidianClient` クラス内に `_validatePort` メソッドを追加：

```javascript
export class ObsidianClient {
    /**
     * ポート番号の検証
     * @param {string|number|undefined} port - ポート番号
     * @returns {string} 有効なポート番号（文字列）
     * @throws {Error} ポート番号が無効な場合
     */
    _validatePort(port) {
        // 未指定、空文字列の場合はデフォルト値を使用
        if (port === undefined || port === null || port === '') {
            return DEFAULT_PORT;
        }

        // 数値変換
        const portNum = Number(port);

        // 非数値チェック
        if (isNaN(portNum)) {
            throw new Error('Invalid port number. Port must be a valid number.');
        }

        // 整数チェック
        if (!Number.isInteger(portNum)) {
            throw new Error('Invalid port number. Port must be an integer.');
        }

        // 範囲チェック
        if (portNum < MIN_PORT || portNum > MAX_PORT) {
            throw new Error(`Invalid port number. Port must be between ${MIN_PORT} and ${MAX_PORT}.`);
        }

        return String(portNum);
    }

    /**
     * 設定オブジェクトを取得する
     * Problem #2: BASE_HEADERS定数を使用してオブジェクト作成を最適化
     * Problem #2: ポート番号の検証を追加
     */
    async _getConfig() {
        const settings = await getSettings();
        const protocol = settings[StorageKeys.OBSIDIAN_PROTOCOL] || 'http';
        const rawPort = settings[StorageKeys.OBSIDIAN_PORT] || DEFAULT_PORT;
        const port = this._validatePort(rawPort);
        const apiKey = settings[StorageKeys.OBSIDIAN_API_KEY];

        if (!apiKey) {
            addLog(LogType.WARN, 'Obsidian API Key is missing');
            throw new Error('Error: API key is missing. Please check your Obsidian settings.');
        }

        return {
            baseUrl: `${protocol}://127.0.0.1:${port}`,
            headers: {
                ...BASE_HEADERS,
                'Authorization': `Bearer ${apiKey}`
            },
            settings
        };
    }
```

**Step 4: Update remaining TODO tests in robustness-port-validation.test.js**

以下のテストのコメントアウトを外して有効化：

- `it('ポート番号が65535より大きい場合はエラーをスローすべき')`
- `it('ポート番号が負の値の場合はエラーをスローすべき')`
- `it('ポート番号が非数値の場合はエラーをスローすべき')`
- `it('ポート番号が小数の場合はエラーをスローすべき')`

**Step 5: Run test to verify it passes**

Run: `npm test -- src/background/__tests__/robustness-port-validation.test.js`
Expected: PASS

**Step 6: Commit**

```bash
git add src/background/obsidianClient.js src/background/__tests__/robustness-port-validation.test.js
git commit -m "feat: add port number validation (1-65535)"
```

---

## Task 4: recordingLogic.js にURLセットサイズ制限を追加する

**Files:**
- Modify: `src/background/recordingLogic.js`
- Test: `src/background/__tests__/robustness-url-set-limit.test.js`

**Step 1: Write the failing test (robustness-url-set-limit.test.js)**

`src/background/__tests__/robustness-url-set-limit.test.js` の `import` 文を更新：

```javascript
import { getSettings, getSavedUrls, setSavedUrls, StorageKeys, MAX_URL_SET_SIZE, URL_WARNING_THRESHOLD } from '../../utils/storage.js';
```

`describe('URLセットサイズ制限のテスト（実装後）')` セクションのTODOテストを有効化：

```javascript
it('URLセットが上限（MAX_URL_SET_SIZE）を超えた場合にエラーをスローすべき', async () => {
  const mockObsidianClient = {
    appendToDailyNote: jest.fn().mockResolvedValue()
  };
  recordingLogic = new RecordingLogic(mockObsidianClient, {});

  // MAX_URL_SET_SIZE個のURLを追加する
  const existingUrls = new Set();
  for (let i = 0; i < MAX_URL_SET_SIZE; i++) {
    existingUrls.add(`https://example.com/${i}`);
  }
  getSavedUrls.mockResolvedValue(existingUrls);

  // MAX_URL_SET_SIZE + 1番目のURLはエラーをスローすべき
  const result = await recordingLogic.record({
    title: 'Test Page',
    url: `https://example.com/new`,
    content: 'New content'
  });

  expect(result.success).toBe(false);
  expect(result.error).toContain('URL set size limit exceeded');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/__tests__/robustness-url-set-limit.test.js`
Expected: FAIL

**Step 3: Write minimal implementation (recordingLogic.js)**

`src/background/recordingLogic.js` の `import` 文を更新：

```javascript
import { getSettings, getSavedUrls, setSavedUrls, saveSettings, StorageKeys, MAX_URL_SET_SIZE, URL_WARNING_THRESHOLD } from '../utils/storage.js';
```

`record()` メソッドの URL 追加ロジックにサイズチェックを追加：

```javascript
async record(data) {
    const { title, url, content, force = false, skipDuplicateCheck = false, alreadyProcessed = false, previewOnly = false } = data;

    try {
      // 1. Check domain filter
      const isAllowed = await isDomainAllowed(url);

      if (!isAllowed && !force) {
        return { success: false, error: 'DOMAIN_BLOCKED' };
      }

      if (!isAllowed && force) {
        addLog(LogType.WARN, 'Force recording blocked domain', { url });
      }

      // 2. Check for duplicates
      // 設定キャッシュを使用
      const settings = await this.getSettingsWithCache();
      // Problem #7: キャッシュ付きURL取得を使用
      const urlSet = await this.getSavedUrlsWithCache();

      if (!skipDuplicateCheck && urlSet.has(url)) {
        return { success: true, skipped: true };
      }

      // Problem #4: URLセットサイズ制限チェック
      if (urlSet.size >= MAX_URL_SET_SIZE) {
        addLog(LogType.ERROR, 'URL set size limit exceeded', {
          current: urlSet.size,
          max: MAX_URL_SET_SIZE,
          url
        });
        NotificationHelper.notifyError(
          'URL history limit reached',
          `Maximum ${MAX_URL_SET_SIZE} URLs allowed. Please clear your history.`
        );
        return { success: false, error: 'URL set size limit exceeded. Please clear your history.' };
      }

      // Problem #4: 警告閾値チェック
      if (urlSet.size >= URL_WARNING_THRESHOLD) {
        addLog(LogType.WARN, 'URL set size approaching limit', {
          current: urlSet.size,
          threshold: URL_WARNING_THRESHOLD,
          remaining: MAX_URL_SET_SIZE - urlSet.size
        });
      }

      // 3. Privacy Pipeline Processing
      // ... (残りのコードは変更なし)
```

**Step 4: Update test and run**

念のため `robustness-url-set-limit.test.js` の冒頭で `MAX_URL_SET_SIZE` が利用可能か確認（必要に応じて適応）

**Step 5: Run test to verify it passes**

Run: `npm test -- src/background/__tests__/robustness-url-set-limit.test.js`
Expected: PASS

**Step 6: Commit**

```bash
git add src/background/recordingLogic.js src/background/__tests__/robustness-url-set-limit.test.js
git commit -m "feat: add URL set size limit (max 10000, warning 8000)"
```

---

## Task 5: popup.html にCSP frame-ancestorsを追加する

**Files:**
- Modify: `src/popup/popup.html`

**Step 1: Verify current CSP**

CSPディレクティブは現在：
`default-src 'none'; script-src 'self'; style-src 'self'; object-src 'none';`

**Step 2: Add frame-ancestors to CSP**

`src/popup/popup.html` の Meta タグを更新：

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none';">
```

**Step 3: Verify the change**

Run: `cat src/popup/popup.html | grep "Content-Security-Policy"`
Expected: `frame-ancestors 'none';` が含まれる

**Step 4: Commit**

```bash
git add src/popup/popup.html
git commit -m "security: add frame-ancestors 'none' to CSP"
```

---

## Task 6: すべてのテストを実行して統合を確認する

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run specific robustness tests**

Run: `npm test -- robustness`
Expected: All 5 robustness test files pass

**Step 3: Final verification**

```bash
git status
```

Expected: No uncommitted changes (or only expected path cache, etc.)

---

## Task 7: CHANGELOG.md の更新（オプション）

**Step 1: Update CHANGELOG.md**

`CHANGELOG.md` に以下のエントリを追加：

```markdown
## [Unreleased]

### Added
- Fetch timeout (15s) with AbortController to prevent infinite waiting
- Port number validation (1-65535) in obsidianClient.js
- URL set size limit (max 10000, warning at 8000) in recordingLogic.js
- CSP `frame-ancestors 'none'` to prevent iframe embedding attacks

### Security
- Added clickjacking protection via CSP frame-ancestors directive
- Improved input validation for port numbers
- Prevented memory exhaustion with URL set limits
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for security/robustness features"
```

---

## Summary

This implementation plan adds the following security and robustness features:

1. **storage.js**: Added `MAX_URL_SET_SIZE = 10000` and `URL_WARNING_THRESHOLD = 8000` constants
2. **obsidianClient.js**:
   - Added fetch timeout (15s) using AbortController
   - Added port number validation (1-65535) with clear error messages
3. **recordingLogic.js**: Added URL set size limit with error handling and user notifications
4. **popup.html**: Added CSP `frame-ancestors 'none'` to prevent clickjacking

All changes follow TDD principles with comprehensive test coverage.