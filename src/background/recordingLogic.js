// src/background/recordingLogic.js
import { PrivacyPipeline } from './privacyPipeline.js';
import { NotificationHelper } from './notificationHelper.js';
import { addLog, LogType } from '../utils/logger.js';
import { isDomainAllowed } from '../utils/domainUtils.js';
import { sanitizeRegex } from '../utils/piiSanitizer.js';
import { getSettings, StorageKeys, getSavedUrls, setSavedUrls } from '../utils/storage.js';

export class RecordingLogic {
  constructor(obsidianClient, aiClient) {
    this.obsidian = obsidianClient;
    this.aiClient = aiClient;
  }

  async record(data) {
    const { title, url, content, force = false, skipDuplicateCheck = false, alreadyProcessed = false, previewOnly = false } = data;

    try {
      // 1. Check domain filter
      const isAllowed = await isDomainAllowed(url);

      if (!isAllowed && !force) {
        return { success: false, error: 'このドメインは記録が許可されていません' };
      }

      if (!isAllowed && force) {
        addLog(LogType.WARN, 'Force recording blocked domain', { url });
      }

      // 2. Check for duplicates
      const settings = await getSettings();
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