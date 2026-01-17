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
async function recordCurrentPage(force = false) {
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
        content: contentResponse.content,
        force: force
      }
    });

    if (response.success) {
      statusDiv.textContent = '✓ Obsidianに保存しました';
      statusDiv.className = 'success';
    } else {
      throw new Error(response.error || '保存に失敗しました');
    }
  } catch (error) {
    statusDiv.className = 'error';

    // Check for the specific domain blocked error
    if (error.message === 'このドメインは記録が許可されていません') {
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