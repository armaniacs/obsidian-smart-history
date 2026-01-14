import { StorageKeys, saveSettings, getSettings } from '../utils/storage.js';
import { ObsidianClient } from '../background/obsidianClient.js';

// Elements
const apiKeyInput = document.getElementById('apiKey');
const protocolInput = document.getElementById('protocol');
const portInput = document.getElementById('port');
const geminiApiKeyInput = document.getElementById('geminiApiKey');
const geminiModelInput = document.getElementById('geminiModel');
const minVisitDurationInput = document.getElementById('minVisitDuration');
const minScrollDepthInput = document.getElementById('minScrollDepth');
const saveBtn = document.getElementById('save');
const statusDiv = document.getElementById('status');

// Load current settings
async function load() {
    const settings = await getSettings();
    if (settings[StorageKeys.OBSIDIAN_API_KEY]) {
        apiKeyInput.value = settings[StorageKeys.OBSIDIAN_API_KEY];
    }
    protocolInput.value = settings[StorageKeys.OBSIDIAN_PROTOCOL] || 'https';
    portInput.value = settings[StorageKeys.OBSIDIAN_PORT] || '27123';

    if (settings[StorageKeys.GEMINI_API_KEY]) {
        geminiApiKeyInput.value = settings[StorageKeys.GEMINI_API_KEY];
    }
    geminiModelInput.value = settings[StorageKeys.GEMINI_MODEL] || 'gemini-1.5-flash';
    minVisitDurationInput.value = settings[StorageKeys.MIN_VISIT_DURATION] || 5;
    minScrollDepthInput.value = settings[StorageKeys.MIN_SCROLL_DEPTH] || 50;
}

// Save and Test
saveBtn.addEventListener('click', async () => {
    statusDiv.textContent = 'Testing connection...';
    statusDiv.className = '';

    const newSettings = {
        [StorageKeys.OBSIDIAN_API_KEY]: apiKeyInput.value.trim(),
        [StorageKeys.OBSIDIAN_PROTOCOL]: protocolInput.value.trim(),
        [StorageKeys.OBSIDIAN_PORT]: portInput.value.trim(),
        [StorageKeys.GEMINI_API_KEY]: geminiApiKeyInput.value.trim(),
        [StorageKeys.GEMINI_MODEL]: geminiModelInput.value.trim(),
        [StorageKeys.MIN_VISIT_DURATION]: parseInt(minVisitDurationInput.value, 10),
        [StorageKeys.MIN_SCROLL_DEPTH]: parseInt(minScrollDepthInput.value, 10)
    };

    await saveSettings(newSettings);

    // Test connection
    const client = new ObsidianClient();
    const result = await client.testConnection();

    if (result.success) {
        statusDiv.textContent = 'Success! Connected to Obsidian.';
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

load();
