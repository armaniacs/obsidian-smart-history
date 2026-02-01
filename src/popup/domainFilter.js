/**
 * domainFilter.js
 * Domain filter settings functionality for the popup UI.
 */

import { StorageKeys, saveSettings, getSettings } from '../utils/storage.js';
import { extractDomain, parseDomainList, validateDomainList } from '../utils/domainUtils.js';
import { init as initUblockImport, saveUblockSettings } from './ublockImport.js';
import { addLog, LogType } from '../utils/logger.js';
import { getCurrentTab, isRecordable } from './tabUtils.js';

// Elements
const generalTabBtn = document.getElementById('generalTab');
const domainTabBtn = document.getElementById('domainTab');
const privacyTabBtn = document.getElementById('privacyTab'); // Phase 3

const generalPanel = document.getElementById('generalPanel');
const domainPanel = document.getElementById('domainPanel');
const privacyPanel = document.getElementById('privacyPanel'); // Phase 3

// Domain filter elements
const filterDisabledRadio = document.getElementById('filterDisabled');
const filterWhitelistRadio = document.getElementById('filterWhitelist');
const filterBlacklistRadio = document.getElementById('filterBlacklist');
const domainListSection = document.getElementById('domainListSection');
const domainListLabel = document.getElementById('domainListLabel');
const domainListTextarea = document.getElementById('domainList');
const addCurrentDomainBtn = document.getElementById('addCurrentDomain');
const saveDomainSettingsBtn = document.getElementById('saveDomainSettings');
const domainStatusDiv = document.getElementById('domainStatus');

// uBlock形式要素
const simpleFormatEnabledCheckbox = document.getElementById('simpleFormatEnabled');
const ublockFormatEnabledCheckbox = document.getElementById('ublockFormatEnabled');
const simpleFormatUI = document.getElementById('simpleFormatUI');
const uBlockFormatUI = document.getElementById('uBlockFormatUI');

// Tab switching functionality
export function init() {
    // Tab switching
    generalTabBtn.addEventListener('click', () => {
        showTab('general');
    });

    domainTabBtn.addEventListener('click', () => {
        showTab('domain');
    });

    if (privacyTabBtn) {
        privacyTabBtn.addEventListener('click', () => {
            showTab('privacy');
        });
    }

    // Domain filter mode change
    [filterDisabledRadio, filterWhitelistRadio, filterBlacklistRadio].forEach(radio => {
        radio.addEventListener('change', updateDomainListVisibility);
    });

    // フィルター形式切替
    simpleFormatEnabledCheckbox.addEventListener('change', toggleFormatUI);
    ublockFormatEnabledCheckbox.addEventListener('change', toggleFormatUI);

    // Add current domain button
    addCurrentDomainBtn.addEventListener('click', addCurrentDomain);

    // uBlock形式の初期化
    initUblockImport();

    // uBlockエクスポート機能の初期化
    import('./ublockExport.js').then(module => {
        module.init();
    }).catch(error => {
        addLog(LogType.ERROR, 'Failed to load ublockExport module', { error: error.message });
    });

    // Save domain settings
    saveDomainSettingsBtn.addEventListener('click', handleSaveDomainSettings);

    // Load domain settings
    loadDomainSettings();
}

function showTab(tabName) {
    // Buttons
    generalTabBtn.classList.toggle('active', tabName === 'general');
    domainTabBtn.classList.toggle('active', tabName === 'domain');
    if (privacyTabBtn) privacyTabBtn.classList.toggle('active', tabName === 'privacy');

    // Panels
    generalPanel.classList.toggle('active', tabName === 'general');
    generalPanel.style.display = tabName === 'general' ? 'block' : 'none';

    domainPanel.classList.toggle('active', tabName === 'domain');
    domainPanel.style.display = tabName === 'domain' ? 'block' : 'none';

    if (privacyPanel) {
        privacyPanel.classList.toggle('active', tabName === 'privacy');
        privacyPanel.style.display = tabName === 'privacy' ? 'block' : 'none';
    }
}

function updateDomainListVisibility() {
    const mode = document.querySelector('input[name="domainFilter"]:checked').value;

    if (mode === 'disabled') {
        domainListSection.style.display = 'none';
    } else {
        domainListSection.style.display = 'block';

        if (mode === 'whitelist') {
            domainListLabel.textContent = 'ホワイトリスト (1行に1ドメイン)';
        } else if (mode === 'blacklist') {
            domainListLabel.textContent = 'ブラックリスト (1行に1ドメイン)';
        }
    }
}

/**
 * フォーマットUIの切替
 */
export function toggleFormatUI() {
    simpleFormatUI.style.display = simpleFormatEnabledCheckbox.checked ? 'block' : 'none';
    uBlockFormatUI.style.display = ublockFormatEnabledCheckbox.checked ? 'block' : 'none';
}

export async function loadDomainSettings() {
    const settings = await getSettings();

    // Load filter mode
    const mode = settings[StorageKeys.DOMAIN_FILTER_MODE] || 'disabled';
    document.querySelector(`input[name="domainFilter"][value="${mode}"]`).checked = true;

    // Load domain list
    let domainList = [];
    if (mode === 'whitelist') {
        domainList = settings[StorageKeys.DOMAIN_WHITELIST] || [];
    } else if (mode === 'blacklist') {
        domainList = settings[StorageKeys.DOMAIN_BLACKLIST] || [];
    }

    domainListTextarea.value = domainList.join('\n');

    updateDomainListVisibility();

    // フィルター形式の読み込み
    simpleFormatEnabledCheckbox.checked = settings[StorageKeys.SIMPLE_FORMAT_ENABLED] !== false;
    ublockFormatEnabledCheckbox.checked = settings[StorageKeys.UBLOCK_FORMAT_ENABLED] === true;

    toggleFormatUI();
}

async function addCurrentDomain() {
    try {
        const tab = await getCurrentTab();

        if (!tab) {
            showDomainStatus('アクティブなタブが見つかりません', 'error');
            return;
        }

        if (!isRecordable(tab)) {
            showDomainStatus('現在のページはHTTP/HTTPSページではありません', 'error');
            return;
        }

        const domain = extractDomain(tab.url);
        if (!domain) {
            showDomainStatus('ドメインを抽出できませんでした', 'error');
            return;
        }

        // Get current list
        const currentList = parseDomainList(domainListTextarea.value);

        // Check for duplicates
        if (currentList.includes(domain)) {
            showDomainStatus(`ドメイン "${domain}" は既にリストに存在します`, 'error');
            return;
        }

        // Add domain to list
        currentList.push(domain);
        domainListTextarea.value = currentList.join('\n');

        showDomainStatus(`ドメイン "${domain}" を追加しました`, 'success');
    } catch (error) {
        addLog(LogType.ERROR, 'Error adding current domain', { error: error.message });
        showDomainStatus(`エラーが発生しました: ${error.message}`, 'error');
    }
}

/**
 * 保存ボタンのハンドラー
 */
export async function handleSaveDomainSettings() {
    try {
        // シンプル形式の保存
        await saveSimpleFormatSettings();

        // uBlock形式の保存 (有効な場合のみパースして保存されるが、有効化フラグだけは更新する)
        const ublockEnabled = ublockFormatEnabledCheckbox.checked;
        if (ublockEnabled) {
            await saveUblockSettings();
        } else {
            await saveSettings({ [StorageKeys.UBLOCK_FORMAT_ENABLED]: false });
        }
    } catch (error) {
        addLog(LogType.ERROR, 'Error saving domain settings', { error: error.message });
        showDomainStatus(`保存エラー: ${error.message}`, 'error');
    }
}

/**
 * シンプル形式の設定を保存
 */
async function saveSimpleFormatSettings() {
    // Check if filter mode is selected
    const selectedMode = document.querySelector('input[name="domainFilter"]:checked');
    if (!selectedMode) {
        showDomainStatus('フィルターモードを選択してください', 'error');
        return;
    }

    const mode = selectedMode.value;
    const domainListText = domainListTextarea.value.trim();
    const domainList = domainListText ? parseDomainList(domainListText) : [];

    // Validate domain list if not disabled
    if (mode !== 'disabled' && domainList.length > 0) {
        const errors = validateDomainList(domainList);
        if (errors.length > 0) {
            showDomainStatus(`ドメインリストのエラー:\n${errors.join('\n')}`, 'error');
            return;
        }
    }

    // Prepare settings object
    const newSettings = {
        [StorageKeys.DOMAIN_FILTER_MODE]: mode,
        [StorageKeys.SIMPLE_FORMAT_ENABLED]: simpleFormatEnabledCheckbox.checked
    };

    if (mode === 'whitelist') {
        newSettings[StorageKeys.DOMAIN_WHITELIST] = domainList;
    } else if (mode === 'blacklist') {
        newSettings[StorageKeys.DOMAIN_BLACKLIST] = domainList;
    }

    // Save settings
    await saveSettings(newSettings);

    showDomainStatus('ドメインフィルター設定を保存しました', 'success');
}

function showDomainStatus(message, type) {
    if (!domainStatusDiv) {
        addLog(LogType.ERROR, 'Domain status div not found');
        return;
    }

    domainStatusDiv.textContent = message;
    domainStatusDiv.className = type;

    // Clear status after 5 seconds for errors, 3 seconds for success
    const timeout = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        if (domainStatusDiv) {
            domainStatusDiv.textContent = '';
            domainStatusDiv.className = '';
        }
    }, timeout);
}