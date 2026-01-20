/**
 * sanitizePreview.js
 * PII Sanitization Preview UI Logic
 */

const modal = document.getElementById('confirmationModal');
const previewContent = document.getElementById('previewContent');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelPreviewBtn');
const confirmBtn = document.getElementById('confirmPreviewBtn');

let resolvePromise = null;

// Initialize Event Listeners
if (modal) {
    closeModalBtn.addEventListener('click', () => handleAction(false));
    cancelBtn.addEventListener('click', () => handleAction(false));
    confirmBtn.addEventListener('click', () => handleAction(true));
}

/**
 * Show the preview modal and wait for user action
 * @param {string} content - The text content to preview (already masked/summarized)
 * @returns {Promise<{confirmed: boolean, content: string}>}
 */
export function showPreview(content) {
    if (!modal) {
        console.error('Confirmation modal not found in DOM');
        return Promise.resolve({ confirmed: true, content }); // Fallback
    }

    previewContent.value = content || '';
    modal.style.display = 'flex';

    return new Promise((resolve) => {
        resolvePromise = resolve;
    });
}

function handleAction(confirmed) {
    if (!resolvePromise) return;

    modal.style.display = 'none';
    const content = previewContent.value;

    resolvePromise({
        confirmed,
        content: confirmed ? content : null
    });

    resolvePromise = null;
}
