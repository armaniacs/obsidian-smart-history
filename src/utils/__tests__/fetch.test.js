import { fetchWithTimeout } from '../fetch.js';

describe('fetchWithTimeout', () => {
  test('正常レスポンスを返す', async () => {
    const mockResponse = { ok: true };
    global.fetch = jest.fn(() => Promise.resolve(mockResponse));

    const response = await fetchWithTimeout('https://example.com', {}, 1000);
    expect(response.ok).toBe(true);
  });

  test('成功率ンスでタイマーをクリアする', async () => {
    let clearTimeoutCalled = false;
    const originalClearTimeout = global.clearTimeout;

    global.clearTimeout = jest.fn(() => {
      clearTimeoutCalled = true;
    });

    try {
      const mockResponse = { ok: true };
      global.fetch = jest.fn(() => Promise.resolve(mockResponse));

      const response = await fetchWithTimeout('https://example.com', {}, 1000);
      expect(response.ok).toBe(true);
      expect(clearTimeoutCalled).toBe(true);
    } finally {
      global.clearTimeout = originalClearTimeout;
    }
  });

  test('fetchエラーをスローする', async () => {
    const testError = new Error('Network error');
    global.fetch = jest.fn(() => Promise.reject(testError));

    await expect(fetchWithTimeout('https://example.com', {}, 1000))
      .rejects.toBe(testError);
  });

  test('デフォルトのタイムアウトは30000ms', async () => {
    const mockResponse = { ok: true };
    global.fetch = jest.fn(() => Promise.resolve(mockResponse));

    let actualTimeout = 0;
    const originalSetTimeout = global.setTimeout;

    global.setTimeout = jest.fn((callback, ms) => {
      actualTimeout = ms;
      return 999;
    });

    try {
      const response = await fetchWithTimeout('https://example.com');
      expect(actualTimeout).toBe(30000);
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });

  test('カスタムタイムアウトを設定できる', async () => {
    const mockResponse = { ok: true };
    global.fetch = jest.fn(() => Promise.resolve(mockResponse));

    let actualTimeout = 0;
    const originalSetTimeout = global.setTimeout;

    global.setTimeout = jest.fn((callback, ms) => {
      actualTimeout = ms;
      return 999;
    });

    try {
      const response = await fetchWithTimeout('https://example.com', {}, 5000);
      expect(actualTimeout).toBe(5000);
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });
});