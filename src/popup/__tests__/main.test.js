/**
 * main.test.js
 * Main Screen Functionality Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { loadCurrentTab, recordCurrentPage, getCurrentTab } from 'src/popup/main.js';
import { showPreview } from 'src/popup/sanitizePreview.js';
import { showSpinner, hideSpinner } from 'src/popup/spinner.js';
import { startAutoCloseTimer } from 'src/popup/autoClose.js';
import { isRecordable } from 'src/popup/tabUtils.js';
import { getSettings, StorageKeys } from 'src/utils/storage.js';

// Mock DOM elements
const mockFavicon = { src: '' };
const mockPageTitle = { textContent: 'Loading...' };
const mockPageUrl = { textContent: 'Loading...' };
const mockRecordBtn = { disabled: false, textContent: '📝 今すぐ記録' };
const mockMainStatus = { className: '', textContent: '' };

// Mock document.getElementById
global.document.getElementById = jest.fn((id) => {
  switch (id) {
    case 'favicon': return mockFavicon;
    case 'pageTitle': return mockPageTitle;
    case 'pageUrl': return mockPageUrl;
    case 'recordBtn': return mockRecordBtn;
    case 'mainStatus': return mockMainStatus;
    default: return null;
  }
});

// Mock all dependencies
jest.mock('src/popup/sanitizePreview.js', () => ({
  showPreview: jest.fn()
}));

jest.mock('src/popup/spinner.js', () => ({
  showSpinner: jest.fn(),
  hideSpinner: jest.fn()
}));

jest.mock('src/popup/autoClose.js', () => ({
  startAutoCloseTimer: jest.fn()
}));

jest.mock('src/popup/tabUtils.js', () => ({
  getCurrentTab: jest.fn(() => Promise.resolve(null)),
  isRecordable: jest.fn(() => true)
}));

jest.mock('src/utils/storage.js', () => ({
  getSettings: jest.fn(() => Promise.resolve({})),
  StorageKeys: {
    PII_CONFIRMATION_UI: 'pii_confirmation_ui'
  }
}));

// Mock chrome API
const mockChrome = {
  tabs: {
    sendMessage: jest.fn()
  },
  runtime: {
    sendMessage: jest.fn()
  }
};

global.chrome = mockChrome;

describe('main', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="mainScreen">
        <img id="favicon" src="" alt="Favicon">
        <h2 id="pageTitle">Loading...</h2>
        <p id="pageUrl">Loading...</p>
        <button id="recordBtn">📝 今すぐ記録</button>
        <div id="mainStatus"></div>
      </div>
    `;
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('loadCurrentTab', () => {
    it('should load current tab information', async () => {
      // Mock tab data
      const mockTab = {
        favIconUrl: 'https://example.com/favicon.ico',
        title: 'Example Page',
        url: 'https://example.com'
      };
      
      getCurrentTab.mockResolvedValue(mockTab);
      isRecordable.mockReturnValue(true);
      
      await loadCurrentTab();
      
      // Check if DOM elements are updated
      const favicon = document.getElementById('favicon');
      const pageTitle = document.getElementById('pageTitle');
      const pageUrl = document.getElementById('pageUrl');
      const recordBtn = document.getElementById('recordBtn');
      
      expect(favicon.src).toBe('https://example.com/favicon.ico');
      expect(pageTitle.textContent).toBe('Example Page');
      expect(pageUrl.textContent).toBe('https://example.com');
      expect(recordBtn.disabled).toBe(false);
      expect(recordBtn.textContent).toBe('📝 今すぐ記録');
    });

    it('should handle recordable page correctly', async () => {
      // Mock tab data
      const mockTab = {
        favIconUrl: '',
        title: 'Non-recordable Page',
        url: 'chrome://extensions'
      };
      
      getCurrentTab.mockImplementation(() => Promise.resolve(mockTab));
      isRecordable.mockReturnValue(false);
      
      await loadCurrentTab();
      
      // Check if record button is disabled
      const recordBtn = document.getElementById('recordBtn');
      expect(recordBtn.disabled).toBe(true);
      expect(recordBtn.textContent).toBe('記録できないページです');
    });

    it('should handle null tab', async () => {
      // Mock null tab
      getCurrentTab.mockImplementation(() => Promise.resolve(null));
      
      await loadCurrentTab();
      
      // Should not throw error and should not update DOM
      const pageTitle = document.getElementById('pageTitle');
      expect(pageTitle.textContent).toBe('Loading...');
    });
  });

  describe('recordCurrentPage', () => {
    it('should handle non-recordable page', async () => {
      // Mock tab data
      const mockTab = {
        url: 'chrome://extensions'
      };
      
      getCurrentTab.mockImplementation(() => Promise.resolve(mockTab));
      isRecordable.mockReturnValue(false);
      
      // Mock DOM elements
      const statusDiv = document.getElementById('mainStatus');
      
      await recordCurrentPage();
      
      // Check if error message is displayed
      expect(statusDiv.className).toBe('error');
      expect(statusDiv.textContent).toBe('記録できないページです');
    });

    it('should handle connection error', async () => {
      // Mock tab data
      const mockTab = {
        id: 1,
        title: 'Example Page',
        url: 'https://example.com'
      };
      
      getCurrentTab.mockImplementation(() => Promise.resolve(mockTab));
      isRecordable.mockReturnValue(true);
      getSettings.mockImplementation(() => Promise.resolve({ [StorageKeys.PII_CONFIRMATION_UI]: true }));
      
      // Mock chrome API to throw error
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Receiving end does not exist'));
      
      // Mock DOM elements
      const statusDiv = document.getElementById('mainStatus');
      
      await recordCurrentPage();
      
      // Check if error message is displayed
      expect(statusDiv.className).toBe('error');
      expect(statusDiv.textContent).toBe('✗ エラー: ページを再読み込みしてから再度お試しください');
    });

    it('should handle domain blocked error with force record', async () => {
      // Mock tab data
      const mockTab = {
        id: 1,
        title: 'Blocked Page',
        url: 'https://blocked.com'
      };
      
      getCurrentTab.mockImplementation(() => Promise.resolve(mockTab));
      isRecordable.mockReturnValue(true);
      getSettings.mockImplementation(() => Promise.resolve({ [StorageKeys.PII_CONFIRMATION_UI]: true }));
      
      // Mock chrome API to return domain blocked error
      mockChrome.tabs.sendMessage.mockResolvedValue({ content: 'Page content' });
      mockChrome.runtime.sendMessage.mockResolvedValue({ 
        success: false, 
        error: 'このドメインは記録が許可されていません' 
      });
      
      // Mock DOM elements
      const statusDiv = document.getElementById('mainStatus');
      
      await recordCurrentPage();
      
      // Check if force record button is displayed
      expect(statusDiv.textContent).toBe('このドメインは記録が許可されていませんが特別に記録しますか？');
      expect(statusDiv.querySelector('button')).toBeTruthy();
    });

    it('should successfully record page with preview', async () => {
      // Mock tab data
      const mockTab = {
        id: 1,
        title: 'Example Page',
        url: 'https://example.com'
      };
      
      getCurrentTab.mockResolvedValue(mockTab);
      isRecordable.mockReturnValue(true);
      getSettings.mockImplementation(() => Promise.resolve({ [StorageKeys.PII_CONFIRMATION_UI]: true }));
      
      // Mock chrome API responses
      mockChrome.tabs.sendMessage.mockResolvedValue({ content: 'Page content' });
      mockChrome.runtime.sendMessage
        .mockResolvedValueOnce({ 
          success: true, 
          mode: 'masked_cloud',
          maskedCount: 1,
          processedContent: '[MASKED:email]@example.com' 
        })
        .mockResolvedValueOnce({ success: true });
      
      // Mock showPreview to confirm
      showPreview.mockResolvedValue({ confirmed: true, content: '[MASKED:email]@example.com' });
      
      // Mock DOM elements
      const statusDiv = document.getElementById('mainStatus');
      
      await recordCurrentPage();
      
      // Check if success message is displayed
      expect(statusDiv.className).toBe('success');
      expect(statusDiv.textContent).toBe('✓ Obsidianに保存しました');
      expect(startAutoCloseTimer).toHaveBeenCalled();
    });

    it('should successfully record page without preview', async () => {
      // Mock tab data
      const mockTab = {
        id: 1,
        title: 'Example Page',
        url: 'https://example.com'
      };
      
      getCurrentTab.mockResolvedValue(mockTab);
      isRecordable.mockReturnValue(true);
      getSettings.mockImplementation(() => Promise.resolve({ [StorageKeys.PII_CONFIRMATION_UI]: false }));
      
      // Mock chrome API responses
      mockChrome.tabs.sendMessage.mockResolvedValue({ content: 'Page content' });
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
      
      // Mock DOM elements
      const statusDiv = document.getElementById('mainStatus');
      
      await recordCurrentPage();
      
      // Check if success message is displayed
      expect(statusDiv.className).toBe('success');
      expect(statusDiv.textContent).toBe('✓ Obsidianに保存しました');
      expect(startAutoCloseTimer).toHaveBeenCalled();
    });

    it('should handle preview cancellation', async () => {
      // Mock tab data
      const mockTab = {
        id: 1,
        title: 'Example Page',
        url: 'https://example.com'
      };
      
      getCurrentTab.mockResolvedValue(mockTab);
      isRecordable.mockReturnValue(true);
      getSettings.mockResolvedValue({ [StorageKeys.PII_CONFIRMATION_UI]: true });
      
      // Mock chrome API responses
      mockChrome.tabs.sendMessage.mockResolvedValue({ content: 'Page content' });
      mockChrome.runtime.sendMessage.mockResolvedValue({ 
        success: true, 
        mode: 'masked_cloud',
        maskedCount: 1,
        processedContent: '[MASKED:email]@example.com' 
      });
      
      // Mock showPreview to cancel
      showPreview.mockResolvedValue({ confirmed: false, content: null });
      
      // Mock DOM elements
      const statusDiv = document.getElementById('mainStatus');
      
      await recordCurrentPage();
      
      // Check if cancellation message is displayed
      expect(statusDiv.textContent).toBe('キャンセルしました');
    });
  });
});