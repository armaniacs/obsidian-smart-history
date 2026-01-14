import { ObsidianClient } from './obsidianClient.js';
import { GeminiClient } from './gemini.js';
import { getSettings, StorageKeys } from '../utils/storage.js';

const obsidian = new ObsidianClient();
const gemini = new GeminiClient();

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

      // Check if this URL has already been saved
      const url = sender.tab.url;
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
        if (apiKey && message.payload.content) {
          console.log(`Generating AI Summary using ${modelName}...`);
          summary = await gemini.generateSummary(message.payload.content, apiKey, modelName);
        } else if (!apiKey) {
          console.warn("Gemini API Key is missing in settings.");
          summary = "No Gemini API Key configured.";
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
          iconUrl: '../icons/icon128.png',
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
          iconUrl: '../icons/icon128.png',
          title: 'Obsidian Sync Failed',
          message: `Error: ${e.message}`
        });

        // Send error response
        sendResponse({ success: false, error: e.message });
      }
    })();

    return true; // Keep the message channel open for async response
  }
});

// Handle Tab Closure - Cleanup only
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabCache.has(tabId)) {
    tabCache.delete(tabId);
  }
});
