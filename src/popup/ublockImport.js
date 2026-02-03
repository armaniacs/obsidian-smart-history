/**
 * @file src/popup/ublockImport.js
 * uBlockインポートUIロジック（複数ソース対応・軽量化版）
 */

import { parseUblockFilterList, parseUblockFilterListWithErrors } from '../utils/ublockParser.js';
import { StorageKeys, saveSettings, getSettings } from '../utils/storage.js';
import { addLog, LogType } from '../utils/logger.js';

let dropZoneActive = false;
let currentSourceUrl = null;

/**
 * uBlockインポートUIを初期化
 */
export async function init() {
  setupTextInputPreview();
  setupFileInput();
  setupDragAndDrop();
  setupUrlImport();
  await loadAndDisplaySources();
}

/**
 * 保存済みソース一覧を読み込んで表示
 */
async function loadAndDisplaySources() {
  const settings = await getSettings();
  const sources = settings[StorageKeys.UBLOCK_SOURCES] || [];
  renderSourceList(sources);
}

/**
 * URLが安全なプロトコルかどうかを検証する
 * @param {string} url - 検証するURL
 * @returns {boolean} 安全なhttps/http/ftpプロトコルの場合true
 */
export function isValidUrl(url) {
  if (!url) return false;
  // Prevent javascript:, data:, vbscript: and other dangerous protocols
  return /^(https?:\/\/|ftp:\/\/)/i.test(url.trim());
}

/**
 * ソースリストをUIに描画
 * @param {Array} sources - ソースリスト
 */
function renderSourceList(sources) {
  const container = document.getElementById('uBlockSourceItems');
  const noSourcesMsg = document.getElementById('uBlockNoSources');

  if (!container || !noSourcesMsg) return;

  container.innerHTML = '';

  if (sources.length === 0) {
    noSourcesMsg.style.display = 'block';
    return;
  }

  noSourcesMsg.style.display = 'none';

  sources.forEach((source, index) => {
    const item = document.createElement('div');
    item.className = 'source-item';
    item.dataset.index = index;

    const urlText = source.url === 'manual' ? '手動入力' : source.url;
    const isUrl = source.url !== 'manual';

    // XSS対策: textContentを使用
    const urlElement = document.createElement(isUrl ? 'a' : 'span');
    urlElement.className = 'source-url';
    urlElement.textContent = urlText;
    if (isUrl && isValidUrl(source.url)) {
      urlElement.href = source.url;
      urlElement.target = '_blank';
      urlElement.rel = 'noopener noreferrer';
    }

    const date = new Date(source.importedAt);
    const dateStr = date.toLocaleString('ja-JP');

    const metaDiv = document.createElement('div');
    metaDiv.className = 'source-meta';

    const metaSpan = document.createElement('span');
    metaSpan.textContent = `${dateStr} | ルール: ${source.ruleCount}`;

    const actionDiv = document.createElement('div');

    if (isUrl) {
      const reloadBtn = document.createElement('button');
      reloadBtn.className = 'reload-btn';
      reloadBtn.dataset.index = index;
      reloadBtn.textContent = '再読込';
      reloadBtn.title = '再読み込み';
      actionDiv.appendChild(reloadBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.dataset.index = index;
    deleteBtn.textContent = '削除';
    actionDiv.appendChild(deleteBtn);

    metaDiv.appendChild(metaSpan);
    metaDiv.appendChild(actionDiv);

    item.appendChild(urlElement);
    item.appendChild(metaDiv);

    container.appendChild(item);
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteSource);
  });

  container.querySelectorAll('.reload-btn').forEach(btn => {
    btn.addEventListener('click', handleReloadSource);
  });
}

/**
 * ソース削除ハンドラ
 * @param {Event} event
 */
async function handleDeleteSource(event) {
  const index = parseInt(event.target.dataset.index, 10);

  const settings = await getSettings();
  const sources = settings[StorageKeys.UBLOCK_SOURCES] || [];

  if (index < 0 || index >= sources.length) return;

  sources.splice(index, 1);

  // ルールを再構築
  const mergedRules = rebuildRulesFromSources(sources);

  await saveSettings({
    [StorageKeys.UBLOCK_SOURCES]: sources,
    [StorageKeys.UBLOCK_RULES]: mergedRules,
    [StorageKeys.UBLOCK_FORMAT_ENABLED]: sources.length > 0
  });

  renderSourceList(sources);
  showStatus('ソースを削除しました', 'success');
}

/**
 * ソース再読み込みハンドラ
 * @param {Event} event
 */
async function handleReloadSource(event) {
  const btn = event.target;
  const index = parseInt(btn.dataset.index, 10);

  const settings = await getSettings();
  const sources = settings[StorageKeys.UBLOCK_SOURCES] || [];

  if (index < 0 || index >= sources.length) return;

  const source = sources[index];
  if (source.url === 'manual') return;

  try {
    btn.disabled = true;
    btn.textContent = '...';

    const filterText = await fetchFromUrl(source.url);

    // エラーチェック付きでパース
    const result = parseUblockFilterListWithErrors(filterText);

    if (result.errors.length > 0) {
      // エラーがあっても続行するか？ ここでは安全のため中止し、ユーザーに通知
      showStatus(`${result.errors.length}個のエラーが見つかりました。更新を中止します。`, 'error');
      // renderSourceList(sources); // ボタン状態を戻すために再描画
      // return; 
      // ※ 元のコードではmanual入力時にエラーがあると保存しない方針なので、それに合わせる
      // ただし、外部ソースの場合は一部エラーがあっても取り込みたい場合があるかもしれないが
      // ここでは厳密にチェックする

      // ボタンの状態を戻すために再描画が必要だが、finallyで処理する手もあるが
      // renderSourceListを呼ぶと一括でリセットされるのでそうする
      renderSourceList(sources);
      return;
    }

    if (result.rules.ruleCount === 0) {
      showStatus('有効なルールが見つかりませんでした。更新を中止します。', 'error');
      renderSourceList(sources);
      return;
    }

    // ドメインリストのみを抽出（軽量化）
    const blockDomains = result.rules.blockRules.map(r => r.domain);
    const exceptionDomains = result.rules.exceptionRules.map(r => r.domain);

    // ソース更新
    sources[index] = {
      ...source,
      importedAt: Date.now(),
      ruleCount: result.rules.ruleCount,
      blockDomains,
      exceptionDomains
    };

    // ルールを再構築
    const mergedRules = rebuildRulesFromSources(sources);

    await saveSettings({
      [StorageKeys.UBLOCK_SOURCES]: sources,
      [StorageKeys.UBLOCK_RULES]: mergedRules
    });

    renderSourceList(sources);
    showStatus(`ソースを更新しました（${result.rules.ruleCount}ルール）`, 'success');

  } catch (error) {
    addLog(LogType.ERROR, '更新エラー', { error: error.message });
    showStatus(`更新エラー: ${error.message}`, 'error');
    renderSourceList(sources); // ボタン状態リセット
  }
}

/**
 * 超軽量化: ソースからドメインセットを構築
 * ストレージにはドメイン文字列の配列のみを保存
 * @param {Array} sources - ソースリスト
 * @returns {Object} 軽量なルールデータ
 */
export function rebuildRulesFromSources(sources) {
  const blockDomains = new Set();
  const exceptionDomains = new Set();

  for (const source of sources) {
    if (source.blockDomains) {
      source.blockDomains.forEach(d => blockDomains.add(d));
    }
    if (source.exceptionDomains) {
      source.exceptionDomains.forEach(d => exceptionDomains.add(d));
    }
  }

  // ストレージには配列のみ保存（オブジェクトは保存しない）
  return {
    blockDomains: Array.from(blockDomains),
    exceptionDomains: Array.from(exceptionDomains),
    metadata: {
      importedAt: Date.now(),
      ruleCount: blockDomains.size + exceptionDomains.size
    }
  };
}

/**
 * テキスト入力のプレビュー更新
 */
function setupTextInputPreview() {
  const textarea = document.getElementById('uBlockFilterInput');
  textarea.addEventListener('input', handleTextInputPreview);
}

/**
 * テキスト入力プレビュー処理
 */
function handleTextInputPreview() {
  const text = document.getElementById('uBlockFilterInput').value;
  const result = previewUblockFilter(text);
  updatePreviewUI(result);
}

/**
 * uBlockフィルターのプレビュー
 * @param {string} text - フィルターテキスト
 * @returns {Object} プレビュー結果
 */
export function previewUblockFilter(text) {
  try {
    const result = parseUblockFilterListWithErrors(text);

    return {
      blockCount: result.rules.blockRules.length,
      exceptionCount: result.rules.exceptionRules.length,
      errorCount: result.errors.length,
      errorDetails: result.errors
    };
  } catch (error) {
    return {
      blockCount: 0,
      exceptionCount: 0,
      errorCount: 1,
      errorDetails: [error.message]
    };
  }
}

/**
 * プレビューUI更新
 */
function updatePreviewUI(result) {
  document.getElementById('uBlockRuleCount').textContent = result.blockCount;
  document.getElementById('uBlockExceptionCount').textContent = result.exceptionCount;
  document.getElementById('uBlockErrorCount').textContent = result.errorCount;

  const errorDetailsElement = document.getElementById('uBlockErrorDetails');
  if (Array.isArray(result.errorDetails)) {
    const errorTexts = result.errorDetails.map(e =>
      typeof e === 'string' ? e : `${e.lineNumber}行: ${e.message}`
    );
    errorDetailsElement.textContent = errorTexts.join('\n');
  } else {
    errorDetailsElement.textContent = result.errorDetails;
  }

  const preview = document.getElementById('uBlockPreview');
  preview.style.display = 'block';
}

/**
 * ファイル入力の設定
 */
function setupFileInput() {
  const fileBtn = document.getElementById('uBlockFileSelectBtn');
  const fileInput = document.getElementById('uBlockFileInput');

  fileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', handleFileSelect);
}

/**
 * ファイル選択処理
 */
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const text = await readFile(file);
  document.getElementById('uBlockFilterInput').value = text;
  currentSourceUrl = null;
  handleTextInputPreview();
}

/**
 * ファイル読み込み
 */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      if (text.charCodeAt(0) === 0xFEFF) {
        resolve(text.slice(1));
      } else {
        resolve(text);
      }
    };

    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * uBlock設定の保存（軽量化版）
 */
export async function saveUblockSettings() {
  const text = document.getElementById('uBlockFilterInput').value;

  const result = parseUblockFilterListWithErrors(text);

  if (result.errors.length > 0) {
    showStatus(`${result.errors.length}個のエラーが見つかりました。修正してください。`, 'error');
    return;
  }

  if (result.rules.ruleCount === 0) {
    showStatus('有効なルールが見つかりませんでした', 'error');
    return;
  }

  const settings = await getSettings();
  const sources = settings[StorageKeys.UBLOCK_SOURCES] || [];

  const sourceUrl = currentSourceUrl || 'manual';
  const existingIndex = sources.findIndex(s => s.url === sourceUrl);

  // ドメインリストのみを抽出（軽量化）
  const blockDomains = result.rules.blockRules.map(r => r.domain);
  const exceptionDomains = result.rules.exceptionRules.map(r => r.domain);

  const newSource = {
    url: sourceUrl,
    importedAt: Date.now(),
    ruleCount: result.rules.ruleCount,
    blockDomains,
    exceptionDomains
  };

  if (existingIndex >= 0) {
    sources[existingIndex] = newSource;
  } else {
    sources.push(newSource);
  }

  // ルールを再構築
  const mergedRules = rebuildRulesFromSources(sources);

  try {
    await saveSettings({
      [StorageKeys.UBLOCK_SOURCES]: sources,
      [StorageKeys.UBLOCK_RULES]: mergedRules,
      [StorageKeys.UBLOCK_FORMAT_ENABLED]: true
    });

    renderSourceList(sources);
    document.getElementById('uBlockFilterInput').value = '';
    document.getElementById('uBlockPreview').style.display = 'none';
    currentSourceUrl = null;

    const action = existingIndex >= 0 ? '更新' : '追加';
    showStatus(`フィルターソースを${action}しました（${result.rules.ruleCount}ルール）`, 'success');
  } catch (error) {
    addLog(LogType.ERROR, '保存エラー', { error: error.message });
    showStatus(`保存エラー: ${error.message}`, 'error');
  }
}

/**
 * URLからフィルターリストを取得
 * @param {string} url - 外部URL
 * @returns {Promise<string>}
 */
export async function fetchFromUrl(url) {
  if (!isValidUrl(url)) {
    throw new Error('無効なURLです');
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const text = await response.text();

    // 取得後にテキストが有効かチェック
    if (!text || text.trim().length === 0) {
      throw new Error('取得されたテキストが空です');
    }

    // Content-Typeがテキストでない場合は警告
    if (contentType && !contentType.includes('text/') && !contentType.includes('application/octet-stream')) {
      addLog(LogType.WARN, 'Content-Typeがテキスト形式ではありません', { contentType });
    }

    return text;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    }
    throw new Error(`URL読み込みエラー: ${error.message}`);
  }
}

/**
 * URLインポート機能の初期化
 */
function setupUrlImport() {
  const urlImportBtn = document.getElementById('uBlockUrlImportBtn');
  if (urlImportBtn) {
    urlImportBtn.addEventListener('click', handleUrlImport);
  }
}

/**
 * URLインポートのイベントハンドラ
 */
async function handleUrlImport() {
  const urlInput = document.getElementById('uBlockUrlInput');
  const url = urlInput.value.trim();

  if (!url) {
    showStatus('URLを入力してください', 'error');
    return;
  }

  try {
    const importBtn = document.getElementById('uBlockUrlImportBtn');
    importBtn.textContent = '読み込み中...';
    importBtn.disabled = true;

    const filterText = await fetchFromUrl(url);
    document.getElementById('uBlockFilterInput').value = filterText;
    currentSourceUrl = url;
    handleTextInputPreview();

    showStatus(`"${url}" からフィルターを読み込みました`, 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    const importBtn = document.getElementById('uBlockUrlImportBtn');
    importBtn.textContent = 'URLからインポート';
    importBtn.disabled = false;
  }
}

/**
 * ドラッグ&ドロップの設定
 */
export function setupDragAndDrop() {
  const dropZone = document.getElementById('uBlockDropZone');
  const textarea = document.getElementById('uBlockFilterInput');
  const uBlockFormatUI = document.getElementById('uBlockFormatUI');

  textarea.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!dropZoneActive) {
      dropZone.style.display = 'block';
      dropZone.classList.add('active');
      dropZoneActive = true;
    }
  });

  uBlockFormatUI.addEventListener('dragleave', (event) => {
    if (dropZoneActive && !isElementInDropZone(event.relatedTarget, dropZone)) {
      dropZone.classList.remove('active');
      dropZone.style.display = 'none';
      dropZoneActive = false;
    }
  });

  dropZone.addEventListener('drop', handleDrop);
}

/**
 * ドロップ処理
 * @param {DragEvent} event
 */
function handleDrop(event) {
  event.preventDefault();
  const dropZone = document.getElementById('uBlockDropZone');
  dropZone.classList.remove('active');
  dropZone.style.display = 'none';
  dropZoneActive = false;

  const file = event.dataTransfer.files[0];
  if (file && file.type === 'text/plain') {
    processFile(file);
  } else {
    showStatus('テキストファイルのみ対応しています', 'error');
  }
}

/**
 * ファイル処理
 * @param {File} file
 */
async function processFile(file) {
  try {
    const text = await readFile(file);
    document.getElementById('uBlockFilterInput').value = text;
    currentSourceUrl = null;
    handleTextInputPreview();
    showStatus(`"${file.name}" を読み込みました`, 'success');
  } catch (error) {
    showStatus(`ファイル読み込みエラー: ${error.message}`, 'error');
  }
}

/**
 * 要素がドロップゾーン内にあるかどうかをチェック
 */
function isElementInDropZone(element, dropZone) {
  while (element) {
    if (element === dropZone) {
      return true;
    }
    element = element.parentElement;
  }
  return false;
}

/**
 * ステータス表示
 * @param {string} message
 * @param {string} type
 */
function showStatus(message, type) {
  const statusDiv = document.getElementById('domainStatus');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = type;

    const timeout = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      if (statusDiv) {
        statusDiv.textContent = '';
        statusDiv.className = '';
      }
    }, timeout);
  }
}
