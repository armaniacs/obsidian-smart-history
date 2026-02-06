/**
 * validation.js
 * uBlockインポートモジュール - バリデーション機能
 */

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