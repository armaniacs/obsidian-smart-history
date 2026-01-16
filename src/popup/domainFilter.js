/**
 * domainFilter.js
 * Domain filter settings functionality for the popup UI.
 */

import { StorageKeys, saveSettings, getSettings } from '../utils/storage.js';
import { extractDomain, parseDomainList, validateDomainList } from '../utils/domainUtils.js';

// Elements
const generalTabBtn = document.getElementById('generalTab');
const domainTabBtn = document.getElementById('domainTab');
const generalPanel = document.getElementById('generalPanel');
const domainPanel = document.getElementById('domainPanel');

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

// Tab switching functionality
export function init() {
    // Tab switching
    generalTabBtn.addEventListener('click', () => {
        showGeneralTab();
    });

    domainTabBtn.addEventListener('click', () => {
        showDomainTab();
    });

    // Domain filter mode change
    [filterDisabledRadio, filterWhitelistRadio, filterBlacklistRadio].forEach(radio => {
        radio.addEventListener('change', updateDomainListVisibility);
    });

    // Add current domain button
    addCurrentDomainBtn.addEventListener('click', addCurrentDomain);

    // Save domain settings
    saveDomainSettingsBtn.addEventListener('click', saveDomainSettings);

    // Load domain settings
    loadDomainSettings();
}

function showGeneralTab() {
    generalTabBtn.classList.add('active');
    domainTabBtn.classList.remove('active');
    generalPanel.classList.add('active');
    generalPanel.style.display = 'block';
    domainPanel.classList.remove('active');
    domainPanel.style.display = 'none';
}

function showDomainTab() {
    generalTabBtn.classList.remove('active');
    domainTabBtn.classList.add('active');
    generalPanel.classList.remove('active');
    generalPanel.style.display = 'none';
    domainPanel.classList.add('active');
    domainPanel.style.display = 'block';
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

async function loadDomainSettings() {
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
}

async function addCurrentDomain() {
    try {
        // Check if we have permission to access tabs
        if (!chrome.tabs) {
            showDomainStatus('タブへのアクセス権限がありません', 'error');
            return;
        }
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            showDomainStatus('アクティブなタブが見つかりません', 'error');
            return;
        }
        
        if (!tab.url || !tab.url.startsWith('http')) {
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
        console.error('Error adding current domain:', error);
        showDomainStatus(`エラーが発生しました: ${error.message}`, 'error');
    }
}

async function saveDomainSettings() {
    try {
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
            [StorageKeys.DOMAIN_FILTER_MODE]: mode
        };
        
        if (mode === 'whitelist') {
            newSettings[StorageKeys.DOMAIN_WHITELIST] = domainList;
        } else if (mode === 'blacklist') {
            newSettings[StorageKeys.DOMAIN_BLACKLIST] = domainList;
        }
        
        // Save settings
        await saveSettings(newSettings);
        
        showDomainStatus('ドメインフィルター設定を保存しました', 'success');
    } catch (error) {
        console.error('Error saving domain settings:', error);
        showDomainStatus(`保存エラー: ${error.message}`, 'error');
    }
}

function showDomainStatus(message, type) {
    if (!domainStatusDiv) {
        console.error('Domain status div not found');
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