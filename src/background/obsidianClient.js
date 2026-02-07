import { getSettings, StorageKeys } from '../utils/storage.js';
import { buildDailyNotePath } from '../utils/dailyNotePathBuilder.js';
import { NoteSectionEditor } from './noteSectionEditor.js';
import { addLog, LogType } from '../utils/logger.js';

/**
 * Mutexクラス - 排他制御用
 * Obsidian APIへの競合回避を実装
 */
class Mutex {
  constructor() {
    this.locked = false;
    this.queue = [];
    this.lockedAt = null;
  }

  /**
   * ロックを取得する
   * ロックが解放されるまで待機
   */
  async acquire() {
    const now = Date.now();

    if (this.locked) {
      addLog(LogType.DEBUG, 'Mutex: Waiting for lock', {
        lockedAt: this.lockedAt - now + 'ms ago',
        queueLength: this.queue.length
      });
      return new Promise(resolve => {
        this.queue.push(resolve);
      });
    }

    this.locked = true;
    this.lockedAt = Date.now();
    addLog(LogType.DEBUG, 'Mutex: Lock acquired');
  }

  /**
   * ロックを解放する
   * 待機中のキューがある場合は次のタスクを実行
   */
  release() {
    if (!this.locked) {
      addLog(LogType.WARN, 'Mutex: Attempting to release unlocked mutex');
      return;
    }

    if (this.queue.length > 0) {
      // キューの先頭のタスクを実行
      const resolve = this.queue.shift();
      this.lockedAt = Date.now(); // 新しい所有者のためにタイムスタンプ更新
      resolve();
      addLog(LogType.DEBUG, 'Mutex: Lock transferred to waiting task', { remainingQueue: this.queue.length });
    } else {
      this.locked = false;
      this.lockedAt = null;
      addLog(LogType.DEBUG, 'Mutex: Lock released');
    }
  }

  /**
   * ロック状態を取得
   */
  isLocked() {
    return this.locked;
  }

  /**
   * ロック期間を取得
   */
  getLockDuration() {
    if (!this.locked || !this.lockedAt) {
      return 0;
    }
    return Date.now() - this.lockedAt;
  }
}

/**
 * Mutexのインスタンス（クロージャ経由で共有）
 * 日次ノートごとではなく、全体的な書き込み操作をシリアライズ
 */
const globalWriteMutex = new Mutex();

export class ObsidianClient {
    async _getConfig() {
        const settings = await getSettings();
        const protocol = settings[StorageKeys.OBSIDIAN_PROTOCOL] || 'http';
        const port = settings[StorageKeys.OBSIDIAN_PORT] || '27123';
        const apiKey = settings[StorageKeys.OBSIDIAN_API_KEY];

        if (!apiKey) {
            addLog(LogType.WARN, 'Obsidian API Key is missing');
            throw new Error('Error: API key is missing. Please check your Obsidian settings.');
        }

        return {
            baseUrl: `${protocol}://127.0.0.1:${port}`,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'text/markdown',
                'Accept': 'application/json'
            },
            settings
        };
    }

    async appendToDailyNote(content) {
        // ロックを取得して競合を回避
        await globalWriteMutex.acquire();

        try {
            const { baseUrl, headers, settings } = await this._getConfig();

            const dailyPathRaw = settings[StorageKeys.OBSIDIAN_DAILY_PATH] || '';
            const dailyPath = buildDailyNotePath(dailyPathRaw);
            const pathSegment = dailyPath ? `${dailyPath}/` : '';
            const targetUrl = `${baseUrl}/vault/${pathSegment}${buildDailyNotePath('')}.md`;

            try {
                const existingContent = await this._fetchExistingContent(targetUrl, headers);
                const newContent = NoteSectionEditor.insertIntoSection(
                    existingContent,
                    NoteSectionEditor.DEFAULT_SECTION_HEADER,
                    content
                );

                await this._writeContent(targetUrl, headers, newContent);
            } catch (error) {
                throw this._handleError(error, targetUrl);
            }
        } finally {
            // 確実にロックを解放
            globalWriteMutex.release();
        }
    }

    async _fetchExistingContent(url, headers) {
        const response = await fetch(url, {
            method: 'GET',
            headers
        });

        if (response.ok) {
            return await response.text();
        } else if (response.status === 404) {
            return '';
        } else {
            const errorText = await response.text();
            addLog(LogType.ERROR, `Failed to read daily note: ${response.status} ${errorText}`);
            throw new Error('Error: Failed to read daily note. Please check your Obsidian connection.');
        }
    }

    async _writeContent(url, headers, content) {
        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: content
        });

        if (!response.ok) {
            const errorText = await response.text();
            addLog(LogType.ERROR, `Obsidian API Error: ${response.status} ${errorText}`);
            throw new Error('Error: Failed to write to daily note. Please check your Obsidian connection.');
        }
    }

    _handleError(error, targetUrl) {
        let errorMessage = error.message;
        if (errorMessage.includes('Failed to fetch') && targetUrl.startsWith('https')) {
            addLog(LogType.ERROR, `Failed to connect to Obsidian at ${targetUrl}`);
            return new Error('Error: Failed to connect to Obsidian. Please visit the Obsidian URL in a new tab and accept the self-signed certificate.');
        }
        addLog(LogType.ERROR, `Failed to connect to Obsidian at ${targetUrl}. Cause: ${errorMessage}`);
        return new Error('Error: Failed to connect to Obsidian. Please check your settings and connection.');
    }

    async testConnection() {
        try {
            const { baseUrl, headers } = await this._getConfig();
            const response = await fetch(`${baseUrl}/`, {
                method: 'GET',
                headers
            });
            if (response.ok) {
                return { success: true, message: 'Success! Connected to Obsidian. Settings Saved.' };
            } else {
                addLog(LogType.ERROR, `Connection test failed with status: ${response.status}`);
                return { success: false, message: 'Connection Failed. Please check your settings.' };
            }
        } catch (e) {
            addLog(LogType.ERROR, `Connection test failed: ${e.message}`);
            return { success: false, message: 'Connection Failed. Please check your settings and connection.' };
        }
    }
}
