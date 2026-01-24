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
jest.spyOn(document, 'getElementById').mockImplementation((id) => {
  if (id === 'confirmationModal') return mockModal;
  if (id === 'previewContent') return mockPreviewContent;
  if (id === 'maskStatusMessage') return mockStatusMessage;
  if (id === 'loadingSpinner') return mockSpinner;
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
