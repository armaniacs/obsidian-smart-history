import { StorageKeys, saveSettings, getSettings } from '../utils/storage.js';
import { ObsidianClient } from '../background/obsidianClient.js';
import { init as initNavigation } from './navigation.js';
import { init as initDomainFilter } from './domainFilter.js';
import { init as initPrivacySettings } from './privacySettings.js';
import { loadSettingsToInputs, extractSettingsFromInputs } from './settingsUiHelper.js';

// Elements
const apiKeyInput = document.getElementById('apiKey');
const protocolInput = document.getElementById('protocol');
const portInput = document.getElementById('port');
const dailyPathInput = document.getElementById('dailyPath');

const aiProviderSelect = document.getElementById('aiProvider');
const geminiSettingsDiv = document.getElementById('geminiSettings');
const openaiSettingsDiv = document.getElementById('openaiSettings');
const openai2SettingsDiv = document.getElementById('openai2Settings');

const geminiApiKeyInput = document.getElementById('geminiApiKey');
const geminiModelInput = document.getElementById('geminiModel');

const openaiBaseUrlInput = document.getElementById('openaiBaseUrl');
const openaiApiKeyInput = document.getElementById('openaiApiKey');
const openaiModelInput = document.getElementById('openaiModel');

const openai2BaseUrlInput = document.getElementById('openai2BaseUrl');
const openai2ApiKeyInput = document.getElementById('openai2ApiKey');
const openai2ModelInput = document.getElementById('openai2Model');

const minVisitDurationInput = document.getElementById('minVisitDuration');
const minScrollDepthInput = document.getElementById('minScrollDepth');
const saveBtn = document.getElementById('save');
const statusDiv = document.getElementById('status');

// Mapping of StorageKeys to DOM elements
const settingsMapping = {
    [StorageKeys.OBSIDIAN_API_KEY]: apiKeyInput,
    [StorageKeys.OBSIDIAN_PROTOCOL]: protocolInput,
    [StorageKeys.OBSIDIAN_PORT]: portInput,
    [StorageKeys.OBSIDIAN_DAILY_PATH]: dailyPathInput,
    [StorageKeys.AI_PROVIDER]: aiProviderSelect,
    [StorageKeys.GEMINI_API_KEY]: geminiApiKeyInput,
    [StorageKeys.GEMINI_MODEL]: geminiModelInput,
    [StorageKeys.OPENAI_BASE_URL]: openaiBaseUrlInput,
    [StorageKeys.OPENAI_API_KEY]: openaiApiKeyInput,
    [StorageKeys.OPENAI_MODEL]: openaiModelInput,
    [StorageKeys.OPENAI_2_BASE_URL]: openai2BaseUrlInput,
    [StorageKeys.OPENAI_2_API_KEY]: openai2ApiKeyInput,
    [StorageKeys.OPENAI_2_MODEL]: openai2ModelInput,
    [StorageKeys.MIN_VISIT_DURATION]: minVisitDurationInput,
    [StorageKeys.MIN_SCROLL_DEPTH]: minScrollDepthInput
};

function updateVisibility() {
    const provider = aiProviderSelect.value;
    geminiSettingsDiv.style.display = 'none';
    openaiSettingsDiv.style.display = 'none';
    openai2SettingsDiv.style.display = 'none';

    if (provider === 'gemini') {
        geminiSettingsDiv.style.display = 'block';
    } else if (provider === 'openai') {
        openaiSettingsDiv.style.display = 'block';
    } else if (provider === 'openai2') {
        openai2SettingsDiv.style.display = 'block';
    }
}

aiProviderSelect.addEventListener('change', updateVisibility);

// Load current settings
async function load() {
    const settings = await getSettings();
    loadSettingsToInputs(settings, settingsMapping);
    updateVisibility();
}

// Save and Test
saveBtn.addEventListener('click', async () => {
    statusDiv.textContent = 'Testing connection...';
    statusDiv.className = '';

    // Input validation
    const protocol = protocolInput.value.trim().toLowerCase();
    if (protocol !== 'http' && protocol !== 'https') {
        statusDiv.textContent = 'Error: Protocol must be "http" or "https".';
        statusDiv.className = 'error';
        return;
    }

    const port = parseInt(portInput.value.trim(), 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        statusDiv.textContent = 'Error: Port must be a number between 1 and 65535.';
        statusDiv.className = 'error';
        return;
    }

    const minVisitDuration = parseInt(minVisitDurationInput.value, 10);
    if (isNaN(minVisitDuration) || minVisitDuration < 0) {
        statusDiv.textContent = 'Error: Minimum visit duration must be a non-negative number.';
        statusDiv.className = 'error';
        return;
    }

    const minScrollDepth = parseInt(minScrollDepthInput.value, 10);
    if (isNaN(minScrollDepth) || minScrollDepth < 0 || minScrollDepth > 100) {
        statusDiv.textContent = 'Error: Minimum scroll depth must be a number between 0 and 100.';
        statusDiv.className = 'error';
        return;
    }

    const newSettings = extractSettingsFromInputs(settingsMapping);
    await saveSettings(newSettings);

    // Test connection
    const client = new ObsidianClient();
    const result = await client.testConnection();

    if (result.success) {
        statusDiv.textContent = 'Success! Connected to Obsidian. Settings Saved.';
        statusDiv.className = 'success';
    } else {
        statusDiv.textContent = `Connection Failed: ${result.message}`;
        statusDiv.className = 'error';

        if (result.message.includes('Failed to fetch') && protocolInput.value === 'https') {
            const url = `https://127.0.0.1:${portInput.value}/`;
            statusDiv.innerHTML += `<br><a href="${url}" target="_blank">Click here to accept self-signed certificate</a>`;
        }
    }
});

// Initialize (ES6 modules are deferred, so DOM is already ready)
initNavigation();
initDomainFilter();
initPrivacySettings();
load();

