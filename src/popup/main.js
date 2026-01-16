// Main screen functionality

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
async function recordCurrentPage() {
  const statusDiv = document.getElementById('mainStatus');
  statusDiv.textContent = '記録中...';
  statusDiv.className = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.startsWith('http')) {
      throw new Error('記録できないページです');
    }

    // Content Scriptにコンテンツ取得を要求
    const contentResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' });

    // Background Workerに記録を要求
    const response = await chrome.runtime.sendMessage({
      type: 'MANUAL_RECORD',
      payload: {
        title: tab.title,
        url: tab.url,
        content: contentResponse.content
      }
    });

    if (response.success) {
      statusDiv.textContent = '✓ Obsidianに保存しました';
      statusDiv.className = 'success';
    } else {
      throw new Error(response.error || '保存に失敗しました');
    }
  } catch (error) {
    statusDiv.textContent = `✗ エラー: ${error.message}`;
    statusDiv.className = 'error';
  }
}

// イベントリスナー設定
document.getElementById('recordBtn').addEventListener('click', recordCurrentPage);

// 初期化
loadCurrentTab();