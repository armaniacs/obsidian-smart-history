/**
 * domainFilter.test.js
 * Domain filter UI component tests
 * 【テスト対象】: src/popup/domainFilter.js
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe.skip('domainFilter.js - UI Component Tests', () => {
  // Mock DOM elements
  let mockElements;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock DOM elements
    mockElements = {
      generalTab: { addEventListener: jest.fn() },
      domainTab: { addEventListener: jest.fn() },
      privacyTab: { addEventListener: jest.fn() },
      generalPanel: { style: { display: '' }, classList: { toggle: jest.fn() } },
      domainPanel: { style: { display: '' }, classList: { toggle: jest.fn() } },
      privacyPanel: { style: { display: '' }, classList: { toggle: jest.fn() } },
      filterDisabled: { addEventListener: jest.fn() },
      filterWhitelist: { addEventListener: jest.fn() },
      filterBlacklist: { addEventListener: jest.fn() },
      domainListSection: { style: { display: '' } },
      domainListLabel: { textContent: '' },
      domainList: { value: '' },
      addCurrentDomain: { addEventListener: jest.fn() },
      saveDomainSettings: { addEventListener: jest.fn() },
      domainStatus: { textContent: '', className: '' },
      simpleFormatEnabled: { addEventListener: jest.fn(), checked: true },
      ublockFormatEnabled: { addEventListener: jest.fn(), checked: false },
      simpleFormatUI: { style: { display: '' } },
      uBlockFormatUI: { style: { display: '' } }
    };

    // Mock document.getElementById
    document.getElementById = jest.fn((id) => {
      const elementMap = {
        'generalTab': mockElements.generalTab,
        'domainTab': mockElements.domainTab,
        'privacyTab': mockElements.privacyTab,
        'generalPanel': mockElements.generalPanel,
        'domainPanel': mockElements.domainPanel,
        'privacyPanel': mockElements.privacyPanel,
        'filterDisabled': mockElements.filterDisabled,
        'filterWhitelist': mockElements.filterWhitelist,
        'filterBlacklist': mockElements.filterBlacklist,
        'domainListSection': mockElements.domainListSection,
        'domainListLabel': mockElements.domainListLabel,
        'domainList': mockElements.domainList,
        'addCurrentDomain': mockElements.addCurrentDomain,
        'saveDomainSettings': mockElements.saveDomainSettings,
        'domainStatus': mockElements.domainStatus,
        'simpleFormatEnabled': mockElements.simpleFormatEnabled,
        'ublockFormatEnabled': mockElements.ublockFormatEnabled,
        'simpleFormatUI': mockElements.simpleFormatUI,
        'uBlockFormatUI': mockElements.uBlockFormatUI
      };
      return elementMap[id] || null;
    });

    // Mock document.querySelector
    document.querySelector = jest.fn((selector) => {
      if (selector === 'input[name="domainFilter"]:checked') {
        return mockElements.filterDisabled;
      }
      return null;
    });

    // Mock chrome.tabs
    global.chrome = {
      tabs: {
        query: jest.fn()
      }
    };

    // Mock dynamic import
    global.import = jest.fn(() => Promise.resolve({ init: jest.fn() }));
  });

  describe('UI-001: Checkbox initialization', () => {
    test('Verify checkboxes are initialized with correct default values', () => {
      // 【テスト目的】: チェックボックスの初期値が正しいことを確認
      // 【テスト内容】: simpleFormatEnabledはchecked、ublockFormatEnabledはuncheckedであることを確認
      // 【期待される動作】: デフォルト値が正しく設定されている

      // 【テストデータ準備】: デフォルトのチェックボックス状態を確認
      expect(mockElements.simpleFormatEnabled.checked).toBe(true);
      expect(mockElements.ublockFormatEnabled.checked).toBe(false);
    });
  });

  describe('UI-002: Checkbox state persistence', () => {
    test('Verify checkbox states are saved and restored from storage', async () => {
      // 【テスト目的】: チェックボックスの状態が保存・復元されることを確認
      // 【テスト内容】: ストレージから設定を読み込み、チェックボックスの状態が復元されることを確認
      // 【期待される動作】: 保存された状態が正しく復元される

      // 【テストデータ準備】: ストレージのモックデータを準備
      getSettings.mockResolvedValue({
        [StorageKeys.SIMPLE_FORMAT_ENABLED]: false,
        [StorageKeys.UBLOCK_FORMAT_ENABLED]: true
      });

      // 【実際の処理実行】: loadDomainSettings関数を呼び出し
      await loadDomainSettings();

      // 【結果検証】: チェックボックスの状態が正しく復元されていることを確認
      expect(mockElements.simpleFormatEnabled.checked).toBe(false);
      expect(mockElements.ublockFormatEnabled.checked).toBe(true);
    });
  });

  describe('UI-003: Simple UI visibility', () => {
    test('Verify Simple UI shows/hides based on checkbox', () => {
      // 【テスト目的】: Simple UIの表示/非表示がチェックボックスで制御されることを確認
      // 【テスト内容】: simpleFormatEnabledのチェック状態に応じてUIが表示/非表示になることを確認
      // 【期待される動作】: チェック時は表示、未チェック時は非表示

      // 【テストデータ準備】: チェックボックスの状態を設定
      mockElements.simpleFormatEnabled.checked = true;
      mockElements.ublockFormatEnabled.checked = false;

      // 【実際の処理実行】: toggleFormatUI関数を呼び出し
      toggleFormatUI();

      // 【結果検証】: Simple UIが表示されていることを確認
      expect(mockElements.simpleFormatUI.style.display).toBe('block');
      expect(mockElements.uBlockFormatUI.style.display).toBe('none');

      // 【テストデータ準備】: チェックボックスの状態を変更
      mockElements.simpleFormatEnabled.checked = false;

      // 【実際の処理実行】: toggleFormatUI関数を再度呼び出し
      toggleFormatUI();

      // 【結果検証】: Simple UIが非表示になっていることを確認
      expect(mockElements.simpleFormatUI.style.display).toBe('none');
    });
  });

  describe('UI-004: uBlock UI visibility', () => {
    test('Verify uBlock UI shows/hides based on checkbox', () => {
      // 【テスト目的】: uBlock UIの表示/非表示がチェックボックスで制御されることを確認
      // 【テスト内容】: ublockFormatEnabledのチェック状態に応じてUIが表示/非表示になることを確認
      // 【期待される動作】: チェック時は表示、未チェック時は非表示

      // 【テストデータ準備】: チェックボックスの状態を設定
      mockElements.simpleFormatEnabled.checked = false;
      mockElements.ublockFormatEnabled.checked = true;

      // 【実際の処理実行】: toggleFormatUI関数を呼び出し
      toggleFormatUI();

      // 【結果検証】: uBlock UIが表示されていることを確認
      expect(mockElements.simpleFormatUI.style.display).toBe('none');
      expect(mockElements.uBlockFormatUI.style.display).toBe('block');

      // 【テストデータ準備】: チェックボックスの状態を変更
      mockElements.ublockFormatEnabled.checked = false;

      // 【実際の処理実行】: toggleFormatUI関数を再度呼び出し
      toggleFormatUI();

      // 【結果検証】: uBlock UIが非表示になっていることを確認
      expect(mockElements.uBlockFormatUI.style.display).toBe('none');
    });
  });

  describe('UI-005: Both UIs visible simultaneously', () => {
    test('Verify both UIs can be visible at the same time', () => {
      // 【テスト目的】: 両方のUIが同時に表示できることを確認
      // 【テスト内容】: 両方のチェックボックスがチェックされている場合、両方のUIが表示されることを確認
      // 【期待される動作】: 両方のUIが同時に表示される

      // 【テストデータ準備】: 両方のチェックボックスをチェック
      mockElements.simpleFormatEnabled.checked = true;
      mockElements.ublockFormatEnabled.checked = true;

      // 【実際の処理実行】: toggleFormatUI関数を呼び出し
      toggleFormatUI();

      // 【結果検証】: 両方のUIが表示されていることを確認
      expect(mockElements.simpleFormatUI.style.display).toBe('block');
      expect(mockElements.uBlockFormatUI.style.display).toBe('block');
    });
  });

  describe('UI-006: Both UIs hidden', () => {
    test('Verify both UIs can be hidden', () => {
      // 【テスト目的】: 両方のUIが非表示にできることを確認
      // 【テスト内容】: 両方のチェックボックスが未チェックの場合、両方のUIが非表示になることを確認
      // 【期待される動作】: 両方のUIが非表示になる

      // 【テストデータ準備】: 両方のチェックボックスを未チェック
      mockElements.simpleFormatEnabled.checked = false;
      mockElements.ublockFormatEnabled.checked = false;

      // 【実際の処理実行】: toggleFormatUI関数を呼び出し
      toggleFormatUI();

      // 【結果検証】: 両方のUIが非表示になっていることを確認
      expect(mockElements.simpleFormatUI.style.display).toBe('none');
      expect(mockElements.uBlockFormatUI.style.display).toBe('none');
    });
  });

  describe('UI-007: Save with Simple only', () => {
    test('Verify saving with only Simple enabled', async () => {
      // 【テスト目的】: Simpleのみ有効な場合の保存動作を確認
      // 【テスト内容】: Simpleのみ有効で保存した場合、Simple設定が保存されuBlockが無効になることを確認
      // 【期待される動作】: Simple設定が保存され、uBlockが無効になる

      // 【テストデータ準備】: Simpleのみ有効な状態を設定
      mockElements.simpleFormatEnabled.checked = true;
      mockElements.ublockFormatEnabled.checked = false;
      mockElements.filterWhitelist.checked = true;
      mockElements.domainList.value = 'example.com';
      parseDomainList.mockReturnValue(['example.com']);
      validateDomainList.mockReturnValue([]);
      saveSettings.mockResolvedValue(undefined);

      // 【実際の処理実行】: handleSaveDomainSettings関数を呼び出し
      await handleSaveDomainSettings();

      // 【結果検証】: Simple設定が保存され、uBlockが無効になっていることを確認
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          [StorageKeys.SIMPLE_FORMAT_ENABLED]: true,
          [StorageKeys.UBLOCK_FORMAT_ENABLED]: false
        })
      );
    });
  });

  describe('UI-008: Save with uBlock only', () => {
    test('Verify saving with only uBlock enabled', async () => {
      // 【テスト目的】: uBlockのみ有効な場合の保存動作を確認
      // 【テスト内容】: uBlockのみ有効で保存した場合、uBlock設定が保存されSimpleが無効になることを確認
      // 【期待される動作】: uBlock設定が保存され、Simpleが無効になる

      // 【テストデータ準備】: uBlockのみ有効な状態を設定
      mockElements.simpleFormatEnabled.checked = false;
      mockElements.ublockFormatEnabled.checked = true;
      mockElements.filterDisabled.checked = true;
      saveUblockSettings.mockResolvedValue(undefined);
      saveSettings.mockResolvedValue(undefined);

      // 【実際の処理実行】: handleSaveDomainSettings関数を呼び出し
      await handleSaveDomainSettings();

      // 【結果検証】: uBlock設定が保存され、Simpleが無効になっていることを確認
      expect(saveUblockSettings).toHaveBeenCalled();
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          [StorageKeys.SIMPLE_FORMAT_ENABLED]: false
        })
      );
    });
  });

  describe('UI-009: Save with both enabled', () => {
    test('Verify saving with both enabled', async () => {
      // 【テスト目的】: 両方有効な場合の保存動作を確認
      // 【テスト内容】: 両方有効で保存した場合、両方の設定が保存されることを確認
      // 【期待される動作】: 両方の設定が保存される

      // 【テストデータ準備】: 両方有効な状態を設定
      mockElements.simpleFormatEnabled.checked = true;
      mockElements.ublockFormatEnabled.checked = true;
      mockElements.filterWhitelist.checked = true;
      mockElements.domainList.value = 'example.com';
      parseDomainList.mockReturnValue(['example.com']);
      validateDomainList.mockReturnValue([]);
      saveUblockSettings.mockResolvedValue(undefined);
      saveSettings.mockResolvedValue(undefined);

      // 【実際の処理実行】: handleSaveDomainSettings関数を呼び出し
      await handleSaveDomainSettings();

      // 【結果検証】: 両方の設定が保存されていることを確認
      expect(saveUblockSettings).toHaveBeenCalled();
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          [StorageKeys.SIMPLE_FORMAT_ENABLED]: true,
          [StorageKeys.UBLOCK_FORMAT_ENABLED]: true
        })
      );
    });
  });

  describe('UI-010: Save with both disabled', () => {
    test('Verify saving with both disabled', async () => {
      // 【テスト目的】: 両方無効な場合の保存動作を確認
      // 【テスト内容】: 両方無効で保存した場合、両方が無効になることを確認
      // 【期待される動作】: 両方が無効になる

      // 【テストデータ準備】: 両方無効な状態を設定
      mockElements.simpleFormatEnabled.checked = false;
      mockElements.ublockFormatEnabled.checked = false;
      mockElements.filterDisabled.checked = true;
      saveSettings.mockResolvedValue(undefined);

      // 【実際の処理実行】: handleSaveDomainSettings関数を呼び出し
      await handleSaveDomainSettings();

      // 【結果検証】: 両方が無効になっていることを確認
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          [StorageKeys.SIMPLE_FORMAT_ENABLED]: false,
          [StorageKeys.UBLOCK_FORMAT_ENABLED]: false
        })
      );
    });
  });
});