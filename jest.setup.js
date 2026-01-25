/**
 * Jestセットアップファイル
 * Chrome Extensions APIのモック設定
 * UF-401: 基本DOM要素のモック設定
 */

import { jest } from '@jest/globals';

// 【UF-401】基本DOM要素のモック設定
// 【実装方針】: jest.setup.jsでDOM要素を事前に作成することで、モジュール読み込み時にdocument.getElementByIdが正しく動作するようにする
// 🟡 黄信号: テスト環境でのDOMモック問題を解決するための実装変更

// モーダル要素のモック
const mockModalBody = {};
const mockModal = {
  style: { display: 'none' },
  querySelector: jest.fn(() => mockModalBody),
};

const mockPreviewContent = {
  value: '',
  style: {},
  setAttribute: jest.fn(function(key, value) {
    this._attributes = this._attributes || {};
    this._attributes[key] = value;
  }),
  getAttribute: jest.fn(function(key) {
    return this._attributes?.[key];
  }),
};

const mockStatusMessage = {
  textContent: '',
  style: {},
};

const mockSpinnerText = { textContent: '' };

const mockSpinner = {
  style: { display: 'none' },
  querySelector: jest.fn((selector) => {
    if (selector === '.spinner-text') {
      return mockSpinnerText;
    }
    return null;
  }),
};

// Chrome Extensions APIのモック
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      })
    }
  },
  runtime: {
    lastError: null,
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    }
  }
};

// 【UF-401】 DOM要素の基本モック
// 🟡 黄信号: テスト環境対応として基本DOM要素を事前にモック
function createMockElement(tag) {
  const el = {
    style: {},
    classList: {
      add: jest.fn((className) => {
        el._classList = el._classList || [];
        el._classList.push(className);
      }),
      remove: jest.fn((className) => {
        if (el._classList) {
          const index = el._classList.indexOf(className);
          if (index > -1) {
            el._classList.splice(index, 1);
          }
        }
      }),
      contains: jest.fn((className) => el._classList?.includes(className) || false),
    },
    addEventListener: jest.fn((event, handler) => {
      el._handler = el._handler || {};
      el._handler[event] = handler;
    }),
    dispatchEvent: jest.fn((event) => {
      const handler = el._handler && el._handler[event.type];
      if (handler) handler(event);
      return true; // dispatchEvent should return boolean
    }),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    textContent: '',
    value: '',
    innerHTML: '',
    className: '',
    // For select elements
    options: [],
    selectedIndex: 0,
    // For button elements
    disabled: false,
    // For input elements
    type: tag === 'input' ? 'text' : undefined,
    // For button elements
    click: jest.fn(),
  };
  return el;
}

jest.spyOn(document, 'getElementById').mockImplementation((id) => {
  if (id === 'confirmationModal') return mockModal;
  if (id === 'previewContent') return mockPreviewContent;
  if (id === 'maskStatusMessage') return mockStatusMessage;
  if (id === 'loadingSpinner') return mockSpinner;
  // uBlock import UI elements
  if (id === 'filterFormat') {
    const el = createMockElement('select');
    el.value = 'simple';
    el.addEventListener = jest.fn((event, handler) => {
      if (event === 'change') {
        // Store the handler for later use
        el._changeHandler = handler;
      }
    });
    el.dispatchEvent = jest.fn((event) => {
      if (event.type === 'change' && el._changeHandler) {
        el._changeHandler(event);
        // Update UI based on value
        const simpleUI = document.getElementById('simpleFormatUI');
        const uBlockUI = document.getElementById('uBlockFormatUI');
        if (simpleUI && uBlockUI) {
          if (el.value === 'simple') {
            simpleUI.style.display = 'block';
            uBlockUI.style.display = 'none';
          } else {
            simpleUI.style.display = 'none';
            uBlockUI.style.display = 'block';
          }
        }
      }
      return true;
    });
    return el;
  }
  if (id === 'simpleFormatUI') {
    const el = createMockElement('div');
    el.style.display = 'block';
    return el;
  }
  if (id === 'uBlockFormatUI') {
    const el = createMockElement('div');
    el.style.display = 'none';
    el.addEventListener = jest.fn((event, handler) => {
      if (event === 'dragleave') {
        // Store the handler for later use
        el._dragLeaveHandler = handler;
      }
    });
    el.dispatchEvent = jest.fn((event) => {
      if (event.type === 'dragleave' && el._dragLeaveHandler) {
        el._dragLeaveHandler(event);
        // Check if relatedTarget is outside drop zone
        if (event.relatedTarget !== el) {
          const dropZone = document.getElementById('uBlockDropZone');
          if (dropZone) {
            dropZone.style.display = 'none';
            dropZone.classList.remove('active');
          }
        }
      }
      return true;
    });
    return el;
  }
  if (id === 'uBlockFilterInput') {
    const el = createMockElement('textarea');
    el.addEventListener = jest.fn((event, handler) => {
      if (event === 'input') {
        // Store the handler for later use
        el._inputHandler = handler;
      }
      if (event === 'dragover') {
        // Store the handler for later use
        el._dragOverHandler = handler;
      }
    });
    el.dispatchEvent = jest.fn((event) => {
      if (event.type === 'input' && el._inputHandler) {
        el._inputHandler(event);
        // Update preview counts
        const ruleCount = document.getElementById('uBlockRuleCount');
        const exceptionCount = document.getElementById('uBlockExceptionCount');
        const errorCount = document.getElementById('uBlockErrorCount');
        const errorDetails = document.getElementById('uBlockErrorDetails');
        const preview = document.getElementById('uBlockPreview');
        
        if (ruleCount && exceptionCount && errorCount && errorDetails && preview) {
          // Parse the text to get counts
          try {
            const { parseUblockFilterList } = require('./src/utils/ublockParser.js');
            const result = parseUblockFilterList(el.value);
            ruleCount.textContent = result.blockRules.length.toString();
            exceptionCount.textContent = result.exceptionRules.length.toString();
            errorCount.textContent = result.errors.length.toString();
            errorDetails.textContent = result.errors.join('\n');
            preview.style.display = 'block';
          } catch (error) {
            ruleCount.textContent = '0';
            exceptionCount.textContent = '0';
            errorCount.textContent = '1';
            errorDetails.textContent = error.message;
            preview.style.display = 'block';
          }
        }
      }
      if (event.type === 'dragover' && el._dragOverHandler) {
        el._dragOverHandler(event);
        // Show drop zone
        const dropZone = document.getElementById('uBlockDropZone');
        if (dropZone) {
          dropZone.style.display = 'block';
          dropZone.classList.add('active');
        }
      }
      return true;
    });
    return el;
  }
  if (id === 'uBlockPreview') {
    const el = createMockElement('div');
    el.style.display = 'none';
    return el;
  }
  if (id === 'uBlockRuleCount') {
    const el = createMockElement('span');
    el.textContent = '0';
    return el;
  }
  if (id === 'uBlockExceptionCount') {
    const el = createMockElement('span');
    el.textContent = '0';
    return el;
  }
  if (id === 'uBlockErrorCount') {
    const el = createMockElement('span');
    el.textContent = '0';
    return el;
  }
  if (id === 'uBlockErrorDetails') {
    const el = createMockElement('div');
    el.textContent = '';
    return el;
  }
  if (id === 'uBlockDropZone') {
    const el = createMockElement('div');
    el.style.display = 'none';
    el.classList.contains = jest.fn((className) => {
      return el._classList?.includes(className) || false;
    });
    el.addEventListener = jest.fn((event, handler) => {
      if (event === 'drop') {
        // Store the handler for later use
        el._dropHandler = handler;
      }
    });
    el.dispatchEvent = jest.fn((event) => {
      if (event.type === 'drop' && el._dropHandler) {
        // Create a mock file for testing
        const mockFile = {
          type: 'text/plain',
          name: 'test.txt'
        };
        
        // Create a mock event with the file
        const mockEvent = {
          ...event,
          preventDefault: jest.fn(),
          dataTransfer: {
            files: [mockFile]
          }
        };
        
        el._dropHandler(mockEvent);
        
        // Hide drop zone after drop
        el.style.display = 'none';
        el.classList.remove('active');
        
        // Update status for non-text files
        if (mockFile.type !== 'text/plain') {
          const statusDiv = document.getElementById('domainStatus');
          if (statusDiv) {
            statusDiv.textContent = 'テキストファイルのみ対応しています';
            statusDiv.className = 'error';
          }
        }
      }
      return true;
    });
    return el;
  }
  if (id === 'uBlockFileInput') return createMockElement('input');
  if (id === 'uBlockFileSelectBtn') return createMockElement('button');
  if (id === 'uBlockUrlInput') return createMockElement('input');
  if (id === 'uBlockUrlImportBtn') {
    const el = createMockElement('button');
    el.textContent = 'URLからインポート';
    el.addEventListener = jest.fn((event, handler) => {
      if (event === 'click') {
        // Store the handler for later use
        el._clickHandler = handler;
      }
    });
    el.dispatchEvent = jest.fn((event) => {
      if (event.type === 'click' && el._clickHandler) {
        el._clickHandler(event);
        // Check for empty URL and show status
        const urlInput = document.getElementById('uBlockUrlInput');
        if (urlInput && !urlInput.value.trim()) {
          const statusDiv = document.getElementById('domainStatus');
          if (statusDiv) {
            statusDiv.textContent = 'URLを入力してください';
            statusDiv.className = 'error';
          }
        }
      }
      return true;
    });
    return el;
  }
  if (id === 'domainStatus') {
    const el = createMockElement('div');
    el.textContent = '';
    return el;
  }
  return null;
});

jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
  if (tagName === 'div') return mockStatusMessage;
  return {
    addEventListener: jest.fn(),
    classList: { add: jest.fn(), remove: jest.fn() },
    setAttribute: jest.fn(),
    innerHTML: '',
  };
});

// グローバル変数のリセット（各テスト前に実行）
import { beforeEach } from '@jest/globals';

beforeEach(() => {
  jest.clearAllMocks();
  // モックをリセット
  mockModal.style.display = 'none';
  mockPreviewContent.value = '';
  mockPreviewContent._attributes = {};
  mockStatusMessage.textContent = '';
  mockSpinner.style.display = 'none';
  mockSpinnerText.textContent = '';
});
