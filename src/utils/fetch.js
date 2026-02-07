/**
 * fetch.js
 * タイムアウト付きfetchラッパー
 *
 * Security features (from P1 code review):
 * - Parameter validation for timeoutMs
 * - Support for optional URL validation
 */

// セキュリティ定数
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:']);
const BLOCKED_PATTERNS = [
  // 注: 127.0.0.1 は Obsidian API で使用されるため除外
  // 注: localhost は Obsidian API で使用される可能性があるため除外
  /^0x7f\./i,         // 0x7f.0.0.1 (alternative localhost format, 除外済み)
  /^::1/,             // IPv6 localhost (除外済み)
  /^\[::f{0,4}:1\]$/i // ::1 in brackets (除外済み)
];

const MIN_TIMEOUT_MS = 100;      // 最小100ms
const MAX_TIMEOUT_MS = 300000;   // 最大5分

/**
 * URLを検証（オプション）
 * @param {string} url - 検証するURL
 * @param {object} options - 検証オプション
 * @param {boolean} options.requireValidProtocol - プロトコル検証を要求するかどうか（デフォルトtrue）
 * @param {boolean} options.blockLocalhost - localhostをブロックするかどうか（デフォルトfalse）
 * @throws {Error} URLが無効またはブロックされている場合
 */
function validateUrl(url, options = {}) {
  const { requireValidProtocol = true, blockLocalhost = false } = options;

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    throw new Error(`Invalid URL: ${e.message}`);
  }

  // プロトコル検証（オプション）
  if (requireValidProtocol && !ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only http:// and https:// are allowed.`);
  }

  // localhostブロック（オプション）
  // Obsidian APIでlocalhostを使用するためデフォルトではブロックしない
  if (blockLocalhost) {
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(parsedUrl.hostname)) {
        throw new Error(`Blocked hostname: ${parsedUrl.hostname}. Access to localhost addresses is not allowed.`);
      }
    }
  }
}

/**
 * タイムアウトパラメータを検証
 * @param {number} timeoutMs - 検証するタイムアウト値（ミリ秒）
 * @throws {Error} タイムアウト値が無効な場合
 */
function validateTimeout(timeoutMs) {
  if (typeof timeoutMs !== 'number') {
    throw new Error(`Timeout must be a number, got ${typeof timeoutMs}`);
  }

  if (!Number.isFinite(timeoutMs)) {
    throw new Error(`Timeout must be a finite number, got ${timeoutMs}`);
  }

  if (timeoutMs < MIN_TIMEOUT_MS) {
    throw new Error(`Timeout must be at least ${MIN_TIMEOUT_MS}ms, got ${timeoutMs}ms`);
  }

  if (timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error(`Timeout must not exceed ${MAX_TIMEOUT_MS}ms, got ${timeoutMs}ms`);
  }
}

/**
 * タイムアウト付きfetchラッパー
 * @param {string} url - リクエストURL
 * @param {object} options - fetchオプションとURL検証オプション
 * @param {number} timeoutMs - タイムアウト時間（ミリ秒）、デフォルト30000ms
 * @returns {Promise<Response>} fetchレスポンス
 * @throws {Error} 無効なURL、タイムアウト、またはネットワークエラー
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  // URL検証（オプション - デフォルトではlocalhostを許可）
  const { requireValidProtocol = true, blockLocalhost = false, ...fetchOptions } = options;
  validateUrl(url, { requireValidProtocol, blockLocalhost });

  // タイムアウト検証
  validateTimeout(timeoutMs);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      // 技術的な詳細を除外して一般的なエラーメッセージを返す
      throw new Error('Error: Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}