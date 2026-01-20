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
    OBSIDIAN_DAILY_PATH: 'obsidian_daily_path',
    AI_PROVIDER: 'ai_provider',
    OPENAI_BASE_URL: 'openai_base_url',
    OPENAI_API_KEY: 'openai_api_key',
    OPENAI_MODEL: 'openai_model',
    OPENAI_2_BASE_URL: 'openai_2_base_url',
    OPENAI_2_API_KEY: 'openai_2_api_key',
    OPENAI_2_MODEL: 'openai_2_model',
    // Domain filter settings
    DOMAIN_WHITELIST: 'domain_whitelist',
    DOMAIN_BLACKLIST: 'domain_blacklist',
    DOMAIN_WHITELIST: 'domain_whitelist',
    DOMAIN_BLACKLIST: 'domain_blacklist',
    DOMAIN_FILTER_MODE: 'domain_filter_mode',
    // Privacy settings（Phase 3）
    PRIVACY_MODE: 'privacy_mode',           // 'local_only' | 'full_pipeline' | 'masked_cloud' | 'cloud_only'
    PII_CONFIRMATION_UI: 'pii_confirmation_ui', // true | false
    PII_SANITIZE_LOGS: 'pii_sanitize_logs'  // true | false
};

const DEFAULT_SETTINGS = {
    [StorageKeys.OBSIDIAN_PROTOCOL]: 'http', // Default HTTP for Local REST API
    [StorageKeys.OBSIDIAN_PORT]: '27123',
    [StorageKeys.MIN_VISIT_DURATION]: 5, // seconds
    [StorageKeys.MIN_SCROLL_DEPTH]: 50, // percentage
    [StorageKeys.GEMINI_MODEL]: 'gemini-1.5-flash',
    [StorageKeys.OBSIDIAN_DAILY_PATH]: '092.Daily', // Default folder path
    [StorageKeys.AI_PROVIDER]: 'openai',
    [StorageKeys.OPENAI_BASE_URL]: 'https://api.groq.com/openai/v1',
    [StorageKeys.OPENAI_MODEL]: 'openai/gpt-oss-20b',
    [StorageKeys.OPENAI_2_BASE_URL]: 'http://127.0.0.1:11434/v1',
    [StorageKeys.OPENAI_2_MODEL]: 'llama3',
    // Domain filter defaults
    [StorageKeys.DOMAIN_WHITELIST]: [],
    [StorageKeys.DOMAIN_BLACKLIST]: [
        'amazon.co.jp',
        'amazon.com',
        'yahoo.co.jp',
        'yahoo.com',
        'facebook.com',
        'twitter.com',
        'x.com',
        'instagram.com',
        'youtube.com',
        'google.com',
        'google.co.jp'
    ],
    [StorageKeys.DOMAIN_FILTER_MODE]: 'blacklist', // 'whitelist', 'blacklist', 'disabled'
    // Privacy defaults
    [StorageKeys.PRIVACY_MODE]: 'masked_cloud',
    [StorageKeys.PII_CONFIRMATION_UI]: true,
    [StorageKeys.PII_SANITIZE_LOGS]: true
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
