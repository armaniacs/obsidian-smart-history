/**
 * settingsUiHelper.js
 * Helper for binding settings to DOM inputs.
 */

/**
 * Show a timed status message on a DOM element.
 * @param {string} elementId - The DOM element ID to show the message in
 * @param {string} message - Message text
 * @param {'success'|'error'} type - Message type
 */
export function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.textContent = message;
    el.className = type;

    const timeout = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        if (el) {
            el.textContent = '';
            el.className = '';
        }
    }, timeout);
}

/**
 * Load settings into DOM inputs based on a mapping object.
 * @param {Object} settings - Settings object from storage
 * @param {Object} mapping - Object mapping StorageKeys to DOM elements
 */
export function loadSettingsToInputs(settings, mapping) {
    for (const [key, element] of Object.entries(mapping)) {
        if (!element) continue;

        const value = settings[key];
        if (value !== undefined && value !== null) {
            element.value = value;
        }
    }
}

/**
 * Extract values from DOM inputs into a settings object.
 * @param {Object} mapping - Object mapping StorageKeys to DOM elements
 * @returns {Object} Settings object to be saved
 */
export function extractSettingsFromInputs(mapping) {
    const settings = {};
    for (const [key, element] of Object.entries(mapping)) {
        if (!element) continue;

        let value = element.value;
        if (element.type === 'number') {
            value = parseInt(value, 10);
        } else if (element.type === 'checkbox') {
            value = element.checked;
        } else if (typeof value === 'string') {
            value = value.trim();
        }

        settings[key] = value;
    }
    return settings;
}
