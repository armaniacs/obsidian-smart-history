/**
 * ローディングスピナー制御関数
 *
 * UF-403 ローディングスピナー追加機能
 */

/**
 * ローディングスピナーを表示する
 * @param {string} text - スピナーの横に表示するテキスト（省略可能、デフォルト: '処理中...'）
 * 🟢 要件定義に基づき実装（loading-spinner-requirements.md 186-196行目）
 */
export function showSpinner(text = '処理中...') {
  const spinner = document.getElementById('loadingSpinner');
  if (!spinner) {
    console.warn('loadingSpinner element not found');
    return;
  }
  const spinnerText = spinner.querySelector('.spinner-text');
  spinnerText.textContent = text;
  spinner.style.display = 'flex';
}

/**
 * ローディングスピナーを非表示にする
 * 🟢 要件定義に基づき実装（loading-spinner-requirements.md 201-204行目）
 */
export function hideSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (!spinner) {
    console.warn('loadingSpinner element not found');
    return;
  }
  spinner.style.display = 'none';
}