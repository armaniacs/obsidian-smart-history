// Main screen functionality
import { getSettings, StorageKeys } from '../utils/storage.js';
import { showPreview } from './sanitizePreview.js';

// 現在のタブ情報を取得して表示
async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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
  if (!url.startsWith('http')) {
    recordBtn.disabled = true;
    recordBtn.textContent = '記録できないページです';
  } else {
    recordBtn.disabled = false;
    recordBtn.textContent = '📝 今すぐ記録';
  }
}

// 手動記録処理
async function recordCurrentPage(force = false) {
  const statusDiv = document.getElementById('mainStatus');
  statusDiv.textContent = '処理中...';
  statusDiv.className = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.startsWith('http')) {
      throw new Error('記録できないページです');
    }

    // 設定確認
    const settings = await getSettings();
    const usePreview = settings[StorageKeys.PII_CONFIRMATION_UI] !== false; // Default true

    // Content Scriptにコンテンツ取得を要求
    statusDiv.textContent = 'コンテンツ取得中...';
    const contentResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' });

    // Background Workerに記録を要求
    let result;

    if (usePreview) {
      statusDiv.textContent = 'ローカルAI処理中...';
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

      // Mode C (masked_cloud) の場合は、マスクが行われた場合のみ確認画面を表示する
      // Mode B などは基本表示する（要約内容の確認のため）
      let shouldShowPreview = true;
      if (previewResponse.mode === 'masked_cloud') {
        shouldShowPreview = (previewResponse.maskedCount || 0) > 0;
      }

      let finalContent = previewResponse.processedContent;

      if (shouldShowPreview) {
        // 2. ユーザー確認
        const confirmation = await showPreview(previewResponse.processedContent);

        if (!confirmation.confirmed) {
          statusDiv.textContent = 'キャンセルしました';
          return;
        }
        finalContent = confirmation.content;
      }

      // 3. 確定データ送信 (L3 processing & Save)
      statusDiv.textContent = '保存中...';
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
      statusDiv.textContent = '✓ Obsidianに保存しました';
      statusDiv.className = 'success';
    } else {
      throw new Error(result.error || '保存に失敗しました');
    }
  } catch (error) {
    statusDiv.className = 'error';

    // Handle connection errors more gracefully
    if (error.message && error.message.includes("Receiving end does not exist")) {
      statusDiv.textContent = '✗ エラー: ページを再読み込みしてから再度お試しください';
    }
    // Check for the specific domain blocked error
    else if (error.message === 'このドメインは記録が許可されていません') {
      statusDiv.textContent = 'このドメインは記録が許可されていませんが特別に記録しますか？';

      const forceBtn = document.createElement('button');
      forceBtn.textContent = '強制記録';
      forceBtn.className = 'secondary-btn'; // Use existing style
      forceBtn.style.marginTop = '10px';
      forceBtn.style.backgroundColor = '#d9534f'; // Reddish color for emphasis

      forceBtn.onclick = () => {
        // Remove the button to prevent multiple clicks
        forceBtn.disabled = true;
        forceBtn.textContent = '記録中...';
        recordCurrentPage(true); // Call with force=true
      };

      statusDiv.appendChild(forceBtn);
    } else {
      statusDiv.textContent = `✗ エラー: ${error.message}`;
    }
  }
}

// イベントリスナー設定
document.getElementById('recordBtn').addEventListener('click', () => recordCurrentPage(false));

// 初期化
loadCurrentTab();