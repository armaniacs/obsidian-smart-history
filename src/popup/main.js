// Main screen functionality
import { getSettings, StorageKeys } from '../utils/storage.js';
import { showPreview, initializeModalEvents } from './sanitizePreview.js';
import { showSpinner, hideSpinner } from './spinner.js';
import { startAutoCloseTimer } from './autoClose.js';
import { getCurrentTab, isRecordable } from './tabUtils.js';
import { showError, showSuccess, ErrorMessages, isDomainBlockedError, isConnectionError } from './errorUtils.js';

// Export functions for testing
export { getCurrentTab };

// 現在のタブ情報を取得して表示
export async function loadCurrentTab() {
  const tab = await getCurrentTab();
  if (!tab) return;

  // Favicon設定
  document.getElementById('favicon').src = tab.favIconUrl || '';

  // タイトル・URL表示
  document.getElementById('pageTitle').textContent = tab.title || 'No title';
  const url = tab.url || '';
  document.getElementById('pageUrl').textContent =
    url.length > 50 ? url.substring(0, 50) + '...' : url;

  // 記録可能ページチェック
  const recordBtn = document.getElementById('recordBtn');
  if (!isRecordable(tab)) {
    recordBtn.disabled = true;
    recordBtn.textContent = '記録できないページです';
  } else {
    recordBtn.disabled = false;
    recordBtn.textContent = '📝 今すぐ記録';
  }
}

// 手動記録処理
export async function recordCurrentPage(force = false) {
  const statusDiv = document.getElementById('mainStatus');
  hideSpinner(); // 前回のスピナー状態をクリア
  statusDiv.textContent = '';
  statusDiv.className = '';

  try {
    const tab = await getCurrentTab();

    if (!isRecordable(tab)) {
      throw new Error('記録できないページです');
    }

    // 設定確認
    const settings = await getSettings();
    const usePreview = settings[StorageKeys.PII_CONFIRMATION_UI] !== false; // Default true

    // Content Scriptにコンテンツ取得を要求
    showSpinner('コンテンツ取得中...');
    const contentResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' });

    // Background Workerに記録を要求
    let result;

    if (usePreview) {
      showSpinner('ローカルAI処理中...');
      // 1. プレビュー用データ取得 (L1/L2 processing)
      const previewResponse = await chrome.runtime.sendMessage({
        type: 'PREVIEW_RECORD',
        payload: {
          title: tab.title,
          url: tab.url,
          content: contentResponse.content,
          force: force
        }
      });

      if (!previewResponse.success) {
        throw new Error(previewResponse.error || '処理に失敗しました');
      }

      // マスクが行われた場合のみ確認画面を表示する
      const shouldShowPreview = (previewResponse.maskedCount || 0) > 0;

      let finalContent = previewResponse.processedContent;

      if (shouldShowPreview) {
        // 2. ユーザー確認（プレビュー表示前にスピナーを非表示）
        hideSpinner();
        const confirmation = await showPreview(
          previewResponse.processedContent,
          previewResponse.maskedItems,
          previewResponse.maskedCount || 0
        );

        if (!confirmation.confirmed) {
          statusDiv.textContent = 'キャンセルしました';
          return;
        }
        finalContent = confirmation.content;
      }

      // 3. 確定データ送信 (L3 processing & Save)
      showSpinner('保存中...');
      result = await chrome.runtime.sendMessage({
        type: 'SAVE_RECORD',
        payload: {
          title: tab.title,
          url: tab.url,
          content: finalContent, // Edited or processed content
          force: force
        }
      });

    } else {
      // 確認なしの既存フロー
      result = await chrome.runtime.sendMessage({
        type: 'MANUAL_RECORD',
        payload: {
          title: tab.title,
          url: tab.url,
          content: contentResponse.content,
          force: force
        }
      });
    }

    if (result.success) {
      hideSpinner();
      showSuccess(statusDiv);

      // 【自動クローズ起動】: 記録成功後に自動クローズタイマーを起動 🟢
      // 【処理方針】: 画面状態が'main'なら2秒後にポップアップを閉じる
      // 【テスト対応】: テストケース「startAutoCloseTimerでタイマーが起動し、2000ms後にwindow.closeが呼ばれる」
      startAutoCloseTimer();
    } else {
      throw new Error(result.error || '保存に失敗しました');
    }
  } catch (error) {
    hideSpinner();
    showError(statusDiv, error, () => recordCurrentPage(true));
  }
}

// イベントリスナー設定
const recordBtn = document.getElementById('recordBtn');
if (recordBtn) {
  recordBtn.addEventListener('click', () => recordCurrentPage(false));
}

// 初期化
initializeModalEvents();
loadCurrentTab();