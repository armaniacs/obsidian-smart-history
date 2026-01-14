import { getSettings, StorageKeys } from '../utils/storage.js';

export class AIClient {
    constructor() { }

    async generateSummary(content) {
        const settings = await getSettings();
        const provider = settings[StorageKeys.AI_PROVIDER] || 'gemini';

        if (provider === 'gemini') {
            return this.generateGeminiSummary(content, settings);
        } else if (provider === 'openai') {
            return this.generateOpenAISummary(
                content,
                settings[StorageKeys.OPENAI_BASE_URL],
                settings[StorageKeys.OPENAI_API_KEY],
                settings[StorageKeys.OPENAI_MODEL]
            );
        } else if (provider === 'openai2') {
            return this.generateOpenAISummary(
                content,
                settings[StorageKeys.OPENAI_2_BASE_URL],
                settings[StorageKeys.OPENAI_2_API_KEY],
                settings[StorageKeys.OPENAI_2_MODEL]
            );
        } else {
            return `Unknown AI Provider: ${provider}`;
        }
    }

    async generateGeminiSummary(content, settings) {
        const apiKey = settings[StorageKeys.GEMINI_API_KEY];
        const modelName = settings[StorageKeys.GEMINI_MODEL] || 'gemini-1.5-flash';

        if (!apiKey) {
            console.warn("Gemini API Key not found.");
            return "No Gemini API Key provided.";
        }

        // Sanitize model name
        const cleanModelName = modelName.replace(/^models\//, '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${apiKey}`;
        console.log("Gemini URL:", url);

        // Truncate content
        const truncatedContent = content.substring(0, 30000);

        const payload = {
            contents: [{
                parts: [{
                    text: `以下のWebページの内容を、日本語で簡潔に要約してください。1文または2文で、重要なポイントをまとめてください。改行しないこと。\n\nContent:\n${truncatedContent}`
                }]
            }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                // If model not found, try to list available models
                if (response.status === 404) {
                    const availableModels = await this.listGeminiModels(apiKey);
                    throw new Error(`Gemini API Error: 404 Model not found. Available models: ${availableModels}`);
                }
                throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return "No summary generated.";
            }

        } catch (error) {
            console.error("Gemini Request Failed:", error);
            return `Error generating summary: ${error.message}`;
        }
    }

    async generateOpenAISummary(content, baseUrlRaw, apiKey, modelNameRaw) {
        const baseUrl = baseUrlRaw || 'https://api.openai.com/v1';
        const modelName = modelNameRaw || 'gpt-3.5-turbo';

        if (apiKey === undefined || apiKey === null) {
            // Note: some local LLMs don't need API key, so we allow empty string if specifically set to empty, but undefined means logic error or missing setting?
            // Actually, for local LLMs, key might be empty string.
            // But if it's explicitly null/undefined, it's an issue.
            // Let's assume if it's empty string it's okay for local.
            // BUT, if it is 'openai' provider, key is usually required.
            // Let's log warning but proceed if empty.
            console.warn("OpenAI API Key is empty or missing.");
        }

        // Ensure baseUrl doesn't end with slash if we append path, but typically user provides base like .../v1
        // We will append /chat/completions
        const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
        console.log("OpenAI URL:", url);

        // Truncate content
        const truncatedContent = content.substring(0, 30000);

        const payload = {
            model: modelName,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that summarizes web pages effectively and concisely in Japanese."
                },
                {
                    role: "user",
                    content: `以下のWebページの内容を、日本語で簡潔に要約してください。1文または2文で、重要なポイントをまとめてください。改行しないこと。\n\nContent:\n${truncatedContent}`
                }
            ]
        };

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                return "No summary generated.";
            }

        } catch (error) {
            console.error("OpenAI Request Failed:", error);
            return `Error generating summary: ${error.message}`;
        }
    }

    async listGeminiModels(apiKey) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) return "Unable to fetch models";
            const data = await response.json();
            return data.models ? data.models.map(m => m.name).join(', ') : "No models returned";
        } catch (e) {
            return `List models failed: ${e.message}`;
        }
    }
}
