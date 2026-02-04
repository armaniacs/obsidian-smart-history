/**
 * privacySettings.js
 * Privacy settings functionality for the popup UI.
 */

import { StorageKeys, saveSettings, getSettings } from '../utils/storage.js';
import { addLog, LogType } from '../utils/logger.js';
import { showStatus } from './settingsUiHelper.js';

// Elements
const savePrivacySettingsBtn = document.getElementById('savePrivacySettings');
const confirmCheckbox = document.getElementById('piiConfirm');

export function init() {
    // Save settings
    if (savePrivacySettingsBtn) {
        savePrivacySettingsBtn.addEventListener('click', savePrivacySettings);
    }

    // Load settings
    loadPrivacySettings();
}

async function loadPrivacySettings() {
    const settings = await getSettings();

    // Mode
    const mode = settings[StorageKeys.PRIVACY_MODE] || 'full_pipeline';
    const radio = document.querySelector(`input[name="privacyMode"][value="${mode}"]`);
    if (radio) {
        radio.checked = true;
    }

    // Confirmation
    if (confirmCheckbox) {
        confirmCheckbox.checked = settings[StorageKeys.PII_CONFIRMATION_UI] !== false; // Default true
    }
}

async function savePrivacySettings() {
    try {
        const selectedMode = document.querySelector('input[name="privacyMode"]:checked');
        if (!selectedMode) {
            showStatus('privacyStatus', 'モードを選択してください', 'error');
            return;
        }

        const newSettings = {
            [StorageKeys.PRIVACY_MODE]: selectedMode.value,
            [StorageKeys.PII_CONFIRMATION_UI]: confirmCheckbox ? confirmCheckbox.checked : true
        };

        await saveSettings(newSettings);
        showStatus('privacyStatus', 'プライバシー設定を保存しました', 'success');

    } catch (error) {
        addLog(LogType.ERROR, 'Error saving privacy settings', { error: error.message });
        showStatus('privacyStatus', `保存エラー: ${error.message}`, 'error');
    }
}

