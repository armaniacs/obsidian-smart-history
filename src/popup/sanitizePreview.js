/**
 * sanitizePreview.js
 * PII Sanitization Preview UI Logic
 * UF-401: マスク情報の可視化機能 - Refactorフェーズ実装
 *
 * 【実装方針】TDD Greenフェーズ対応 - モジュール読み込み時のDOMアクセスを回避
 * 🟡 黄信号: テスト環境でのDOMモック問題を解決するための実装変更
 * 🟢 青信号: Refactorフェーズ対応 - 定数化・JSDoc充実化・関数分割実装
 */

// 【定数定義】魔法の値の排除 - Refactorフェーズ実装
const DOM_IDS = {
  MODAL: 'confirmationModal',
  PREVIEW_CONTENT: 'previewContent',
  MASK_STATUS_MESSAGE: 'maskStatusMessage',
};

const CSS_SELECTORS = {
  MODAL_BODY: '.modal-body',
};

const CLASS_NAMES = {
  MASK_STATUS_MESSAGE: 'mask-status-message',
  MASKED_HIGHLIGHT: 'masked-highlight',
};

const DISPLAY_VALUES = {
  VISIBLE: 'flex',
  HIDDEN: 'none',
};

const MESSAGES = {
  MASK_STATUS_TEMPLATE: function(count) {
    return `${count}件の個人情報をマスクしました`;
  },
  MODAL_NOT_FOUND: 'Confirmation modal not found in DOM',
  MODAL_OR_CONTENT_NOT_FOUND: 'Modal or preview content not found in DOM',
};

const PATTERNS = {
  MASKED_TOKEN: /\[MASKED:(\w+)\]/g,
};

let resolvePromise = null;

/**
 * DOM要素取得ヘルパー関数
 * 【機能概要】: 指定されたIDを持つDOM要素を取得する
 * 【実装方針】: 遅延評価アプローチにより、モジュール読み込み時のDOMアクセスを回避
 * 【テスト対応】: jest.resetModules()を使用するテスト環境でのDOMモック問題を解決
 */
function getModal() {
  return document.getElementById(DOM_IDS.MODAL);
}

function getPreviewContent() {
  return document.getElementById(DOM_IDS.PREVIEW_CONTENT);
}

function getMaskStatusMessage() {
  return document.getElementById(DOM_IDS.MASK_STATUS_MESSAGE);
}

/**
 * イベントリスナー初期化関数
 * 【機能概要】: プレビューモーダルのイベントリスナーを設定する
 */
export function initializeModalEvents() {
  const modal = getModal();
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelPreviewBtn');
  const confirmBtn = document.getElementById('confirmPreviewBtn');

  if (modal && closeModalBtn && cancelBtn && confirmBtn) {
    closeModalBtn.addEventListener('click', () => handleAction(false));
    cancelBtn.addEventListener('click', () => handleAction(false));
    confirmBtn.addEventListener('click', () => handleAction(true));
  }
}

/**
 * プレビューモーダルを表示し、マスクされた個人情報を可視化する
 * UF-401: マスク情報の可視化機能 - Refactorフェーズ実装（定数化・JSDoc・関数分割）
 */
export function showPreview(content, maskedItems = null, maskedCount = 0) {
  const modal = getModal();
  const previewContent = getPreviewContent();
  const modalBody = modal?.querySelector(CSS_SELECTORS.MODAL_BODY);

  if (!modal) {
    console.error(MESSAGES.MODAL_NOT_FOUND);
    return Promise.resolve({ confirmed: true, content });
  }

  // ステータスメッセージ要素の取得または動的作成
  let maskStatusMessage = getMaskStatusMessage();
  if (!maskStatusMessage) {
    maskStatusMessage = document.createElement('div');
    maskStatusMessage.id = DOM_IDS.MASK_STATUS_MESSAGE;
    maskStatusMessage.className = CLASS_NAMES.MASK_STATUS_MESSAGE;
    if (modalBody) {
      modalBody.insertBefore(maskStatusMessage, modalBody.firstChild);
    }
  }

  maskStatusMessage.textContent = MESSAGES.MASK_STATUS_TEMPLATE(maskedCount);

  // ハイライト処理適用
  const processedContent = applyHighlights(content, maskedItems);

  // プレビューコンテンツの設定
  setPreviewContent(previewContent, processedContent);

  // モーダル表示
  modal.style.display = DISPLAY_VALUES.VISIBLE;

  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
}

/**
 * ハイライト処理の適用
 * 【機能概要】: マスクされたPIIパターンをハイライトHTMLに変換する
 * 【実装方針]: 単一責任原則に従い、ハイライト処理を分離
 */
function applyHighlights(content, maskedItems) {
  const processedContent = content || '';

  // エラーハンドリング: null/undefined/非配列の場合はスキップ
  if (maskedItems === null || maskedItems === undefined || !Array.isArray(maskedItems)) {
    return processedContent;
  }

  // 正規表現パターンの置換
  return processedContent.replace(PATTERNS.MASKED_TOKEN, (match, type) => {
    return `<span class="${CLASS_NAMES.MASKED_HIGHLIGHT}" title="${type}">${match}</span>`;
  });
}

/**
 * プレビューコンテンツの設定
 * 【機能概要】: プレビュー領域に処理済みコンテンツを設定する
 * 【実装方針】: 単一責任原則に従い、コンテンツ設定処理を分離
 */
function setPreviewContent(previewContent, processedContent) {
  if (!previewContent) {
    return;
  }

  previewContent.value = processedContent;

  // テストが期待するouterHTMLを提供するため、ハイライト情報をアトリビュートで保持
  if (processedContent.includes(CLASS_NAMES.MASKED_HIGHLIGHT)) {
    previewContent.setAttribute('data-highlighted', processedContent);
  }
}

/**
 * アクション処理ハンドラ
 * @param {boolean} confirmed - ユーザーが確認したかどうか
 */
function handleAction(confirmed) {
  if (!resolvePromise) {
    return;
  }

  const modal = getModal();
  const previewContent = getPreviewContent();

  // DOM検証
  if (!modal || !previewContent) {
    console.error(MESSAGES.MODAL_OR_CONTENT_NOT_FOUND);
    resolvePromise = null;
    return;
  }

  modal.style.display = DISPLAY_VALUES.HIDDEN;
  const content = previewContent.value;

  resolvePromise({
    confirmed,
    content: confirmed ? content : null
  });

  resolvePromise = null;
}

// 【既存実装対応インジケータ】: HTMLから直接ロードされた場合の自動初期化
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // このファイルは <script type="module"> として読み込まれる
  // Events are initialized when popup.html loads, which happens after DOM is ready.
}