import { StorageKeys, saveSettings, getSettings } from '../utils/storage.js';
import { ObsidianClient } from '../background/obsidianClient.js';
import { init as initNavigation } from './navigation.js';

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

    // Obsidian
    if (settings[StorageKeys.OBSIDIAN_API_KEY]) {
        apiKeyInput.value = settings[StorageKeys.OBSIDIAN_API_KEY];
    }
    protocolInput.value = settings[StorageKeys.OBSIDIAN_PROTOCOL] || 'http';
    portInput.value = settings[StorageKeys.OBSIDIAN_PORT] || '27123';
    dailyPathInput.value = settings[StorageKeys.OBSIDIAN_DAILY_PATH] || '092.Daily';

    // AI Provider
    aiProviderSelect.value = settings[StorageKeys.AI_PROVIDER] || 'gemini';

    // Gemini
    if (settings[StorageKeys.GEMINI_API_KEY]) {
        geminiApiKeyInput.value = settings[StorageKeys.GEMINI_API_KEY];
    }
    geminiModelInput.value = settings[StorageKeys.GEMINI_MODEL] || 'gemini-1.5-flash';

    // OpenAI
    openaiBaseUrlInput.value = settings[StorageKeys.OPENAI_BASE_URL] || 'https://api.groq.com/openai/v1';
    if (settings[StorageKeys.OPENAI_API_KEY]) {
        openaiApiKeyInput.value = settings[StorageKeys.OPENAI_API_KEY];
    }
    openaiModelInput.value = settings[StorageKeys.OPENAI_MODEL] || 'openai/gpt-oss-20b';

    // OpenAI 2
    openai2BaseUrlInput.value = settings[StorageKeys.OPENAI_2_BASE_URL] || 'http://127.0.0.1:11434/v1';
    if (settings[StorageKeys.OPENAI_2_API_KEY]) {
        openai2ApiKeyInput.value = settings[StorageKeys.OPENAI_2_API_KEY];
    }
    openai2ModelInput.value = settings[StorageKeys.OPENAI_2_MODEL] || 'llama3';


    minVisitDurationInput.value = settings[StorageKeys.MIN_VISIT_DURATION] || 5;
    minScrollDepthInput.value = settings[StorageKeys.MIN_SCROLL_DEPTH] || 50;

    updateVisibility();
}

// Save and Test
saveBtn.addEventListener('click', async () => {
    statusDiv.textContent = 'Testing connection...';
    statusDiv.className = '';

    const newSettings = {
        [StorageKeys.OBSIDIAN_API_KEY]: apiKeyInput.value.trim(),
        [StorageKeys.OBSIDIAN_PROTOCOL]: protocolInput.value.trim(),
        [StorageKeys.OBSIDIAN_PORT]: portInput.value.trim(),
        [StorageKeys.OBSIDIAN_DAILY_PATH]: dailyPathInput.value.trim(),

        [StorageKeys.AI_PROVIDER]: aiProviderSelect.value,

        [StorageKeys.GEMINI_API_KEY]: geminiApiKeyInput.value.trim(),
        [StorageKeys.GEMINI_MODEL]: geminiModelInput.value.trim(),

        [StorageKeys.OPENAI_BASE_URL]: openaiBaseUrlInput.value.trim(),
        [StorageKeys.OPENAI_API_KEY]: openaiApiKeyInput.value.trim(),
        [StorageKeys.OPENAI_MODEL]: openaiModelInput.value.trim(),

        [StorageKeys.OPENAI_2_BASE_URL]: openai2BaseUrlInput.value.trim(),
        [StorageKeys.OPENAI_2_API_KEY]: openai2ApiKeyInput.value.trim(),
        [StorageKeys.OPENAI_2_MODEL]: openai2ModelInput.value.trim(),

        [StorageKeys.MIN_VISIT_DURATION]: parseInt(minVisitDurationInput.value, 10),
        [StorageKeys.MIN_SCROLL_DEPTH]: parseInt(minScrollDepthInput.value, 10)
    };

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

// Initialize navigation
initNavigation();

load();
