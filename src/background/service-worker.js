import { ObsidianClient } from './obsidianClient.js';
import { AIClient } from './aiClient.js';
import { LocalAIClient } from './localAiClient.js';
import { sanitizeRegex } from '../utils/piiSanitizer.js';
import { getSettings, StorageKeys } from '../utils/storage.js';
import { isDomainAllowed } from '../utils/domainUtils.js';
import { addLog, LogType } from '../utils/logger.js';

const obsidian = new ObsidianClient();
const aiClient = new AIClient();
const localAiClient = new LocalAIClient();

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
        isValidVisit: false, // Default to false until proven valid
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
      isValidVisit: false, // Reset validity on new page load
      content: null
    });
  }
});

// Core recording logic
async function processUrlRecording(data) {
  /* original line 48 */ const { title, url, content, force = false, skipDuplicateCheck = false, alreadyProcessed = false } = data; // alreadyProcessed added

  try {
    // 1. Check domain filter
    const isAllowed = await isDomainAllowed(url);

    if (!isAllowed && !force) {
      return { success: false, error: 'このドメインは記録が許可されていません' };
    }

    if (!isAllowed && force) {
      addLog(LogType.WARN, 'Force recording blocked domain', { url });
    }

    // 2. Check for details
    const settings = await getSettings(); // Load settings
    const savedUrls = await chrome.storage.local.get('savedUrls');
    const urlSet = new Set(savedUrls.savedUrls || []);

    if (!skipDuplicateCheck && urlSet.has(url)) {
      return { success: true, skipped: true };
    }

    // 3. Privacy Pipeline Processing
    let summary = "Summary not available.";
    if (content) {
      const mode = settings[StorageKeys.PRIVACY_MODE] || 'full_pipeline';
      const previewOnly = data.previewOnly || false;
      const sanitizedSettings = {
        mode,
        useLocalAi: (mode === 'local_only' || mode === 'full_pipeline') && !alreadyProcessed,
        useMasking: (mode === 'full_pipeline' || mode === 'masked_cloud') && !alreadyProcessed,
        useCloudAi: mode !== 'local_only'
      };

      let processingText = content;
      let maskedCount = 0;

      // L1: Local Summarization (縮約)
      if (sanitizedSettings.useLocalAi) {
        // LocalAIが利用可能な場合、それで要約（あるいは前処理）
        const localStatus = await localAiClient.getAvailability();
        if (localStatus === 'readily' || mode === 'local_only') {
          const localResult = await localAiClient.summarize(content);
          if (localResult.success) {
            processingText = localResult.summary;
            // Local Onlyならここで完了
            if (mode === 'local_only') {
              summary = localResult.summary;
            }
          }else {
            if (mode === 'local_only') {
              summary = `Summary not available. (Error: ${localResult.error})`;
            }
          }
        }
      }

      // L2: PII Masking
      if (sanitizedSettings.useMasking) {
        const sanitizeResult = sanitizeRegex(processingText);
        processingText = sanitizeResult.text;
        maskedCount = sanitizeResult.maskedItems.length;

        // Logging
        if (settings[StorageKeys.PII_SANITIZE_LOGS] !== false) {
          const count = sanitizeResult.maskedItems.length;
          if (count > 0) {
            addLog(LogType.SANITIZE, `Masked ${count} PII items`, {
              url: url,
              mode: mode,
              items: sanitizeResult.maskedItems.map(i => i.type) // Log types only
            });
          }
        }
      }

      // Preview Mode Branch
      if (previewOnly) {
        return {
          success: true,
          preview: true,
          title,
          url,
          processedContent: processingText,
          mode,
          maskedCount
        };
      }

      // L3: Cloud Summarization
      // Local Only以外で、Cloud AIを使用する場合
      if (sanitizedSettings.useCloudAi) {
        // Cloud AIには「要約してください」と投げる
        // すでにLocal AIで要約済みの場合は「さらに洗練させて」等のプロンプト調整が必要だが
        // 現状は単純に投げる
        summary = await aiClient.generateSummary(processingText);
      }
    }

    // 4. Format Markdown
    const timestamp = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const markdown = `- ${timestamp} [${title}](${url})\n    - AI要約: ${summary}`;

    // 5. Save to Obsidian
    await obsidian.appendToDailyNote(markdown);
    addLog(LogType.INFO, 'Saved to Obsidian', { title, url });

    // 6. Update saved list
    if (!urlSet.has(url)) {
      urlSet.add(url);
      await chrome.storage.local.set({ savedUrls: Array.from(urlSet) });
    }

    // 7. Notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      title: 'Saved to Obsidian',
      message: `Saved: ${title}`
    });

    return { success: true };

  } catch (e) {
    addLog(LogType.ERROR, 'Failed to process recording', { error: e.message, url });

    // Error Notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      title: 'Obsidian Sync Failed',
      message: `Error: ${e.message}`
    });

    return { success: false, error: e.message };
  }
}

// Listen for messages from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Automatic Visit Processing
  if (message.type === 'VALID_VISIT' && sender.tab) {
    (async () => {
      const tabId = sender.tab.id;
      const currentData = tabCache.get(tabId) || {};

      // Update cache
      tabCache.set(tabId, {
        ...currentData,
        title: sender.tab.title,
        url: sender.tab.url,
        content: message.payload.content,
        isValidVisit: true
      });

      // Call shared logic
      const result = await processUrlRecording({
        title: sender.tab.title,
        url: sender.tab.url,
        content: message.payload.content,
        skipDuplicateCheck: false // Auto record checks duplicates
      });

      sendResponse(result);
    })();

    return true; // Keep channel open
  }

  // Manual Record Processing & Preview
  if (message.type === 'MANUAL_RECORD' || message.type === 'PREVIEW_RECORD') {
    (async () => {
      const result = await processUrlRecording({
        title: message.payload.title,
        url: message.payload.url,
        content: message.payload.content,
        force: message.payload.force,
        skipDuplicateCheck: true, // Manual record generally skips duplicate check
        previewOnly: message.type === 'PREVIEW_RECORD'
      });

      sendResponse(result);
    })();

    return true; // Keep channel open
  }

  // Save Confirmed Record (Post-Preview)
  if (message.type === 'SAVE_RECORD') {
    (async () => {
      // 既に加工済みのテキストが来る前提
      // ただし、processUrlRecordingを再利用するため、少し工夫が必要
      // ここではシンプルに、"Local Only" modeとして擬似的に振る舞い、
      // L3 (Cloud) 呼び出しは processUrlRecording の中で制御させるか、
      // あるいは processUrlRecording に 'bypassPreprocessing' フラグを渡すのが良い

      // 今回の修正で、processUrlRecording内では content があれば AI処理が走るようになっている。
      // ユーザーが編集した後のテキストを "content" として渡し、
      // さらに "alreadyProcessed: true" のようなフラグを渡して、L1/L2をスキップさせるのがスマート。

      const result = await processUrlRecording({
        title: message.payload.title,
        url: message.payload.url,
        content: message.payload.content, // This is the edited/processed content
        skipDuplicateCheck: true,
        alreadyProcessed: true,
        force: message.payload.force
      });
      sendResponse(result);
    })();
    return true;
  }
});

// Handle Tab Closure - Cleanup only
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabCache.has(tabId)) {
    tabCache.delete(tabId);
  }
});
