/**
 * Jestセットアップファイル
 * Chrome Extensions APIのモック設定
 * jsdom環境を利用したテスト設定
 */

// jestをグローバル変数として定義
global.jest = global.jest || {};

// viをグローバル変数として定義
global.vi = global.jest;

// documentはjsdomが提供するため上書きしない
// jsdomにより基本的なDOM操作（getElementById, createElement, querySelector等）が利用可能

// 【改善】：global.documentの上書きを削除しjsdomの機能を活用
// 🟢 信頼性レベル: jest.config.cjsでtestEnvironment: 'jsdom'が設定されているため、
// jsdomによる完全なDOM環境が提供される。手動モックを削除することで、
// DOMの操作（appendChild, remove, classList等）が正しく動作するようになる。

// Chrome Extensions APIのモック（jsdomが提供しないもののみ）
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
    sendMessage: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    }
  }
};

// 【簡略化】：getElementByIdの複雑なモックを削除
// 🟡 黄信号: これは既存テストとの互換性を保つための暫定対策
// 将来的には各テストファイルでbeforeEachで必要な要素を作成する方式へ移行推奨
//
// 【移行計画】:
// 1. uBlock関連の要素モックは、ublockImport.test.js等でbeforeEachで動的に作成
// 2. domainFilter関連の要素モックは、domainFilter.test.jsでbeforeEachで動的に作成
// 3. 共通要素（modal, spinnerなど）は、共通beforeEachフックを作成

// グローバル変数のリセット（各テスト前に実行）
beforeEach(() => {
  jest.clearAllMocks();
  // Chrome APIの状態をリセット
  global.chrome.runtime.lastError = null;
});

// テスト終了後のクリーンアップ
afterEach(() => {
  // DOMの状態をリセット（jsdomのdomNodesプロパティをクリア）
  document.body.innerHTML = '';
});