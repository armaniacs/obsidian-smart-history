import { getSettings, StorageKeys } from '../utils/storage.js';

export class ObsidianClient {
    constructor() {
        this.baseUrl = null;
        this.headers = null;
    }

    async init() {
        const settings = await getSettings();
        // Force HTTP to override any stale 'https' setting in local storage
        const protocol = settings[StorageKeys.OBSIDIAN_PROTOCOL] || 'http';
        const port = settings[StorageKeys.OBSIDIAN_PORT] || '27123';
        const apiKey = settings[StorageKeys.OBSIDIAN_API_KEY];

        if (!apiKey) {
            console.warn('Obsidian API Key is missing.');
            throw new Error('API Key missing');
        }

        this.baseUrl = `${protocol}://127.0.0.1:${port}`;
        this.headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'text/markdown',
            'Accept': 'application/json'
        };
    }

    async appendToDailyNote(content) {
        await this.init();

        const settings = await getSettings();
        const dailyPathRaw = settings[StorageKeys.OBSIDIAN_DAILY_PATH] || '';

        // Use local date for YYYY-MM-DD and placeholders
        const now = new Date();
        const year = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        // Replace placeholders in path: YYYY, MM, DD
        const dailyPath = dailyPathRaw
            .replace(/YYYY/g, year)
            .replace(/MM/g, month)
            .replace(/DD/g, day);

        const pathSegment = dailyPath ? `${dailyPath}/` : '';
        const targetUrl = `${this.baseUrl}/vault/${pathSegment}${today}.md`;

        console.log(`Appending to Obsidian: ${targetUrl}`);

        try {
            // 1. Read existing file content
            let existingContent = '';
            const getResponse = await fetch(targetUrl, {
                method: 'GET',
                headers: this.headers
            });

            if (getResponse.ok) {
                existingContent = await getResponse.text();
            } else if (getResponse.status === 404) {
                // File doesn't exist yet, will create it
                console.log('Daily note does not exist yet, will create it.');
            } else {
                const errorText = await getResponse.text();
                throw new Error(`Failed to read daily note: ${getResponse.status} ${errorText}`);
            }

            // 2. Find or create the browser history section
            const sectionHeader = '## 🌐 ブラウザ閲覧履歴';
            let newContent;

            if (existingContent.includes(sectionHeader)) {
                // Section exists, append under it
                const lines = existingContent.split('\n');
                const sectionIndex = lines.findIndex(line => line.trim() === sectionHeader);

                // Find the next section (next ## header) or end of file
                let insertIndex = sectionIndex + 1;
                for (let i = sectionIndex + 1; i < lines.length; i++) {
                    if (lines[i].startsWith('## ')) {
                        insertIndex = i;
                        break;
                    }
                    insertIndex = i + 1;
                }

                // Insert the new content before the next section
                lines.splice(insertIndex, 0, content);
                newContent = lines.join('\n');
            } else {
                // Section doesn't exist, create it at the end
                if (existingContent && !existingContent.endsWith('\n')) {
                    existingContent += '\n';
                }
                newContent = existingContent + `\n${sectionHeader}\n${content}\n`;
            }

            // 3. Write back the entire file
            const putResponse = await fetch(targetUrl, {
                method: 'PUT',
                headers: this.headers,
                body: newContent
            });

            if (!putResponse.ok) {
                const errorText = await putResponse.text();
                throw new Error(`Obsidian API Error: ${putResponse.status} ${errorText}`);
            }

            console.log('Successfully appended to browser history section');
        } catch (error) {
            console.error(`Failed to append to daily note (${targetUrl}):`, error);

            let errorMessage = error.message;
            if (errorMessage.includes('Failed to fetch') && targetUrl.startsWith('https')) {
                errorMessage += ' (Self-signed certificate might not be trusted. Please visit the Obsidian URL in a new tab and accept the certificate.)';
            }

            throw new Error(`Failed to connect to Obsidian at ${targetUrl}. Cause: ${errorMessage}`);
        }
    }

    async testConnection() {
        try {
            await this.init();
            // Try to get status or list of files to verify auth
            const response = await fetch(`${this.baseUrl}/`, {
                method: 'GET',
                headers: this.headers
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
