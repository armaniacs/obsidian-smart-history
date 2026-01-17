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

// Core recording logic
async function processUrlRecording(data) {
  const { title, url, content, force = false, skipDuplicateCheck = false } = data;

  try {
    // 1. Check domain filter
    const isAllowed = await isDomainAllowed(url);

    if (!isAllowed && !force) {
      console.log(`Blocked by domain filter: ${url}`);
      return { success: false, error: 'このドメインは記録が許可されていません' };
    }

    if (!isAllowed && force) {
      console.log(`Force recording for blocked domain: ${url}`);
    }

    // 2. Check for details
    const savedUrls = await chrome.storage.local.get('savedUrls');
    const urlSet = new Set(savedUrls.savedUrls || []);

    if (!skipDuplicateCheck && urlSet.has(url)) {
      console.log(`URL already saved, skipping: ${url}`);
      return { success: true, skipped: true };
    }

    // 3. Generate AI Summary
    let summary = "Summary not available.";
    if (content) {
      console.log(`Generating AI Summary...`);
      // Re-use aiClient instance
      summary = await aiClient.generateSummary(content);
    }

    // 4. Format Markdown
    const timestamp = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const markdown = `- ${timestamp} [${title}](${url})\n    - AI要約: ${summary}`;

    // 5. Save to Obsidian
    await obsidian.appendToDailyNote(markdown);
    console.log("Saved to Obsidian successfully.");

    // 6. Update saved list
    if (!urlSet.has(url)) {
      urlSet.add(url);
      await chrome.storage.local.set({ savedUrls: Array.from(urlSet) });
      console.log(`URL added to saved list: ${url}`);
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
    console.error("Failed to process recording", e);

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

      console.log(`Tab ${tabId} marked as VALID visit. Processing...`);

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

  // Manual Record Processing
  if (message.type === 'MANUAL_RECORD') {
    (async () => {
      console.log(`Manual record requested: ${message.payload.url}`);

      const result = await processUrlRecording({
        title: message.payload.title,
        url: message.payload.url,
        content: message.payload.content,
        force: message.payload.force,
        skipDuplicateCheck: true // Manual record generally skips duplicate check
      });

      sendResponse(result);
    })();

    return true; // Keep channel open
  }
});

// Handle Tab Closure - Cleanup only
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabCache.has(tabId)) {
    tabCache.delete(tabId);
  }
});
