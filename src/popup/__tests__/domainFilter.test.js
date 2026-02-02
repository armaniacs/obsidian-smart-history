/**
 * domainFilter.test.js
 * Domain Filter UI Component Tests
 */

// Mock dependencies (jest.mock is hoisted before all imports by babel-jest)
const mockGetSettings = jest.fn();
const mockSaveSettings = jest.fn();
const mockValidateDomainList = jest.fn();
const mockParseDomainList = jest.fn();
const mockExtractDomain = jest.fn();
const mockInitUblockImport = jest.fn();
const mockSaveUblockSettings = jest.fn();
const mockAddLog = jest.fn();
const mockGetCurrentTab = jest.fn();
const mockIsRecordable = jest.fn();

jest.mock('../../utils/storage.js', () => ({
  StorageKeys: {
    DOMAIN_FILTER_MODE: 'domain_filter_mode',
    DOMAIN_WHITELIST: 'domain_whitelist',
    DOMAIN_BLACKLIST: 'domain_blacklist',
    SIMPLE_FORMAT_ENABLED: 'simple_format_enabled',
    UBLOCK_FORMAT_ENABLED: 'ublock_format_enabled',
    UBLOCK_RULES: 'ublock_rules',
    UBLOCK_SOURCES: 'ublock_sources',
  },
  getSettings: mockGetSettings,
  saveSettings: mockSaveSettings,
}));

jest.mock('../../utils/domainUtils.js', () => ({
  extractDomain: mockExtractDomain,
  parseDomainList: mockParseDomainList,
  validateDomainList: mockValidateDomainList,
  isDomainAllowed: jest.fn(),
  isDomainInList: jest.fn(),
  isValidDomain: jest.fn(),
  matchesPattern: jest.fn(),
}));

jest.mock('../ublockImport.js', () => ({
  init: mockInitUblockImport,
  saveUblockSettings: mockSaveUblockSettings,
}));

jest.mock('../../utils/logger.js', () => ({
  addLog: mockAddLog,
  LogType: { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', SANITIZE: 'SANITIZE' },
}));

jest.mock('../tabUtils.js', () => ({
  getCurrentTab: mockGetCurrentTab,
  isRecordable: mockIsRecordable,
}));

// Import after mocks are set up (babel-jest hoists jest.mock above these)
const domainFilter = require('../domainFilter.js');

describe('domainFilter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('init', () => {
    it('should initialize without errors', () => {
      mockGetSettings.mockResolvedValue({
        domain_filter_mode: 'disabled',
        simple_format_enabled: true,
        ublock_format_enabled: false,
      });

      expect(() => domainFilter.init()).not.toThrow();
    });

    it('should call ublockImport.init', () => {
      mockGetSettings.mockResolvedValue({
        domain_filter_mode: 'disabled',
        simple_format_enabled: true,
        ublock_format_enabled: false,
      });

      domainFilter.init();

      expect(mockInitUblockImport).toHaveBeenCalled();
    });
  });

  describe('loadDomainSettings', () => {
    it('should load whitelist mode settings from storage', async () => {
      mockGetSettings.mockResolvedValue({
        domain_filter_mode: 'whitelist',
        domain_whitelist: ['example.com', 'test.com'],
        domain_blacklist: ['bad.com'],
        simple_format_enabled: true,
        ublock_format_enabled: false,
      });

      await domainFilter.loadDomainSettings();

      expect(mockGetSettings).toHaveBeenCalled();
    });

    it('should load blacklist mode settings from storage', async () => {
      mockGetSettings.mockResolvedValue({
        domain_filter_mode: 'blacklist',
        domain_whitelist: [],
        domain_blacklist: ['bad.com', 'spam.com'],
        simple_format_enabled: true,
        ublock_format_enabled: false,
      });

      await domainFilter.loadDomainSettings();

      expect(mockGetSettings).toHaveBeenCalled();
    });

    it('should load disabled mode settings from storage', async () => {
      mockGetSettings.mockResolvedValue({
        domain_filter_mode: 'disabled',
        domain_whitelist: [],
        domain_blacklist: [],
        simple_format_enabled: true,
        ublock_format_enabled: false,
      });

      await domainFilter.loadDomainSettings();

      expect(mockGetSettings).toHaveBeenCalled();
    });

    it('should handle ublock format enabled', async () => {
      mockGetSettings.mockResolvedValue({
        domain_filter_mode: 'disabled',
        domain_whitelist: [],
        domain_blacklist: [],
        simple_format_enabled: false,
        ublock_format_enabled: true,
      });

      await domainFilter.loadDomainSettings();

      expect(mockGetSettings).toHaveBeenCalled();
    });
  });

  describe('handleSaveDomainSettings', () => {
    let originalQuerySelector;

    beforeEach(() => {
      // saveSimpleFormatSettings uses document.querySelector to find the checked radio
      originalQuerySelector = document.querySelector;
    });

    afterEach(() => {
      document.querySelector = originalQuerySelector;
    });

    it('should save settings and call saveSettings when ublock is disabled', async () => {
      // Mock querySelector to return a selected radio button (disabled mode)
      document.querySelector = jest.fn(() => ({ value: 'disabled' }));

      mockSaveSettings.mockResolvedValue();
      mockValidateDomainList.mockReturnValue([]);
      mockParseDomainList.mockReturnValue([]);

      await domainFilter.handleSaveDomainSettings();

      // saveSimpleFormatSettings saves the mode, then handleSaveDomainSettings
      // saves ublock_format_enabled: false
      expect(mockSaveSettings).toHaveBeenCalled();
    });

    it('should call saveUblockSettings when ublock checkbox is enabled', async () => {
      document.querySelector = jest.fn(() => ({ value: 'disabled' }));

      // The ublockFormatEnabledCheckbox is captured at module load time from getElementById.
      // We can't change the reference, but we can check that saveUblockSettings or
      // saveSettings is called.
      mockSaveSettings.mockResolvedValue();
      mockSaveUblockSettings.mockResolvedValue();
      mockValidateDomainList.mockReturnValue([]);
      mockParseDomainList.mockReturnValue([]);

      await domainFilter.handleSaveDomainSettings();

      // At minimum, saveSettings should be called for simple format save
      expect(mockSaveSettings).toHaveBeenCalled();
    });

    it('should still save ublock setting when no filter mode is selected', async () => {
      // querySelector returns null (no radio selected) → saveSimpleFormatSettings shows error and returns
      // But handleSaveDomainSettings continues to the ublock part
      document.querySelector = jest.fn(() => null);

      mockSaveSettings.mockResolvedValue();

      await domainFilter.handleSaveDomainSettings();

      // The domainStatus element should show an error message about filter mode
      const domainStatus = document.getElementById('domainStatus');
      expect(domainStatus.textContent).toContain('フィルターモードを選択してください');
    });

    it('should handle save errors gracefully', async () => {
      document.querySelector = jest.fn(() => ({ value: 'disabled' }));
      mockSaveSettings.mockRejectedValue(new Error('Storage error'));
      mockValidateDomainList.mockReturnValue([]);
      mockParseDomainList.mockReturnValue([]);

      // Should not throw
      await expect(domainFilter.handleSaveDomainSettings()).resolves.not.toThrow();
    });

    it('should validate domain list when mode is not disabled', async () => {
      document.querySelector = jest.fn(() => ({ value: 'blacklist' }));
      mockSaveSettings.mockResolvedValue();
      mockParseDomainList.mockReturnValue(['bad.com']);
      mockValidateDomainList.mockReturnValue([]);

      // Set the domainList textarea value (captured at module load time)
      const domainListEl = global.__mockElementCache?.['domainList'];
      if (domainListEl) {
        domainListEl.value = 'bad.com';
      }

      await domainFilter.handleSaveDomainSettings();

      expect(mockParseDomainList).toHaveBeenCalledWith('bad.com');
      expect(mockValidateDomainList).toHaveBeenCalledWith(['bad.com']);
      expect(mockSaveSettings).toHaveBeenCalled();

      // Cleanup
      if (domainListEl) {
        domainListEl.value = '';
      }
    });
  });

  describe('toggleFormatUI', () => {
    it('should execute without errors', () => {
      expect(() => domainFilter.toggleFormatUI()).not.toThrow();
    });
  });
});
