/**
 * タイムアウト付きfetchラッパー
 * @param {string} url - リクエストURL
 * @param {object} options - fetchオプション
 * @param {number} timeoutMs - タイムアウト時間（ミリ秒）
 * @returns {Promise<Response>} fetchレスポンス
 * @throws {Error} タイムアウト時にエラーをスロー
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}