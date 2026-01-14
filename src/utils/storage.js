/**
 * storage.js
 * Wrapper for chrome.storage.local to manage settings.
 */

export const StorageKeys = {
    OBSIDIAN_API_KEY: 'obsidian_api_key',
    OBSIDIAN_PROTOCOL: 'obsidian_protocol', // 'http' or 'https'
    OBSIDIAN_PORT: 'obsidian_port',
    GEMINI_API_KEY: 'gemini_api_key',
    MIN_VISIT_DURATION: 'min_visit_duration',
    MIN_SCROLL_DEPTH: 'min_scroll_depth',
    GEMINI_MODEL: 'gemini_model',
    OBSIDIAN_DAILY_PATH: 'obsidian_daily_path'
};

const DEFAULT_SETTINGS = {
    [StorageKeys.OBSIDIAN_PROTOCOL]: 'http', // Default HTTP for Local REST API
    [StorageKeys.OBSIDIAN_PORT]: '27123',
    [StorageKeys.MIN_VISIT_DURATION]: 5, // seconds
    [StorageKeys.MIN_SCROLL_DEPTH]: 50, // percentage
    [StorageKeys.GEMINI_MODEL]: 'gemini-1.5-flash',
    [StorageKeys.OBSIDIAN_DAILY_PATH]: '092.Daily', // Default folder path
};

export async function getSettings() {
    const settings = await chrome.storage.local.get(null);
    return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(settings) {
    await chrome.storage.local.set(settings);
}

export async function getApiKey() {
    const settings = await getSettings();
    return settings[StorageKeys.OBSIDIAN_API_KEY];
}
