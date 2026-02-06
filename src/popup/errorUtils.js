/**
 * errorUtils.js
 * エラーハンドリング共通モジュール
 */

/**
 * エラーメッセージ定数
 */
export const ErrorMessages = {
  /**
   * コネクションエラー（Content Scriptとの通信失敗）
   */
  CONNECTION_ERROR: 'ページを再読み込みしてから再度お試しください',

  /**
   * ドメインブロックエラー
   */
  DOMAIN_BLOCKED: 'このドメインは記録が許可されていませんが特別に記録しますか？',

  /**
   * 一般エラープレフィックス
   */
  ERROR_PREFIX: '✗ エラー:',

  /**
   * 成功メッセージ
   */
  SUCCESS: '✓ Obsidianに保存しました',

  /**
   * キャンセルメッセージ
   */
  CANCELLED: 'キャンセルしました'
};

/**
 * エラータイプ
 */
export const ErrorType = {
  /** Content Scriptとの通信エラー */
  CONNECTION: 'CONNECTION',
  /** ドメインブロックエラー */
  DOMAIN_BLOCKED: 'DOMAIN_BLOCKED',
  /** 一般エラー */
  GENERAL: 'GENERAL'
};

/**
 * エラーがコネクションエラーかどうかを判定
 * @param {Error} error - エラーオブジェクト
 * @returns {boolean} コネクションエラーの場合true
 */
export function isConnectionError(error) {
  return error?.message && error.message.includes('Receiving end does not exist');
}

/**
 * エラーがドメインブロックエラーかどうかを判定
 * @param {Error} error - エラーオブジェクト
 * @returns {boolean} ドメインブロックエラーの場合true
 */
export function isDomainBlockedError(error) {
  return error?.message === 'このドメインは記録が許可されていません';
}

/**
 * エラータイプを判定
 * @param {Error} error - エラーオブジェクト
 * @returns {ErrorType} エラータイプ
 */
export function getErrorType(error) {
  if (isConnectionError(error)) {
    return ErrorType.CONNECTION;
  }
  if (isDomainBlockedError(error)) {
    return ErrorType.DOMAIN_BLOCKED;
  }
  return ErrorType.GENERAL;
}

/**
 * ユーザー向けエラーメッセージを取得
 * @param {Error} error - エラーオブジェクト
 * @returns {string} ユーザー向けエラーメッセージ
 */
export function getUserErrorMessage(error) {
  const type = getErrorType(error);

  switch (type) {
    case ErrorType.CONNECTION:
      return `${ErrorMessages.ERROR_PREFIX} ${ErrorMessages.CONNECTION_ERROR}`;
    case ErrorType.DOMAIN_BLOCKED:
      return ErrorMessages.DOMAIN_BLOCKED;
    default:
      return `${ErrorMessages.ERROR_PREFIX} ${error?.message || '不明なエラーが発生しました'}`;
  }
}

/**
 * エラーをステータス要素に表示
 * @param {HTMLElement} statusElement - ステータス要素
 * @param {Error} error - エラーオブジェクト
 * @param {Function} onForceRecord - 強制記録コールバック
 */
export function showError(statusElement, error, onForceRecord = null) {
  // エラークラスを設定
  statusElement.className = 'error';

  // ステータス要素をクリア
  statusElement.textContent = '';

  const type = getErrorType(error);

  if (type === ErrorType.DOMAIN_BLOCKED && onForceRecord) {
    // ドメインブロックエラー - 強制記録ボタンを表示
    statusElement.textContent = ErrorMessages.DOMAIN_BLOCKED;
    createForceRecordButton(statusElement, onForceRecord);
  } else {
    // その他のエラー - メッセージを表示
    statusElement.textContent = getUserErrorMessage(error);
  }
}

/**
 * 成功メッセージを表示
 * @param {HTMLElement} statusElement - ステータス要素
 * @param {string} message - 成功メッセージ（オプション）
 */
export function showSuccess(statusElement, message = ErrorMessages.SUCCESS) {
  statusElement.textContent = message;
  statusElement.className = 'success';
}

/**
 * 強制記録ボタンを作成
 * @param {HTMLElement} parentElement - 親要素
 * @param {Function} onClick - クリックハンドラー
 */
function createForceRecordButton(parentElement, onClick) {
  const forceBtn = document.createElement('button');
  forceBtn.textContent = '強制記録';
  forceBtn.className = 'secondary-btn';
  forceBtn.style.marginTop = '10px';
  forceBtn.style.backgroundColor = '#d9534f';

  forceBtn.onclick = () => {
    forceBtn.disabled = true;
    forceBtn.textContent = '記録中...';
    onClick();
  };

  parentElement.appendChild(forceBtn);
}

/**
 * エラーハンドリング共通処理
 * @param {Error} error - エラーオブジェクト
 * @param {Object} handlers - ハンドラー設定
 * @param {Function} handlers.onConnectionError - コネクションエラーハンドラー
 * @param {Function} handlers.onDomainBlocked - ドメインブロックエラーハンドラー
 * @param {Function} handlers.onGeneralError - 一般エラーハンドラー
 */
export function handleError(error, handlers) {
  const type = getErrorType(error);

  switch (type) {
    case ErrorType.CONNECTION:
      if (handlers.onConnectionError) {
        handlers.onConnectionError(error);
      }
      break;
    case ErrorType.DOMAIN_BLOCKED:
      if (handlers.onDomainBlocked) {
        handlers.onDomainBlocked(error);
      }
      break;
    default:
      if (handlers.onGeneralError) {
        handlers.onGeneralError(error);
      }
  }
}