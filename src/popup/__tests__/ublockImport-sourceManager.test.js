/**
 * ublockImport-sourceManager.test.js
 * uBlock Import - SourceManagerモジュールのユニットテスト
 */

import { StorageKeys } from '../../utils/storage.js';
import {
  loadAndDisplaySources,
  deleteSource,
  reloadSource,
  saveUblockSettings
} from '../ublockImport/sourceManager.js';

// ==============================================================================
// テスト共通ヘルパー
// ==============================================================================

/**
 * ストレージを初期化するヘルパー関数
 * jest.setup.jsのmock実装をオーバーライドする
 */
function initializeStorage() {
  // jest.fnの実装をオーバーライドして、テスト用のストレージを使用する
  global.chrome.storage.local.get.mockImplementation((keys, callback) => {
    if (callback) callback(testStorage);
    return Promise.resolve(testStorage);
  });
  global.chrome.storage.local.set.mockImplementation((data, callback) => {
    Object.assign(testStorage, data);
    if (callback) callback();
    return Promise.resolve();
  });
}

// テスト用ストレージ（各テストでリセットされる）
let testStorage = {
  ublock_sources: [],
  ublock_rules: {},
  ublock_format_enabled: false
};

// ==============================================================================

describe('ublockImport - SourceManager Module', () => {
  beforeEach(() => {
    // 各テストの前にストレージをリセットして、mock実装を初期化
    testStorage = {
      ublock_sources: [],
      ublock_rules: {},
      ublock_format_enabled: false
    };
    initializeStorage();
  });

  afterEach(() => {
    // テスト後にmockの実装をリセット（コール履歴など）
    // jest.clearAllMocks()はjest.setup.jsのbeforeEachで呼ばれる
  });

  // ========================================================================
  // loadAndDisplaySources
  // ========================================================================

  describe('loadAndDisplaySources', () => {
    test('ソースを読み込んで表示コールバックを呼ぶ', async () => {
      const renderCallback = jest.fn();

      await loadAndDisplaySources(renderCallback);

      expect(renderCallback).toHaveBeenCalled();
    });

    test('renderCallbackがない場合は表示しない', async () => {
      await loadAndDisplaySources();
      // エラーを投げないことを確認
      expect(true).toBe(true);
    });
  });

  // ========================================================================
  // deleteSource
  // ========================================================================

  describe('deleteSource', () => {
    test('指定したインデックスのソースを削除', async () => {
      testStorage[StorageKeys.UBLOCK_SOURCES] = [
        { url: 'https://example.com/filters1.txt', ruleCount: 2, blockDomains: ['example.com'], exceptionDomains: [] },
        { url: 'https://example.com/filters2.txt', ruleCount: 1, blockDomains: ['test.com'], exceptionDomains: [] }
      ];

      const renderCallback = jest.fn();
      await deleteSource(0, renderCallback);

      expect(renderCallback).toHaveBeenCalled();
      expect(testStorage[StorageKeys.UBLOCK_SOURCES]).toHaveLength(1);
      expect(testStorage[StorageKeys.UBLOCK_SOURCES][0].url).toBe('https://example.com/filters2.txt');
    });

    test('無効なインデックスでは何もしない', async () => {
      testStorage[StorageKeys.UBLOCK_SOURCES] = [];

      const renderCallback = jest.fn();
      await deleteSource(-1, renderCallback);

      expect(true).toBe(true); // 何も投げないことを確認
    });
  });

  // ========================================================================
  // reloadSource
  // ========================================================================

  describe('reloadSource', () => {
    test('ソースを再読み込みして更新', async () => {
      testStorage[StorageKeys.UBLOCK_SOURCES] = [
        { url: 'https://example.com/filters.txt', ruleCount: 2, blockDomains: ['example.com'], exceptionDomains: [] }
      ];

      const fetchFromUrlCallback = jest.fn().mockResolvedValue(`||example.com^
||newdomain.com^`);

      const result = await reloadSource(0, fetchFromUrlCallback);

      expect(fetchFromUrlCallback).toHaveBeenCalledWith('https://example.com/filters.txt');
      expect(result.sources).toHaveLength(1);
      expect(result.ruleCount).toBeGreaterThan(0);
    });

    test('無効なインデックスではエラーを投げる', async () => {
      testStorage[StorageKeys.UBLOCK_SOURCES] = [];

      const fetchFromUrlCallback = jest.fn();

      await expect(reloadSource(100, fetchFromUrlCallback)).rejects.toThrow('無効なインデックス');
    });

    test('手動入力のソースの再読み込みはエラー', async () => {
      testStorage[StorageKeys.UBLOCK_SOURCES] = [
        { url: 'manual', ruleCount: 1, blockDomains: ['test.com'], exceptionDomains: [] }
      ];

      const fetchFromUrlCallback = jest.fn();

      await expect(reloadSource(0, fetchFromUrlCallback)).rejects.toThrow('手動入力のソースは更新できません');
    });

    test('パースエラーがある場合はエラーを投げる', async () => {
      testStorage[StorageKeys.UBLOCK_SOURCES] = [
        { url: 'https://example.com/filters.txt', ruleCount: 2, blockDomains: ['example.com'], exceptionDomains: [] }
      ];

      const fetchFromUrlCallback = jest.fn().mockResolvedValue('invalid line without caret');

      await expect(reloadSource(0, fetchFromUrlCallback)).rejects.toThrow('エラーが見つかりました');
    });

    test('パース結果にルールがない場合はエラーを投げる', async () => {
      testStorage[StorageKeys.UBLOCK_SOURCES] = [
        { url: 'https://example.com/filters.txt', ruleCount: 2, blockDomains: ['example.com'], exceptionDomains: [] }
      ];

      // 空または無効なフィルターテキストを返す
      const fetchFromUrlCallback = jest.fn().mockResolvedValue('');

      await expect(reloadSource(0, fetchFromUrlCallback)).rejects.toThrow('有効なルールが見つかりませんでした');
    });
  });

  // ========================================================================
  // saveUblockSettings
  // ========================================================================

  describe('saveUblockSettings', () => {
    test('有効なフィルターテキストを保存', async () => {
      const filterText = `||example.com^
||test.com^`;

      const result = await saveUblockSettings(filterText);

      expect(result.action).toBe('追加');
      expect(result.ruleCount).toBe(2);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].url).toBe('manual');
      expect(result.sources[0].blockDomains).toContain('example.com');
    });

    test('URL指定の場合はURLが保存される', async () => {
      const filterText = '||example.com^';
      const url = 'https://example.com/filters.txt';

      const result = await saveUblockSettings(filterText, url);

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].url).toBe('https://example.com/filters.txt');
    });

    test('パースエラーがある場合はエラーを投げる', async () => {
      const filterText = 'invalid line without caret';

      await expect(saveUblockSettings(filterText)).rejects.toThrow(/エラーが見つかりました/);
    });

    test('有効なルールがない場合はエラーを投げる', async () => {
      // 空文字列は入力バリデーションで早期リターン
      const filterText = '';

      await expect(saveUblockSettings(filterText)).rejects.toThrow('有効なルールが見つかりませんでした');
    });

    test('パース後のルールが0の場合はエラーを投げる', async () => {
      // コメントのみのフィルターテキスト - 有効な文字列だがルールは0
      const filterText = '! This is a comment\n! Another comment';

      await expect(saveUblockSettings(filterText)).rejects.toThrow('有効なルールが見つかりませんでした');
    });

    test('大量のルールを正しく保存', async () => {
      const largeFilterText = Array(1000).fill(0).map((_, i) => `||domain${i}.com^`).join('\n');

      const result = await saveUblockSettings(largeFilterText);

      expect(result.ruleCount).toBe(1000);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].url).toBe('manual');
    });

    test('既存のURLを指定した場合はソースを更新（追加しない）', async () => {
      const url = 'https://example.com/filters.txt';

      // 最初の保存
      await saveUblockSettings('||example.com^', url);
      expect(testStorage[StorageKeys.UBLOCK_SOURCES]).toHaveLength(1);

      // 同じURLで更新
      const updateResult = await saveUblockSettings('||updated.com^', url);

      expect(updateResult.action).toBe('更新');
      expect(updateResult.sources).toHaveLength(1);
      expect(updateResult.sources[0].url).toBe(url);
      expect(testStorage[StorageKeys.UBLOCK_SOURCES]).toHaveLength(1);
    });

    test('手動入力を複数回保存しても1つのソースになる', async () => {
      // 最初の保存
      await saveUblockSettings('||example.com^');
      expect(testStorage[StorageKeys.UBLOCK_SOURCES]).toHaveLength(1);

      // 同じURL（manual）で更新
      const updateResult = await saveUblockSettings('||updated.com^');

      expect(updateResult.action).toBe('更新');
      expect(updateResult.sources).toHaveLength(1);
      expect(testStorage[StorageKeys.UBLOCK_SOURCES]).toHaveLength(1);
    });
  });
});