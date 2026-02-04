// src/background/__tests__/recordingLogic.test.js
import { RecordingLogic } from '../recordingLogic.js';
import * as storage from '../../utils/storage.js';
import * as domainUtils from '../../utils/domainUtils.js';
import * as privacy from '../privacyPipeline.js';

jest.mock('../../utils/storage.js');
jest.mock('../../utils/domainUtils.js');
jest.mock('../privacyPipeline.js');

describe('RecordingLogic', () => {
  const mockObsidian = {
    appendToDailyNote: jest.fn()
  };

  const mockAiClient = {
    getLocalAvailability: jest.fn().mockResolvedValue('readily'),
    summarizeLocally: jest.fn().mockResolvedValue({ success: true, summary: 'test' }),
    generateSummary: jest.fn().mockResolvedValue('Cloud summary')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Chrome notifications APIが存在する場合のみモック
    if (!chrome.notifications) {
      chrome.notifications = { create: jest.fn() };
    }
    // storageのデフォルトモック
    storage.getSettings.mockResolvedValue({ PRIVACY_MODE: 'full_pipeline', PII_SANITIZE_LOGS: true });
    storage.getSavedUrls.mockResolvedValue(new Set());
    storage.setSavedUrls.mockResolvedValue();
    storage.StorageKeys = {
      PRIVACY_MODE: 'PRIVACY_MODE',
      PII_SANITIZE_LOGS: 'PII_SANITIZE_LOGS'
    };
    // domainUtilsのデフォルトモック
    domainUtils.isDomainAllowed.mockResolvedValue(true);
    // PrivacyPipelineのデフォルトモック
    privacy.PrivacyPipeline.mockImplementation(() => ({
      process: jest.fn().mockResolvedValue({ summary: 'Test summary', maskedCount: 0 })
    }));
  });

  describe('record', () => {
    it('should skip recording when domain is not allowed', async () => {
      const logic = new RecordingLogic(mockObsidian, mockAiClient);
      domainUtils.isDomainAllowed.mockResolvedValue(false);

      const result = await logic.record({
        url: 'https://blocked.com',
        title: 'Blocked',
        content: 'Content'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('許可されていません');
    });

    it('should skip recording when URL is already saved', async () => {
      const logic = new RecordingLogic(mockObsidian, mockAiClient);
      storage.getSavedUrls.mockResolvedValue(new Set(['https://test.com']));

      const result = await logic.record({
        url: 'https://test.com',
        title: 'Test',
        content: 'Content'
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });
});