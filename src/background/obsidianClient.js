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
            throw new Error('Error: API key is missing. Please check your Obsidian settings.');
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
            addLog(LogType.ERROR, `Failed to read daily note: ${response.status} ${errorText}`);
            throw new Error('Error: Failed to read daily note. Please check your Obsidian connection.');
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
            addLog(LogType.ERROR, `Obsidian API Error: ${response.status} ${errorText}`);
            throw new Error('Error: Failed to write to daily note. Please check your Obsidian connection.');
        }
    }

    _handleError(error, targetUrl) {
        let errorMessage = error.message;
        if (errorMessage.includes('Failed to fetch') && targetUrl.startsWith('https')) {
            addLog(LogType.ERROR, `Failed to connect to Obsidian at ${targetUrl}`);
            return new Error('Error: Failed to connect to Obsidian. Please visit the Obsidian URL in a new tab and accept the self-signed certificate.');
        }
        addLog(LogType.ERROR, `Failed to connect to Obsidian at ${targetUrl}. Cause: ${errorMessage}`);
        return new Error('Error: Failed to connect to Obsidian. Please check your settings and connection.');
    }

    async testConnection() {
        try {
            const { baseUrl, headers } = await this._getConfig();
            const response = await fetch(`${baseUrl}/`, {
                method: 'GET',
                headers
            });
            if (response.ok) {
                return { success: true, message: 'Success! Connected to Obsidian. Settings Saved.' };
            } else {
                addLog(LogType.ERROR, `Connection test failed with status: ${response.status}`);
                return { success: false, message: 'Connection Failed. Please check your settings.' };
            }
        } catch (e) {
            addLog(LogType.ERROR, `Connection test failed: ${e.message}`);
            return { success: false, message: 'Connection Failed. Please check your settings and connection.' };
        }
    }
}
