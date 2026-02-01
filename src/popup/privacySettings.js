/**
 * privacySettings.js
 * Privacy settings functionality for the popup UI.
 */

import { StorageKeys, saveSettings, getSettings } from '../utils/storage.js';
import { addLog, LogType } from '../utils/logger.js';

// Elements
const savePrivacySettingsBtn = document.getElementById('savePrivacySettings');
const privacyStatusDiv = document.getElementById('privacyStatus');
const confirmCheckbox = document.getElementById('piiConfirm');
const radioInputs = document.querySelectorAll('input[name="privacyMode"]');

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
            showStatus('モードを選択してください', 'error');
            return;
        }

        const newSettings = {
            [StorageKeys.PRIVACY_MODE]: selectedMode.value,
            [StorageKeys.PII_CONFIRMATION_UI]: confirmCheckbox ? confirmCheckbox.checked : true
        };

        await saveSettings(newSettings);
        showStatus('プライバシー設定を保存しました', 'success');

    } catch (error) {
        addLog(LogType.ERROR, 'Error saving privacy settings', { error: error.message });
        showStatus(`保存エラー: ${error.message}`, 'error');
    }
}

function showStatus(message, type) {
    if (!privacyStatusDiv) return;

    privacyStatusDiv.textContent = message;
    privacyStatusDiv.className = type;

    const timeout = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        if (privacyStatusDiv) {
            privacyStatusDiv.textContent = '';
            privacyStatusDiv.className = '';
        }
    }, timeout);
}
