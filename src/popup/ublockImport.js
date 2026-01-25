/**
 * @file src/popup/ublockImport.js
 * uBlockインポートUIロジック
 */

import { parseUblockFilterList } from '../utils/ublockParser.js';
import { StorageKeys, saveSettings } from '../utils/storage.js';

let dropZoneActive = false;

/**
 * uBlockインポートUIを初期化
 */
export function init() {
  setupTextInputPreview();
  setupFileInput();
  setupDragAndDrop();
  setupUrlImport(); // URLインポート機能の初期化
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

  // エラー詳細の表示を更新
  const errorDetailsElement = document.getElementById('uBlockErrorDetails');
  if (Array.isArray(result.errorDetails)) {
    // ParseErrorオブジェクトの場合
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
  handleTextInputPreview();
}

/**
 * ファイル読み込み
 * UTF-8エンコーディングを検出する
 */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // UTF-8エンコーディングを検出する
    reader.onload = (e) => {
      const text = e.target.result;

      // BOMのチェック
      if (text.charCodeAt(0) === 0xFEFF) {
        // BOMを削除
        resolve(text.slice(1));
      } else {
        resolve(text);
      }
    };

    reader.onerror = reject;

    // UTF-8として読み込む
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * uBlock設定の保存
 */
export async function saveUblockSettings() {
  const text = document.getElementById('uBlockFilterInput').value;

  // エラーハンドリング付きでパース
  const result = parseUblockFilterListWithErrors(text);

  // エラーがある場合は保存を中止してユーザーに通知
  if (result.errors.length > 0) {
    showStatus(`${result.errors.length}個のエラーが見つかりました。修正してください。`, 'error');
    return;
  }

  // 有効なルールがない場合も通知
  if (result.rules.ruleCount === 0) {
    showStatus('有効なルールが見つかりませんでした', 'error');
    return;
  }

  await saveSettings({
    [StorageKeys.UBLOCK_RULES]: result.rules,
    [StorageKeys.UBLOCK_FORMAT_ENABLED]: true
  });

  showStatus('uBlockフィルターを保存しました', 'success');
}

/**
 * URLからフィルターリストを取得
 * @param {string} url - 外部URL
 * @returns {Promise<string>}
 */
export async function fetchFromUrl(url) {
  try {
    // URLのバリデーション
    try {
      new URL(url);
    } catch (e) {
      throw new Error('無効なURLです');
    }

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/plain')) {
      // テキストファイル以外も許容するが警告を表示
      console.warn('Content-Typeがtext/plainではありません:', contentType);
    }

    return await response.text();
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
    // ローディング表示
    const importBtn = document.getElementById('uBlockUrlImportBtn');
    const originalText = importBtn.textContent;
    importBtn.textContent = '読み込み中...';
    importBtn.disabled = true;

    const filterText = await fetchFromUrl(url);
    document.getElementById('uBlockFilterInput').value = filterText;
    handleTextInputPreview();

    showStatus(`"${url}" からフィルターを読み込みました`, 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    // ローディング表示を元に戻す
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

  // ドラッグ開始時の処理
  textarea.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!dropZoneActive) {
      dropZone.style.display = 'block';
      dropZone.classList.add('active');
      dropZoneActive = true;
    }
  });

  // ドラッグ終了時の処理
  uBlockFormatUI.addEventListener('dragleave', (event) => {
    // ドロップゾーン外に出たときに非表示にする
    if (dropZoneActive && !isElementInDropZone(event.relatedTarget, dropZone)) {
      dropZone.classList.remove('active');
      dropZone.style.display = 'none';
      dropZoneActive = false;
    }
  });

  // ドロップ処理
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
    handleTextInputPreview();
    showStatus(`"${file.name}" を読み込みました`, 'success');
  } catch (error) {
    showStatus(`ファイル読み込みエラー: ${error.message}`, 'error');
  }
}

/**
 * 要素がドロップゾーン内にあるかどうかをチェック
 * @param {Element} element 
 * @param {Element} dropZone 
 * @returns {boolean}
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

    // Clear status after 5 seconds for errors, 3 seconds for success
    const timeout = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      if (statusDiv) {
        statusDiv.textContent = '';
        statusDiv.className = '';
      }
    }, timeout);
  }
}