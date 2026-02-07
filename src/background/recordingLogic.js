// src/background/recordingLogic.js
import { PrivacyPipeline } from './privacyPipeline.js';
import { NotificationHelper } from './notificationHelper.js';
import { addLog, LogType } from '../utils/logger.js';
import { isDomainAllowed } from '../utils/domainUtils.js';
import { sanitizeRegex } from '../utils/piiSanitizer.js';
import { getSettings, StorageKeys, getSavedUrls, setSavedUrls, saveSettings } from '../utils/storage.js';

const SETTINGS_CACHE_TTL = 30 * 1000; // 30 seconds

export class RecordingLogic {
  // キャッシュ状態永続化（SERVICE-WORKER再起動間で保持）
  static cacheState = {
    settingsCache: null,
    cacheTimestamp: null,
    cacheVersion: 0
  };

  constructor(obsidianClient, aiClient) {
    this.obsidian = obsidianClient;
    this.aiClient = aiClient;
    // インスタンスレベルのキャッシュ状態
    this.instanceCacheState = {
      settingsCache: null,
      cacheTimestamp: null,
      cacheVersion: null
    };
  }

  /**
   * 設定キャッシュから取得する
   * キャッシュが有効であればキャッシュを返し、なければstorageから取得してキャッシュする
   */
  async getSettingsWithCache() {
    const now = Date.now();

    // キャッシュバージョンが不一致の場合、直ちに再取得
    if (this.instanceCacheState.cacheVersion !== null &&
        this.instanceCacheState.cacheVersion !== RecordingLogic.cacheState.cacheVersion) {
      addLog(LogType.DEBUG, 'Settings version mismatch, fetching fresh', {
        instanceVersion: this.instanceCacheState.cacheVersion,
        globalVersion: RecordingLogic.cacheState.cacheVersion
      });
      // キャッシュをスキップしてstorageから取得へ
      return this._fetchAndCacheSettings(now);
    }

    // インスタンスキャッシュを確認
    if (this.instanceCacheState.settingsCache) {
      const age = now - this.instanceCacheState.cacheTimestamp;
      if (age < SETTINGS_CACHE_TTL && this.instanceCacheState.cacheVersion === RecordingLogic.cacheState.cacheVersion) {
        addLog(LogType.DEBUG, 'Settings cache hit', { age: age + 'ms' });
        return this.instanceCacheState.settingsCache;
      }
    }

    // staticキャッシュを確認
    if (RecordingLogic.cacheState.settingsCache) {
      const age = now - RecordingLogic.cacheState.cacheTimestamp;
      if (age < SETTINGS_CACHE_TTL) {
        addLog(LogType.DEBUG, 'Settings cache hit (static)', { age: age + 'ms' });
        this.instanceCacheState.settingsCache = RecordingLogic.cacheState.settingsCache;
        this.instanceCacheState.cacheTimestamp = RecordingLogic.cacheState.cacheTimestamp;
        this.instanceCacheState.cacheVersion = RecordingLogic.cacheState.cacheVersion;
        return RecordingLogic.cacheState.settingsCache;
      }
    }

    // キャッシュが無効な場合、storageから取得
    return this._fetchAndCacheSettings(now);
  }

  /**
   * storageから設定を取得しキャッシュに保存
   */
  async _fetchAndCacheSettings(now) {
    const settings = await getSettings();

    // キャッシュに保存
    RecordingLogic.cacheState.settingsCache = settings;
    RecordingLogic.cacheState.cacheTimestamp = now;
    RecordingLogic.cacheState.cacheVersion++;

    this.instanceCacheState.settingsCache = settings;
    this.instanceCacheState.cacheTimestamp = now;
    this.instanceCacheState.cacheVersion = RecordingLogic.cacheState.cacheVersion;

    addLog(LogType.DEBUG, 'Settings cache updated', { cacheVersion: RecordingLogic.cacheState.cacheVersion });

    return settings;
  }

  /**
   * 設定キャッシュを無効化する
   * 設定が変更された場合に呼び出す
   */
  static invalidateSettingsCache() {
    addLog(LogType.DEBUG, 'Settings cache invalidated');
    RecordingLogic.cacheState.settingsCache = null;
    RecordingLogic.cacheState.cacheTimestamp = null;
    RecordingLogic.cacheState.cacheVersion++;
  }

  /**
   * インスタンスキャッシュを無効化する
   */
  invalidateInstanceCache() {
    this.instanceCacheState.settingsCache = null;
    this.instanceCacheState.cacheTimestamp = null;
  }

  async record(data) {
    const { title, url, content, force = false, skipDuplicateCheck = false, alreadyProcessed = false, previewOnly = false } = data;

    try {
      // 1. Check domain filter
      const isAllowed = await isDomainAllowed(url);

      if (!isAllowed && !force) {
        return { success: false, error: 'DOMAIN_BLOCKED' };
      }

      if (!isAllowed && force) {
        addLog(LogType.WARN, 'Force recording blocked domain', { url });
      }

      // 2. Check for duplicates
      // 設定キャッシュを使用
      const settings = await this.getSettingsWithCache();
      const urlSet = await getSavedUrls();

      if (!skipDuplicateCheck && urlSet.has(url)) {
        return { success: true, skipped: true };
      }

      // 3. Privacy Pipeline Processing
      const pipeline = new PrivacyPipeline(settings, this.aiClient, { sanitizeRegex });
      const pipelineResult = await pipeline.process(content, {
        previewOnly,
        alreadyProcessed
      });

      if (previewOnly) {
        return {
          ...pipelineResult,
          title,
          url
        };
      }

      const summary = pipelineResult.summary || 'Summary not available.';

      // 4. Format Markdown
      const timestamp = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      const markdown = `- ${timestamp} [${title}](${url})\n    - AI要約: ${summary}`;

      // 5. Save to Obsidian
      await this.obsidian.appendToDailyNote(markdown);
      addLog(LogType.INFO, 'Saved to Obsidian', { title, url });

      // 6. Update saved list
      if (!urlSet.has(url)) {
        urlSet.add(url);
        await setSavedUrls(urlSet);
      }

      // 7. Notification
      NotificationHelper.notifySuccess('Saved to Obsidian', `Saved: ${title}`);

      return { success: true };

    } catch (e) {
      addLog(LogType.ERROR, 'Failed to process recording', { error: e.message, url });
      NotificationHelper.notifyError(e.message);

      return { success: false, error: e.message };
    }
  }

  async recordWithPreview(data) {
    const result = await this.record({ ...data, previewOnly: true });
    return result;
  }
}