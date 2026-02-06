/**
 * index.js
 * uBlockインポートモジュール - メインエントリーポイント
 */

import { readFile } from './fileReader.js';
import { fetchFromUrl } from './urlFetcher.js';
import { isValidUrl } from './validation.js';
import { rebuildRulesFromSources, previewUblockFilter } from './rulesBuilder.js';
import { loadAndDisplaySources, deleteSource, reloadSource, saveUblockSettings } from './sourceManager.js';
import { renderSourceList, updatePreviewUI, hidePreview, clearInput, exportSimpleFormat, copyToClipboard, buildUblockFormat } from './uiRenderer.js';
import { showStatus } from '../settingsUiHelper.js';
import { LogType, addLog } from '../../utils/logger.js';
import { StorageKeys } from '../../utils/storage.js';
import { getSettings } from '../../utils/storage.js';

// グローバル状態
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
  setupExportButtons();

  // ソース一覧を読み込んで表示
  await loadAndDisplaySources((sources) => {
    renderSourceList(
      sources,
      handleDeleteSource,
      handleReloadSource
    );
  });
}

// ============================================================================
// テキスト入力プレビュー機能
// ============================================================================

/**
 * テキスト入力のプレビュー更新
 */
function setupTextInputPreview() {
  const textarea = document.getElementById('uBlockFilterInput');
  if (textarea) {
    textarea.addEventListener('input', handleTextInputPreview);
  }
}

/**
 * テキスト入力プレビュー処理
 */
function handleTextInputPreview() {
  const text = document.getElementById('uBlockFilterInput').value;
  const result = previewUblockFilter(text);
  updatePreviewUI(result);
}

// ============================================================================
// ファイル入力機能
// ============================================================================

/**
 * ファイル入力の設定
 */
function setupFileInput() {
  const fileBtn = document.getElementById('uBlockFileSelectBtn');
  const fileInput = document.getElementById('uBlockFileInput');

  if (fileBtn && fileInput) {
    fileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);
  }
}

/**
 * ファイル選択処理
 */
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await readFile(file);
    document.getElementById('uBlockFilterInput').value = text;
    currentSourceUrl = null;
    handleTextInputPreview();
    showStatus('domainStatus', `"${file.name}" を読み込みました`, 'success');
  } catch (error) {
    showStatus('domainStatus', `ファイル読み込みエラー: ${error.message}`, 'error');
  }
}

// ============================================================================
// URLインポート機能
// ============================================================================

/**
 * URLインポート機能の初期化
 */
function setupUrlImport() {
  const urlImportBtn = document.getElementById('uBlockUrlImportBtn');
  if (urlImportBtn) {
    urlImportBtn.addEventListener('click', handleUrlImport);
  }
}

// ============================================================================
// エクスポート・コピー機能
// ============================================================================

/**
 * エクスポートボタンとコピーボタンを設定
 */
function setupExportButtons() {
  const exportBtn = document.getElementById('uBlockExportBtn');
  const copyBtn = document.getElementById('uBlockCopyBtn');

  if (exportBtn) {
    exportBtn.addEventListener('click', handleExport);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopy);
  }
}

/**
 * エクスポート処理
 */
async function handleExport() {
  try {
    const settings = await getSettings();
    const sources = settings[StorageKeys.UBLOCK_SOURCES] || [];

    if (sources.length === 0) {
      showStatus('domainStatus', 'エクスポートするデータがありません', 'error');
      return;
    }

    const simpleFormat = exportSimpleFormat(sources);
    const blob = new Blob([simpleFormat], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `domain-list-${Date.now()}.txt`;
    a.click();

    URL.revokeObjectURL(url);
    showStatus('domainStatus', 'ファイルをエクスポートしました', 'success');
  } catch (error) {
    showStatus('domainStatus', `エクスポートエラー: ${error.message}`, 'error');
  }
}

/**
 * クリップボードにコピー処理
 */
async function handleCopy() {
  try {
    const text = document.getElementById('uBlockFilterInput').value;

    if (!text.trim()) {
      showStatus('domainStatus', 'コピーするテキストがありません', 'error');
      return;
    }

    await copyToClipboard(text);
    showStatus('domainStatus', 'クリップボードにコピーしました', 'success');
  } catch (error) {
    showStatus('domainStatus', `コピーエラー: ${error.message}`, 'error');
  }
}

// ============================================================================
// URLインポート機能
// ============================================================================

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
  if (!urlInput) return;

  const url = urlInput.value.trim();

  if (!url) {
    showStatus('domainStatus', 'URLを入力してください', 'error');
    return;
  }

  const importBtn = document.getElementById('uBlockUrlImportBtn');
  if (importBtn) {
    importBtn.textContent = '読み込み中...';
    importBtn.disabled = true;
  }

  try {
    const filterText = await fetchFromUrl(url);
    document.getElementById('uBlockFilterInput').value = filterText;
    currentSourceUrl = url;
    handleTextInputPreview();

    showStatus('domainStatus', `"${url}" からフィルターを読み込みました`, 'success');
  } catch (error) {
    showStatus('domainStatus', error.message, 'error');
  } finally {
    if (importBtn) {
      importBtn.textContent = 'URLからインポート';
      importBtn.disabled = false;
    }
  }
}

// ============================================================================
// ソース管理イベントハンドラ
// ============================================================================

/**
 * ソース削除ハンドラ
 */
async function handleDeleteSource(index) {
  try {
    await deleteSource(index, (sources) => {
      renderSourceList(
        sources,
        handleDeleteSource,
        handleReloadSource
      );
    });
  } catch (error) {
    showStatus('domainStatus', `削除エラー: ${error.message}`, 'error');
  }
}

/**
 * ソース再読み込みハンドラ
 */
async function handleReloadSource(index) {
  const btn = document.querySelector(`.reload-btn[data-index="${index}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '...';
  }

  try {
    const { sources, ruleCount } = await reloadSource(index, fetchFromUrl);

    renderSourceList(
      sources,
      handleDeleteSource,
      handleReloadSource
    );

    showStatus('domainStatus', `ソースを更新しました（${ruleCount}ルール）`, 'success');
  } catch (error) {
    addLog(LogType.ERROR, '更新エラー', { error: error.message });
    showStatus('domainStatus', `更新エラー: ${error.message}`, 'error');

    // ボタン状態リセットのために再描画
    const settings = await chrome.storage.sync.get();
    const sources = settings[StorageKeys.UBLOCK_SOURCES] || [];
    renderSourceList(
      sources,
      handleDeleteSource,
      handleReloadSource
    );
  }
}

/**
 * uBlock設定の保存DOMハンドラ
 */
async function saveUblockSettingsDOM() {
  const text = document.getElementById('uBlockFilterInput').value;
  try {
    const { sources, action, ruleCount } = await saveUblockSettings(text, currentSourceUrl);

    renderSourceList(
      sources,
      handleDeleteSource,
      handleReloadSource
    );

    clearInput();
    hidePreview();
    currentSourceUrl = null;
  } catch (error) {
    // エラーメッセージは saveUblockSettings 内で表示済み
  }
}

// ============================================================================
// ドラッグ&ドロップ機能
// ============================================================================

/**
 * ドラッグ&ドロップの設定
 */
export function setupDragAndDrop() {
  const dropZone = document.getElementById('uBlockDropZone');
  const textarea = document.getElementById('uBlockFilterInput');
  const uBlockFormatUI = document.getElementById('uBlockFormatUI');

  if (!dropZone || !textarea || !uBlockFormatUI) return;

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
 */
function handleDrop(event) {
  event.preventDefault();
  const dropZone = document.getElementById('uBlockDropZone');
  if (dropZone) {
    dropZone.classList.remove('active');
    dropZone.style.display = 'none';
  }
  dropZoneActive = false;

  const file = event.dataTransfer.files[0];
  if (file && file.type === 'text/plain') {
    processFile(file);
  } else {
    showStatus('domainStatus', 'テキストファイルのみ対応しています', 'error');
  }
}

/**
 * ファイル処理
 */
async function processFile(file) {
  try {
    const text = await readFile(file);
    document.getElementById('uBlockFilterInput').value = text;
    currentSourceUrl = null;
    handleTextInputPreview();
    showStatus('domainStatus', `"${file.name}" を読み込みました`, 'success');
  } catch (error) {
    showStatus('domainStatus', `ファイル読み込みエラー: ${error.message}`, 'error');
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

// ============================================================================
// Public API
// ============================================================================

// エクスポート（テスト用など）
export {
  isValidUrl,
  rebuildRulesFromSources,
  previewUblockFilter,
  fetchFromUrl,
  readFile,
  renderSourceList,
  updatePreviewUI,
  hidePreview,
  clearInput,
  loadAndDisplaySources,
  deleteSource,
  reloadSource,
  saveUblockSettings
};

// DOM保存用ハンドラーをグローバルに公開
window.saveUblockSettingsDOM = saveUblockSettingsDOM;