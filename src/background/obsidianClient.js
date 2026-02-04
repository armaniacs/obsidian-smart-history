import { getSettings, StorageKeys } from '../utils/storage.js';
import { buildDailyNotePath } from '../utils/dailyNotePathBuilder.js';
import { NoteSectionEditor } from './noteSectionEditor.js';
import { addLog, LogType } from '../utils/logger.js';

export class ObsidianClient {
    async _getConfig() {
        const settings = await getSettings();
        const protocol = settings[StorageKeys.OBSIDIAN_PROTOCOL] || 'http';
        const port = settings[StorageKeys.OBSIDIAN_PORT] || '27123';
        const apiKey = settings[StorageKeys.OBSIDIAN_API_KEY];

        if (!apiKey) {
            addLog(LogType.WARN, 'Obsidian API Key is missing');
            throw new Error('API Key missing');
        }

        return {
            baseUrl: `${protocol}://127.0.0.1:${port}`,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'text/markdown',
                'Accept': 'application/json'
            },
            settings
        };
    }

    async appendToDailyNote(content) {
        const { baseUrl, headers, settings } = await this._getConfig();

        const dailyPathRaw = settings[StorageKeys.OBSIDIAN_DAILY_PATH] || '';
        const dailyPath = buildDailyNotePath(dailyPathRaw);
        const pathSegment = dailyPath ? `${dailyPath}/` : '';
        const targetUrl = `${baseUrl}/vault/${pathSegment}${buildDailyNotePath('')}.md`;

        try {
            const existingContent = await this._fetchExistingContent(targetUrl, headers);
            const newContent = NoteSectionEditor.insertIntoSection(
                existingContent,
                NoteSectionEditor.DEFAULT_SECTION_HEADER,
                content
            );

            await this._writeContent(targetUrl, headers, newContent);

        } catch (error) {
            throw this._handleError(error, targetUrl);
        }
    }

    async _fetchExistingContent(url, headers) {
        const response = await fetch(url, {
            method: 'GET',
            headers
        });

        if (response.ok) {
            return await response.text();
        } else if (response.status === 404) {
            return '';
        } else {
            const errorText = await response.text();
            throw new Error(`Failed to read daily note: ${response.status} ${errorText}`);
        }
    }

    async _writeContent(url, headers, content) {
        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: content
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Obsidian API Error: ${response.status} ${errorText}`);
        }
    }

    _handleError(error, targetUrl) {
        let errorMessage = error.message;
        if (errorMessage.includes('Failed to fetch') && targetUrl.startsWith('https')) {
            errorMessage += ' (Self-signed certificate might not be trusted. Please visit the Obsidian URL in a new tab and accept the certificate.)';
        }
        return new Error(`Failed to connect to Obsidian at ${targetUrl}. Cause: ${errorMessage}`);
    }

    async testConnection() {
        try {
            const { baseUrl, headers } = await this._getConfig();
            const response = await fetch(`${baseUrl}/`, {
                method: 'GET',
                headers
            });
            if (response.ok) {
                return { success: true, message: 'Connected to Obsidian!' };
            } else {
                return { success: false, message: `Status: ${response.status}` };
            }
        } catch (e) {
            return { success: false, message: e.message };
        }
    }
}
