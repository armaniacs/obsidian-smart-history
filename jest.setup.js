/**
 * Jestセットアップファイル
 * Chrome Extensions APIのモック設定
 */

import { jest } from '@jest/globals';

// Chrome Extensions APIのモック
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        // デフォルトの空オブジェクトを返す
        if (callback) {
          callback({});
        }
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) {
          callback();
        }
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

// グローバル変数のリセット（各テスト前に実行）
import { beforeEach } from '@jest/globals';

beforeEach(() => {
  jest.clearAllMocks();
});
