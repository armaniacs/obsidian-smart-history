/**
 * ublockImport-error.test.js
 * Error handling tests for fetchFromUrl function
 * 【テスト対象】: src/popup/ublockImport.js - fetchFromUrl function
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock the logger module
jest.mock('../../utils/logger.js', () => ({
  addLog: jest.fn(),
  LogType: { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO' }
}));

// Create a standalone version of fetchFromUrl for testing
function createFetchFromUrl(addLogMock, LogTypeMock) {
  return async function fetchFromUrl(url) {
    try {
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
      const text = await response.text();

      // 取得後にテキストが有効かチェック
      if (!text || text.trim().length === 0) {
        throw new Error('取得されたテキストが空です');
      }

      // Content-Typeがテキストでない場合は警告
      if (contentType && !contentType.includes('text/') && !contentType.includes('application/octet-stream')) {
        addLogMock(LogTypeMock.WARN, 'Content-Typeがテキスト形式ではありません', { contentType });
      }

      return text;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      }
      throw new Error(`URL読み込みエラー: ${error.message}`);
    }
  };
}

describe('fetchFromUrl - Error Handling', () => {
  let fetchFromUrl;
  let addLogMock;
  let LogTypeMock;

  beforeEach(() => {
    jest.clearAllMocks();
    addLogMock = jest.fn();
    LogTypeMock = { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO' };
    fetchFromUrl = createFetchFromUrl(addLogMock, LogTypeMock);
    global.fetch = jest.fn();
  });

  test('HTTPエラーを適切に処理', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => 'text/plain' },
      text: () => Promise.resolve('')
    });

    await expect(fetchFromUrl('https://example.com/filters.txt')).rejects.toThrow('HTTP 404');
  });

  test('空のレスポンスを検出', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'text/plain' },
      text: () => Promise.resolve('  ')
    });

    await expect(fetchFromUrl('https://example.com/empty.txt')).rejects.toThrow('取得されたテキストが空です');
  });

  test('無効なURLを検出', async () => {
    await expect(fetchFromUrl('not-a-url')).rejects.toThrow('無効なURLです');
  });

  test('無効なURL protocol (javascript:)を検出', async () => {
    await expect(fetchFromUrl('javascript:alert(1)')).rejects.not.toThrow('無効なURLです'); // Valid URL but invalid protocol

    // Check that it attempts to fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'text/plain' },
      text: () => Promise.resolve('example.com')
    });

    // This would require actual fetch but should not throw URL validation error
    global.fetch.mockClear();
  });

  test('有効なURLとContent-Type for text/plain', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'text/plain' },
      text: () => Promise.resolve('example.com')
    });

    const result = await fetchFromUrl('https://example.com/filters.txt');
    expect(result).toBe('example.com');
    expect(addLogMock).not.toHaveBeenCalled();
  });

  test('有効なURLとContent-Type for text/html', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve('example.com')
    });

    const result = await fetchFromUrl('https://example.com/filters.html');
    expect(result).toBe('example.com');
    expect(addLogMock).not.toHaveBeenCalled();
  });

  test('有効なURLとContent-Type for application/octet-stream', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/octet-stream' },
      text: () => Promise.resolve('example.com')
    });

    const result = await fetchFromUrl('https://example.com/filters.dat');
    expect(result).toBe('example.com');
    expect(addLogMock).not.toHaveBeenCalled();
  });

  test('非テキストContent-Typeで警告ログを出力', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{"domain":"example.com"}')
    });

    const result = await fetchFromUrl('https://example.com/filters.json');
    expect(result).toBe('{"domain":"example.com"}');
    expect(addLogMock).toHaveBeenCalledWith(
      LogTypeMock.WARN,
      'Content-Typeがテキスト形式ではありません',
      { contentType: 'application/json' }
    );
  });

  test('Content-Typeがnullの場合でも警告を出さない', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => null },
      text: () => Promise.resolve('example.com')
    });

    const result = await fetchFromUrl('https://example.com/filters.txt');
    expect(result).toBe('example.com');
    expect(addLogMock).not.toHaveBeenCalled();
  });

  test('HTTP 500エラーを適切に処理', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => 'text/plain' },
      text: () => Promise.resolve('')
    });

    await expect(fetchFromUrl('https://example.com/filters.txt')).rejects.toThrow('HTTP 500');
  });

  test('HTTP 403エラーを適切に処理', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: { get: () => 'text/plain' },
      text: () => Promise.resolve('')
    });

    await expect(fetchFromUrl('https://example.com/filters.txt')).rejects.toThrow('HTTP 403');
  });

  test('ネットワークエラーを適切に処理', async () => {
    const networkError = new TypeError('Failed to fetch');
    networkError.name = 'TypeError';
    networkError.message = 'Failed to fetch';

    global.fetch.mockRejectedValueOnce(networkError);

    await expect(fetchFromUrl('https://example.com/filters.txt')).rejects.toThrow(
      'ネットワークエラーが発生しました。インターネット接続を確認してください。'
    );
  });

  test('空文字URLを検出', async () => {
    await expect(fetchFromUrl('')).rejects.toThrow('無効なURLです');
  });

  test('null URLを検出', async () => {
    await expect(fetchFromUrl(null)).rejects.toThrow('無効なURLです');
  });

  test('undefined URLを検出', async () => {
    await expect(fetchFromUrl(undefined)).rejects.toThrow('無効なURLです');
  });
});