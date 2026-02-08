# Service Worker & Obsidian Client Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** service-worker.js と obsidianClient.js の長大な関数を分割し、単一責任原則に基づいて再構築する

**Architecture:**
- processUrlRecording を Privacy Pipeline Processing と Recording Logic に分割
- obsidianClient.js の appendToDailyNote を Read-Edit-Write 操作に分割
- ユーティリティ関数を分離して再利用性を向上させる

**Tech Stack:**
- Chrome Extension Manifest V3
- ES Modules
- Jest (existing test framework)

---
## Overview of Changes

| Original File | New File(s) | Responsibility |
|---|---|---|
| service-worker.js | src/background/recordingLogic.js | processUrlRecordingのコアロジック |
|  | src/background/privacyPipeline.js | Privacy Pipeline Processing (L1/L2/L3) |
|  | src/background/notificationHelper.js | 通知ロジック |
|  | src/background/messageHandler.js | メッセージルーティング |
| obsidianClient.js | src/utils/dailyNotePathBuilder.js | 日付パス構築ロジック |
|  | src/background/noteSectionEditor.js | ノートセクション編集ロジック |

---
## Task 1: Privacy Pipelineの抽出

**Files:**
- Create: `src/background/privacyPipeline.js`
- Modify: `src/background/service-worker.js:71-146` (remove pipeline logic)
- Test: `src/background/__tests__/privacyPipeline.test.js`

**Step 1: Write the failing test for Privacy Pipeline**

```javascript
// src/background/__tests__/privacyPipeline.test.js
import { PrivacyPipeline } from '../privacyPipeline.js';

describe('PrivacyPipeline', () => {
  const mockSettings = {
    PRIVACY_MODE: 'full_pipeline',
    PII_SANITIZE_LOGS: true
  };

  const mockAiClient = {
    getLocalAvailability: jest.fn().mockResolvedValue('readily'),
    summarizeLocally: jest.fn().mockResolvedValue({
      success: true,
      summary: 'Local summary'
    }),
    generateSummary: jest.fn().mockResolvedValue('Cloud summary')
  };

  const mockSanitizers = {
    sanitizeRegex: jest.fn().mockReturnValue({
      text: 'Sanitized text',
      maskedItems: [{ type: 'email' }]
    })
  };

  describe('process', () => {
    it('should process full pipeline (L1 -> L2 -> L3)', async () => {
      const pipeline = new PrivacyPipeline(mockSettings, mockAiClient, mockSanitizers);

      const result = await pipeline.process('Original content');

      expect(result.summary).toBe('Cloud summary');
      expect(result.maskedCount).toBe(1);
    });

    it('should return preview only when previewOnly is true', async () => {
      const pipeline = new PrivacyPipeline(mockSettings, mockAiClient, mockSanitizers);

      const result = await pipeline.process('Original content', { previewOnly: true });

      expect(result.preview).toBe(true);
      expect(result.processedContent).toBe('Cloud summary');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/__tests__/privacyPipeline.test.js`
Expected: FAIL with "PrivacyPipeline is not defined"

**Step 3: Create PrivacyPipeline class**

```javascript
// src/background/privacyPipeline.js
import { addLog, LogType } from '../utils/logger.js';

export class PrivacyPipeline {
  constructor(settings, aiClient, sanitizers) {
    this.settings = settings;
    this.aiClient = aiClient;
    this.sanitizers = sanitizers;
    this.mode = settings.PRIVACY_MODE || 'full_pipeline';
  }

  async process(content, options = {}) {
    const { previewOnly = false, alreadyProcessed = false } = options;

    if (!content) {
      return { summary: 'Summary not available.' };
    }

    const sanitizedSettings = {
      useLocalAi: (this.mode === 'local_only' || this.mode === 'full_pipeline') && !alreadyProcessed,
      useMasking: (this.mode === 'full_pipeline' || this.mode === 'masked_cloud') && !alreadyProcessed,
      useCloudAi: this.mode !== 'local_only'
    };

    let processingText = content;
    let maskedCount = 0;

    // L1: Local Summarization
    if (sanitizedSettings.useLocalAi) {
      const localStatus = await this.aiClient.getLocalAvailability();
      if (localStatus === 'readily' || this.mode === 'local_only') {
        const localResult = await this.aiClient.summarizeLocally(content);
        if (localResult.success) {
          processingText = localResult.summary;
          if (this.mode === 'local_only') {
            return { summary: localResult.summary };
          }
        }
      }
    }

    // L2: PII Masking
    if (sanitizedSettings.useMasking) {
      const sanitizeResult = this.sanitizers.sanitizeRegex(processingText);
      processingText = sanitizeResult.text;
      maskedCount = sanitizeResult.maskedItems.length;

      this._logMasking(sanitizeResult);
    }

    if (previewOnly) {
      return {
        success: true,
        preview: true,
        processedContent: processingText,
        mode: this.mode,
        maskedCount
      };
    }

    // L3: Cloud Summarization
    if (sanitizedSettings.useCloudAi) {
      const summary = await this.aiClient.generateSummary(processingText);
      return { summary, maskedCount };
    }

    return { summary: 'Summary not available.' };
  }

  _logMasking(sanitizeResult) {
    if (this.settings.PII_SANITIZE_LOGS !== false) {
      const count = sanitizeResult.maskedItems.length;
      if (count > 0) {
        addLog(LogType.SANITIZE, `Masked ${count} PII items`, {
          items: sanitizeResult.maskedItems.map(i => i.type)
        });
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/background/__tests__/privacyPipeline.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/background/privacyPipeline.js src/background/__tests__/privacyPipeline.test.js
git commit -m "refactor: extract PrivacyPipeline class from service-worker"
```

---
## Task 2: Notification Helperの抽出

**Files:**
- Create: `src/background/notificationHelper.js`
- Modify: `src/background/service-worker.js:163-168, 176-181` (remove notification logic)
- Test: `src/background/__tests__/notificationHelper.test.js`

**Step 1: Write the failing test for Notification Helper**

```javascript
// src/background/__tests__/notificationHelper.test.js
import { NotificationHelper } from '../notificationHelper.js';

jest.mock('chrome', () => ({
  notifications: {
    create: jest.fn()
  }
}));

describe('NotificationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notifySuccess', () => {
    it('should create success notification', () => {
      NotificationHelper.notifySuccess('Test Title', 'Test Message');

      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          message: 'Test Message'
        })
      );
    });
  });

  describe('notifyError', () => {
    it('should create error notification', () => {
      NotificationHelper.notifyError('Test Error');

      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Failed'),
          message: expect.stringContaining('Test Error')
        })
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/__tests__/notificationHelper.test.js`
Expected: FAIL with "NotificationHelper is not defined"

**Step 3: Create NotificationHelper class**

```javascript
// src/background/notificationHelper.js
export class NotificationHelper {
  static ICON_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  static notifySuccess(title, message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: this.ICON_URL,
      title,
      message
    });
  }

  static notifyError(error) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: this.ICON_URL,
      title: 'Obsidian Sync Failed',
      message: `Error: ${error}`
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/background/__tests__/notificationHelper.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/background/notificationHelper.js src/background/__tests__/notificationHelper.test.js
git commit -m "refactor: extract NotificationHelper class from service-worker"
```

---
## Task 3: Recording Logicの抽出

**Files:**
- Create: `src/background/recordingLogic.js`
- Modify: `src/background/service-worker.js:48-185` (replace with new class)
- Test: `src/background/__tests__/recordingLogic.test.js`

**Step 1: Write the failing test for Recording Logic**

```javascript
// src/background/__tests__/recordingLogic.test.js
import { RecordingLogic } from '../recordingLogic.js';

describe('RecordingLogic', () => {
  const mockObsidian = {
    appendToDailyNote: jest.fn()
  };

  const mockPrivacyPipeline = {
    process: jest.fn()
  };

  const mockDomainUtils = {
    isDomainAllowed: jest.fn().mockResolvedValue(true)
  };

  describe('record', () => {
    it('should skip recording when domain is not allowed', async () => {
      const logic = new RecordingLogic(mockObsidian, mockPrivacyPipeline, mockDomainUtils);
      mockDomainUtils.isDomainAllowed.mockResolvedValue(false);

      const result = await logic.record({
        url: 'https://blocked.com',
        title: 'Blocked',
        content: 'Content'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('許可されていません');
    });

    it('should skip recording when URL is already saved', async () => {
      const logic = new RecordingLogic(mockObsidian, mockPrivacyPipeline, mockDomainUtils);
      logic.getSavedUrls = jest.fn().mockResolvedValue(new Set(['https://test.com']));

      const result = await logic.record({
        url: 'https://test.com',
        title: 'Test',
        content: 'Content'
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/__tests__/recordingLogic.test.js`
Expected: FAIL with "RecordingLogic is not defined"

**Step 3: Create RecordingLogic class**

```javascript
// src/background/recordingLogic.js
import { PrivacyPipeline } from './privacyPipeline.js';
import { NotificationHelper } from './notificationHelper.js';
import { addLog, LogType } from '../utils/logger.js';
import { isDomainAllowed } from '../utils/domainUtils.js';
import { sanitizeRegex } from '../utils/piiSanitizer.js';
import { getSettings, StorageKeys, getSavedUrls, setSavedUrls } from '../utils/storage.js';

export class RecordingLogic {
  constructor(obsidianClient, aiClient) {
    this.obsidian = obsidianClient;
    this.aiClient = aiClient;
  }

  async record(data) {
    const { title, url, content, force = false, skipDuplicateCheck = false, alreadyProcessed = false } = data;

    try {
      // 1. Check domain filter
      const isAllowed = await isDomainAllowed(url);

      if (!isAllowed && !force) {
        return { success: false, error: 'このドメインは記録が許可されていません' };
      }

      if (!isAllowed && force) {
        addLog(LogType.WARN, 'Force recording blocked domain', { url });
      }

      // 2. Check for duplicates
      const settings = await getSettings();
      const urlSet = await getSavedUrls();

      if (!skipDuplicateCheck && urlSet.has(url)) {
        return { success: true, skipped: true };
      }

      // 3. Privacy Pipeline Processing
      const pipeline = new PrivacyPipeline(settings, this.aiClient, { sanitizeRegex });
      const pipelineResult = await pipeline.process(content, {
        previewOnly: false,
        alreadyProcessed
      });

      const previewOnly = data.previewOnly || false;

      if (previewOnly) {
        return {
          ...pipelineResult,
          title,
          url
        };
      }

      const summary = pipelineResult.summary || 'Summary not available.';

      // 4. Format Markdown
      const timestamp = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      const markdown = `- ${timestamp} [${title}](${url})\n    - AI要約: ${summary}`;

      // 5. Save to Obsidian
      await this.obsidian.appendToDailyNote(markdown);
      addLog(LogType.INFO, 'Saved to Obsidian', { title, url });

      // 6. Update saved list
      if (!urlSet.has(url)) {
        urlSet.add(url);
        await setSavedUrls(urlSet);
      }

      // 7. Notification
      NotificationHelper.notifySuccess('Saved to Obsidian', `Saved: ${title}`);

      return { success: true };

    } catch (e) {
      addLog(LogType.ERROR, 'Failed to process recording', { error: e.message, url });
      NotificationHelper.notifyError(e.message);

      return { success: false, error: e.message };
    }
  }

  async recordWithPreview(data) {
    const result = await this.record({ ...data, previewOnly: true });
    return result;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/background/__tests__/recordingLogic.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/background/recordingLogic.js src/background/__tests__/recordingLogic.test.js
git commit -m "refactor: extract RecordingLogic class from service-worker"
```

---
## Task 4: Service Workerの簡素化

**Files:**
- Modify: `src/background/service-worker.js:1-269` (refactor to use new classes)

**Step 1: Update service-worker.js imports**

```javascript
// src/background/service-worker.js (lines 1-11)
import { ObsidianClient } from './obsidianClient.js';
import { AIClient } from './aiClient.js';
import { RecordingLogic } from './recordingLogic.js';
```

**Step 2: Simplify service-worker.js**

```javascript
// src/background/service-worker.js (replace lines 9-185)
const obsidian = new ObsidianClient();
const aiClient = new AIClient();
const recordingLogic = new RecordingLogic(obsidian, aiClient);

// Cache to store tab data including content and validation status
// Key: TabID, Value: { title, url, content, isValidVisit, timestamp }
const tabCache = new Map();

// Initialize cache with currently open tabs (basic info only)
chrome.tabs.query({}, (tabs) => {
  tabs.forEach(tab => {
    if (tab.url && tab.url.startsWith('http')) {
      tabCache.set(tab.id, {
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        lastUpdated: Date.now(),
        isValidVisit: false,
        content: null
      });
    }
  });
});

// Update cache on navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    tabCache.set(tabId, {
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      lastUpdated: Date.now(),
      isValidVisit: false,
      content: null
    });
  }
});

// Listen for messages from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  async function handleMessage() {
    // Automatic Visit Processing
    if (message.type === 'VALID_VISIT' && sender.tab) {
      const result = await recordingLogic.record({
        title: sender.tab.title,
        url: sender.tab.url,
        content: message.payload.content,
        skipDuplicateCheck: false
      });

      // Update cache
      tabCache.set(sender.tab.id, {
        ...tabCache.get(sender.tab.id),
        title: sender.tab.title,
        url: sender.tab.url,
        content: message.payload.content,
        isValidVisit: true
      });

      return result;
    }

    // Manual Record Processing & Preview
    if (message.type === 'MANUAL_RECORD' || message.type === 'PREVIEW_RECORD') {
      return await recordingLogic.record({
        title: message.payload.title,
        url: message.payload.url,
        content: message.payload.content,
        force: message.payload.force,
        skipDuplicateCheck: true,
        previewOnly: message.type === 'PREVIEW_RECORD'
      });
    }

    // Save Confirmed Record (Post-Preview)
    if (message.type === 'SAVE_RECORD') {
      return await recordingLogic.record({
        title: message.payload.title,
        url: message.payload.url,
        content: message.payload.content,
        skipDuplicateCheck: true,
        alreadyProcessed: true,
        force: message.payload.force
      });
    }

    return null;
  }

  handleMessage().then(sendResponse);
  return true;
});

// Handle Tab Closure - Cleanup
chrome.tabs.onRemoved.addListener((tabId) => {
  tabCache.delete(tabId);
});
```

**Step 3: Run tests to verify refactoring**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/background/service-worker.js
git commit -m "refactor: simplify service-worker using extracted classes"
```

---
## Task 5: Daily Note Path Builderの抽出

**Files:**
- Create: `src/utils/dailyNotePathBuilder.js`
- Modify: `src/background/obsidianClient.js:36-50` (remove path building logic)
- Test: `src/utils/__tests__/dailyNotePathBuilder.test.js`

**Step 1: Write the failing test for Daily Note Path Builder**

```javascript
// src/utils/__tests__/dailyNotePathBuilder.test.js
import { buildDailyNotePath } from '../dailyNotePathBuilder.js';

describe('buildDailyNotePath', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-04'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should build path with YYYY placeholders', () => {
    const result = buildDailyNotePath('notes/YYYY');
    expect(result).toBe('notes/2026');
  });

  it('should build path with YYYY-MM-DD format', () => {
    const result = buildDailyNotePath('092.Daily/YYYY-MM-DD');
    expect(result).toBe('092.Daily/2026-02-04');
  });

  it('should handle empty path', () => {
    const result = buildDailyNotePath('');
    expect(result).toBe('2026-02-04');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/dailyNotePathBuilder.test.js`
Expected: FAIL with "buildDailyNotePath is not defined"

**Step 3: Create dailyNotePathBuilder utility**

```javascript
// src/utils/dailyNotePathBuilder.js
export function buildDailyNotePath(pathRaw, date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (!pathRaw) return `${year}-${month}-${day}`;

  const today = `${year}-${month}-${day}`;

  return pathRaw
    .replace(/YYYY/g, year)
    .replace(/MM/g, month)
    .replace(/DD/g, day)
    .replace(/YYYY-MM-DD/g, today);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/__tests__/dailyNotePathBuilder.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/dailyNotePathBuilder.js src/utils/__tests__/dailyNotePathBuilder.test.js
git commit -m "refactor: extract buildDailyNotePath utility"
```

---
## Task 6: Note Section Editorの抽出

**Files:**
- Create: `src/background/noteSectionEditor.js`
- Modify: `src/background/obsidianClient.js:69-97` (remove section editing logic)
- Test: `src/background/__tests__/noteSectionEditor.test.js`

**Step 1: Write the failing test for Note Section Editor**

```javascript
// src/background/__tests__/noteSectionEditor.test.js
import { NoteSectionEditor } from '../noteSectionEditor.js';

describe('NoteSectionEditor', () => {
  describe('insertIntoSection', () => {
    it('should create new section when header does not exist', () => {
      const result = NoteSectionEditor.insertIntoSection(
        'Existing content\n',
        '# 🌐 ブラウザ閲覧履歴',
        'New entry'
      );

      expect(result).toContain('# 🌐 ブラウザ閲覧履歴');
      expect(result).toContain('New entry');
    });

    it('should insert content under existing section header', () => {
      const existing = '# 🌐 ブラウザ閲覧履歴\n- Old entry\n\n## Other Section';
      const result = NoteSectionEditor.insertIntoSection(
        existing,
        '# 🌐 ブラウザ閲覧履歴',
        '- New entry'
      );

      const lines = result.split('\n');
      const historyIndex = lines.findIndex(l => l.includes('ブラウザ閲覧履歴'));
      const newIndex = lines.findIndex(l => l === '- New entry');
      const otherIndex = lines.findIndex(l => l === '## Other Section');

      expect(historyIndex).toBeLessThan(newIndex);
      expect(newIndex).toBeLessThan(otherIndex);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/__tests__/noteSectionEditor.test.js`
Expected: FAIL with "NoteSectionEditor is not defined"

**Step 3: Create NoteSectionEditor class**

```javascript
// src/background/noteSectionEditor.js
export class NoteSectionEditor {
  static DEFAULT_SECTION_HEADER = '# 🌐 ブラウザ閲覧履歴';

  static insertIntoSection(existingContent, sectionHeader, newContent) {
    if (existingContent.includes(sectionHeader)) {
      return this._insertUnderExistingSection(existingContent, sectionHeader, newContent);
    } else {
      return this._createNewSection(existingContent, sectionHeader, newContent);
    }
  }

  static _insertUnderExistingSection(content, sectionHeader, newContent) {
    const lines = content.split('\n');
    const sectionIndex = lines.findIndex(line => line.trim() === sectionHeader);

    let insertIndex = sectionIndex + 1;
    for (let i = sectionIndex + 1; i < lines.length; i++) {
      if (lines[i].startsWith('# ')) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    lines.splice(insertIndex, 0, newContent);
    return lines.join('\n');
  }

  static _createNewSection(existingContent, sectionHeader, newContent) {
    let content = existingContent;
    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    return content + `\n${sectionHeader}\n${newContent}\n`;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/background/__tests__/noteSectionEditor.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/background/noteSectionEditor.js src/background/__tests__/noteSectionEditor.test.js
git commit -m "refactor: extract NoteSectionEditor class from ObsidianClient"
```

---
## Task 7: ObsidianClientの簡素化

**Files:**
- Modify: `src/background/obsidianClient.js:1-139` (refactor to use new utilities)

**Step 1: Update obsidianClient.js imports**

```javascript
// src/background/obsidianClient.js (lines 1-3)
import { getSettings, StorageKeys } from '../utils/storage.js';
import { buildDailyNotePath } from '../utils/dailyNotePathBuilder.js';
import { NoteSectionEditor } from './noteSectionEditor.js';
import { addLog, LogType } from '../utils/logger.js';
```

**Step 2: Simplify appendToDailyNote method**

```javascript
// src/background/obsidianClient.js (replace lines 30-119)
async appendToDailyNote(content) {
    await this.init();

    const settings = await getSettings();
    const dailyPathRaw = settings[StorageKeys.OBSIDIAN_DAILY_PATH] || '';

    const dailyPath = buildDailyNotePath(dailyPathRaw);
    const pathSegment = dailyPath ? `${dailyPath}/` : '';
    const targetUrl = `${this.baseUrl}/vault/${pathSegment}${buildDailyNotePath('')}.md`;

    try {
        const existingContent = await this._fetchExistingContent(targetUrl);
        const newContent = NoteSectionEditor.insertIntoSection(
            existingContent,
            NoteSectionEditor.DEFAULT_SECTION_HEADER,
            content
        );

        await this._writeContent(targetUrl, newContent);

    } catch (error) {
        throw this._handleError(error, targetUrl);
    }) // this is wrong, remove this comment later
}

async _fetchExistingContent(url) {
    const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
    });

    if (response.ok) {
        return await response.text();
    } else if (response.status === 404) {
        return '';
    } else {
        const errorText = await response.text();
        throw new Error(`Failed to read daily note: ${response.status} ${errorText}`);
    }
}

async _writeContent(url, content) {
    const response = await fetch(url, {
        method: 'PUT',
        headers: this.headers,
        body: content
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Obsidian API Error: ${response.status} ${errorText}`);
    }
}

_handleError(error, targetUrl) {
    let errorMessage = error.message;
    if (errorMessage.includes('Failed to fetch') && targetUrl.startsWith('https')) {
        errorMessage += ' (Self-signed certificate might not be trusted...)';
    }
    return new Error(`Failed to connect to Obsidian at ${targetUrl}. Cause: ${errorMessage}`);
}
```

**Step 3: Fix syntax error in Step 2**

```javascript
// src/background/obsidianClient.js - correct error handling
async appendToDailyNote(content) {
    await this.init();

    const settings = await getSettings();
    const dailyPathRaw = settings[StorageKeys.OBSIDIAN_DAILY_PATH] || '';

    const dailyPath = buildDailyNotePath(dailyPathRaw);
    const pathSegment = dailyPath ? `${dailyPath}/` : '';
    const targetUrl = `${this.baseUrl}/vault/${pathSegment}${buildDailyNotePath('')}.md`;

    try {
        const existingContent = await this._fetchExistingContent(targetUrl);
        const newContent = NoteSectionEditor.insertIntoSection(
            existingContent,
            NoteSectionEditor.DEFAULT_SECTION_HEADER,
            content
        );

        await this._writeContent(targetUrl, newContent);

    } catch (error) {
        throw this._handleError(error, targetUrl);
    }
}
```

**Step 4: Run tests to verify refactoring**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/background/obsidianClient.js
git commit -m "refactor: simplify ObsidianClient using extracted utilities"
```

---
## Task 8: Final Integration Test

**Files:**
- Create: `src/background/__tests__/integration-recording.test.js`
- Test: Verify the refactored code works end-to-end

**Step 1: Write integration test**

```javascript
// src/background/__tests__/integration-recording.test.js
import { RecordingLogic } from '../recordingLogic.js';

describe('Recording Integration Test', () => {
  let mockObsidian, mockAiClient, logic;

  beforeEach(() => {
    mockObsidian = {
      appendToDailyNote: jest.fn().mockResolvedValue()
    };

    mockAiClient = {
      getLocalAvailability: jest.fn().mockResolvedValue('readily'),
      summarizeLocally: jest.fn().mockResolvedValue({
        success: true,
        summary: 'Local summary'
      }),
      generateSummary: jest.fn().mockResolvedValue('Cloud summary')
    };

    logic = new RecordingLogic(mockObsidian, mockAiClient);
  });

  it('should successfully record a URL through full pipeline', async () => {
    jest.spyOn(chrome.storage.local, 'get').mockResolvedValue({
      [StorageKeys.PRIVACY_MODE]: 'full_pipeline',
      [StorageKeys.PII_SANITIZE_LOGS]: true
    });

    jest.spyOn(chrome.storage.local, 'get').mockResolvedValue(new Set());

    const result = await logic.record({
      url: 'https://example.com',
      title: 'Example',
      content: 'Test content'
    });

    expect(result.success).toBe(true);
    expect(mockObsidian.appendToDailyNote).toHaveBeenCalled();
  });
});
```

**Step 2: Run tests**

Run: `npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/background/__tests__/integration-recording.test.js
git commit -m "test: add integration test for refactored recording logic"
```

---
## Post-Refactoring Verification

After completing all tasks, verify:

1. All existing tests pass: `npm test`
2. Code is more maintainable:
   - Each class has a single responsibility
   - Functions are shorter and focused
   - Dependencies are clearly defined
3. No functionality was broken

---