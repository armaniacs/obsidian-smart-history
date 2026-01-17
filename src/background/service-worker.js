import { ObsidianClient } from './obsidianClient.js';
import { AIClient } from './aiClient.js';
import { getSettings, StorageKeys } from '../utils/storage.js';
import { isDomainAllowed } from '../utils/domainUtils.js';

const obsidian = new ObsidianClient();
const aiClient = new AIClient();

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

// Listen for messages from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

      console.log(`Tab ${tabId} marked as VALID visit. Processing immediately...`);

      // Check domain filter
      const url = sender.tab.url;
      const isAllowed = await isDomainAllowed(url);
      
      if (!isAllowed) {
        console.log(`URL blocked by domain filter: ${url}`);
        return;
      }

      // Check if this URL has already been saved
      const savedUrls = await chrome.storage.local.get('savedUrls');
      const urlSet = new Set(savedUrls.savedUrls || []);

      if (urlSet.has(url)) {
        console.log(`URL already saved, skipping: ${url}`);
        return;
      }

      // Trigger AI Summary immediately
      try {
        const settings = await getSettings();
        const apiKey = settings[StorageKeys.GEMINI_API_KEY];
        const modelName = settings[StorageKeys.GEMINI_MODEL] || 'gemini-1.5-flash';

        let summary = "Summary not available.";
        if (message.payload.content) {
          console.log(`Generating AI Summary...`);
          summary = await aiClient.generateSummary(message.payload.content);
        }

        // Format the entry
        const timestamp = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        const markdown = `- ${timestamp} [${sender.tab.title}](${sender.tab.url})\n    - AI要約: ${summary}`;

        await obsidian.appendToDailyNote(markdown);
        console.log("Saved to Obsidian successfully.");

        // Add URL to saved list
        urlSet.add(url);
        await chrome.storage.local.set({ savedUrls: Array.from(urlSet) });
        console.log(`URL added to saved list: ${url}`);

        // Success Notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          title: 'Saved to Obsidian',
          message: `Saved: ${sender.tab.title}`
        });

        // Send success response
        sendResponse({ success: true });

      } catch (e) {
        console.error("Failed to sync to Obsidian", e);

        // Error Notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          title: 'Obsidian Sync Failed',
          message: `Error: ${e.message}`
        });

        // Send error response
        sendResponse({ success: false, error: e.message });
      }
    })();

    return true; // Keep the message channel open for async response
  }
  
  // 手動記録処理（重複チェックなし）
  if (message.type === 'MANUAL_RECORD') {
    (async () => {
      try {
        const { title, url, content } = message.payload;

        console.log(`Manual record requested: ${url}`);

        // Check domain filter
        const isAllowed = await isDomainAllowed(url);
        const isForce = message.payload.force === true;
        
        if (!isAllowed && !isForce) {
          console.log(`Manual record blocked by domain filter: ${url}`);
          sendResponse({ success: false, error: 'このドメインは記録が許可されていません' });
          return;
        }

        if (isForce) {
             console.log(`Manual record forced for blocked domain: ${url}`);
        }

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
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          title: 'Saved to Obsidian',
          message: `手動記録: ${title}`
        });

        sendResponse({ success: true });
      } catch (e) {
        console.error('Failed to save manual record', e);

        // エラー通知
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          title: 'Obsidian Sync Failed',
          message: `Error: ${e.message}`
        });

        sendResponse({ success: false, error: e.message });
      }
    })();

    return true; // 非同期レスポンス
  }
});

// Handle Tab Closure - Cleanup only
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabCache.has(tabId)) {
    tabCache.delete(tabId);
  }
});
